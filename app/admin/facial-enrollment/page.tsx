'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Camera, Trash2, Shield, UserCheck, AlertTriangle, CheckCircle, XCircle, FileText, RefreshCw, Video } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'

interface AlunoFacial {
  aluno_id: string
  nome: string
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
  const { turmas } = useTurmas(escolaId)
  const [turmaId, setTurmaId] = useState('')

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

  // Captura facial via câmera
  const [capturaAlunoId, setCapturaAlunoId] = useState<string | null>(null)
  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [modelosCarregados, setModelosCarregados] = useState(false)
  const [carregandoModelos, setCarregandoModelos] = useState(false)
  const [faceDetectada, setFaceDetectada] = useState(false)
  const [qualidadeFace, setQualidadeFace] = useState(0)
  const [enviandoEmbed, setEnviandoEmbed] = useState(false)
  const [capturaStatus, setCapturaStatus] = useState<'aguardando' | 'detectando' | 'capturado' | 'enviando'>('aguardando')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceapiRef = useRef<any>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Delete confirm
  const [deleteAlunoId, setDeleteAlunoId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState(false)

  // Reset turma when escola changes
  useEffect(() => {
    setTurmaId('')
  }, [escolaId])

  // Buscar alunos com dados faciais
  const buscarAlunos = useCallback(async () => {
    if (!escolaId || !turmaId) {
      toast.error('Selecione a escola e a turma')
      return
    }

    setCarregando(true)
    setBuscouAlunos(true)
    try {
      const res = await fetch(`/api/admin/facial/consentimento?escola_id=${escolaId}&turma_id=${turmaId}`)
      if (!res.ok) {
        toast.error('Erro ao carregar dados faciais')
        return
      }
      const data = await res.json()
      setAlunos(Array.isArray(data) ? data : data.alunos || [])
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

  // Iniciar câmera
  const iniciarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
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

  // Parar câmera
  const pararCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraAtiva(false)
    setFaceDetectada(false)
    setQualidadeFace(0)
    setCapturaStatus('aguardando')
  }

  // Loop de detecção facial (feedback visual em tempo real)
  const iniciarDeteccao = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current)

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !faceapiRef.current || !canvasRef.current) return

      const faceapi = faceapiRef.current
      const video = videoRef.current
      const canvas = canvasRef.current

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)

