'use client'

import { useEffect, useRef } from 'react'
import {
  contarPresencasPendentes, sincronizarPresencas, limparPresencasEnviadas,
} from '@/lib/terminal-db'
import type { Fase } from '../types'

interface UseSyncParams {
  fase: Fase
  token: string
  serverUrl: string
  setPendentesSync: React.Dispatch<React.SetStateAction<number>>
  sincronizando: boolean
  setSincronizando: (v: boolean) => void
}

export function useSync({
  fase, token, serverUrl, setPendentesSync, sincronizando, setSincronizando,
}: UseSyncParams) {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sincronizandoRef = useRef(false)

  useEffect(() => {
    if (fase !== 'terminal') return

    const sync = async () => {
      if (!navigator.onLine || !token || sincronizandoRef.current) return
      const count = await contarPresencasPendentes()
      if (count === 0) {
        setPendentesSync(0)
        return
      }

      sincronizandoRef.current = true
      setSincronizando(true)
      try {
        const result = await sincronizarPresencas(serverUrl || window.location.origin, token)
        if (result.enviados > 0) {
          await limparPresencasEnviadas()
        }
      } catch (err) {
        console.warn('[Sync] Falha na sincronização, retry no próximo ciclo:', (err as Error).message)
      }
      setPendentesSync(await contarPresencasPendentes())
      sincronizandoRef.current = false
      setSincronizando(false)
    }

    // Sync a cada 30 segundos
    syncIntervalRef.current = setInterval(sync, 30000)
    sync() // Sync imediato ao entrar no terminal

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [fase, token, serverUrl])
}
