'use client'

import { useEffect, useRef } from 'react'
import type { Fase, StatusModelo } from '../types'

interface UseCameraParams {
  fase: Fase
  statusModelo: StatusModelo
  alunosCount: number
  cameraAtiva: boolean
  setCameraAtiva: (v: boolean) => void
  setMensagem: (m: string) => void
  setMensagemTipo: (t: 'sucesso' | 'info' | 'erro') => void
  videoRef: React.RefObject<HTMLVideoElement>
  streamRef: React.MutableRefObject<MediaStream | null>
}

export function useCamera({
  fase, statusModelo, alunosCount, cameraAtiva, setCameraAtiva,
  setMensagem, setMensagemTipo, videoRef, streamRef,
}: UseCameraParams) {
  const wakeLockRef = useRef<any>(null)

  // AUTO-START CAMERA ao entrar no terminal
  useEffect(() => {
    if (fase !== 'terminal' || cameraAtiva || statusModelo !== 'pronto' || alunosCount === 0) return

    const iniciarCameraAuto = async () => {
      // Parar stream anterior se existir
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      try {
        // Tentar camera frontal primeiro, fallback para qualquer camera
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true })
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraAtiva(true)
      } catch (err: any) {
        console.error('[Camera] Erro:', err?.name, err?.message)
        const msg = err?.name === 'NotAllowedError'
          ? 'Camera bloqueada. Permita o acesso nas configuracoes do navegador.'
          : err?.name === 'NotFoundError'
          ? 'Nenhuma camera encontrada neste dispositivo.'
          : err?.name === 'NotReadableError'
          ? 'Camera em uso por outro aplicativo.'
          : `Erro ao acessar camera: ${err?.name || err?.message || 'desconhecido'}`
        setMensagem(msg)
        setMensagemTipo('erro')
      }
    }

    iniciarCameraAuto()
  }, [fase, statusModelo, alunosCount])

  // WAKE LOCK - Impedir tela de apagar
  useEffect(() => {
    if (fase !== 'terminal') return

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch { /* Nao suportado */ }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }

    requestWakeLock()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {})
    }
  }, [fase])
}
