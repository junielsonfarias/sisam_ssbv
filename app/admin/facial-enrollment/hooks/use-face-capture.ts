'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useToast } from '@/components/toast'
import { PoseType, PoseCapture, POSES, TAMANHO_MINIMO_ROSTO, AMOSTRAS_POR_POSE } from '../types'

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

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceapiRef = useRef<any>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const poseBufferRef = useRef<{ descriptor: Float32Array; score: number }[]>([])

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

  // Loop de deteccao facial
  const iniciarDeteccao = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current)
    poseBufferRef.current = []

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !faceapiRef.current || !canvasRef.current) return
      if (capturaStatus === 'enviando' || capturaStatus === 'capturado') return

      const faceapi = faceapiRef.current
      const video = videoRef.current
      const canvas = canvasRef.current

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
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
        const boaQualidade = score > 0.7

        const angulo = detectarAngulo(det.landmarks)
        setAnguloDetectado(angulo)
        setTamanhoRosto(rostoPct)

        const poseEsperada = POSES[poseAtual]?.key
        const anguloCorreto = angulo === poseEsperada

        const corBox = !rostoGrande ? '#ef4444' :
          anguloCorreto && boaQualidade ? '#10b981' :
          boaQualidade ? '#3b82f6' : '#eab308'

        if (ctx) {
          ctx.strokeStyle = corBox
          ctx.lineWidth = 3
          ctx.strokeRect(box.x, box.y, box.width, box.height)
          ctx.fillStyle = corBox
          ctx.font = 'bold 13px sans-serif'
          ctx.fillText(`${(score * 100).toFixed(0)}% | ${angulo}`, box.x, box.y - 8)

          if (!rostoGrande) {
            ctx.fillStyle = '#eab308'
            ctx.font = 'bold 12px sans-serif'
            ctx.fillText(`Aproxime (${rostoPct}%)`, box.x, box.y + box.height + 16)
          }
        }

        if (anguloCorreto && boaQualidade && rostoGrande && det.descriptor) {
          poseBufferRef.current.push({ descriptor: new Float32Array(det.descriptor), score })
          if (poseBufferRef.current.length > 10) {
            poseBufferRef.current = poseBufferRef.current.slice(-10)
          }
        }

        setFaceDetectada(rostoGrande && boaQualidade && anguloCorreto)
        setQualidadeFace(Math.round(score * 100))
      } else {
        setFaceDetectada(false)
        setQualidadeFace(0)
        setTamanhoRosto(0)
        setAnguloDetectado(null)
        if (detections.length > 1 && ctx) {
          ctx.fillStyle = '#ef4444'
          ctx.font = 'bold 16px sans-serif'
          ctx.fillText('Apenas 1 rosto por vez!', 10, 30)
        }
      }
    }, 500)
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
  }

  // Capturar pose atual
  const capturarPose = () => {
    if (poseBufferRef.current.length < AMOSTRAS_POR_POSE) {
      toast.error(`Aguarde ${AMOSTRAS_POR_POSE} amostras. Mantenha a posicao.`)
      return
    }
    if (!videoRef.current) return

    const melhor = poseBufferRef.current.reduce((a, b) => a.score > b.score ? a : b)

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

    const poseKey = POSES[poseAtual].key
    const descriptorClone = new Float32Array(melhor.descriptor)
    setPosesCapturadas(prev => ({ ...prev, [poseKey]: { descriptor: descriptorClone, score: melhor.score, foto } }))
    poseBufferRef.current = []

    if (poseAtual < POSES.length - 1) {
      setPoseAtual(prev => prev + 1)
      toast.success(`${POSES[poseAtual].label} capturado! Agora: ${POSES[poseAtual + 1].label}`)
    } else {
      toast.success('Todas as poses capturadas! Clique em Salvar.')
    }
  }

  // Converter Float32Array para base64
  const float32ToBase64 = (arr: Float32Array): string => {
    const bytes = new Uint8Array(arr.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  // Calcular media dos descriptors
  const calcularMediaDescriptors = (): Float32Array => {
    const descs = POSES.map(p => posesCapturadas[p.key]?.descriptor).filter(Boolean) as Float32Array[]
    const media = new Float32Array(128)
    for (let i = 0; i < 128; i++) {
      let soma = 0
      for (const d of descs) soma += d[i]
      media[i] = soma / descs.length
    }
    let norm = 0
    for (let i = 0; i < 128; i++) norm += media[i] * media[i]
    norm = Math.sqrt(norm)
    if (norm > 0) for (let i = 0; i < 128; i++) media[i] /= norm
    return media
  }

  // Salvar embedding final
  const salvarEmbedding = async () => {
    if (!capturaAlunoId || !todasPosesCapturadas) return

    setCapturaStatus('enviando')
    setEnviandoEmbed(true)

    try {
      const mediaDescriptor = calcularMediaDescriptors()

      if (!mediaDescriptor || mediaDescriptor.length !== 128) {
        toast.error('Erro ao gerar embedding. Tente capturar novamente.')
        setCapturaStatus('detectando')
        return
      }

      const base64 = float32ToBase64(mediaDescriptor)
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
        console.error('Enrollment erro:', res.status, err)
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
      console.error('Erro ao salvar embedding:', err)
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
    if (!modelosCarregados) await carregarModelos()
  }

  // Cleanup
  useEffect(() => { return () => { pararCamera() } }, [])

  // Iniciar camera quando modal abre
  useEffect(() => {
    if (capturaAlunoId && modelosCarregados && !cameraAtiva) iniciarCamera()
  }, [capturaAlunoId, modelosCarregados])

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
    videoRef,
    canvasRef,
    poseBufferRef,
    poseConfig,
    todasPosesCapturadas,
    posesConcluidasCount,
    alternarCamera,
    pararCamera,
    capturarPose,
    salvarEmbedding,
    abrirCaptura,
  }
}
