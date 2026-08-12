// Web Push Service Worker for Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA9heNRcUmey1lY2_UGSCuZrdViksKoG2E',
  appId: '1:356514741847:web:056ced79df340a9c4dad12',
  messagingSenderId: '356514741847',
  projectId: 'anaadapp',
  authDomain: 'anaadapp.firebaseapp.com',
  storageBucket: 'anaadapp.firebasestorage.app',
  measurementId: 'G-0FD3CY2PWG',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const title = payload.data?.title || payload.notification?.title || 'Anaad Foods';
  const body = payload.data?.body || payload.notification?.body || 'New update';
  const metadata = payload.data || {};

  // Suppress silent sync/update messages (e.g. read/dismiss sync events)
  if (payload.data?.event_type === 'NOTIFICATION_READ' || payload.data?.event_type === 'NOTIFICATION_DISMISSED') {
    return;
  }

  const notificationOptions = {
    body: body,
    icon: '/assets/favicon.ico',
    data: metadata,
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Click handler for deep linking on Web
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  
  let targetPath = '/notifications';
  if (data) {
    if (data.type === 'order' || data.screen === 'order_tracking') {
      const orderId = data.order_id || data.id;
      if (orderId) targetPath = `/order/${orderId}`;
    } else if (data.type === 'product' || data.screen === 'product_detail') {
      const productId = data.product_id || data.id;
      if (productId) targetPath = `/product/${productId}`;
    } else if (data.type === 'subscription' || data.screen === 'subscription_detail') {
      const subId = data.subscription_id || data.id;
      if (subId) targetPath = `/subscription/${subId}`;
    }
  }

  const urlToOpen = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Find an existing tab and navigate it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ action: 'navigate', path: targetPath });
          return client.focus();
        }
      }
      // Or open a new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
