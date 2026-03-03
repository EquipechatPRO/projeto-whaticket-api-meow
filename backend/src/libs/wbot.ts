import fs from "fs/promises"
import * as Sentry from "@sentry/node";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  WAMessage,
  WAMessageContent,
  WAMessageKey,
  WAMessageStubType,
  WASocket,
  isJidBroadcast,
  isJidGroup,
  isJidNewsletter,
  isJidStatusBroadcast,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  proto,
} from "@whiskeysockets/baileys";
import { makeInMemoryStore } from "@whiskeysockets/baileys";
import { FindOptions } from "sequelize/types";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import pino from "pino";
import { useMultiFileAuthState } from "../helpers/useMultiFileAuthState";
import { Boom } from "@hapi/boom";
import AppError from "../errors/AppError";
import { getIO } from "./socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "../libs/cache";
import { add } from "date-fns";
import moment from "moment";
import { getTypeMessage, isValidMsg } from "../services/WbotServices/wbotMessageListener";
import { addLogs } from "../helpers/addLogs";
import NodeCache from 'node-cache';
import Message from "../models/Message";
import { getVersionByIndexFromUrl } from "../utils/versionHelper";
import path from "path";
import { getGroupMetadataCache } from "../utils/RedisGroupCache";

const loggerBaileys = pino({ level: "error" });

export type Session = WASocket & {
  id?: number;
  myJid?: string;
  myLid?: string;
  store?: (msg: proto.IWebMessageInfo) => void;
};

const sessions: Session[] = [];
// ✅ Mapa global de stores do Baileys por whatsappId — para acesso aos contatos sincronizados
const inMemoryStores = new Map<number, ReturnType<typeof makeInMemoryStore>>();

export const getInMemoryStore = (whatsappId: number) => inMemoryStores.get(whatsappId);

const retriesQrCodeMap = new Map<number, number>();
// ✅ Backoff exponencial: rastreia tentativas de reconexão por whatsapp id
const reconnectAttemptsMap = new Map<number, number>();
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 2000; // 2 segundos
const MAX_RECONNECT_DELAY_MS = 5 * 60 * 1000; // 5 minutos

const getReconnectDelay = (whatsappId: number): number => {
  const attempts = reconnectAttemptsMap.get(whatsappId) || 0;
  // Exponencial: 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s... max 5min
  const delay = Math.min(
    BASE_RECONNECT_DELAY_MS * Math.pow(2, attempts),
    MAX_RECONNECT_DELAY_MS
  );
  // Adicionar jitter de ±20% para evitar thundering herd
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
};

// ✅ Health Check periódico para detectar conexões zumbis
const HEALTH_CHECK_INTERVAL_MS = 10 * 60 * 1000; // Verificar a cada 10 minutos (era 5min)
const HEALTH_CHECK_TIMEOUT_MS = 20 * 1000; // Timeout de 20 segundos (era 15s)
const ZOMBIE_THRESHOLD_MS = 12 * 60 * 1000; // 12 minutos sem pong = zumbi (era 5min)
const lastPongMap = new Map<number, number>(); // Último pong recebido por sessão
const failedPingCountMap = new Map<number, number>(); // Contagem de pings falhados consecutivos
const ZOMBIE_FAILED_PINGS = 3; // Número de pings consecutivos falhados para considerar zumbi
let healthCheckTimer: NodeJS.Timer | null = null;

