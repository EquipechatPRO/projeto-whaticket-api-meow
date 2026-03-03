import { initWASocket, getWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import logger from "../../utils/logger";
import * as Sentry from "@sentry/node";
import { redisGroupCache } from "../../utils/RedisGroupCache";

const startingSessions = new Set<number>();

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  if (startingSessions.has(whatsapp.id)) {
    logger.warn(`[WBOT] Sessão ${whatsapp.name} (${whatsapp.id}) já está iniciando, ignorando chamada duplicada.`);
    return;
  }

  startingSessions.add(whatsapp.id);

  try {
    try {
      const existingWbot = getWbot(whatsapp.id) as any;
      const wsAny = existingWbot?.ws as any;
      const isOpen = typeof wsAny?.readyState === "number"
        ? wsAny.readyState === 1
        : typeof wsAny?.isClosed === "boolean"
          ? !wsAny.isClosed
          : !!existingWbot?.user?.id;

      if (isOpen && existingWbot?.user?.id) {
        logger.info(`[WBOT] Sessão ${whatsapp.name} (${whatsapp.id}) já conectada, pulando nova inicialização.`);
        return;
      }
    } catch {
      // Sessão ainda não inicializada, segue fluxo normal
    }

    await whatsapp.update({ status: "OPENING" });

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-whatsappSession`, {
        action: "update",
        session: whatsapp
      });

    // Fire-and-forget: não bloqueia aguardando conexão abrir
    // Isso evita que startingSessions trave quando QR é gerado mas não escaneado
    // Lazy-load: metadados de grupos são buscados sob demanda via RedisGroupCache
    // quando uma mensagem de grupo chega, eliminando o pico de CPU no boot
    initWASocket(whatsapp).then((wbot) => {
      if (wbot?.id) {
        try {
          wbotMessageListener(wbot, companyId);
          wbotMonitor(wbot, whatsapp, companyId);
          logger.info(`[WBOT] Sessão ${whatsapp.name} (${whatsapp.id}) listeners registrados com sucesso.`);
        } catch (listenerErr) {
          logger.error(`[WBOT] Erro ao registrar listeners para sessão ${whatsapp.id}: ${listenerErr}`);
        }
      }
    }).catch((err) => {
      Sentry.captureException(err);
      logger.error(`[WBOT] Erro ao iniciar sessão ${whatsapp.name}: ${err}`);
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  } finally {
    // Libera imediatamente para não bloquear futuras tentativas
    startingSessions.delete(whatsapp.id);
  }
};
