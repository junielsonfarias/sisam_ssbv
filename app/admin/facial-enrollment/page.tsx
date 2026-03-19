'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useCallback } from 'react'
import { Search, Upload, Trash2, Shield, UserCheck, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'

interface EscolaSimples { id: string; nome: string }
interface TurmaSimples { id: string; codigo: string; nome: string | null; serie: string; ano_letivo: string }

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
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolaIdUsuario, setEscolaIdUsuario] = useState('')

  // Filtros
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [escolaId, setEscolaId] = useState('')
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

  // Upload embedding
  const [uploadAlunoId, setUploadAlunoId] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [enviandoEmbed, setEnviandoEmbed] = useState(false)

  // Delete confirm
  const [deleteAlunoId, setDeleteAlunoId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState(false)

  // Init
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth/verificar')
        if (authRes.ok) {
          const data = await authRes.json()
          if (data.usuario) {
            const tipo = data.usuario.tipo_usuario === 'administrador' ? 'admin' : data.usuario.tipo_usuario
            setTipoUsuario(tipo)
            if (data.usuario.escola_id) {
              setEscolaIdUsuario(data.usuario.escola_id)
              setEscolaId(data.usuario.escola_id)
            }
          }
        }
      } catch {}
    }
    init()
  }, [])

  // Carregar escolas
  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(data => setEscolas(Array.isArray(data) ? data : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  // Carregar turmas
  useEffect(() => {
    if (escolaId) {
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}`)
        .then(r => r.json())
        .then(data => setTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTurmas([]))
    } else {
      setTurmas([])
    }
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

  // Upload embedding
  const enviarEmbedding = async () => {
    if (!uploadAlunoId || !uploadFile) {
      toast.error('Selecione um arquivo de embedding')
      return
    }

    setEnviandoEmbed(true)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          const base64Data = result.includes(',') ? result.split(',')[1] : result
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(uploadFile)
      })

      const res = await fetch('/api/admin/facial/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: uploadAlunoId,
          embedding_data: base64,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Erro ao enviar embedding')
        return
      }

      toast.success('Embedding facial cadastrado com sucesso')
      setUploadAlunoId(null)
      setUploadFile(null)
      await buscarAlunos()
    } catch {
      toast.error('Erro ao processar arquivo')
    } finally {
      setEnviandoEmbed(false)
    }
  }

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

                              {/* Upload button - only for consented students */}
                              {aluno.consentido && (
                                <button
                                  onClick={() => {
                                    setUploadAlunoId(aluno.aluno_id)
                                    setUploadFile(null)
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
                                  title="Upload de embedding"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  Embedding
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

        {/* Modal de Upload de Embedding */}
        {uploadAlunoId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  Upload de Embedding Facial
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Aluno: {alunos.find(a => a.aluno_id === uploadAlunoId)?.nome}
                </p>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arquivo de Embedding (base64)
                  </label>
                  <input
                    type="file"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Selecione o arquivo contendo os dados do embedding facial do aluno.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setUploadAlunoId(null)
                    setUploadFile(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarEmbedding}
                  disabled={enviandoEmbed || !uploadFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {enviandoEmbed && <LoadingSpinner />}
                  <Upload className="w-4 h-4" />
                  Enviar Embedding
                </button>
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
