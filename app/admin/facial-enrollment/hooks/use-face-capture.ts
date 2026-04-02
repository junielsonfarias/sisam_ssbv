'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useToast } from '@/components/toast'
import {
  PoseType, PoseCapture, POSES, TAMANHO_MINIMO_ROSTO,
  AMOSTRAS_POR_POSE, QUALIDADE_MINIMA, AUTO_CAPTURA_DELAY_MS,
} from '../types'

export interface IluminacaoInfo {
  nivel: number       // 0-255
  status: 'escuro' | 'bom' | 'claro'
  mensagem: string
}

export function useFaceCapture(onSaved: () => void) {
  const toast = useToast()

  const [capturaAlunoId, setCapturaAlunoId] = useState<string | null>(null)
  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [modelosCarregados, setModelosCarregados] = useState(false)
  const [carregandoModelos, setCarregandoModelos] = useState(false)
  const [faceDetectada, setFaceDetectada] = useState(false)
  const [qualidadeFace, setQualidadeFace] = useState(0)
  const [tamanhoRosto, setTamanhoRosto] = useState(0)
  const [anguloDetectado, setAnguloDetectado] = useState<PoseType | null>(null)
  const [enviandoEmbed, setEnviandoEmbed] = useState(false)
  const [capturaStatus, setCapturaStatus] = useState<'aguardando' | 'detectando' | 'capturado' | 'enviando'>('aguardando')
  const [poseAtual, setPoseAtual] = useState<number>(0)
  const [posesCapturadas, setPosesCapturadas] = useState<Record<PoseType, PoseCapture | null>>({
    frontal: null, esquerda: null, direita: null
  })
  const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('user')
  const [iluminacao, setIluminacao] = useState<IluminacaoInfo>({ nivel: 128, status: 'bom', mensagem: '' })
  const [autoCapturaProg, setAutoCapturaProg] = useState(0) // 0-100 progresso da auto-captura

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceapiRef = useRef<any>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const poseBufferRef = useRef<{ descriptor: Float32Array; score: number }[]>([])
  const autoCapturaTimerRef = useRef<number | null>(null) // timestamp inicio condições boas
  const detectandoRef = useRef(false)

  const poseConfig = POSES[poseAtual] || POSES[0]
  const todasPosesCapturadas = POSES.every(p => posesCapturadas[p.key] !== null)
  const posesConcluidasCount = POSES.filter(p => posesCapturadas[p.key] !== null).length

  // Carregar modelos face-api.js
  const carregarModelos = async () => {
    if (modelosCarregados) return
    setCarregandoModelos(true)
    try {
      const faceapi = await import('@vladmandic/face-api')
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models/face-api')
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models/face-api')
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models/face-api')
      faceapiRef.current = faceapi
      setModelosCarregados(true)
    } catch {
      toast.error('Erro ao carregar modelos de reconhecimento facial')
    } finally {
      setCarregandoModelos(false)
    }
  }

  // Analisar iluminacao do video
  const analisarIluminacao = (video: HTMLVideoElement): IluminacaoInfo => {
    const tempCanvas = document.createElement('canvas')
    const size = 64 // amostra pequena para performance
    tempCanvas.width = size
    tempCanvas.height = size
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) return { nivel: 128, status: 'bom', mensagem: '' }

    ctx.drawImage(video, 0, 0, size, size)
    const imageData = ctx.getImageData(0, 0, size, size)
    const data = imageData.data

    let totalBrightness = 0
    for (let i = 0; i < data.length; i += 4) {
      // Luminancia percebida (ITU-R BT.709)
      totalBrightness += data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722
    }
    const avgBrightness = totalBrightness / (size * size)

    if (avgBrightness < 60) return { nivel: Math.round(avgBrightness), status: 'escuro', mensagem: 'Ambiente muito escuro — melhore a iluminacao' }
    if (avgBrightness > 210) return { nivel: Math.round(avgBrightness), status: 'claro', mensagem: 'Luz muito forte — evite luz direta no rosto' }
    return { nivel: Math.round(avgBrightness), status: 'bom', mensagem: '' }
  }

  // Detectar angulo do rosto via landmarks
  const detectarAngulo = (landmarks: any): PoseType => {
    const nose = landmarks.getNose()
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()

    if (!nose?.length || !leftEye?.length || !rightEye?.length) return 'frontal'

    const noseTip = nose[3]
    const leftEyeCenter = { x: leftEye.reduce((s: number, p: any) => s + p.x, 0) / leftEye.length }
    const rightEyeCenter = { x: rightEye.reduce((s: number, p: any) => s + p.x, 0) / rightEye.length }
    const eyeCenter = (leftEyeCenter.x + rightEyeCenter.x) / 2
    const eyeWidth = Math.abs(rightEyeCenter.x - leftEyeCenter.x)

    const desvio = (noseTip.x - eyeCenter) / eyeWidth

    if (desvio < -0.15) return 'esquerda'
    if (desvio > 0.15) return 'direita'
    return 'frontal'
  }

  // Executar auto-captura quando buffer estiver cheio
  const executarAutoCaptura = useCallback(() => {
    if (poseBufferRef.current.length < AMOSTRAS_POR_POSE) return
    if (!videoRef.current) return

    const descriptors = poseBufferRef.current.map(s => s.descriptor)
    const medianaDescriptor = calcularMedianaDescriptors(descriptors)
    const melhorScore = Math.max(...poseBufferRef.current.map(s => s.score))

    const video = videoRef.current
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = video.videoWidth
    tempCanvas.height = video.videoHeight
    const tempCtx = tempCanvas.getContext('2d')
    let foto = ''
    if (tempCtx) {
      tempCtx.drawImage(video, 0, 0)
      foto = tempCanvas.toDataURL('image/jpeg', 0.7)
    }

    const poseKey = POSES[poseAtual]?.key
    if (!poseKey) return

    setPosesCapturadas(prev => ({ ...prev, [poseKey]: { descriptor: medianaDescriptor, score: melhorScore, foto } }))
    poseBufferRef.current = []
    autoCapturaTimerRef.current = null
    setAutoCapturaProg(0)

    if (poseAtual < POSES.length - 1) {
      setPoseAtual(prev => prev + 1)
      toast.success(`${POSES[poseAtual].label} capturado automaticamente!`)
    } else {
      toast.success('Todas as poses capturadas! Clique em Salvar.')
    }
  }, [poseAtual, toast])

  // Loop de deteccao facial
  const iniciarDeteccao = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current)
    poseBufferRef.current = []
    autoCapturaTimerRef.current = null

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !faceapiRef.current || !canvasRef.current) return
      if (capturaStatus === 'enviando' || capturaStatus === 'capturado') return
      if (detectandoRef.current) return
      detectandoRef.current = true

      try {
        const faceapi = faceapiRef.current
        const video = videoRef.current
        const canvas = canvasRef.current

        // Verificar iluminacao a cada frame
        const luzInfo = analisarIluminacao(video)
        setIluminacao(luzInfo)

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.6 }))
          .withFaceLandmarks(true)
          .withFaceDescriptors()

        const displaySize = { width: video.videoWidth, height: video.videoHeight }
        faceapi.matchDimensions(canvas, displaySize)
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (detections.length === 1) {
          const resized = faceapi.resizeResults(detections, displaySize)
          const det = resized[0]
          const box = det.detection.box
          const score = det.detection.score
          const rostoPct = Math.round((box.width / displaySize.width) * 100)
          const rostoGrande = rostoPct >= TAMANHO_MINIMO_ROSTO
          const boaQualidade = score > QUALIDADE_MINIMA
          const boaIluminacao = luzInfo.status === 'bom'

          const angulo = detectarAngulo(det.landmarks)
          setAnguloDetectado(angulo)
          setTamanhoRosto(rostoPct)

          const poseEsperada = POSES[poseAtual]?.key
          const anguloCorreto = angulo === poseEsperada

          // Cor do box baseada nas condições
          const condicoesOk = rostoGrande && boaQualidade && anguloCorreto && boaIluminacao
          const corBox = !rostoGrande ? '#ef4444' :
            condicoesOk ? '#10b981' :
            boaQualidade ? '#3b82f6' : '#eab308'

          if (ctx) {
            // Desenhar guia oval quando não há rosto ou condições ruins
            ctx.strokeStyle = corBox
            ctx.lineWidth = 3
            ctx.strokeRect(box.x, box.y, box.width, box.height)

            // Label com qualidade
            const labelText = `${(score * 100).toFixed(0)}% | ${angulo}`
            ctx.font = 'bold 13px sans-serif'
            const textW = ctx.measureText(labelText).width
            ctx.fillStyle = corBox
            ctx.fillRect(box.x, box.y - 24, textW + 12, 22)
            ctx.fillStyle = '#fff'
            ctx.fillText(labelText, box.x + 6, box.y - 8)

            if (!rostoGrande) {
              ctx.fillStyle = 'rgba(234, 179, 8, 0.9)'
              ctx.font = 'bold 12px sans-serif'
              const approxText = `Aproxime o rosto (${rostoPct}%)`
              const approxW = ctx.measureText(approxText).width
              ctx.fillRect(box.x, box.y + box.height + 4, approxW + 12, 20)
              ctx.fillStyle = '#fff'
              ctx.fillText(approxText, box.x + 6, box.y + box.height + 18)
            }
          }

          // Acumular amostras boas
          if (condicoesOk && det.descriptor) {
            poseBufferRef.current.push({ descriptor: new Float32Array(det.descriptor), score })
            if (poseBufferRef.current.length > 12) {
              poseBufferRef.current = poseBufferRef.current.slice(-12)
            }

            // Auto-captura: iniciar timer quando temos amostras suficientes
            if (poseBufferRef.current.length >= AMOSTRAS_POR_POSE) {
              if (!autoCapturaTimerRef.current) {
                autoCapturaTimerRef.current = Date.now()
              }
              const elapsed = Date.now() - autoCapturaTimerRef.current
              const prog = Math.min(100, (elapsed / AUTO_CAPTURA_DELAY_MS) * 100)
              setAutoCapturaProg(prog)

              if (elapsed >= AUTO_CAPTURA_DELAY_MS) {
                executarAutoCaptura()
              }
            }
          } else {
            // Reset auto-captura se condições piorarem
            autoCapturaTimerRef.current = null
            setAutoCapturaProg(0)
          }

          setFaceDetectada(condicoesOk)
          setQualidadeFace(Math.round(score * 100))
        } else {
          setFaceDetectada(false)
          setQualidadeFace(0)
          setTamanhoRosto(0)
          setAnguloDetectado(null)
          autoCapturaTimerRef.current = null
          setAutoCapturaProg(0)

          if (detections.length > 1 && ctx) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)'
            const warningText = 'Apenas 1 rosto por vez!'
            ctx.font = 'bold 16px sans-serif'
            const ww = ctx.measureText(warningText).width
            ctx.fillRect(8, 8, ww + 16, 28)
            ctx.fillStyle = '#fff'
            ctx.fillText(warningText, 16, 28)
          }
        }
      } catch {
        // Erro silencioso no loop
      } finally {
        detectandoRef.current = false
      }
    }, 400) // 400ms = mais responsivo que 500ms
  }

  // Iniciar camera
  const iniciarCamera = async (modo?: 'user' | 'environment') => {
    const facingMode = modo || cameraMode
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraAtiva(true)
      setCapturaStatus('detectando')
      iniciarDeteccao()
    } catch {
      toast.error('Erro ao acessar a camera. Verifique as permissoes do navegador.')
    }
  }

  // Alternar camera
  const alternarCamera = async () => {
    const novoModo = cameraMode === 'user' ? 'environment' : 'user'
    setCameraMode(novoModo)
    poseBufferRef.current = []
    autoCapturaTimerRef.current = null
    setAutoCapturaProg(0)
    await iniciarCamera(novoModo)
  }

  // Parar camera
  const pararCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraAtiva(false)
    setFaceDetectada(false)
    setQualidadeFace(0)
    setTamanhoRosto(0)
    setAnguloDetectado(null)
    setCapturaStatus('aguardando')
    setPoseAtual(0)
    setPosesCapturadas({ frontal: null, esquerda: null, direita: null })
    poseBufferRef.current = []
    autoCapturaTimerRef.current = null
    setAutoCapturaProg(0)
  }

  // Calcular mediana component-wise dos descriptors
  const calcularMedianaDescriptors = (descs: Float32Array[]): Float32Array => {
    const resultado = new Float32Array(128)
    for (let i = 0; i < 128; i++) {
      const valores = descs.map(d => d[i]).sort((a, b) => a - b)
      const mid = Math.floor(valores.length / 2)
      resultado[i] = valores.length % 2 !== 0
        ? valores[mid]
        : (valores[mid - 1] + valores[mid]) / 2
    }
    return resultado
  }

  // Capturar pose manualmente (caso auto-captura esteja lenta)
  const capturarPose = () => {
    if (poseBufferRef.current.length < AMOSTRAS_POR_POSE) {
      toast.error(`Aguarde ${AMOSTRAS_POR_POSE} amostras. Mantenha a posicao.`)
      return
    }
    executarAutoCaptura()
  }

  // Recapturar pose especifica
  const recapturarPose = (poseIndex: number) => {
    setPosesCapturadas(prev => ({ ...prev, [POSES[poseIndex].key]: null }))
    setPoseAtual(poseIndex)
    poseBufferRef.current = []
    autoCapturaTimerRef.current = null
    setAutoCapturaProg(0)
    setCapturaStatus('detectando')
  }

  // Converter Float32Array para base64
  const float32ToBase64 = (arr: Float32Array): string => {
    const bytes = new Uint8Array(arr.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  // Concatenar descriptors das 3 poses (384 floats = 1536 bytes)
  const concatenarDescriptors = (): Float32Array => {
    const descs = POSES.map(p => posesCapturadas[p.key]?.descriptor).filter(Boolean) as Float32Array[]
    const concat = new Float32Array(128 * descs.length)
    for (let d = 0; d < descs.length; d++) {
      const desc = new Float32Array(descs[d])
      let norm = 0
      for (let i = 0; i < 128; i++) norm += desc[i] * desc[i]
      norm = Math.sqrt(norm)
      if (norm > 0) for (let i = 0; i < 128; i++) desc[i] /= norm
      concat.set(desc, d * 128)
    }
    return concat
  }

  // Salvar embedding final
  const salvarEmbedding = async () => {
    if (!capturaAlunoId || !todasPosesCapturadas) return

    setCapturaStatus('enviando')
    setEnviandoEmbed(true)

    try {
      const descriptors = concatenarDescriptors()

      if (!descriptors || (descriptors.length !== 128 * 3 && descriptors.length !== 128)) {
        toast.error('Erro ao gerar embedding. Tente capturar novamente.')
        setCapturaStatus('detectando')
        return
      }

      const base64 = float32ToBase64(descriptors)
      const scores = POSES.map(p => posesCapturadas[p.key]?.score || 0).filter(s => s > 0)
      const mediaQualidade = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 70

      const res = await fetch('/api/admin/facial/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ aluno_id: capturaAlunoId, embedding_data: base64, qualidade: mediaQualidade }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err.mensagem || err.error || `Erro ao salvar (${res.status})`
        toast.error(msg)
        setCapturaStatus('detectando')
        return
      }

      toast.success(`Rosto cadastrado com 3 angulos! Qualidade media: ${mediaQualidade}%`)
      setCapturaStatus('capturado')

      setTimeout(() => {
        pararCamera()
        setCapturaAlunoId(null)
        onSaved()
      }, 2000)
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err?.message || 'Verifique a conexao'}`)
      setCapturaStatus('detectando')
    } finally {
      setEnviandoEmbed(false)
    }
  }

  // Abrir modal de captura
  const abrirCaptura = async (alunoId: string) => {
    setCapturaAlunoId(alunoId)
    setCapturaStatus('aguardando')
    setFaceDetectada(false)
    setQualidadeFace(0)
    setPoseAtual(0)
    setPosesCapturadas({ frontal: null, esquerda: null, direita: null })
    poseBufferRef.current = []
    autoCapturaTimerRef.current = null
    setAutoCapturaProg(0)
    if (!modelosCarregados) await carregarModelos()
  }

  // Cleanup
  useEffect(() => { return () => { pararCamera() } }, [])

  // Iniciar camera quando modal abre
  useEffect(() => {
    if (capturaAlunoId && modelosCarregados && !cameraAtiva) iniciarCamera()
  }, [capturaAlunoId, modelosCarregados, cameraAtiva])

  return {
    capturaAlunoId,
    setCapturaAlunoId,
    cameraAtiva,
    carregandoModelos,
    faceDetectada,
    qualidadeFace,
    tamanhoRosto,
    anguloDetectado,
    enviandoEmbed,
    capturaStatus,
    poseAtual,
    posesCapturadas,
    cameraMode,
    iluminacao,
    autoCapturaProg,
    videoRef,
    canvasRef,
    poseBufferRef,
    poseConfig,
    todasPosesCapturadas,
    posesConcluidasCount,
    alternarCamera,
    pararCamera,
    capturarPose,
    recapturarPose,
    salvarEmbedding,
    abrirCaptura,
  }
}
