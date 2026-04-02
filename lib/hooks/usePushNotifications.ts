'use client'

import { useEffect, useRef } from 'react'
import { isFirebaseConfigured, solicitarTokenPush, ouvirMensagensForeground } from '@/lib/firebase/client'

/**
 * Hook para gerenciar push notifications.
 * Solicita permissão e registra token FCM no servidor.
 * Escuta mensagens em foreground para exibir toast.
 *
 * Uso: chamar em layouts autenticados (professor, responsavel, admin)
 */
export function usePushNotifications(onMensagem?: (titulo: string, corpo: string) => void) {
  const registrado = useRef(false)

  useEffect(() => {
    if (registrado.current) return
    if (!isFirebaseConfigured()) return
    if (typeof window === 'undefined') return

    const registrar = async () => {
      try {
        // Solicitar token (pede permissão se necessário)
        const token = await solicitarTokenPush()
        if (!token) return

        // Detectar navegador
        const ua = navigator.userAgent
        const navegador = ua.includes('Chrome') ? 'Chrome' :
          ua.includes('Firefox') ? 'Firefox' :
          ua.includes('Safari') ? 'Safari' : 'Outro'

        // Registrar no servidor
        await fetch('/api/push/registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token, plataforma: 'web', navegador }),
        })

        registrado.current = true
      } catch {
        // Permissão negada ou erro — falha silenciosa
      }
    }

    // Atrasar 3s para não atrapalhar o carregamento inicial
    const timer = setTimeout(registrar, 3000)

    // Listener de mensagens em foreground
    const unsubscribe = ouvirMensagensForeground((payload) => {
      const { title, body } = payload.notification || {}
      if (onMensagem && title) {
        onMensagem(title, body || '')
      }
    })

    return () => {
      clearTimeout(timer)
      if (unsubscribe) unsubscribe()
    }
  }, [onMensagem])
}
