'use client'

import { useCallback, useRef } from 'react'
import { AlunoEmbedding, RegistroPresenca } from '../types'
import { tocarSom } from '../utils/tocarSom'

// Distancia euclidiana entre dois descritores de 128 dimensoes.
function distanciaEuclidiana(a: Float32Array, b: Float32Array): number {
  let soma = 0
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; soma += d * d }
  return Math.sqrt(soma)
}

// #1 Normaliza o descritor para norma unitaria — DEVE casar com a normalizacao
// feita no cadastro (concatenarDescriptors), senao a distancia fica inconsistente.
function normalizarDescritor(d: Float32Array): Float32Array {
  let norma = 0
  for (let i = 0; i < d.length; i++) norma += d[i] * d[i]
  norma = Math.sqrt(norma)
  if (norma === 0) return d
  const out = new Float32Array(d.length)
  for (let i = 0; i < d.length; i++) out[i] = d[i] / norma
  return out
}

// Melhor e segundo-melhor match (distancia minima por aluno, sobre seus 3
// descritores). O segundo serve para o #4 ratio test (margem).
function melhorMatch(desc: Float32Array, labeled: any[]): { bestLabel: string; bestDist: number; secondDist: number } {
  let bestLabel = 'unknown', bestDist = Infinity, secondDist = Infinity
  for (const ld of labeled) {
    let dmin = Infinity
    for (const d of ld.descriptors) {
      const dist = distanciaEuclidiana(desc, d)
      if (dist < dmin) dmin = dist
    }
    if (dmin < bestDist) { secondDist = bestDist; bestDist = dmin; bestLabel = ld.label }
    else if (dmin < secondDist) { secondDist = dmin }
  }
  return { bestLabel, bestDist, secondDist }
}

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
  // #3 Quantos frames consecutivos do MESMO aluno ja confirmaram
  const confirmacoesRef = useRef<{ alunoId: string | null; count: number }>({ alunoId: null, count: 0 })

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
    // #4 Margem minima entre o melhor e o 2o melhor match (evita trocar alunos
    // parecidos). #3 frames consecutivos para confirmar antes de registrar.
    const MARGEM_MINIMA = 0.05
    const CONFIRMACOES_NECESSARIAS = 3

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
            // #1 normaliza o descritor vivo + #4 match com ratio test (margem)
            const descNorm = normalizarDescritor(detection.descriptor)
            const { bestLabel, bestDist, secondDist } = melhorMatch(descNorm, labeledDescriptors)
            const reconhecido = bestLabel !== 'unknown'
              && bestDist <= maxDistance
              && (secondDist - bestDist) >= MARGEM_MINIMA

            if (reconhecido) {
              const alunoId = bestLabel
              const confianca = 1 - bestDist

              // Verificar cooldown
              const agora = Date.now()
              const ultimoRegistro = cooldownMapRef.current.get(alunoId) || 0
              const cooldownMs = config.cooldown_segundos * 1000

              if (agora - ultimoRegistro < cooldownMs) {
                // Já registrado — desenhar em amarelo
                confirmacoesRef.current = { alunoId: null, count: 0 }
                const box = detection.detection.box
                if (ctx) {
                  // O vídeo é espelhado (selfie); espelhamos só o X do box/texto
                  // para alinhar com a imagem, mantendo o texto legível.
                  const mx = canvasRef.current.width - box.x - box.width
                  ctx.strokeStyle = '#facc15'
                  ctx.lineWidth = 3
                  ctx.strokeRect(mx, box.y, box.width, box.height)
                  const aluno = alunos.find(a => a.aluno_id === alunoId)
                  ctx.fillStyle = '#facc15'
                  ctx.font = 'bold 14px sans-serif'
                  ctx.fillText(`${aluno?.nome || ''} (já registrado)`, mx, box.y - 5)
                }
                continue
              }

              // Reset unknown counter on successful recognition
              setUnknownCount(0)

              // #3 Consistencia temporal: exigir N frames consecutivos do MESMO
              // aluno antes de registrar (mata falso-positivo de 1 frame so).
              if (confirmacoesRef.current.alunoId === alunoId) {
                confirmacoesRef.current.count += 1
              } else {
                confirmacoesRef.current = { alunoId, count: 1 }
              }
              if (confirmacoesRef.current.count < CONFIRMACOES_NECESSARIAS) {
                const box = detection.detection.box
                if (ctx) {
                  const mx = canvasRef.current.width - box.x - box.width
                  const aluno = alunos.find(a => a.aluno_id === alunoId)
                  ctx.strokeStyle = '#3b82f6'
                  ctx.lineWidth = 3
                  ctx.strokeRect(mx, box.y, box.width, box.height)
                  ctx.fillStyle = '#3b82f6'
                  ctx.font = 'bold 14px sans-serif'
                  ctx.fillText(`${aluno?.nome || ''} — confirmando ${confirmacoesRef.current.count}/${CONFIRMACOES_NECESSARIAS}`, mx, box.y - 5)
                }
                continue
              }
              confirmacoesRef.current = { alunoId: null, count: 0 }

              // Registrar presença
              cooldownMapRef.current.set(alunoId, agora)
              const aluno = alunos.find(a => a.aluno_id === alunoId)

              // Desenhar em verde
              const box = detection.detection.box
              if (ctx) {
                const mx = canvasRef.current.width - box.x - box.width
                ctx.strokeStyle = '#22c55e'
                ctx.lineWidth = 3
                ctx.strokeRect(mx, box.y, box.width, box.height)
                ctx.fillStyle = '#22c55e'
                ctx.font = 'bold 16px sans-serif'
                ctx.fillText(`${aluno?.nome || ''} ✓`, mx, box.y - 5)
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
              // Desconhecido (ou margem insuficiente) — desenhar em vermelho
              confirmacoesRef.current = { alunoId: null, count: 0 }
              const box = detection.detection.box
              if (ctx) {
                const mx = canvasRef.current.width - box.x - box.width
                ctx.strokeStyle = '#ef4444'
                ctx.lineWidth = 2
                ctx.strokeRect(mx, box.y, box.width, box.height)
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
