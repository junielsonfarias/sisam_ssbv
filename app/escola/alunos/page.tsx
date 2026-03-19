'use client'

import ProtectedRoute from '@/components/protected-route'
import ModalHistoricoAluno from '@/components/modal-historico-aluno'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Eye, School, UserCircle, Plus, Edit3, Trash2,
  X, Save, GraduationCap, Users, AlertTriangle, CheckCircle
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner'
import { normalizarSerie, ordenarSeries } from '@/lib/dados/utils'
import { SITUACOES } from '@/lib/situacoes-config'
import { useSeries } from '@/lib/use-series'

interface Aluno {
  id: string
  codigo: string | null
  nome: string
  escola_id: string
  turma_id: string | null
  serie: string | null
  ano_letivo: string | null
  ativo: boolean
  situacao?: string | null
  cpf?: string | null
  data_nascimento?: string | null
  pcd?: boolean
  sexo?: string | null
  escola_nome?: string
  turma_codigo?: string
  turma_nome?: string
}

interface FormAluno {
  nome: string
  cpf: string
  data_nascimento: string
  sexo: string
  pcd: boolean
  turma_id: string
  serie: string
  ano_letivo: string
}

const formInicial: FormAluno = {
  nome: '', cpf: '', data_nascimento: '', sexo: '',
  pcd: false, turma_id: '', serie: '', ano_letivo: new Date().getFullYear().toString()
}

