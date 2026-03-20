'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Camera, Trash2, Shield, UserCheck, AlertTriangle, CheckCircle, XCircle, FileText, RefreshCw, Video, SwitchCamera } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'

interface AlunoFacial {
  aluno_id: string
  nome: string
  aluno_nome?: string
  aluno_codigo?: string
  consentido: boolean
  tem_embedding: boolean
  responsavel_nome?: string
  responsavel_cpf?: string
  data_consentimento?: string
}

interface ConsentForm {
  responsavel_nome: string
  responsavel_cpf: string
  consentido: boolean
}

export default function FacialEnrollmentPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()

  const { tipoUsuario, isEscola } = useUserType({
    onUsuarioCarregado: (u) => {
      if (u.escola_id) setEscolaId(u.escola_id)
    }
  })
  const { escolas } = useEscolas({ desabilitado: isEscola })

  // Filtros
  const [escolaId, setEscolaId] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const { turmas } = useTurmas(escolaId)
  const [turmaId, setTurmaId] = useState('')

  // Séries únicas extraídas das turmas
  const seriesDisponiveis = [...new Set(turmas.map(t => t.serie).filter(Boolean))].sort()

  // Turmas filtradas por série
  const turmasFiltradas = filtroSerie
    ? turmas.filter(t => t.serie === filtroSerie)
    : turmas

  // Dados
  const [alunos, setAlunos] = useState<AlunoFacial[]>([])
  const [carregando, setCarregando] = useState(false)
  const [buscouAlunos, setBuscouAlunos] = useState(false)

  // Modal de consentimento
  const [consentAlunoId, setConsentAlunoId] = useState<string | null>(null)
  const [consentForm, setConsentForm] = useState<ConsentForm>({
    responsavel_nome: '',
    responsavel_cpf: '',
    consentido: false,
  })
  const [salvandoConsent, setSalvandoConsent] = useState(false)

  // ============================================================================
  // CAPTURA FACIAL MULTI-POSE
  // ============================================================================

  type PoseType = 'frontal' | 'esquerda' | 'direita'
  interface PoseCapture {
    descriptor: Float32Array
    score: number
    foto: string
  }

  const POSES: { key: PoseType; label: string; instrucao: string; seta: string }[] = [
    { key: 'frontal', label: 'Frontal', instrucao: 'Olhe diretamente para a camera', seta: '⬆' },
    { key: 'esquerda', label: 'Esquerda', instrucao: 'Vire levemente para a esquerda', seta: '⬅' },
    { key: 'direita', label: 'Direita', instrucao: 'Vire levemente para a direita', seta: '➡' },
  ]

  const TAMANHO_MINIMO_ROSTO = 15
  const AMOSTRAS_POR_POSE = 3

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
  const [poseAtual, setPoseAtual] = useState<number>(0) // índice em POSES
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

  // Delete confirm
  const [deleteAlunoId, setDeleteAlunoId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState(false)

  // Reset filtros quando escola muda
  useEffect(() => {
    setFiltroSerie('')
    setTurmaId('')
  }, [escolaId])

  // Reset turma quando série muda
  useEffect(() => {
    setTurmaId('')
  }, [filtroSerie])

  // Buscar alunos com dados faciais
  const buscarAlunos = useCallback(async () => {
    if (!escolaId || !turmaId) {
      toast.error('Selecione a escola e a turma')
      return
    }

    setCarregando(true)
    setBuscouAlunos(true)
    try {
      const anoAtual = new Date().getFullYear().toString()
      const res = await fetch(`/api/admin/facial/consentimento?escola_id=${escolaId}&turma_id=${turmaId}&ano_letivo=${anoAtual}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.mensagem || `Erro ao carregar (${res.status})`)
        return
      }
      const data = await res.json()
      const lista = Array.isArray(data) ? data : data.alunos || []
      // Normalizar campo nome (API retorna aluno_nome)
      setAlunos(lista.map((a: any) => ({ ...a, nome: a.nome || a.aluno_nome || '' })))
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }, [escolaId, turmaId, toast])

  // Salvar consentimento
  const salvarConsentimento = async () => {
    if (!consentAlunoId) return
    if (!consentForm.responsavel_nome.trim()) {
      toast.error('Informe o nome do responsável')
      return
    }

    setSalvandoConsent(true)
    try {
      const res = await fetch('/api/admin/facial/consentimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aluno_id: consentAlunoId,
          responsavel_nome: consentForm.responsavel_nome.trim(),
          responsavel_cpf: consentForm.responsavel_cpf.trim() || null,
          consentido: consentForm.consentido,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Erro ao salvar consentimento')
        return
      }

      toast.success('Consentimento registrado com sucesso')
      setConsentAlunoId(null)
      setConsentForm({ responsavel_nome: '', responsavel_cpf: '', consentido: false })
      await buscarAlunos()
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSalvandoConsent(false)
    }
  }

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

  // Iniciar câmera com modo selecionado (frontal ou traseira)
  const iniciarCamera = async (modo?: 'user' | 'environment') => {
    const facingMode = modo || cameraMode
    // Parar câmera anterior se existir
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

  // Alternar entre câmera frontal e traseira
  const alternarCamera = async () => {
    const novoModo = cameraMode === 'user' ? 'environment' : 'user'
    setCameraMode(novoModo)
    // Limpar buffer de poses da pose atual (ângulo muda)
    poseBufferRef.current = []
    await iniciarCamera(novoModo)
  }

  // Parar câmera e resetar tudo
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

  // Detectar ângulo do rosto via landmarks (posição do nariz relativo aos olhos)
  const detectarAngulo = (landmarks: any): PoseType => {
    const nose = landmarks.getNose()
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()

    if (!nose?.length || !leftEye?.length || !rightEye?.length) return 'frontal'

    const noseTip = nose[3] // ponta do nariz
    const leftEyeCenter = { x: leftEye.reduce((s: number, p: any) => s + p.x, 0) / leftEye.length }
    const rightEyeCenter = { x: rightEye.reduce((s: number, p: any) => s + p.x, 0) / rightEye.length }
    const eyeCenter = (leftEyeCenter.x + rightEyeCenter.x) / 2
    const eyeWidth = Math.abs(rightEyeCenter.x - leftEyeCenter.x)

    // Razão: deslocamento do nariz / largura entre olhos
    const desvio = (noseTip.x - eyeCenter) / eyeWidth

    if (desvio < -0.15) return 'esquerda'  // nariz deslocado para esquerda da câmera = rosto virado para direita do aluno
    if (desvio > 0.15) return 'direita'
    return 'frontal'
  }

  // Loop de detecção facial com detecção de ângulo
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

        // Detectar ângulo
        const angulo = detectarAngulo(det.landmarks)
        setAnguloDetectado(angulo)
        setTamanhoRosto(rostoPct)

        // Verificar se o ângulo corresponde à pose solicitada
        const poseEsperada = POSES[poseAtual]?.key
        const anguloCorreto = angulo === poseEsperada

        // Cor da caixa
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

        // Coletar descriptor se ângulo correto, qualidade boa E rosto grande
        if (anguloCorreto && boaQualidade && rostoGrande && det.descriptor) {
          poseBufferRef.current.push({ descriptor: det.descriptor, score })
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

  // Capturar a pose atual
  const capturarPose = () => {
    if (poseBufferRef.current.length < AMOSTRAS_POR_POSE) {
      toast.error(`Aguarde ${AMOSTRAS_POR_POSE} amostras. Mantenha a posicao.`)
      return
    }
    if (!videoRef.current) return

    // Selecionar melhor descriptor
    const melhor = poseBufferRef.current.reduce((a, b) => a.score > b.score ? a : b)

    // Capturar foto
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

    // Salvar pose — clonar descriptor para evitar referência invalidada
    const poseKey = POSES[poseAtual].key
    const descriptorClone = new Float32Array(melhor.descriptor)
    setPosesCapturadas(prev => ({ ...prev, [poseKey]: { descriptor: descriptorClone, score: melhor.score, foto } }))
    poseBufferRef.current = []

    // Avançar para próxima pose
    if (poseAtual < POSES.length - 1) {
      setPoseAtual(prev => prev + 1)
      toast.success(`${POSES[poseAtual].label} capturado! Agora: ${POSES[poseAtual + 1].label}`)
    } else {
      toast.success('Todas as poses capturadas! Clique em Salvar.')
    }
  }

  // Converter Float32Array para base64 (browser)
  const float32ToBase64 = (arr: Float32Array): string => {
    const bytes = new Uint8Array(arr.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  // Calcular média dos descriptors das 3 poses
  const calcularMediaDescriptors = (): Float32Array => {
    const descs = POSES.map(p => posesCapturadas[p.key]?.descriptor).filter(Boolean) as Float32Array[]
    const media = new Float32Array(128)
    for (let i = 0; i < 128; i++) {
      let soma = 0
      for (const d of descs) soma += d[i]
      media[i] = soma / descs.length
    }
    // Normalizar (L2 norm) para manter compatibilidade com FaceMatcher
    let norm = 0
    for (let i = 0; i < 128; i++) norm += media[i] * media[i]
    norm = Math.sqrt(norm)
    if (norm > 0) for (let i = 0; i < 128; i++) media[i] /= norm
    return media
  }

  // Salvar embedding final (média das 3 poses)
  const salvarEmbedding = async () => {
    if (!capturaAlunoId || !todasPosesCapturadas) return

    setCapturaStatus('enviando')
    setEnviandoEmbed(true)

    try {
      const mediaDescriptor = calcularMediaDescriptors()

      // Validar que o descriptor foi gerado corretamente
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
        buscarAlunos()
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

  // Iniciar câmera quando modal abre
  useEffect(() => {
    if (capturaAlunoId && modelosCarregados && !cameraAtiva) iniciarCamera()
  }, [capturaAlunoId, modelosCarregados])

  // Deletar dados faciais
  const deletarDadosFaciais = async () => {
    if (!deleteAlunoId) return

    setDeletando(true)
    try {
      const res = await fetch(`/api/admin/facial/consentimento?aluno_id=${deleteAlunoId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Erro ao remover dados faciais')
        return
      }

      toast.success('Dados faciais removidos com sucesso')
      setDeleteAlunoId(null)
      await buscarAlunos()
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setDeletando(false)
    }
  }

  const getStatusBadge = (aluno: AlunoFacial) => {
    if (aluno.tem_embedding) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Cadastrado
        </span>
      )
    }
    if (aluno.consentido) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-3 h-3" />
          Sem Embedding
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3" />
        Sem Consentimento
      </span>
    )
  }

  const alunoConsentModal = alunos.find(a => a.aluno_id === consentAlunoId)
  const alunoDeleteModal = alunos.find(a => a.aluno_id === deleteAlunoId)

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Cadastro Facial</h1>
                <p className="text-teal-100 text-sm mt-1">
                  Gerenciamento de consentimentos e embeddings faciais dos alunos
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* LGPD Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Aviso de Privacidade (LGPD)</p>
              <p>
                Os dados faciais armazenados neste sistema consistem exclusivamente em vetores
                matematicos (embeddings), e nao em fotografias ou imagens dos alunos. Esses vetores
                nao permitem a reconstrucao da imagem original. Para alunos menores de idade, o
                consentimento do responsavel legal e obrigatorio antes do cadastro do reconhecimento
                facial.
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Filtros</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Escola */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
                {tipoUsuario === 'escola' ? (
                  <input
                    type="text"
                    value={escolas.find(e => e.id === escolaId)?.nome || 'Sua escola'}
                    disabled
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-sm"
                  />
                ) : (
                  <select
                    value={escolaId}
                    onChange={e => setEscolaId(e.target.value)}
                    className="select-custom w-full"
                  >
                    <option value="">Selecione a escola</option>
                    {escolas.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Série */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serie</label>
                <select
                  value={filtroSerie}
                  onChange={e => setFiltroSerie(e.target.value)}
                  disabled={!escolaId || seriesDisponiveis.length === 0}
                  className="select-custom w-full"
                >
                  <option value="">Todas as series</option>
                  {seriesDisponiveis.map(s => (
                    <option key={s} value={s}>{formatSerie(s)}</option>
                  ))}
                </select>
              </div>

              {/* Turma */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
                <select
                  value={turmaId}
                  onChange={e => setTurmaId(e.target.value)}
                  disabled={!escolaId || turmasFiltradas.length === 0}
                  className="select-custom w-full"
                >
                  <option value="">Selecione a turma</option>
                  {turmasFiltradas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} - {formatSerie(t.serie)}{t.nome ? ` (${t.nome})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão Buscar */}
              <div className="flex items-end">
                <button
                  onClick={buscarAlunos}
                  disabled={!escolaId || !turmaId || carregando}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {carregando ? <LoadingSpinner /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Alunos */}
          {buscouAlunos && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">
                  Alunos ({alunos.length})
                </h2>
              </div>

              {carregando ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner />
                </div>
              ) : alunos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum aluno encontrado para esta turma</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acoes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {alunos.map(aluno => (
                        <tr key={aluno.aluno_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {aluno.nome}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(aluno)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* Consent button */}
                              <button
                                onClick={() => {
                                  setConsentAlunoId(aluno.aluno_id)
                                  setConsentForm({
                                    responsavel_nome: aluno.responsavel_nome || '',
                                    responsavel_cpf: aluno.responsavel_cpf || '',
                                    consentido: aluno.consentido,
                                  })
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors"
                                title="Gerenciar consentimento"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Consentimento
                              </button>

                              {/* Captura facial - only for consented students */}
                              {aluno.consentido && (
                                <button
                                  onClick={() => abrirCaptura(aluno.aluno_id)}
                                  disabled={carregandoModelos}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                    aluno.tem_embedding
                                      ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                      : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                                  } disabled:opacity-50`}
                                  title={aluno.tem_embedding ? 'Recapturar rosto' : 'Capturar rosto via camera'}
                                >
                                  {carregandoModelos ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                  {aluno.tem_embedding ? 'Recapturar' : 'Capturar'}
                                </button>
                              )}

                              {/* Delete button - only if has consent or embedding */}
                              {(aluno.consentido || aluno.tem_embedding) && (
                                <button
                                  onClick={() => setDeleteAlunoId(aluno.aluno_id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                                  title="Remover dados faciais"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remover
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Consentimento */}
        {consentAlunoId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  Termo de Consentimento
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Aluno: {alunoConsentModal?.nome}
                </p>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Responsavel *
                  </label>
                  <input
                    type="text"
                    value={consentForm.responsavel_nome}
                    onChange={e => setConsentForm(prev => ({ ...prev, responsavel_nome: e.target.value }))}
                    placeholder="Nome completo do responsavel legal"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF do Responsavel (opcional)
                  </label>
                  <input
                    type="text"
                    value={consentForm.responsavel_cpf}
                    onChange={e => setConsentForm(prev => ({ ...prev, responsavel_cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="consent-check"
                    checked={consentForm.consentido}
                    onChange={e => setConsentForm(prev => ({ ...prev, consentido: e.target.checked }))}
                    className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="consent-check" className="text-sm text-gray-700">
                    Autorizo o uso de reconhecimento facial para fins de registro de presenca escolar.
                    Estou ciente de que apenas vetores matematicos serao armazenados, e nao imagens ou
                    fotografias.
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setConsentAlunoId(null)
                    setConsentForm({ responsavel_nome: '', responsavel_cpf: '', consentido: false })
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarConsentimento}
                  disabled={salvandoConsent || !consentForm.responsavel_nome.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {salvandoConsent && <LoadingSpinner />}
                  Salvar Consentimento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Captura Facial Multi-Pose */}
        {capturaAlunoId && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-100 dark:bg-teal-900/40 rounded-lg p-2">
                      <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">Captura Facial Multi-Angulo</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {alunos.find(a => a.aluno_id === capturaAlunoId)?.nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={alternarCamera}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                      title={cameraMode === 'user' ? 'Usando camera frontal — clique para traseira' : 'Usando camera traseira — clique para frontal'}
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                      {cameraMode === 'user' ? 'Frontal' : 'Traseira'}
                    </button>
                    <span className="text-xs font-semibold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-full">
                      {posesConcluidasCount}/{POSES.length} poses
                    </span>
                  </div>
                </div>
              </div>

              {/* Progresso das poses */}
              <div className="px-6 pt-4">
                <div className="flex gap-2">
                  {POSES.map((pose, i) => {
                    const capturada = posesCapturadas[pose.key] !== null
                    const atual = i === poseAtual && !todasPosesCapturadas
                    return (
                      <div key={pose.key} className={`flex-1 rounded-lg p-2 text-center transition-all border-2 ${
                        capturada ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' :
                        atual ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-400 dark:border-teal-600 shadow-sm' :
                        'bg-gray-50 dark:bg-slate-700/50 border-transparent'
                      }`}>
                        <div className="text-2xl mb-1">{capturada ? '✅' : pose.seta}</div>
                        <p className={`text-xs font-semibold ${capturada ? 'text-green-700 dark:text-green-400' : atual ? 'text-teal-700 dark:text-teal-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          {pose.label}
                        </p>
                        {capturada && posesCapturadas[pose.key] && (
                          <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                            {Math.round(posesCapturadas[pose.key]!.score * 100)}%
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Camera + instrução */}
              <div className="px-6 py-4">
                {/* Instrução da pose atual */}
                {cameraAtiva && !todasPosesCapturadas && capturaStatus !== 'capturado' && (
                  <div className={`mb-3 rounded-lg p-3 text-center ${
                    faceDetectada ? 'bg-green-50 dark:bg-green-900/20' : 'bg-teal-50 dark:bg-teal-900/20'
                  }`}>
                    <p className="text-3xl mb-1">{poseConfig.seta}</p>
                    <p className={`text-sm font-semibold ${faceDetectada ? 'text-green-700 dark:text-green-300' : 'text-teal-700 dark:text-teal-300'}`}>
                      {poseConfig.instrucao}
                    </p>
                    {anguloDetectado && anguloDetectado !== poseConfig.key && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Detectado: {anguloDetectado} — vire para {poseConfig.label.toLowerCase()}
                      </p>
                    )}
                    {faceDetectada && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Angulo correto! Amostras: {poseBufferRef.current.length}/{AMOSTRAS_POR_POSE}
                      </p>
                    )}
                  </div>
                )}

                <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

                  {/* Loading */}
                  {(carregandoModelos || (!cameraAtiva && capturaAlunoId)) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <div className="text-center text-white">
                        <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin opacity-70" />
                        <p className="text-sm">{carregandoModelos ? 'Carregando modelos de IA...' : 'Iniciando camera...'}</p>
                      </div>
                    </div>
                  )}

                  {/* Sucesso final */}
                  {capturaStatus === 'capturado' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-900/80">
                      <div className="text-center text-white">
                        <div className="flex justify-center gap-3 mb-4">
                          {POSES.map(p => posesCapturadas[p.key]?.foto && (
                            <img key={p.key} src={posesCapturadas[p.key]!.foto} alt={p.label}
                              className="w-20 h-20 rounded-full object-cover border-3 border-green-400 shadow-lg" />
                          ))}
                        </div>
                        <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                        <p className="text-xl font-bold">Rosto cadastrado com 3 angulos!</p>
                      </div>
                    </div>
                  )}

                  {/* Guia visual */}
                  {cameraAtiva && !faceDetectada && capturaStatus === 'detectando' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-60 border-2 border-dashed border-white/30 rounded-3xl" />
                    </div>
                  )}
                </div>

                {/* Fotos das poses capturadas */}
                {posesConcluidasCount > 0 && capturaStatus !== 'capturado' && (
                  <div className="mt-3 flex gap-3">
                    {POSES.map(p => posesCapturadas[p.key] && (
                      <div key={p.key} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                        <img src={posesCapturadas[p.key]!.foto} alt={p.label}
                          className="w-10 h-10 rounded-full object-cover border-2 border-green-400" />
                        <div>
                          <p className="text-xs font-semibold text-green-700 dark:text-green-300">{p.label}</p>
                          <p className="text-[10px] text-green-600">{Math.round(posesCapturadas[p.key]!.score * 100)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {cameraAtiva && !todasPosesCapturadas && (
                    <>
                      <span>Qualidade: <strong className={qualidadeFace >= 70 ? 'text-green-600' : 'text-yellow-600'}>{qualidadeFace || '-'}%</strong></span>
                      {tamanhoRosto > 0 && <span>Rosto: <strong className={tamanhoRosto >= TAMANHO_MINIMO_ROSTO ? 'text-green-600' : 'text-orange-600'}>{tamanhoRosto}%</strong></span>}
                      {anguloDetectado && <span>Angulo: <strong>{anguloDetectado}</strong></span>}
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { pararCamera(); setCapturaAlunoId(null) }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  {!todasPosesCapturadas ? (
                    <button
                      onClick={capturarPose}
                      disabled={!faceDetectada || poseBufferRef.current.length < AMOSTRAS_POR_POSE}
                      className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Capturar {poseConfig.label} ({poseAtual + 1}/{POSES.length})
                    </button>
                  ) : (
                    <button
                      onClick={salvarEmbedding}
                      disabled={enviandoEmbed || capturaStatus === 'capturado'}
                      className="px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {enviandoEmbed ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Salvar Cadastro Facial
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmacao de Exclusao */}
        {deleteAlunoId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Confirmar Exclusao
                </h3>
              </div>

              <div className="px-6 py-4">
                <p className="text-sm text-gray-700">
                  Tem certeza que deseja remover todos os dados faciais (consentimento e embedding)
                  do aluno <strong>{alunoDeleteModal?.nome}</strong>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  Esta acao nao pode ser desfeita.
                </p>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setDeleteAlunoId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={deletarDadosFaciais}
                  disabled={deletando}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {deletando && <LoadingSpinner />}
                  <Trash2 className="w-4 h-4" />
                  Remover Dados
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