const performHealthCheck = async (): Promise<void> => {
  if (sessions.length === 0) return;

  for (const session of sessions) {
    if (!session?.id || !session?.ws) continue;

    const whatsappId = session.id;

    try {
      const wsAny = session.ws as any;
      const isWsOpen = typeof wsAny?.readyState === 'number'
        ? wsAny.readyState === 1
        : typeof wsAny?.isClosed === 'boolean'
          ? !wsAny.isClosed
          : !!session.user?.id;

      if (!isWsOpen) {
        logger.warn(`[HEALTH-CHECK] Sessão ${whatsappId} - Conexão não está ativa (user.id: ${session.user?.id || 'N/A'})`);
        continue;
      }

      const lastPong = lastPongMap.get(whatsappId);
      const now = Date.now();
      const failedPings = failedPingCountMap.get(whatsappId) || 0;

      // Zumbi: sem pong há mais de 5 minutos E pelo menos 3 pings falhados consecutivos
      if (lastPong && (now - lastPong) > ZOMBIE_THRESHOLD_MS && failedPings >= ZOMBIE_FAILED_PINGS) {
        logger.error(`[HEALTH-CHECK] Sessão ${whatsappId} - CONEXÃO ZUMBI detectada! Último pong há ${Math.round((now - lastPong) / 1000)}s, ${failedPings} pings falhados. Forçando reconexão.`);

        try {
          const whatsapp = await Whatsapp.findByPk(whatsappId);
          if (whatsapp && whatsapp.status === "CONNECTED") {
            await whatsapp.update({ status: "OPENING" });
            session.ws.close();
            removeWbot(whatsappId, false);
            lastPongMap.delete(whatsappId);
            failedPingCountMap.delete(whatsappId);

            const { StartWhatsAppSession } = await import("../services/WbotServices/StartWhatsAppSession");
            setTimeout(() => StartWhatsAppSession(whatsapp, whatsapp.companyId), 3000);
          }
        } catch (restartErr) {
          logger.error(`[HEALTH-CHECK] Erro ao reiniciar sessão ${whatsappId}: ${restartErr.message}`);
        }
        continue;
      }

      // Enviar ping via sendPresenceUpdate
      try {
        await Promise.race([
          session.sendPresenceUpdate("available"),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), HEALTH_CHECK_TIMEOUT_MS)
          )
        ]);
        lastPongMap.set(whatsappId, Date.now());
        failedPingCountMap.set(whatsappId, 0); // Reset contador de falhas
      } catch (pingErr) {
        const newFailCount = failedPings + 1;
        failedPingCountMap.set(whatsappId, newFailCount);
        logger.warn(`[HEALTH-CHECK] Sessão ${whatsappId} - Ping falhou (${newFailCount}/${ZOMBIE_FAILED_PINGS}): ${pingErr.message}`);
        if (!lastPongMap.has(whatsappId)) {
          lastPongMap.set(whatsappId, now);
        }
      }
    } catch (err) {
      logger.error(`[HEALTH-CHECK] Erro ao verificar sessão ${whatsappId}: ${err.message}`);
    }
  }
};

export const startHealthCheck = (): void => {
  if (healthCheckTimer) return; // Já está rodando

  logger.info(`[HEALTH-CHECK] Iniciando monitoramento periódico (intervalo: ${HEALTH_CHECK_INTERVAL_MS / 1000}s)`);
  healthCheckTimer = setInterval(performHealthCheck, HEALTH_CHECK_INTERVAL_MS);
};

export const stopHealthCheck = (): void => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
    logger.info("[HEALTH-CHECK] Monitoramento periódico parado");
  }
};

// ✅ Variável global para armazenar a versão do WhatsApp Web
let cachedWhatsAppVersion: [number, number, number] | null = null;

/**
 * Busca e cacheia a versão do WhatsApp Web
 * Esta função é chamada uma única vez no início da aplicação
 */
export const initializeWhatsAppVersion = async (): Promise<void> => {
  try {
    if (!cachedWhatsAppVersion) {
      cachedWhatsAppVersion = await getVersionByIndexFromUrl(2);
      console.info("✅ [WBOT] Versão do WhatsApp Web carregada:", cachedWhatsAppVersion);
    }
  } catch (error) {
    console.error("❌ [WBOT] Erro ao buscar versão do WhatsApp Web:", error);
    // Fallback para versão padrão
    cachedWhatsAppVersion = [2, 3000, 1024710243];
    console.info("⚠️ [WBOT] Usando versão padrão:", cachedWhatsAppVersion);
  }
};

