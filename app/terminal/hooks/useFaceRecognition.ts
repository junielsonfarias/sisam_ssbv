'use client'

import { useEffect, useRef } from 'react'
import { registrarPresenca } from '@/lib/terminal-db'
import type { AlunoEmMemoria, Fase, RegistroLocal } from '../types'

interface UseFaceRecognitionParams {
  fase: Fase
  cameraAtiva: boolean
  faceapiRef: React.MutableRefObject<any>
  alunos: AlunoEmMemoria[]
  confianca: number
  cooldown: number
  somAtivo: boolean
  serverUrl: string
  token: string
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  setReconhecendo: (v: boolean) => void
  setRegistros: React.Dispatch<React.SetStateAction<RegistroLocal[]>>
  setUltimoAlunoNome: (v: string) => void
  setUltimoAlunoInfo: (v: string) => void
  setUltimoAlunoHora: (v: string) => void
  setConfirmacaoTipo: (v: 'entrada' | 'ja_registrado') => void
  setMostrarConfirmacao: (v: boolean) => void
  setPendentesSync: React.Dispatch<React.SetStateAction<number>>
}

export function useFaceRecognition({
  fase, cameraAtiva, faceapiRef, alunos, confianca, cooldown, somAtivo,
  serverUrl, token, videoRef, canvasRef,
  setReconhecendo, setRegistros, setUltimoAlunoNome, setUltimoAlunoInfo,
  setUltimoAlunoHora, setConfirmacaoTipo, setMostrarConfirmacao, setPendentesSync,
}: UseFaceRecognitionParams) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownMapRef = useRef<Map<string, number>>(new Map())
  const confirmacaoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const detectandoRef = useRef(false)

  useEffect(() => {
    if (fase !== 'terminal' || !cameraAtiva || !faceapiRef.current || alunos.length === 0) {
      if (fase === 'terminal') {
        console.warn('[FaceRecognition] Não iniciou:', {
          cameraAtiva, faceapi: !!faceapiRef.current, alunos: alunos.length,
        })
      }
      return
    }

    const faceapi = faceapiRef.current

    // Clonar descriptors para evitar corrupção de referência
    const labeledDescriptors = alunos.map(a =>
      new faceapi.LabeledFaceDescriptors(a.aluno_id, [new Float32Array(a.descriptor)])
    )
    // Thresholds ajustados para webcam com iluminação variável
    // face-api.js euclidean distance: <0.4 = muito similar, 0.4-0.6 = provável, >0.6 = incerto
    const maxDistance = confianca >= 0.9 ? 0.5 : confianca >= 0.85 ? 0.6 : 0.7
    const matcher = new faceapi.FaceMatcher(labeledDescriptors, maxDistance)

    console.info(`[FaceRecognition] Matcher criado: ${alunos.length} aluno(s), maxDistance=${maxDistance}`)

    setReconhecendo(true)

    // Sincronizar canvas com dimensoes do video
    const video = videoRef.current
    if (video && canvasRef.current && video.videoWidth && video.videoHeight) {
      faceapi.matchDimensions(canvasRef.current, { width: video.videoWidth, height: video.videoHeight })
    }

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused) return
      if (document.hidden) return
      if (detectandoRef.current) return
      if (videoRef.current.readyState < 2) return

      detectandoRef.current = true

      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!canvas) return

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)
          .withFaceDescriptors()

        const dims = { width: video.videoWidth, height: video.videoHeight }
        const resized = faceapi.resizeResults(detections, dims)

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        for (const det of resized) {
          const match = matcher.findBestMatch(det.descriptor)
          const box = det.detection.box

          if (match.label !== 'unknown') {
            const alunoId = match.label
            const conf = 1 - match.distance
            const aluno = alunos.find(a => a.aluno_id === alunoId)

            const ultimoRegistro = cooldownMapRef.current.get(alunoId)
            const agora = Date.now()
            const emCooldown = ultimoRegistro && (agora - ultimoRegistro) < cooldown * 1000

            const cor = emCooldown ? '#eab308' : '#10b981'
            ctx.strokeStyle = cor
            ctx.lineWidth = 3
            ctx.strokeRect(box.x, box.y, box.width, box.height)

            const nome = aluno?.nome || alunoId
            const info = [aluno?.turma_codigo, aluno?.serie ? `${aluno.serie}º Ano` : ''].filter(Boolean).join(' - ')

            ctx.font = 'bold 15px sans-serif'
            const nomeW = ctx.measureText(nome).width
            ctx.font = '12px sans-serif'
            const infoW = info ? ctx.measureText(info).width : 0
            const labelW = Math.max(nomeW, infoW) + 20
            const labelH = info ? 42 : 26

            ctx.fillStyle = cor
            ctx.fillRect(box.x, box.y - labelH - 4, labelW, labelH)
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 15px sans-serif'
            ctx.fillText(nome, box.x + 10, box.y - (info ? 24 : 10))
            if (info) {
              ctx.font = '12px sans-serif'
              ctx.fillStyle = 'rgba(255,255,255,0.85)'
              ctx.fillText(info, box.x + 10, box.y - 8)
            }

            if (!emCooldown && aluno) {
              cooldownMapRef.current.set(alunoId, agora)

              const timestamp = new Date().toISOString()
              const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              let tipo: 'entrada' | 'ja_registrado' = 'entrada'

              let salvoNoServidor = false
              if (navigator.onLine) {
                try {
                  const baseUrl = serverUrl || window.location.origin
                  const res = await fetch(`${baseUrl}/api/admin/facial/presenca-terminal`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ aluno_id: alunoId, timestamp, confianca: conf }),
                  })
                  if (res.ok) {
                    const data = await res.json()
                    salvoNoServidor = true
                    if (data.tipo === 'saida') tipo = 'ja_registrado'
                  }
                } catch {
                  // Expected: network failure in offline mode, presence saved locally
                }
              }

              if (!salvoNoServidor) {
                await registrarPresenca({ aluno_id: alunoId, nome: aluno.nome, timestamp, confianca: conf })
                setPendentesSync(prev => prev + 1)
              }

              setRegistros(prev => [{ aluno_id: alunoId, nome: aluno.nome, tipo: tipo === 'ja_registrado' ? 'saida' as const : 'entrada' as const, hora, confianca: conf }, ...prev].slice(0, 50))

              setUltimoAlunoNome(aluno.nome)
              setUltimoAlunoInfo([aluno.turma_codigo, aluno.serie ? `${aluno.serie}º Ano` : ''].filter(Boolean).join(' — '))
              setUltimoAlunoHora(`${hora}${salvoNoServidor ? '' : ' (offline)'}`)
              setConfirmacaoTipo(tipo)
              setMostrarConfirmacao(true)
              if (confirmacaoTimeoutRef.current) clearTimeout(confirmacaoTimeoutRef.current)
              confirmacaoTimeoutRef.current = setTimeout(() => setMostrarConfirmacao(false), 3000)

              if (somAtivo) {
                try {
                  const audioCtx = new AudioContext()
                  const osc = audioCtx.createOscillator()
                  osc.frequency.value = tipo === 'ja_registrado' ? 440 : 880
                  osc.connect(audioCtx.destination)
                  osc.start()
                  setTimeout(() => { osc.stop(); audioCtx.close() }, tipo === 'ja_registrado' ? 300 : 150)
                } catch {
                  // Expected: AudioContext not supported in all browsers
                }
              }
            }
          } else {
            ctx.strokeStyle = '#ef4444'
            ctx.lineWidth = 2
            ctx.strokeRect(box.x, box.y, box.width, box.height)
            const label = 'Nao cadastrado'
            ctx.font = 'bold 14px sans-serif'
            const tw = ctx.measureText(label).width
            ctx.fillStyle = 'rgba(239,68,68,0.85)'
            ctx.fillRect(box.x, box.y - 24, tw + 12, 22)
            ctx.fillStyle = '#fff'
            ctx.fillText(label, box.x + 6, box.y - 8)
          }
        }
      } catch (err) {
        console.warn('[FaceRecognition] Erro no loop de detecção:', (err as Error).message)
      } finally {
        detectandoRef.current = false
      }
    }, 500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setReconhecendo(false)
    }
  }, [fase, cameraAtiva, alunos, confianca, cooldown, somAtivo])
}
