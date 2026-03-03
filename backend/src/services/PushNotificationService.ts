// @ts-ignore
import * as webpush from "web-push";
import PushSubscription from "../models/PushSubscription";
import logger from "../utils/logger";

// As VAPID keys devem ser configuradas via variáveis de ambiente
// Gere com: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@multiflow.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info("[PUSH] VAPID keys configuradas com sucesso");
} else {
  logger.warn("[PUSH] VAPID keys não configuradas. Push notifications desabilitadas. Gere com: npx web-push generate-vapid-keys");
}

export const getVapidPublicKey = (): string => {
  return VAPID_PUBLIC_KEY;
};

interface SubscribeData {
  userId: number;
  companyId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export const subscribeUser = async (data: SubscribeData): Promise<PushSubscription> => {
  // Remover subscription duplicada pelo endpoint
  await PushSubscription.destroy({
    where: { endpoint: data.endpoint }
  });

  const subscription = await PushSubscription.create({
    userId: data.userId,
    companyId: data.companyId,
    endpoint: data.endpoint,
    p256dh: data.p256dh,
    auth: data.auth,
    userAgent: data.userAgent || null
  });

  logger.info(`[PUSH] Subscription criada para userId=${data.userId}`);
  return subscription;
};

export const unsubscribeUser = async (endpoint: string): Promise<void> => {
  await PushSubscription.destroy({
    where: { endpoint }
  });
  logger.info(`[PUSH] Subscription removida: ${endpoint.substring(0, 50)}...`);
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  ticketId?: number;
}

export const sendPushToUser = async (userId: number, companyId: number, payload: PushPayload): Promise<void> => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return; // Push não configurado
  }

  const subscriptions = await PushSubscription.findAll({
    where: { userId, companyId }
  });

  if (subscriptions.length === 0) return;

  const pushPayload = JSON.stringify(payload);

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        pushPayload
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expirada ou inválida, remover
        logger.info(`[PUSH] Removendo subscription expirada para userId=${userId}`);
        await sub.destroy();
      } else {
        logger.error(`[PUSH] Erro ao enviar push para userId=${userId}: statusCode=${err.statusCode}, message=${err.message}, body=${JSON.stringify(err.body || {})}`);
      }
    }
  });

  await Promise.allSettled(sendPromises);
};

export const sendPushToCompanyUsers = async (
  companyId: number,
  userIds: number[],
  payload: PushPayload
): Promise<void> => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const promises = userIds.map(userId => sendPushToUser(userId, companyId, payload));
  await Promise.allSettled(promises);
};
