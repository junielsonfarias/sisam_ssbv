/**
 * Firebase Messaging Service Worker
 * Recebe push notifications quando o app esta em background
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js')

// Config sera injetada via env vars no build
// Por enquanto usa placeholder — substituir quando configurar Firebase
firebase.initializeApp({
  apiKey: 'PLACEHOLDER',
  authDomain: 'PLACEHOLDER',
  projectId: 'PLACEHOLDER',
  storageBucket: 'PLACEHOLDER',
  messagingSenderId: 'PLACEHOLDER',
  appId: 'PLACEHOLDER',
})

const messaging = firebase.messaging()

// Background message handler
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}

  const notificationOptions = {
    body: body || 'Nova notificacao do SISAM',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.data?.tipo || 'sisam-notification',
    data: {
      url: payload.data?.link || payload.fcmOptions?.link || '/',
      ...payload.data,
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
  }

  self.registration.showNotification(
    title || 'SISAM',
    notificationOptions
  )
})

// Click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se ja tem uma aba aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Se nao, abre nova aba
      return clients.openWindow(url)
    })
  )
})