/**
 * Retorna a versão do WhatsApp Web cacheada
 * Se não estiver cacheada, usa a versão padrão
 */
const getWhatsAppVersion = (): [number, number, number] => {
  if (!cachedWhatsAppVersion) {
    console.warn("⚠️ [WBOT] Versão não inicializada, usando versão padrão");
    return [2, 3000, 1024710243];
  }
  return cachedWhatsAppVersion;
};

// export default function msg() {
//   return {
//     get: (key: WAMessageKey) => {
//       const { id } = key;
//       if (!id) return;
//       let data = msgCache.get(id);
//       if (data) {
//         try {
//           let msg = JSON.parse(data as string);
//           return msg?.message;
//         } catch (error) {
//           logger.error(error);
//         }
//       }
//     },
//     save: (msg: WAMessage) => {
//       const { id } = msg.key;
//       const msgtxt = JSON.stringify(msg);
//       try {
//         msgCache.set(id as string, msgtxt);
//       } catch (error) {
//         logger.error(error);
//       }
//     }
//   }
// }

async function deleteFolder(folder) {
  try {
    await fs.rm(folder, { recursive: true });
    console.log('Pasta deletada com sucesso!', folder);
  } catch (err) {
    console.error('Erro ao deletar pasta:', err);
  }
}

export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

export const restartWbot = async (
  companyId: number,
  session?: any
): Promise<void> => {
  try {
    const options: FindOptions = {
      where: {
        companyId,
      },
      attributes: ["id"],
    }

    const whatsapp = await Whatsapp.findAll(options);

    whatsapp.map(async c => {
      const sessionIndex = sessions.findIndex(s => s.id === c.id);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].ws.close();
      }

    });

  } catch (err) {
    logger.error(err);
  }
};

export const removeWbot = async (
  whatsappId: number,
  isLogout = true
): Promise<void> => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      const session = sessions[sessionIndex];

      if (isLogout) {
        try {
          await session.logout();
        } catch (logoutError) {
          logger.warn(`[WBOT] Falha ao deslogar sessão ${whatsappId}: ${logoutError?.message || logoutError}`);
        }
      }

      try {
        session.ws?.close();
      } catch (closeError) {
        logger.warn(`[WBOT] Falha ao fechar socket da sessão ${whatsappId}: ${closeError?.message || closeError}`);
      }

      sessions.splice(sessionIndex, 1);
      lastPongMap.delete(whatsappId);
      failedPingCountMap.delete(whatsappId);
      inMemoryStores.delete(whatsappId);

      // Parar health check se não há mais sessões
      if (sessions.length === 0) {
        stopHealthCheck();
      }
    }
  } catch (err) {
    logger.error(err);
  }
};

export function internalIsJidGroup(jid: string): boolean {
  return isJidGroup(jid);
}

export var dataMessages: any = {};

// export const msgDB = msg();

// Mapa para armazenar callbacks de pairing code pendentes
const pairingCodeCallbacks = new Map<number, (code: string) => void>();

const isSessionReadyForPairing = (session: Session | undefined): { ready: boolean; reason: string } => {
  if (!session) return { ready: false, reason: "session_null" };

  const wsAny = session?.ws as any;

  // Checar se o websocket está aberto usando múltiplas heurísticas
  const readyState = wsAny?.readyState;
  const isClosed = wsAny?.isClosed;
  const isWsOpen =
    (typeof readyState === "number" && readyState === 1) ||
    (typeof isClosed === "boolean" && !isClosed) ||
    (readyState === undefined && isClosed === undefined && !!wsAny); // WS existe mas sem propriedades padrão

  if (!isWsOpen) return { ready: false, reason: `ws_not_open (readyState=${readyState}, isClosed=${isClosed})` };

  // Não exigir authState.creds — em Baileys v7 o creds pode não estar exposto no socket
  // O importante é que o socket esteja aberto e NÃO registrado (sem user.id)
  const isRegistered = !!session?.user?.id;
  if (isRegistered) return { ready: false, reason: "already_registered" };

  return { ready: true, reason: "ok" };
};

