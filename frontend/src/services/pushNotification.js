import api from "../services/api";

// Converte base64 URL-safe para Uint8Array (necessário para applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
  try {
    // Verificar suporte
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[PUSH] Push notifications não suportadas neste navegador");
      return false;
    }

    // Pedir permissão
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[PUSH] Permissão de notificação negada");
      return false;
    }

    // Buscar VAPID public key do backend
    const { data } = await api.get("/push/vapid-public-key");
    if (!data.publicKey) {
      console.warn("[PUSH] VAPID public key não configurada no servidor");
      return false;
    }

    // Aguardar service worker ficar pronto
    const registration = await navigator.serviceWorker.ready;

    // Verificar se já existe uma subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Criar nova subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    // Enviar subscription para o backend
    const subscriptionJSON = subscription.toJSON();
    await api.post("/push/subscribe", {
      endpoint: subscriptionJSON.endpoint,
      keys: {
        p256dh: subscriptionJSON.keys.p256dh,
        auth: subscriptionJSON.keys.auth,
      },
    });

    console.log("[PUSH] Subscription criada com sucesso!");
    return true;
  } catch (err) {
    console.error("[PUSH] Erro ao criar subscription:", err);
    return false;
  }
}

export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api.post("/push/unsubscribe", {
        endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
      console.log("[PUSH] Unsubscribed com sucesso");
    }
    return true;
  } catch (err) {
    console.error("[PUSH] Erro ao cancelar subscription:", err);
    return false;
  }
}

export async function isPushSubscribed() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
