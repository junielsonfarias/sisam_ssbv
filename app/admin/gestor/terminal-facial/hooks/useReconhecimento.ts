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

// #8 EAR (Eye Aspect Ratio) de um olho de 6 pontos (face-api). Olho aberto
// ~0.3; fechado ~0.1. A variacao ao longo do tempo indica piscar (vida) — uma
// foto mantem o EAR praticamente constante.
function calcularEAR(eye: { x: number; y: number }[]): number {
  if (!eye || eye.length < 6) return 0.3
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
  const v1 = dist(eye[1], eye[5])
  const v2 = dist(eye[2], eye[4])
  const h = dist(eye[0], eye[3])
  return h === 0 ? 0.3 : (v1 + v2) / (2 * h)
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
  // #8 Liveness: historico de EAR + se ja detectou "vida" (piscar) para o aluno atual
  const livenessRef = useRef<{ alunoId: string | null; ears: number[]; vivo: boolean }>({ alunoId: null, ears: [], vivo: false })

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
    // #8 Exige prova de vida (piscar) antes de registrar — anti-foto.
    const LIVENESS_ATIVO = true

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
                livenessRef.current = { alunoId: null, ears: [], vivo: false }
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

              // #8 Liveness (anti-foto): acompanha a variacao do EAR. Rosto vivo
              // pisca/move os olhos; uma FOTO mantem o EAR constante. Exige um
              // "piscar" (queda do EAR) na janela recente antes de registrar.
              const lr = livenessRef.current
              if (lr.alunoId !== alunoId) { lr.alunoId = alunoId; lr.ears = []; lr.vivo = false }
              try {
                const earAvg = (calcularEAR(detection.landmarks.getLeftEye()) + calcularEAR(detection.landmarks.getRightEye())) / 2
                lr.ears.push(earAvg)
                if (lr.ears.length > 16) lr.ears.shift()
                if (!lr.vivo && lr.ears.length >= 4) {
                  const maxE = Math.max(...lr.ears), minE = Math.min(...lr.ears)
                  if (maxE - minE >= 0.07 && minE <= 0.21) lr.vivo = true
                }
              } catch { /* landmarks dos olhos indisponiveis neste frame */ }

              // #3 Consistencia temporal: exigir N frames consecutivos do MESMO
              // aluno antes de registrar (mata falso-positivo de 1 frame so).
              if (confirmacoesRef.current.alunoId === alunoId) {
                confirmacoesRef.current.count += 1
              } else {
                confirmacoesRef.current = { alunoId, count: 1 }
              }

              const faltaConfirmar = confirmacoesRef.current.count < CONFIRMACOES_NECESSARIAS
              const faltaVivo = LIVENESS_ATIVO && !lr.vivo
              if (faltaConfirmar || faltaVivo) {
                const box = detection.detection.box
                if (ctx) {
                  const mx = canvasRef.current.width - box.x - box.width
                  const aluno = alunos.find(a => a.aluno_id === alunoId)
                  ctx.strokeStyle = '#3b82f6'
                  ctx.lineWidth = 3
                  ctx.strokeRect(mx, box.y, box.width, box.height)
                  ctx.fillStyle = '#3b82f6'
                  ctx.font = 'bold 14px sans-serif'
                  const msg = faltaVivo ? 'pisque para confirmar' : `confirmando ${confirmacoesRef.current.count}/${CONFIRMACOES_NECESSARIAS}`
                  ctx.fillText(`${aluno?.nome || ''} — ${msg}`, mx, box.y - 5)
                }
                continue
              }
              confirmacoesRef.current = { alunoId: null, count: 0 }
              livenessRef.current = { alunoId: null, ears: [], vivo: false }

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
                    // Liveness ja confirmado (gate #8 acima); informa o servidor.
                    prova_vida: { metodo: 'ear', vivo: true },
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
              livenessRef.current = { alunoId: null, ears: [], vivo: false }
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
    }, 300) // Detectar a cada 300ms (mais responsivo + melhora a deteccao de piscar/#8)
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