      // Ajustar canvas ao vídeo
      const displaySize = { width: video.videoWidth, height: video.videoHeight }
      faceapi.matchDimensions(canvas, displaySize)
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (detections.length === 1) {
        // Uma face detectada — ideal
        const resized = faceapi.resizeResults(detections, displaySize)
        const box = resized[0].detection.box
        const score = resized[0].detection.score

        if (ctx) {
          ctx.strokeStyle = score > 0.7 ? '#10b981' : '#eab308'
          ctx.lineWidth = 3
          ctx.strokeRect(box.x, box.y, box.width, box.height)
          ctx.fillStyle = score > 0.7 ? '#10b981' : '#eab308'
          ctx.font = 'bold 14px sans-serif'
          ctx.fillText(`${(score * 100).toFixed(0)}%`, box.x, box.y - 8)
        }

        setFaceDetectada(true)
        setQualidadeFace(Math.round(score * 100))
      } else {
        setFaceDetectada(false)
        setQualidadeFace(0)

        if (detections.length > 1 && ctx) {
          ctx.fillStyle = '#ef4444'
          ctx.font = 'bold 16px sans-serif'
          ctx.fillText('Apenas 1 rosto por vez!', 10, 30)
        }
      }
    }, 500)
  }

  // Capturar embedding do rosto atual
  const capturarEmbedding = async () => {
    if (!videoRef.current || !faceapiRef.current || !capturaAlunoId) return

    setCapturaStatus('enviando')
    setEnviandoEmbed(true)

    try {
      const faceapi = faceapiRef.current
      const video = videoRef.current

      // Detectar com descriptor completo
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.6 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor()

      if (!detection) {
        toast.error('Nenhum rosto detectado. Posicione o aluno em frente a camera.')
        setCapturaStatus('detectando')
        return
      }

      // Converter Float32Array para base64
      const descriptor = detection.descriptor
      const buffer = Buffer.from(new Float32Array(descriptor).buffer)
      const base64 = buffer.toString('base64')
      const qualidade = Math.round(detection.detection.score * 100)

      // Enviar para API
      const res = await fetch('/api/admin/facial/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: capturaAlunoId,
          embedding_data: base64,
          qualidade,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Erro ao salvar embedding')
        setCapturaStatus('detectando')
        return
      }

      toast.success('Rosto cadastrado com sucesso!')
      setCapturaStatus('capturado')

      // Fechar após 1.5s
      setTimeout(() => {
        pararCamera()
        setCapturaAlunoId(null)
        buscarAlunos()
      }, 1500)
    } catch (err) {
      toast.error('Erro ao processar captura facial')
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

    if (!modelosCarregados) {
      await carregarModelos()
    }
  }

  // Cleanup ao desmontar ou fechar modal
  useEffect(() => {
    return () => {
      pararCamera()
    }
  }, [])

  // Iniciar câmera quando modal abre e modelos estão prontos
  useEffect(() => {
    if (capturaAlunoId && modelosCarregados && !cameraAtiva) {
      iniciarCamera()
    }
  }, [capturaAlunoId, modelosCarregados])

  // Deletar dados faciais
  const deletarDadosFaciais = async () => {
    if (!deleteAlunoId) return

    setDeletando(true)
    try {
      const res = await fetch(`/api/admin/facial/consentimento?aluno_id=${deleteAlunoId}`, {
        method: 'DELETE',
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
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Escola */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Escola</label>
                {tipoUsuario === 'escola' ? (
                  <input
                    type="text"
                    value={escolas.find(e => e.id === escolaId)?.nome || 'Sua escola'}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 text-sm"
                  />
                ) : (
                  <select
                    value={escolaId}
                    onChange={e => setEscolaId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Selecione a escola</option>
                    {escolas.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Turma */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                <select
                  value={turmaId}
                  onChange={e => setTurmaId(e.target.value)}
                  disabled={!escolaId}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                >
                  <option value="">Selecione a turma</option>
                  {turmas.map(t => (
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
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Modal de Captura Facial via Camera */}
        {capturaAlunoId && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-100 dark:bg-teal-900/40 rounded-lg p-2">
                      <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">Captura Facial</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {alunos.find(a => a.aluno_id === capturaAlunoId)?.nome}
                      </p>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    capturaStatus === 'capturado' ? 'bg-green-100 text-green-700' :
                    capturaStatus === 'enviando' ? 'bg-blue-100 text-blue-700' :
                    faceDetectada ? 'bg-emerald-100 text-emerald-700' :
                    cameraAtiva ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {capturaStatus === 'capturado' ? 'Capturado!' :
                     capturaStatus === 'enviando' ? 'Salvando...' :
                     carregandoModelos ? 'Carregando modelos...' :
                     !cameraAtiva ? 'Iniciando camera...' :
                     faceDetectada ? `Rosto detectado (${qualidadeFace}%)` :
                     'Posicione o rosto'}
                  </div>
                </div>
              </div>

              {/* Camera view */}
              <div className="px-6 py-4">
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                  />

                  {/* Overlay de loading */}
                  {(carregandoModelos || (!cameraAtiva && capturaAlunoId)) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <div className="text-center text-white">
                        <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin opacity-70" />
                        <p className="text-sm">{carregandoModelos ? 'Carregando modelos de IA...' : 'Iniciando camera...'}</p>
                      </div>
                    </div>
                  )}

                  {/* Overlay de sucesso */}
                  {capturaStatus === 'capturado' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-900/70">
                      <div className="text-center text-white">
                        <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-400" />
                        <p className="text-xl font-bold">Rosto cadastrado!</p>
                      </div>
                    </div>
                  )}

                  {/* Guia visual */}
                  {cameraAtiva && !faceDetectada && capturaStatus === 'detectando' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-60 border-2 border-dashed border-white/40 rounded-3xl" />
                    </div>
                  )}
                </div>

                {/* Instrucoes */}
                <div className="mt-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Video className="w-4 h-4 mt-0.5 flex-shrink-0 text-teal-500" />
                    <div>
                      <p className="font-medium">Instrucoes:</p>
                      <ul className="text-xs mt-1 space-y-0.5 text-gray-500 dark:text-gray-400">
                        <li>Posicione o aluno de frente para a camera, com boa iluminacao</li>
                        <li>Aguarde a caixa verde aparecer ao redor do rosto</li>
                        <li>Quando a qualidade estiver acima de 70%, clique em Capturar</li>
                        <li>Apenas 1 rosto deve estar visivel na camera</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {faceDetectada && (
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${qualidadeFace >= 70 ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Qualidade: <strong className={qualidadeFace >= 70 ? 'text-green-600' : 'text-yellow-600'}>{qualidadeFace}%</strong>
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      pararCamera()
                      setCapturaAlunoId(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={capturarEmbedding}
                    disabled={!faceDetectada || enviandoEmbed || qualidadeFace < 50 || capturaStatus === 'capturado'}
                    className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {enviandoEmbed ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    Capturar Rosto
                  </button>
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
