// Service Worker para Web Push Notifications - MultiFLOW
const CACHE_NAME = 'multiflow-v1';

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker instalado');
  self.skipWaiting();
});

// Ativação
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

// Receber Push Notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);

  let data = {
    title: 'MultiFLOW',
    body: 'Nova mensagem recebida',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: 'default',
    url: '/'
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('[SW] Erro ao parsear dados do push:', e);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/favicon-32x32.png',
    tag: data.tag || 'default',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      ticketId: data.ticketId
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event.notification.tag);
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma janela aberta, focar nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (event.notification.data?.ticketId) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              ticketId: event.notification.data.ticketId,
              url: urlToOpen
            });
          }
          return;
        }
      }
      // Se não, abrir nova janela
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada');
});