export default function AlunosEscolaPage() {
  const toast = useToast()
  const router = useRouter()
  const { formatSerie } = useSeries()
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [todasTurmas, setTodasTurmas] = useState<any[]>([])
  const [seriesDisponiveis, setSeriesDisponiveis] = useState<string[]>([])
  const [escolaId, setEscolaId] = useState<string>('')
  const [escolaNome, setEscolaNome] = useState<string>('')
  const [poloNome, setPoloNome] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroAno, setFiltroAno] = useState('')

  // Modal de histórico
  const [mostrarModalHistorico, setMostrarModalHistorico] = useState(false)
  const [historicoAluno, setHistoricoAluno] = useState<any>(null)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Modal criar/editar aluno
  const [mostrarModal, setMostrarModal] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null)
  const [formData, setFormData] = useState<FormAluno>(formInicial)
  const [salvando, setSalvando] = useState(false)

  // Confirmação de exclusão
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null)

  // Resumo
  const [resumo, setResumo] = useState({ total: 0, ativos: 0, transferidos: 0, pcd: 0 })

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const carregarDadosIniciais = async () => {
      try {
        const response = await fetch('/api/auth/verificar', { signal: abortController.signal })
        const data = await response.json()
        if (data.usuario && data.usuario.escola_id) {
          setEscolaId(data.usuario.escola_id)

          const escolaRes = await fetch(`/api/admin/escolas?id=${data.usuario.escola_id}`, { signal: abortController.signal })
          const escolaData = await escolaRes.json()
          if (Array.isArray(escolaData) && escolaData.length > 0) {
            setEscolaNome(escolaData[0].nome)
            setPoloNome(escolaData[0].polo_nome || '')
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
        }
      } finally {
        if (!abortController.signal.aborted) {
          setCarregando(false)
        }
      }
    }
    carregarDadosIniciais()

    return () => { abortController.abort() }
  }, [])

  // Carregar séries disponíveis
  useEffect(() => {
    const carregarSeries = async () => {
      if (!escolaId) return
      try {
        const response = await fetch(`/api/admin/alunos?escola_id=${escolaId}&limite=200`)
        const data = await response.json()
        if (data.alunos && Array.isArray(data.alunos)) {
          const series = data.alunos
            .map((a: Aluno) => a.serie)
            .filter((serie: string | null): serie is string => Boolean(serie))
            .map((serie: string) => normalizarSerie(serie))
            .filter((serie: string) => serie !== '')
          const seriesUnicas = [...new Set(series)] as string[]
          setSeriesDisponiveis(ordenarSeries(seriesUnicas))
        }
      } catch (error) {
      }
    }
    carregarSeries()
  }, [escolaId])

  // Carregar turmas filtradas
  useEffect(() => {
    if (escolaId && filtroSerie) {
      carregarTurmas()
    } else {
      setTurmas([])
      setFiltroTurma('')
    }
  }, [filtroSerie, escolaId, filtroAno])

  // Carregar todas as turmas (para o modal)
  useEffect(() => {
    if (escolaId) {
      fetch(`/api/admin/turmas?escolas_ids=${escolaId}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setTodasTurmas(Array.isArray(data) ? data : []))
        .catch(() => setTodasTurmas([]))
    }
  }, [escolaId])

  const carregarTurmas = async () => {
    if (!escolaId || !filtroSerie) { setTurmas([]); return }
    try {
      const params = new URLSearchParams()
      params.append('escolas_ids', escolaId)
      params.append('serie', filtroSerie)
      if (filtroAno) params.append('ano_letivo', filtroAno)
      const response = await fetch(`/api/admin/turmas?${params}`)
      const data = await response.json()
      setTurmas(Array.isArray(data) ? data : [])
    } catch {
      setTurmas([])
    }
  }

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(timer)
  }, [busca])

  useEffect(() => { carregarAlunos() }, [buscaDebounced, filtroTurma, filtroSerie, filtroAno, escolaId])

  const carregarAlunos = useCallback(async () => {
    if (!escolaId) return
    try {
      setCarregando(true)
      const params = new URLSearchParams()
      params.append('escola_id', escolaId)
      if (filtroTurma) params.append('turma_id', filtroTurma)
      if (filtroSerie) params.append('serie', filtroSerie)
      if (filtroAno) params.append('ano_letivo', filtroAno)
      if (buscaDebounced) params.append('busca', buscaDebounced)
      params.append('limite', '200')

      const data = await fetch(`/api/admin/alunos?${params}`).then(r => r.ok ? r.json() : Promise.reject())

      const lista = data.alunos && Array.isArray(data.alunos) ? data.alunos : Array.isArray(data) ? data : []
      setAlunos(lista)

      // Calcular resumo
      const ativos = lista.filter((a: Aluno) => a.ativo)
      setResumo({
        total: lista.length,
        ativos: ativos.length,
        transferidos: lista.filter((a: Aluno) => a.situacao === 'transferido').length,
        pcd: lista.filter((a: Aluno) => a.pcd).length
      })
    } catch {
      setAlunos([])
    } finally {
      setCarregando(false)
    }
  }, [buscaDebounced, filtroTurma, filtroSerie, filtroAno, escolaId])

  const handleVisualizarHistorico = useCallback(async (aluno: Aluno) => {
    setCarregandoHistorico(true)
    setMostrarModalHistorico(true)
    setHistoricoAluno(null)
    try {
      const response = await fetch(`/api/admin/alunos/historico?aluno_id=${encodeURIComponent(aluno.id)}`)
      const data = await response.json()
      if (response.ok) {
        setHistoricoAluno(data)
      } else {
        toast.error(data.mensagem || 'Erro ao carregar histórico')
        setMostrarModalHistorico(false)
      }
    } catch {
      toast.error('Erro ao carregar histórico')
      setMostrarModalHistorico(false)
    } finally {
      setCarregandoHistorico(false)
    }
  }, [toast])

  const abrirModalCriar = () => {
    setAlunoEditando(null)
    setFormData({ ...formInicial, ano_letivo: filtroAno || new Date().getFullYear().toString() })
    setMostrarModal(true)
  }

  const abrirModalEditar = (aluno: Aluno) => {
    setAlunoEditando(aluno)
    setFormData({
      nome: aluno.nome,
      cpf: aluno.cpf || '',
      data_nascimento: aluno.data_nascimento ? aluno.data_nascimento.split('T')[0] : '',
      sexo: aluno.sexo || '',
      pcd: aluno.pcd || false,
      turma_id: aluno.turma_id || '',
      serie: aluno.serie || '',
      ano_letivo: aluno.ano_letivo || new Date().getFullYear().toString()
    })
    setMostrarModal(true)
  }

  const salvarAluno = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setSalvando(true)
    try {
      const body: any = {
        nome: formData.nome.trim(),
        escola_id: escolaId,
        cpf: formData.cpf || null,
        data_nascimento: formData.data_nascimento || null,
        sexo: formData.sexo || null,
        pcd: formData.pcd,
        turma_id: formData.turma_id || null,
        serie: formData.serie || null,
        ano_letivo: formData.ano_letivo || null
      }

      if (alunoEditando) {
        body.id = alunoEditando.id
        const res = await fetch('/api/admin/alunos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (res.ok) {
          toast.success('Aluno atualizado')
          setMostrarModal(false)
          carregarAlunos()
        } else {
          const err = await res.json()
          toast.error(err.mensagem || 'Erro ao atualizar')
        }
      } else {
        const res = await fetch('/api/admin/alunos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (res.ok) {
          toast.success('Aluno cadastrado')
          setMostrarModal(false)
          carregarAlunos()
        } else {
          const err = await res.json()
          toast.error(err.mensagem || 'Erro ao cadastrar')
        }
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const excluirAluno = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/alunos?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Aluno excluído')
        setConfirmandoExclusao(null)
        carregarAlunos()
      } else {
        const err = await res.json()
        toast.error(err.mensagem || 'Erro ao excluir')
      }
    } catch {
      toast.error('Erro de conexão')
    }
  }

  const getSituacaoConfig = (situacao: string | null | undefined) => {
    const cfg = SITUACOES.find(s => s.value === situacao)
    return cfg || SITUACOES.find(s => s.value === 'cursando')!
  }

  const alunosFiltrados = useMemo(() => {
    return alunos.filter(aluno => {
      if (buscaDebounced && !aluno.nome.toLowerCase().includes(buscaDebounced.toLowerCase())) return false
      return true
    })
  }, [alunos, buscaDebounced])

  // Turmas do modal filtradas pela série selecionada
  const turmasDoModal = useMemo(() => {
    if (!formData.serie) return todasTurmas
    return todasTurmas.filter(t => t.serie === formData.serie || !t.serie)
  }, [todasTurmas, formData.serie])

  return (
    <ProtectedRoute tiposPermitidos={['escola']}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Alunos</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {escolaNome && `${escolaNome}`}
              {poloNome && <span className="text-gray-500 dark:text-gray-500"> - Polo: {poloNome}</span>}
            </p>
          </div>
          <button
            onClick={abrirModalCriar}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Aluno
          </button>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', valor: resumo.total, icon: Users, cor: 'text-blue-600' },
            { label: 'Ativos', valor: resumo.ativos, icon: CheckCircle, cor: 'text-emerald-600' },
            { label: 'Transferidos', valor: resumo.transferidos, icon: AlertTriangle, cor: 'text-orange-600' },
            { label: 'PCD', valor: resumo.pcd, icon: GraduationCap, cor: 'text-purple-600' }
          ].map((c, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-3 text-center">
              <c.icon className={`w-5 h-5 mx-auto mb-1 ${c.cor}`} />
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{c.valor}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar Aluno</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Nome do aluno..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escola</label>
              <input
                type="text"
                value={escolaNome || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
              <select
                value={filtroSerie}
                onChange={e => { setFiltroSerie(e.target.value); setFiltroTurma('') }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              >
                <option value="">Todas</option>
                {seriesDisponiveis.map(serie => <option key={serie} value={serie}>{serie}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
              <select
                value={filtroTurma}
                onChange={e => setFiltroTurma(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                disabled={!filtroSerie || turmas.length === 0}
              >
                <option value="">Todas</option>
                {turmas.map(turma => (
                  <option key={turma.id} value={turma.id}>
                    {turma.codigo || turma.nome || `Turma ${turma.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
              <input
                type="text"
                value={filtroAno}
                onChange={e => setFiltroAno(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                placeholder="Ex: 2026"
              />
            </div>
          </div>
        </div>

        {/* Tabela de Alunos */}
        {carregando ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Carregando alunos...</p>
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
            <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhum aluno encontrado</p>
            <p className="text-sm text-gray-400 mt-2">
              {busca || filtroTurma || filtroSerie || filtroAno ? 'Tente ajustar os filtros' : 'Clique em "Novo Aluno" para cadastrar'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-indigo-50 dark:bg-indigo-900/30">
                  <tr>
                    <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden sm:table-cell">Código</th>
                    <th className="text-left py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Nome</th>
                    <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Turma</th>
                    <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden md:table-cell">Série</th>
                    <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm hidden lg:table-cell">Situação</th>
                    <th className="text-center py-2 px-2 md:py-3 md:px-4 font-semibold text-gray-700 dark:text-gray-200 text-xs md:text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {alunosFiltrados.map(aluno => {
                    const sitCfg = getSituacaoConfig(aluno.situacao)
                    return (
                      <tr key={aluno.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap hidden sm:table-cell">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-mono">{aluno.codigo || '-'}</span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/admin/alunos/${aluno.id}`)}
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-xs md:text-sm underline cursor-pointer text-left truncate max-w-[120px] sm:max-w-[200px] md:max-w-none"
                            title="Ver perfil completo"
                          >
                            {aluno.nome}
                          </button>
                          {aluno.pcd && (
                            <span className="ml-1 text-[10px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">PCD</span>
                          )}
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{aluno.turma_codigo || '-'}</span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden md:table-cell">
                          <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{formatSerie(aluno.serie)}</span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap hidden lg:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sitCfg.cor}`}>
                            {sitCfg.label}
                          </span>
                        </td>
                        <td className="py-2 px-2 md:py-3 md:px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => router.push(`/admin/alunos/${aluno.id}`)}
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                              title="Ver perfil"
                            >
                              <UserCircle className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button
                              onClick={() => handleVisualizarHistorico(aluno)}
                              disabled={carregandoHistorico}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-50"
                              title="Ver histórico"
                            >
                              <Eye className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button
                              onClick={() => abrirModalEditar(aluno)}
                              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/30"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            {confirmandoExclusao === aluno.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => excluirAluno(aluno.id)}
                                  className="text-red-600 hover:text-red-800 p-1 text-xs font-medium"
                                  title="Confirmar"
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setConfirmandoExclusao(null)}
                                  className="text-gray-500 hover:text-gray-700 p-1 text-xs"
                                  title="Cancelar"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmandoExclusao(aluno.id)}
                                className="text-red-500 dark:text-red-400 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
              {alunosFiltrados.length} aluno(s) encontrado(s)
            </div>
          </div>
        )}

        {/* Modal criar/editar aluno */}
        {mostrarModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setMostrarModal(false)}></div>
              <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {alunoEditando ? 'Editar Aluno' : 'Novo Aluno'}
                  </h2>
                  <button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.data_nascimento}
                      onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sexo</label>
                    <select
                      value={formData.sexo}
                      onChange={e => setFormData({ ...formData, sexo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Série</label>
                    <select
                      value={formData.serie}
                      onChange={e => setFormData({ ...formData, serie: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {seriesDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma</label>
                    <select
                      value={formData.turma_id}
                      onChange={e => setFormData({ ...formData, turma_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {turmasDoModal.map(t => <option key={t.id} value={t.id}>{t.codigo} {t.serie ? `- ${formatSerie(t.serie)}` : ''}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Letivo</label>
                    <input
                      type="text"
                      value={formData.ano_letivo}
                      onChange={e => setFormData({ ...formData, ano_letivo: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-2">
                      <input
                        type="checkbox"
                        checked={formData.pcd}
                        onChange={e => setFormData({ ...formData, pcd: e.target.checked })}
                        className="rounded"
                      />
                      PCD
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setMostrarModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarAluno}
                    disabled={salvando || !formData.nome.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {salvando ? <><ButtonSpinner /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ModalHistoricoAluno
          mostrar={mostrarModalHistorico}
          historico={historicoAluno}
          carregando={carregandoHistorico}
          onClose={() => {
            setMostrarModalHistorico(false)
            setHistoricoAluno(null)
          }}
        />
      </div>
    </ProtectedRoute>
  )
}
