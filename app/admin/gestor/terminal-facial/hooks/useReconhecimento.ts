'use client'

import { useCallback, useRef } from 'react'
import { AlunoEmbedding, RegistroPresenca } from '../types'
import { tocarSom } from '../utils/tocarSom'

interface UseReconhecimentoParams {
  alunos: AlunoEmbedding[]
  config: { confianca_minima: number; cooldown_segundos: number }
  somAtivo: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  faceapiRef: React.MutableRefObject<any>
  setReconhecendo: (v: boolean) => void
  setUnknownCount: React.Dispatch<React.SetStateAction<number>>
  setRegistros: React.Dispatch<React.SetStateAction<RegistroPresenca[]>>
  setMensagem: (v: string) => void
  setMensagemTipo: (v: 'sucesso' | 'info' | 'erro') => void
  setOnline: (v: boolean) => void
}

export function useReconhecimento({
  alunos, config, somAtivo,
  videoRef, canvasRef, faceapiRef,
  setReconhecendo, setUnknownCount, setRegistros,
  setMensagem, setMensagemTipo, setOnline,
}: UseReconhecimentoParams) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownMapRef = useRef<Map<string, number>>(new Map())
  const detectandoRef = useRef(false)

  const iniciarReconhecimento = useCallback(() => {
    if (!faceapiRef.current || !videoRef.current || alunos.length === 0) return

    const faceapi = faceapiRef.current
    const video = videoRef.current

    // Criar LabeledFaceDescriptors para matching (suporta múltiplos descriptors por aluno)
    const labeledDescriptors = alunos.map(aluno =>
      new faceapi.LabeledFaceDescriptors(
        aluno.aluno_id,
        aluno.descriptors.map(d => new Float32Array(d))
      )
    )

    // face-api.js euclidean distance: <0.4 = muito similar, 0.4-0.6 = provável, >0.6 = incerto
    // Antes: 1 - confianca_minima (0.15 para 0.85) era restritivo demais
    const confianca = config.confianca_minima
    const maxDistance = confianca >= 0.9 ? 0.5 : confianca >= 0.85 ? 0.6 : 0.7
    const matcher = new faceapi.FaceMatcher(labeledDescriptors, maxDistance)

    setReconhecendo(true)

    // Loop de detecção
    intervalRef.current = setInterval(async () => {
      if (!video || video.paused || video.ended) return
      if (document.hidden) return // Não processar com tab em background
      if (detectandoRef.current) return // Evitar execução paralela
      detectandoRef.current = true

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.65 }))
          .withFaceLandmarks(true)
          .withFaceDescriptors()

        // Desenhar no canvas
        if (canvasRef.current) {
          const dims = faceapi.matchDimensions(canvasRef.current, video, true)
          const resized = faceapi.resizeResults(detections, dims)

          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          }

          // Para cada rosto detectado
          for (const detection of resized) {
            const match = matcher.findBestMatch(detection.descriptor)

            if (match.label !== 'unknown') {
              const alunoId = match.label
              const confianca = 1 - match.distance

              // Verificar cooldown
              const agora = Date.now()
              const ultimoRegistro = cooldownMapRef.current.get(alunoId) || 0
              const cooldownMs = config.cooldown_segundos * 1000

              if (agora - ultimoRegistro < cooldownMs) {
                // Já registrado — desenhar em amarelo
                const box = detection.detection.box
                if (ctx) {
                  ctx.strokeStyle = '#facc15'
                  ctx.lineWidth = 3
                  ctx.strokeRect(box.x, box.y, box.width, box.height)
                  const aluno = alunos.find(a => a.aluno_id === alunoId)
                  ctx.fillStyle = '#facc15'
                  ctx.font = 'bold 14px sans-serif'
                  ctx.fillText(`${aluno?.nome || ''} (já registrado)`, box.x, box.y - 5)
                }
                continue
              }

              // Reset unknown counter on successful recognition
              setUnknownCount(0)

              // Registrar presença
              cooldownMapRef.current.set(alunoId, agora)
              const aluno = alunos.find(a => a.aluno_id === alunoId)

              // Desenhar em verde
              const box = detection.detection.box
              if (ctx) {
                ctx.strokeStyle = '#22c55e'
                ctx.lineWidth = 3
                ctx.strokeRect(box.x, box.y, box.width, box.height)
                ctx.fillStyle = '#22c55e'
                ctx.font = 'bold 16px sans-serif'
                ctx.fillText(`${aluno?.nome || ''} ✓`, box.x, box.y - 5)
              }

              // Enviar para API
              const hora = new Date().toLocaleTimeString('pt-BR')
              try {
                const res = await fetch('/api/admin/facial/presenca-terminal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    aluno_id: alunoId,
                    timestamp: new Date().toISOString(),
                    confianca: Math.round(confianca * 10000) / 10000,
                  }),
                })

                if (res.ok) {
                  const resData = await res.json()
                  const tipo = resData.tipo || 'entrada'
                  setRegistros(prev => [{
                    aluno_id: alunoId,
                    nome: aluno?.nome || 'Desconhecido',
                    tipo: tipo as 'entrada' | 'saida',
                    hora,
                    confianca,
                  }, ...prev].slice(0, 50))

                  setMensagem(`${aluno?.nome} — ${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada!`)
                  setMensagemTipo('sucesso')
                  setOnline(true)

                  if (somAtivo) tocarSom('sucesso')
                } else {
                  setMensagem(`${aluno?.nome} — Erro ao registrar`)
                  setMensagemTipo('erro')
                }
              } catch {
                // Offline — salvar localmente
                const regOffline: RegistroPresenca = {
                  aluno_id: alunoId,
                  nome: aluno?.nome || 'Desconhecido',
                  tipo: 'entrada' as const,
                  hora,
                  confianca,
                }
                setRegistros(prev => [regOffline, ...prev].slice(0, 50))

                setMensagem(`${aluno?.nome} — Salvo offline`)
                setMensagemTipo('info')
                setOnline(false)
              }

              // Limpar mensagem após 4 segundos
              setTimeout(() => setMensagem(''), 4000)
            } else {
              // Desconhecido — desenhar em vermelho
              const box = detection.detection.box
              if (ctx) {
                ctx.strokeStyle = '#ef4444'
                ctx.lineWidth = 2
                ctx.strokeRect(box.x, box.y, box.width, box.height)
              }
              // Track consecutive unknown detections
              setUnknownCount(prev => {
                const next = prev + 1
                if (next === 6) {
                  setMensagem('Rosto não reconhecido detectado frequentemente. Considere cadastrar novos alunos.')
                  setMensagemTipo('info')
                  setTimeout(() => setMensagem(''), 6000)
                }
                return next
              })
            }
          }
        }
      } catch (err) {
        // Erro silencioso no loop de detecção
      } finally {
        detectandoRef.current = false
      }
    }, 500) // Detectar a cada 500ms
  }, [alunos, config.confianca_minima, config.cooldown_segundos, somAtivo,
      videoRef, canvasRef, faceapiRef, setReconhecendo, setUnknownCount,
      setRegistros, setMensagem, setMensagemTipo, setOnline])

  const pararReconhecimento = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setReconhecendo(false)
  }, [setReconhecendo])

  return { iniciarReconhecimento, pararReconhecimento }
}
