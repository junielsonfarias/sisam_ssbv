/**
 * Firebase Client SDK — Inicialização para Push Notifications
 *
 * Requer variáveis de ambiente NEXT_PUBLIC_FIREBASE_*
 * Configurar no Firebase Console > Project Settings > Web App
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

/** Retorna true se Firebase está configurado (variáveis de ambiente existem) */
export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId)
}

/** Inicializa Firebase App (singleton) */
export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
}

/** Solicita permissão de notificação e retorna o token FCM */
export async function solicitarTokenPush(): Promise<string | null> {
  try {
    if (!isFirebaseConfigured()) return null

    const supported = await isSupported()
    if (!supported) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const app = getFirebaseApp()
    if (!app) return null

    const messaging = getMessaging(app)
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
    })

    return token || null
  } catch (error) {
    console.warn('[Firebase] Erro ao solicitar token push:', error)
    return null
  }
}

/** Registra listener para mensagens em foreground */
export function ouvirMensagensForeground(callback: (payload: any) => void): (() => void) | null {
  try {
    if (!isFirebaseConfigured()) return null

    const app = getFirebaseApp()
    if (!app) return null

    const messaging = getMessaging(app)
    const unsubscribe = onMessage(messaging, (payload) => {
      callback(payload)
    })

    return unsubscribe
  } catch {
    return null
  }
}
