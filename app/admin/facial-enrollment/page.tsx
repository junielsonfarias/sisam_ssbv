'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { Search, Shield, UserCheck } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import { useUserType } from '@/lib/hooks/useUserType'
import { useEscolas } from '@/lib/hooks/useEscolas'
import { useTurmas } from '@/lib/hooks/useTurmas'

import { AlunoFacial, ConsentForm } from './types'
import { useFaceCapture } from './hooks/use-face-capture'
import { ConsentModal } from './components/consent-modal'
import { CaptureModal } from './components/capture-modal'
import { DeleteModal } from './components/delete-modal'
import { AlunoTable } from './components/aluno-table'

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

  const seriesDisponiveis = [...new Set(turmas.map(t => t.serie).filter(Boolean))].sort()
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

  // Delete confirm
  const [deleteAlunoId, setDeleteAlunoId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState(false)

  // Reset filtros quando escola muda
  useEffect(() => {
    setFiltroSerie('')
    setTurmaId('')
  }, [escolaId])

  // Reset turma quando serie muda
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
      setAlunos(lista.map((a: any) => ({ ...a, nome: a.nome || a.aluno_nome || '' })))
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }, [escolaId, turmaId, toast])

  // Face capture hook
  const faceCapture = useFaceCapture(buscarAlunos)

  // Salvar consentimento
  const salvarConsentimento = async () => {
    if (!consentAlunoId) return
    if (!consentForm.responsavel_nome.trim()) {
      toast.error('Informe o nome do responsavel')
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

  const alunoConsentModal = alunos.find(a => a.aluno_id === consentAlunoId)
  const alunoDeleteModal = alunos.find(a => a.aluno_id === deleteAlunoId)

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <UserCheck className="w-7 h-7 sm:w-8 sm:h-8" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Cadastro Facial</h1>
                <p className="text-indigo-200 text-xs sm:text-sm mt-1">
                  Consentimentos e embeddings faciais dos alunos
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* LGPD Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Aviso de Privacidade (LGPD)</p>
              <p className="leading-relaxed">
                Os dados faciais armazenados neste sistema consistem exclusivamente em vetores
                matematicos (embeddings), e nao em fotografias ou imagens dos alunos. Esses vetores
                nao permitem a reconstrucao da imagem original. Para alunos menores de idade, o
                consentimento do responsavel legal e obrigatorio antes do cadastro do reconhecimento
                facial.
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Filtros</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <AlunoTable
            alunos={alunos}
            carregando={carregando}
            buscouAlunos={buscouAlunos}
            carregandoModelos={faceCapture.carregandoModelos}
            onConsentimento={(aluno) => {
              setConsentAlunoId(aluno.aluno_id)
              setConsentForm({
                responsavel_nome: aluno.responsavel_nome || '',
                responsavel_cpf: aluno.responsavel_cpf || '',
                consentido: aluno.consentido,
              })
            }}
            onCapturar={(alunoId) => faceCapture.abrirCaptura(alunoId)}
            onDeletar={(alunoId) => setDeleteAlunoId(alunoId)}
          />
        </div>

        {/* Modal de Consentimento */}
        {consentAlunoId && (
          <ConsentModal
            aluno={alunoConsentModal}
            consentForm={consentForm}
            setConsentForm={setConsentForm}
            salvandoConsent={salvandoConsent}
            onSalvar={salvarConsentimento}
            onCancelar={() => {
              setConsentAlunoId(null)
              setConsentForm({ responsavel_nome: '', responsavel_cpf: '', consentido: false })
            }}
          />
        )}

        {/* Modal de Captura Facial Multi-Pose */}
        {faceCapture.capturaAlunoId && (
          <CaptureModal
            alunoNome={alunos.find(a => a.aluno_id === faceCapture.capturaAlunoId)?.nome || ''}
            cameraAtiva={faceCapture.cameraAtiva}
            carregandoModelos={faceCapture.carregandoModelos}
            faceDetectada={faceCapture.faceDetectada}
            qualidadeFace={faceCapture.qualidadeFace}
            tamanhoRosto={faceCapture.tamanhoRosto}
            anguloDetectado={faceCapture.anguloDetectado}
            enviandoEmbed={faceCapture.enviandoEmbed}
            capturaStatus={faceCapture.capturaStatus}
            poseAtual={faceCapture.poseAtual}
            posesCapturadas={faceCapture.posesCapturadas}
            cameraMode={faceCapture.cameraMode}
            iluminacao={faceCapture.iluminacao}
            autoCapturaProg={faceCapture.autoCapturaProg}
            videoRef={faceCapture.videoRef}
            canvasRef={faceCapture.canvasRef}
            poseBufferRef={faceCapture.poseBufferRef}
            poseConfig={faceCapture.poseConfig}
            todasPosesCapturadas={faceCapture.todasPosesCapturadas}
            posesConcluidasCount={faceCapture.posesConcluidasCount}
            onAlternarCamera={faceCapture.alternarCamera}
            onCapturarPose={faceCapture.capturarPose}
            onRecapturarPose={faceCapture.recapturarPose}
            onSalvarEmbedding={faceCapture.salvarEmbedding}
            onCancelar={() => { faceCapture.pararCamera(); faceCapture.setCapturaAlunoId(null) }}
          />
        )}

        {/* Modal de Confirmacao de Exclusao */}
        {deleteAlunoId && (
          <DeleteModal
            aluno={alunoDeleteModal}
            deletando={deletando}
            onConfirmar={deletarDadosFaciais}
            onCancelar={() => setDeleteAlunoId(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