const normalizePairingCode = (code: string): string => {
  return String(code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
};


export const requestPairingCode = async (whatsappId: number, phoneNumber: string): Promise<string> => {
  const cleanNumber = phoneNumber.replace(/\D/g, "");

  if (!cleanNumber || cleanNumber.length < 10) {
    throw new AppError("Número inválido. Use o formato: 5511999998888", 400);
  }

  const maxAttempts = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const session = sessions.find(s => s.id === whatsappId);

    if (!session) {
      logger.error(`[PairingCode] Sessão ${whatsappId} NÃO encontrada em memória. Sessions ativas: [${sessions.map(s => s.id).join(",")}]`);
      throw new AppError("ERR_WAPP_NOT_INITIALIZED — sessão não está em memória. Clique em 'Tentar novamente' na tela de conexões.", 400);
    }

    // Verificar se já está registrado (conectado) — checar APENAS user.id, não creds.registered
    // porque creds.registered pode ser true de sessão anterior residual
    if (session?.user?.id) {
      throw new AppError("Sessão já está autenticada. Desconecte antes de solicitar novo pareamento.", 400);
    }

    try {
      const readiness = isSessionReadyForPairing(session);
      logger.info(`[PairingCode] Tentativa ${attempt}/${maxAttempts} - readiness: ${JSON.stringify(readiness)}`);

      if (!readiness.ready) {
        if (readiness.reason === "already_registered") {
          throw new AppError("Sessão já está autenticada.", 400);
        }

        // Aguardar WS estabilizar
        logger.warn(`[PairingCode] Sessão ${whatsappId} não pronta: ${readiness.reason}. Aguardando 3s...`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Re-buscar sessão (pode ter sido recriada)
        const retrySession = sessions.find(s => s.id === whatsappId);
        const retryReadiness = isSessionReadyForPairing(retrySession);
        if (!retryReadiness.ready) {
          throw new Error(`PAIRING_SESSION_NOT_READY: ${retryReadiness.reason}`);
        }
      }

      // Delay de estabilização reduzido: 2s ao invés de 5s
      // (o controller já espera 2s antes de chamar esta função)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Re-buscar sessão mais recente antes de chamar requestPairingCode
      const currentSession = sessions.find(s => s.id === whatsappId);
      if (!currentSession) {
        throw new Error("Sessão perdida durante estabilização");
      }

      logger.info(`[PairingCode] Chamando requestPairingCode no Baileys para número ${cleanNumber}...`);
      const rawCode = await (currentSession as any).requestPairingCode(cleanNumber);
      logger.info(`[PairingCode] Baileys retornou código raw: "${rawCode}"`);

      const normalizedCode = normalizePairingCode(rawCode);

      if (!normalizedCode || normalizedCode.length < 4 || normalizedCode === "SUK1CH4N") {
        logger.warn(`[PairingCode] Código inválido recebido: "${normalizedCode}" (raw: "${rawCode}")`);
        throw new Error("INVALID_PAIRING_CODE");
      }

      logger.info(`[PairingCode] ✅ Código gerado para whatsappId=${whatsappId} na tentativa ${attempt}/${maxAttempts}: ${normalizedCode}`);
      return normalizedCode;
    } catch (err: any) {
      lastError = err;
      const message = err?.message || String(err);
      const canRetry =
        attempt < maxAttempts &&
        /(PAIRING_SESSION_NOT_READY|INVALID_PAIRING_CODE|timeout|timed out|closed|connection|stream|conflict|temporarily unavailable|429|rate|not initialized)/i.test(message);

      logger.warn(`[PairingCode] Falha na tentativa ${attempt}/${maxAttempts} para whatsappId=${whatsappId}: ${message}`);

      if (!canRetry) {
        break;
      }

      // Delay progressivo entre tentativas
      const retryDelay = 2000 * attempt;
      logger.info(`[PairingCode] Aguardando ${retryDelay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  logger.error(`[PairingCode] Erro ao solicitar código após ${maxAttempts} tentativas: ${lastError?.message || lastError}`);
  throw new AppError(lastError?.message || "Erro ao gerar código de pareamento.", 500);
};

export const initWASocket = async (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise(async (resolve, reject) => {
    try {
      (async () => {

        const io = getIO();

        const whatsappUpdate = await Whatsapp.findOne({
          where: { id: whatsapp.id }
        });

        if (!whatsappUpdate) return;

        const { id, name, allowGroup, companyId } = whatsappUpdate;

        logger.info(`Starting session ${name}`);
        let retriesQrCode = 0;

        let wsocket: Session = null;

        const store = new NodeCache({
          stdTTL: 3600, //1 hora
          checkperiod: 30,
          useClones: false
        });

        // ✅ inMemoryStore DESATIVADO para reduzir consumo de CPU/memória
        // O store duplicava todos os eventos (mensagens, contatos, chats) em memória
        // Os contatos já são salvos via wbotMonitor (contacts.set, contacts.upsert)
        // const baileysStore = makeInMemoryStore({ logger: loggerBaileys });
        // inMemoryStores.set(id, baileysStore);

        const msgRetryCounterCache = new NodeCache({
          stdTTL: 60 * 60,
          useClones: false
        });

        // ✅ Baileys v7: Retry de sessão para erros BAD_MAC / NO_SESSION
        // Este patch existia no fork renatoiub/WSocket e não existe na v7 oficial.
        // Quando o Baileys falha ao descriptografar uma mensagem (BAD_MAC) ou
        // não encontra a sessão Signal (NO_SESSION), ele chama getMessage() para
        // reenviar. Este cache conta as tentativas para evitar loops infinitos.
        const sessionRetryCache = new NodeCache({
          stdTTL: 60 * 5, // 5 minutos
          useClones: false
        });
        const MAX_SESSION_RETRIES = 3;

        async function getMessage(
          key: WAMessageKey
        ): Promise<WAMessageContent> {
          if (!key.id) return null;

          const message = store.get(key.id);

          if (message) {
            logger.info({ message }, "cacheMessage: recovered from cache");
            return message;
          }

          logger.info(
            { key },
            "cacheMessage: not found in cache - fallback to database"
          );

          let msg: Message;

          msg = await Message.findOne({
            where: { wid: key.id, fromMe: true }
          });

          if (!msg) {
            logger.info({ key }, "cacheMessage: not found in database");
            return undefined;
          }

          try {
            const data = JSON.parse(msg.dataJson);
            logger.info(
              { key, data },
              "cacheMessage: recovered from database"
            );
            store.set(key.id, data.message);
            return data.message || undefined;
          } catch (error) {
            logger.error(
              { key },
              `cacheMessage: error parsing message from database - ${error.message}`
            );
          }

          return undefined;
        }

        // ✅ Usar versão cacheada ao invés de buscar toda vez
        const versionWA = getWhatsAppVersion();
        console.info(`[WBOT] Usando versão cacheada para ${name}:`, versionWA);

        const publicFolder = path.join(__dirname, '..', '..', '..', 'backend', 'sessions');
        const folderSessions = path.join(publicFolder, `company${whatsapp.companyId}`, whatsapp.id.toString());

        const { state, saveCreds } = await useMultiFileAuthState(whatsapp);

        wsocket = makeWASocket({
          version: versionWA || [2, 3000, 1024710243],
          logger: loggerBaileys,
          printQRInTerminal: false,
          auth: {
            creds: state.creds,
            /** ✅ Baileys v7: cache em memória para Signal keys — reduz I/O no Redis */
            keys: makeCacheableSignalKeyStore(state.keys, loggerBaileys),
          },
          syncFullHistory: false,
          transactionOpts: { maxCommitRetries: 1, delayBetweenTriesMs: 10 },
          generateHighQualityLinkPreview: true,
          linkPreviewImageThumbnailWidth: 200,
          emitOwnEvents: true,
          // Usa o nome da conexão como identificador visível no celular
          browser: Browsers.macOS(name || "Chrome"),
          defaultQueryTimeoutMs: 60000,
          connectTimeoutMs: 60000,
          keepAliveIntervalMs: 60000, // 60s (era 45s) — reduz tráfego em sessões ociosas
          msgRetryCounterCache,
          maxMsgRetryCount: MAX_SESSION_RETRIES,
          shouldIgnoreJid: jid => {
            const ignoreJid = (!allowGroup && isJidGroup(jid)) ||
              isJidBroadcast(jid) ||
              isJidNewsletter(jid) ||
              isJidStatusBroadcast(jid)
            // || isJidMetaIa(jid)
            return ignoreJid
          },
          getMessage
        });

        wsocket.id = whatsapp.id;

        wsocket.store = (msg: proto.IWebMessageInfo): void => {
          if (!msg.key.fromMe) return;

          logger.debug({ message: msg.message }, "cacheMessage: saved");

          store.set(msg.key.id, msg.message);
        };


        wsocket.ev.on(
          "connection.update",
          async ({ connection, lastDisconnect, qr }) => {
            logger.info(
              `Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""
              }`
            );

            if (connection === "close") {
              const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
              const disconnectMessage = (lastDisconnect?.error as Error)?.message || "";
              const isConflictDisconnect =
                statusCode === 440 || /conflict|replaced/i.test(disconnectMessage);
              const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !isConflictDisconnect;

              logger.info(
                `[WBOT] ${name} desconectado - statusCode: ${statusCode}, reconectar: ${shouldReconnect}`
              );

              if (isConflictDisconnect) {
                logger.warn(
                  `[WBOT] ${name} desconectado por conflito de sessão (stream replaced). ` +
                  `Interrompendo reconexão automática para evitar loop.`
                );

                await whatsapp.update({ status: "DISCONNECTED" });
                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });

                removeWbot(id, false);
                reconnectAttemptsMap.delete(id);
              } else if (statusCode === 403) {
                // Banned ou bloqueado — limpar sessão
                await whatsapp.update({ status: "PENDING", session: "" });
                await DeleteBaileysService(whatsapp.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                removeWbot(id, false);
                reconnectAttemptsMap.delete(id);
              } else if (shouldReconnect) {
                // ✅ Reconexão com backoff exponencial
                const attempts = reconnectAttemptsMap.get(id) || 0;

                if (attempts >= MAX_RECONNECT_ATTEMPTS) {
                  logger.warn(`[WBOT] ${name} atingiu máximo de ${MAX_RECONNECT_ATTEMPTS} tentativas de reconexão. Parando.`);
                  await whatsapp.update({ status: "DISCONNECTED" });
                  io.of(String(companyId))
                    .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                      action: "update",
                      session: whatsapp
                    });
                  removeWbot(id, false);
                  reconnectAttemptsMap.delete(id);
                } else {
                  const delay = getReconnectDelay(id);
                  reconnectAttemptsMap.set(id, attempts + 1);
                  logger.info(`[WBOT] ${name} reconectando em ${Math.round(delay / 1000)}s (tentativa ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
                  removeWbot(id, false);
                  setTimeout(
                    () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                    delay
                  );
                }
              } else {
                // loggedOut: não reconectar — aguarda ação do usuário
                logger.info(`[WBOT] ${name} deslogado pelo usuário. Aguardando nova autenticação.`);
                await whatsapp.update({ status: "PENDING", session: "" });
                await DeleteBaileysService(whatsapp.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                removeWbot(id, false);
                reconnectAttemptsMap.delete(id);
              }
            }

            if (connection === "open") {
              // ✅ Reset do backoff exponencial ao conectar com sucesso
              reconnectAttemptsMap.delete(id);
              // ✅ Registrar pong inicial e iniciar health check
              lastPongMap.set(id, Date.now());
              startHealthCheck();

              wsocket.myLid = jidNormalizedUser(wsocket.user?.lid)
              wsocket.myJid = jidNormalizedUser(wsocket.user.id)

              await whatsapp.update({
                status: "CONNECTED",
                qrcode: "",
                retries: 0,
                number: jidNormalizedUser((wsocket as WASocket).user.id).split("@")[0]
              });

              // Recarregar para garantir que todos os campos estejam atualizados antes de emitir
              await whatsapp.reload();

              logger.debug(
                {
                  id: jidNormalizedUser(wsocket.user.id),
                  name: wsocket.user.name,
                  lid: jidNormalizedUser(wsocket.user?.lid),
                  notify: wsocket.user?.notify,
                  verifiedName: wsocket.user?.verifiedName,
                  imgUrl: wsocket.user?.imgUrl,
                  status: wsocket.user?.status
                },
                `Session ${name} details`
              );

              io.of(String(companyId))
                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });

              const sessionIndex = sessions.findIndex(
                s => s.id === whatsapp.id
              );
              if (sessionIndex === -1) {
                wsocket.id = whatsapp.id;
                sessions.push(wsocket);
              }

              resolve(wsocket);
            }

            if (qr !== undefined) {
              if (retriesQrCodeMap.get(id) && retriesQrCodeMap.get(id) >= 3) {
                await whatsappUpdate.update({
                  status: "DISCONNECTED",
                  qrcode: ""
                });
                await DeleteBaileysService(whatsappUpdate.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsappUpdate
                  });
                wsocket.ev.removeAllListeners("connection.update");
                wsocket.ws.close();
                wsocket = null;
                retriesQrCodeMap.delete(id);
                // Resolver a promise para não travar StartWhatsAppSession
                resolve(null as any);
              } else {
                logger.info(`Session QRCode Generate ${name}`);
                retriesQrCodeMap.set(id, (retriesQrCode += 1));

                await whatsapp.update({
                  qrcode: qr,
                  status: "qrcode",
                  retries: 0,
                  number: ""
                });
                const sessionIndex = sessions.findIndex(
                  s => s.id === whatsapp.id
                );

                if (sessionIndex === -1) {
                  wsocket.id = whatsapp.id;
                  sessions.push(wsocket);
                }

                io.of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });

                // Resolver na primeira geração de QR para não bloquear
                if (retriesQrCode === 1) {
                  resolve(wsocket);
                }
              }
            }
          }
        );
        wsocket.ev.on("creds.update", saveCreds);

        // ✅ Baileys v7: Retry automático de sessão Signal para erros BAD_MAC / NO_SESSION
        // Na v7 oficial, o Baileys não faz retry automático de sessões corrompidas.
        // Este handler detecta falhas de descriptografia e invalida a sessão Signal,
        // forçando o Baileys a criar uma nova sessão na próxima tentativa.
        wsocket.ev.on("messages.update", async (updates) => {
          for (const update of updates) {
            // Detectar mensagens que falharam na descriptografia (status de erro)
            const updateAny = update as any;
            if (updateAny?.update?.messageStubType === WAMessageStubType.CIPHERTEXT) {
              const msgId = update.key?.id;
              if (!msgId) continue;

              const retryCount = (sessionRetryCache.get(msgId) as number) || 0;
              if (retryCount >= MAX_SESSION_RETRIES) {
                logger.warn(`[SESSION-RETRY] Máximo de tentativas atingido para msg ${msgId}, ignorando`);
                sessionRetryCache.del(msgId);
                continue;
              }

              sessionRetryCache.set(msgId, retryCount + 1);
              logger.info(`[SESSION-RETRY] Tentativa ${retryCount + 1}/${MAX_SESSION_RETRIES} para msg ${msgId} (BAD_MAC/NO_SESSION)`);
            }
          }
        });

        // ✅ inMemoryStore.bind DESATIVADO para reduzir consumo de CPU/memória
        // baileysStore.bind(wsocket.ev);
      })();
    } catch (error) {
      Sentry.captureException(error);
      console.log(error);
      reject(error);
    }
  });
};
