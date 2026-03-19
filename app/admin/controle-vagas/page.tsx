'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState, useMemo } from 'react'
import {
  Users, School, AlertTriangle, CheckCircle, Edit3, Save,
  X, UserPlus, Clock, ChevronDown, ChevronUp, RefreshCw,
  Search, Trash2, Plus, BarChart3, Settings, Send, Ban
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'

interface PoloSimples { id: string; nome: string }
interface EscolaSimples { id: string; nome: string; polo_id?: string }

interface TurmaVaga {
  id: string; codigo: string; serie: string; ano_letivo: string
  capacidade_maxima: number; alunos_matriculados: number
  vagas_disponiveis: number; fila_espera: number
  percentual_ocupacao: number; escola_nome: string; escola_id: string
}

interface Resumo {
  total_turmas: number; total_vagas: number; total_matriculados: number
  total_disponiveis: number; total_fila: number; turmas_lotadas: number
  ocupacao_media: number
}

interface DadosSerie {
  serie: string; capacidade: number; matriculados: number; vagas: number; fila: number
}

interface ItemFila {
  id: string; posicao: number; status: string; observacao: string
  data_entrada: string; data_convocacao: string | null; data_resolucao: string | null
  aluno_nome: string; aluno_codigo: string; aluno_id: string
  aluno_serie: string | null; dias_espera: number
  turma_codigo: string; turma_serie: string; turma_id: string
  escola_nome: string; escola_id: string
}

interface ResumoFila {
  total: number; aguardando: number; convocados: number; matriculados: number; desistentes: number
}

interface AlunoParaFila {
  id: string; nome: string; codigo: string; serie: string | null; escola_nome: string
}

type FiltroOcupacao = '' | 'lotada' | 'com_vagas' | 'com_fila'

export default function ControleVagasPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()

  const [tipoUsuario, setTipoUsuario] = useState('')
  const [polos, setPolos] = useState<PoloSimples[]>([])
  const [poloId, setPoloId] = useState('')
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [todasEscolas, setTodasEscolas] = useState<EscolaSimples[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())

  const [turmas, setTurmas] = useState<TurmaVaga[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [porSerie, setPorSerie] = useState<DadosSerie[]>([])
  const [carregando, setCarregando] = useState(true)

  // Edição de capacidade
  const [editandoId, setEditandoId] = useState('')
  const [novaCapacidade, setNovaCapacidade] = useState(35)
  const [salvando, setSalvando] = useState(false)

  // Edição em lote
  const [modoLote, setModoLote] = useState(false)
  const [capacidadesLote, setCapacidadesLote] = useState<Record<string, number>>({})

  // Fila de espera
  const [filaAberta, setFilaAberta] = useState('')
  const [fila, setFila] = useState<ItemFila[]>([])
  const [resumoFila, setResumoFila] = useState<ResumoFila | null>(null)
  const [carregandoFila, setCarregandoFila] = useState(false)

  // Modal adicionar à fila
  const [modalFila, setModalFila] = useState<{ turmaId: string; turmaCode: string; escolaId: string } | null>(null)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<AlunoParaFila[]>([])
  const [buscandoAluno, setBuscandoAluno] = useState(false)
  const [observacaoFila, setObservacaoFila] = useState('')
  const [adicionandoFila, setAdicionandoFila] = useState(false)

  // Confirmação de remoção
  const [confirmandoRemocao, setConfirmandoRemocao] = useState<string | null>(null)

  // Filtros
  const [filtroSerie, setFiltroSerie] = useState('')
  const [filtroOcupacao, setFiltroOcupacao] = useState<FiltroOcupacao>('')

  // Gráfico expandido
  const [mostrarGrafico, setMostrarGrafico] = useState(true)

  useEffect(() => {
    const u = localStorage.getItem('usuario')
    if (u) {
      const parsed = JSON.parse(u)
      setTipoUsuario(parsed.tipo_usuario)
      if (parsed.tipo_usuario === 'escola' && parsed.escola_id) {
        setEscolaId(parsed.escola_id)
      }
      if (parsed.tipo_usuario === 'polo' && parsed.polo_id) {
        setPoloId(parsed.polo_id)
      }
    }
    // Carregar polos
    fetch('/api/admin/polos')
      .then(r => r.json())
      .then(data => setPolos(Array.isArray(data) ? data : []))
      .catch(() => {})
    // Carregar escolas
    fetch('/api/admin/escolas')
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : data.dados || []
        setTodasEscolas(lista)
        setEscolas(lista)
      })
      .catch(() => {})
  }, [])

  // Filtrar escolas por polo selecionado
  useEffect(() => {
    if (poloId) {
      setEscolas(todasEscolas.filter(e => e.polo_id === poloId))
      // Se a escola selecionada não pertence ao polo, limpar
      const escolaPertence = todasEscolas.find(e => e.id === escolaId && e.polo_id === poloId)
      if (escolaId && !escolaPertence) setEscolaId('')
    } else {
      setEscolas(todasEscolas)
    }
  }, [poloId, todasEscolas])

  useEffect(() => { carregarDados() }, [escolaId, poloId, anoLetivo])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo })
      if (escolaId) params.set('escola_id', escolaId)
      if (poloId && !escolaId) params.set('polo_id', poloId)
      const res = await fetch(`/api/admin/controle-vagas?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTurmas(data.turmas)
        setResumo(data.resumo)
        setPorSerie(data.por_serie || [])
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }

  const salvarCapacidade = async (turmaId: string) => {
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/controle-vagas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, capacidade_maxima: novaCapacidade })
      })
      if (res.ok) {
        toast.success('Capacidade atualizada')
        setEditandoId('')
        carregarDados()
      } else {
        const err = await res.json()
        toast.error(err.mensagem || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const salvarLote = async () => {
    const lote = Object.entries(capacidadesLote).map(([turma_id, capacidade_maxima]) => ({
      turma_id, capacidade_maxima
    }))
    if (lote.length === 0) { toast.error('Nenhuma alteração'); return }
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/controle-vagas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lote })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.mensagem)
        setModoLote(false)
        setCapacidadesLote({})
        carregarDados()
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const iniciarModoLote = () => {
    const caps: Record<string, number> = {}
    turmasFiltradas.forEach(t => { caps[t.id] = t.capacidade_maxima })
    setCapacidadesLote(caps)
    setModoLote(true)
  }

  const abrirFila = async (turmaId: string) => {
    if (filaAberta === turmaId) { setFilaAberta(''); return }
    setFilaAberta(turmaId)
    setCarregandoFila(true)
    try {
      const res = await fetch(`/api/admin/controle-vagas/fila?turma_id=${turmaId}`)
      if (res.ok) {
        const data = await res.json()
        setFila(data.itens || data)
        setResumoFila(data.resumo || null)
      }
    } catch {
      toast.error('Erro ao carregar fila')
    } finally {
      setCarregandoFila(false)
    }
  }

  const atualizarStatusFila = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/controle-vagas/fila', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.mensagem || `Status: ${status}`)
        abrirFila(filaAberta)
        if (status === 'matriculado') carregarDados()
      }
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const removerDaFila = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/controle-vagas/fila?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Aluno removido da fila')
        setConfirmandoRemocao(null)
        abrirFila(filaAberta)
        carregarDados()
      }
    } catch {
      toast.error('Erro ao remover')
    }
  }

  // Busca de aluno para adicionar à fila
  useEffect(() => {
    if (!buscaAluno || buscaAluno.length < 2) { setResultadosBusca([]); return }
    const timer = setTimeout(async () => {
      setBuscandoAluno(true)
      try {
        const res = await fetch(`/api/admin/matriculas/alunos/buscar?busca=${encodeURIComponent(buscaAluno)}`)
        const data = await res.json()
        setResultadosBusca(Array.isArray(data) ? data : [])
      } catch {
        setResultadosBusca([])
      } finally {
        setBuscandoAluno(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [buscaAluno])

  const adicionarAFila = async (alunoId: string) => {
    if (!modalFila) return
    setAdicionandoFila(true)
    try {
      const res = await fetch('/api/admin/controle-vagas/fila', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: alunoId,
          turma_id: modalFila.turmaId,
          escola_id: modalFila.escolaId,
          observacao: observacaoFila || null
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensagem)
        setModalFila(null)
        setBuscaAluno('')
        setResultadosBusca([])
        setObservacaoFila('')
        carregarDados()
        if (filaAberta === modalFila.turmaId) abrirFila(filaAberta)
      } else {
        toast.error(data.mensagem || 'Erro ao adicionar')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setAdicionandoFila(false)
    }
  }

  const getCorOcupacao = (pct: number) => {
    if (pct >= 100) return 'bg-red-500'
    if (pct >= 85) return 'bg-orange-500'
    if (pct >= 60) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  const getCorTextoOcupacao = (pct: number) => {
    if (pct >= 100) return 'text-red-600 dark:text-red-400'
    if (pct >= 85) return 'text-orange-600 dark:text-orange-400'
    return 'text-emerald-600 dark:text-emerald-400'
  }

  const formatarDiasEspera = (dias: number) => {
    if (dias === 0) return 'Hoje'
    if (dias === 1) return '1 dia'
    if (dias < 30) return `${Math.floor(dias)} dias`
    if (dias < 60) return '1 mês'
    return `${Math.floor(dias / 30)} meses`
  }

  const seriesUnicas = [...new Set(turmas.map(t => t.serie))].sort()

  const turmasFiltradas = useMemo(() => {
    let resultado = turmas
    if (filtroSerie) resultado = resultado.filter(t => t.serie === filtroSerie)
    if (filtroOcupacao === 'lotada') resultado = resultado.filter(t => t.vagas_disponiveis <= 0)
    if (filtroOcupacao === 'com_vagas') resultado = resultado.filter(t => t.vagas_disponiveis > 0)
    if (filtroOcupacao === 'com_fila') resultado = resultado.filter(t => t.fila_espera > 0)
    return resultado
  }, [turmas, filtroSerie, filtroOcupacao])

  const isAdmin = tipoUsuario !== 'escola' && tipoUsuario !== 'polo' && tipoUsuario !== ''

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Controle de Vagas</h1>
                <p className="text-sm text-gray-300">Capacidade, ocupação e fila de espera</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={anoLetivo}
                onChange={e => setAnoLetivo(e.target.value)}
                className="bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 text-sm"
              >
                {[2024, 2025, 2026].map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
              </select>
              {tipoUsuario !== 'escola' && tipoUsuario !== 'polo' && (
                <select
                  value={poloId}
                  onChange={e => { setPoloId(e.target.value); setEscolaId('') }}
                  className="bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 text-sm max-w-44"
                >
                  <option value="" className="text-gray-800">Todos os polos</option>
                  {polos.map(p => <option key={p.id} value={p.id} className="text-gray-800">{p.nome}</option>)}
                </select>
              )}
              {tipoUsuario !== 'escola' && (
                <select
                  value={escolaId}
                  onChange={e => setEscolaId(e.target.value)}
                  className="bg-white/20 border border-white/30 rounded-lg px-3 py-1.5 text-sm max-w-48"
                >
                  <option value="" className="text-gray-800">{poloId ? 'Todas do polo' : 'Todas as escolas'}</option>
                  {escolas.map(e => <option key={e.id} value={e.id} className="text-gray-800">{e.nome}</option>)}
                </select>
              )}
              <button onClick={carregarDados} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition" title="Atualizar">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Cards resumo */}
        {resumo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Turmas', valor: resumo.total_turmas, icon: School, cor: 'text-blue-600' },
              { label: 'Capacidade', valor: resumo.total_vagas, icon: Users, cor: 'text-gray-600' },
              { label: 'Matriculados', valor: resumo.total_matriculados, icon: CheckCircle, cor: 'text-emerald-600' },
              { label: 'Vagas Livres', valor: resumo.total_disponiveis, icon: UserPlus, cor: 'text-indigo-600' },
              { label: 'Fila de Espera', valor: resumo.total_fila, icon: Clock, cor: 'text-orange-600' },
              { label: 'Lotadas', valor: resumo.turmas_lotadas, icon: AlertTriangle, cor: 'text-red-600' },
              { label: 'Ocupação', valor: `${resumo.ocupacao_media}%`, icon: BarChart3, cor: 'text-purple-600' }
            ].map((c, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 text-center">
                <c.icon className={`w-5 h-5 mx-auto mb-1 ${c.cor}`} />
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{c.valor}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Gráfico de ocupação por série */}
        {porSerie.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
            <button
              onClick={() => setMostrarGrafico(!mostrarGrafico)}
              className="flex items-center justify-between w-full"
            >
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Ocupação por Série
              </h3>
              {mostrarGrafico ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {mostrarGrafico && (
              <div className="mt-4 space-y-3">
                {porSerie.map(s => {
                  const pct = s.capacidade > 0 ? Math.round((s.matriculados / s.capacidade) * 100) : 0
                  return (
                    <div key={s.serie} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 text-right flex-shrink-0">
                        {formatSerie(s.serie)}
                      </span>
                      <div className="flex-1 relative">
                        <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${getCorOcupacao(pct)}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          >
                            {pct >= 20 && (
                              <span className="text-white text-xs font-bold">{pct}%</span>
                            )}
                          </div>
                        </div>
                        {pct < 20 && (
                          <span className={`absolute right-2 top-0.5 text-xs font-bold ${getCorTextoOcupacao(pct)}`}>{pct}%</span>
                        )}
                      </div>
                      <div className="w-32 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                        <span>{s.matriculados}/{s.capacidade}</span>
                        {s.fila > 0 && (
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            +{s.fila} fila
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Filtrar:</span>

          {/* Série */}
          <button
            onClick={() => setFiltroSerie('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              !filtroSerie ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
          >
            Todas
          </button>
          {seriesUnicas.map(s => (
            <button
              key={s}
              onClick={() => setFiltroSerie(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filtroSerie === s ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              {formatSerie(s)}
            </button>
          ))}

          <span className="text-gray-300 dark:text-gray-600">|</span>

          {/* Status ocupação */}
          {[
            { value: '' as FiltroOcupacao, label: 'Todas', cor: '' },
            { value: 'lotada' as FiltroOcupacao, label: 'Lotadas', cor: 'text-red-600' },
            { value: 'com_vagas' as FiltroOcupacao, label: 'Com vagas', cor: 'text-emerald-600' },
            { value: 'com_fila' as FiltroOcupacao, label: 'Com fila', cor: 'text-orange-600' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFiltroOcupacao(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filtroOcupacao === f.value
                  ? 'bg-slate-700 text-white dark:bg-slate-500'
                  : `bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 ${f.cor}`
              }`}
            >
              {f.label}
            </button>
          ))}

          {isAdmin && (
            <div className="ml-auto">
              {modoLote ? (
                <div className="flex gap-2">
                  <button
                    onClick={salvarLote}
                    disabled={salvando}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {salvando ? <ButtonSpinner /> : <Save className="w-3.5 h-3.5" />}
                    Salvar Lote
                  </button>
                  <button
                    onClick={() => { setModoLote(false); setCapacidadesLote({}) }}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-300"
                  >
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={iniciarModoLote}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                >
                  <Settings className="w-3.5 h-3.5" /> Editar Capacidades em Lote
                </button>
              )}
            </div>
          )}
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando vagas..." centered />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700 border-b dark:border-slate-600">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Turma</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Escola</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Série</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Capacidade</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Matriculados</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Vagas</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Ocupação</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Fila</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {turmasFiltradas.map(t => (
                    <>
                      <tr key={t.id} className={`border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                        t.vagas_disponiveis <= 0 ? 'bg-red-50/30 dark:bg-red-900/5' : ''
                      }`}>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{t.codigo}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs hidden lg:table-cell">{t.escola_nome}</td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{formatSerie(t.serie)}</td>
                        <td className="px-4 py-3 text-center">
                          {modoLote ? (
                            <input
                              type="number"
                              value={capacidadesLote[t.id] || t.capacidade_maxima}
                              onChange={e => setCapacidadesLote({ ...capacidadesLote, [t.id]: parseInt(e.target.value) || 0 })}
                              className="w-16 border rounded px-2 py-0.5 text-center text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              min={1} max={100}
                            />
                          ) : editandoId === t.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={novaCapacidade}
                                onChange={e => setNovaCapacidade(parseInt(e.target.value) || 0)}
                                className="w-16 border rounded px-2 py-0.5 text-center text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                min={1} max={100}
                              />
                              <button onClick={() => salvarCapacidade(t.id)} disabled={salvando} className="text-emerald-600 hover:text-emerald-700 p-1">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditandoId('')} className="text-gray-400 hover:text-gray-600 p-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300">{t.capacidade_maxima}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200">{t.alunos_matriculados}</td>
                        <td className={`px-4 py-3 text-center font-bold ${
                          t.vagas_disponiveis <= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {t.vagas_disponiveis}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 bg-gray-200 dark:bg-slate-600 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all ${getCorOcupacao(t.percentual_ocupacao)}`}
                                style={{ width: `${Math.min(100, t.percentual_ocupacao)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-9 text-right ${getCorTextoOcupacao(t.percentual_ocupacao)}`}>
                              {t.percentual_ocupacao}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => abrirFila(t.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
                              t.fila_espera > 0
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {t.fila_espera > 0 ? t.fila_espera : '0'}
                            {filaAberta === t.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin && !modoLote && (
                              <button
                                onClick={() => { setEditandoId(t.id); setNovaCapacidade(t.capacidade_maxima) }}
                                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 p-1"
                                title="Editar capacidade"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setModalFila({ turmaId: t.id, turmaCode: t.codigo, escolaId: t.escola_id })}
                              className="text-orange-600 hover:text-orange-700 dark:text-orange-400 p-1"
                              title="Adicionar à fila de espera"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Fila de espera expandida */}
                      {filaAberta === t.id && (
                        <tr key={`fila-${t.id}`}>
                          <td colSpan={9} className="px-4 py-3 bg-orange-50/50 dark:bg-orange-900/5">
                            {carregandoFila ? (
                              <LoadingSpinner text="Carregando fila..." centered />
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" /> Fila de Espera — {t.codigo}
                                  </h4>
                                  {resumoFila && (
                                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                                      <span className="text-yellow-600">{resumoFila.aguardando} aguardando</span>
                                      <span className="text-blue-600">{resumoFila.convocados} convocados</span>
                                      <span className="text-emerald-600">{resumoFila.matriculados} matriculados</span>
                                      <span className="text-gray-400">{resumoFila.desistentes} desistentes</span>
                                    </div>
                                  )}
                                </div>

                                {fila.length === 0 ? (
                                  <div className="text-center py-4">
                                    <p className="text-sm text-gray-500">Nenhum aluno na fila</p>
                                    <button
                                      onClick={() => setModalFila({ turmaId: t.id, turmaCode: t.codigo, escolaId: t.escola_id })}
                                      className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 mx-auto"
                                    >
                                      <Plus className="w-4 h-4" /> Adicionar aluno à fila
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {fila.map(f => (
                                      <div key={f.id} className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm shadow-sm transition ${
                                        f.status === 'aguardando' ? 'bg-white dark:bg-slate-800' :
                                        f.status === 'convocado' ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800' :
                                        f.status === 'matriculado' ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800' :
                                        'bg-gray-50 dark:bg-slate-700/50 opacity-60'
                                      }`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            f.status === 'aguardando' ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200' :
                                            f.status === 'convocado' ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' :
                                            f.status === 'matriculado' ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' :
                                            'bg-gray-200 text-gray-600'
                                          }`}>
                                            {f.posicao}
                                          </span>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{f.aluno_nome}</span>
                                              <span className="text-gray-400 text-xs flex-shrink-0">{f.aluno_codigo}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                              <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {formatarDiasEspera(f.dias_espera)}
                                              </span>
                                              {f.observacao && (
                                                <span className="italic truncate max-w-[200px]" title={f.observacao}>
                                                  "{f.observacao}"
                                                </span>
                                              )}
                                              {f.data_convocacao && f.status === 'convocado' && (
                                                <span className="text-blue-500">
                                                  Convocado em {new Date(f.data_convocacao).toLocaleDateString('pt-BR')}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            f.status === 'aguardando' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            f.status === 'convocado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            f.status === 'matriculado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                          }`}>
                                            {f.status === 'aguardando' ? 'Aguardando' :
                                             f.status === 'convocado' ? 'Convocado' :
                                             f.status === 'matriculado' ? 'Matriculado' : 'Desistente'}
                                          </span>

                                          {f.status === 'aguardando' && (
                                            <button
                                              onClick={() => atualizarStatusFila(f.id, 'convocado')}
                                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded hover:bg-blue-100 transition"
                                              title="Convocar aluno"
                                            >
                                              <Send className="w-3 h-3" /> Convocar
                                            </button>
                                          )}
                                          {f.status === 'convocado' && (
                                            <>
                                              <button
                                                onClick={() => atualizarStatusFila(f.id, 'matriculado')}
                                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded hover:bg-emerald-100 transition"
                                                title="Matricular (vincula à turma)"
                                              >
                                                <CheckCircle className="w-3 h-3" /> Matricular
                                              </button>
                                              <button
                                                onClick={() => atualizarStatusFila(f.id, 'desistente')}
                                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                                                title="Marcar desistência"
                                              >
                                                <Ban className="w-3 h-3" />
                                              </button>
                                            </>
                                          )}

                                          {(f.status === 'aguardando' || f.status === 'convocado') && (
                                            confirmandoRemocao === f.id ? (
                                              <div className="flex items-center gap-1 text-xs">
                                                <button onClick={() => removerDaFila(f.id)} className="text-red-600 font-medium hover:text-red-700">Confirmar</button>
                                                <button onClick={() => setConfirmandoRemocao(null)} className="text-gray-500">Cancelar</button>
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() => setConfirmandoRemocao(f.id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="Remover da fila"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {turmasFiltradas.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhuma turma encontrada</p>
              </div>
            )}
          </div>
        )}

        {/* Modal: Adicionar aluno à fila */}
        {modalFila && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => { setModalFila(null); setBuscaAluno(''); setResultadosBusca([]) }}></div>
              <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-orange-600" />
                    Adicionar à Fila — {modalFila.turmaCode}
                  </h2>
                  <button
                    onClick={() => { setModalFila(null); setBuscaAluno(''); setResultadosBusca([]) }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar Aluno</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={buscaAluno}
                      onChange={e => setBuscaAluno(e.target.value)}
                      placeholder="Digite nome, código ou CPF..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                      autoFocus
                    />
                  </div>
                </div>

                {buscandoAluno && <p className="text-sm text-gray-500">Buscando...</p>}

                {resultadosBusca.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-700">
                    {resultadosBusca.map(aluno => (
                      <button
                        key={aluno.id}
                        onClick={() => adicionarAFila(aluno.id)}
                        disabled={adicionandoFila}
                        className="w-full flex items-center justify-between p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{aluno.nome}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {aluno.codigo && <span>Cód: {aluno.codigo}</span>}
                            {aluno.escola_nome && <span> | {aluno.escola_nome}</span>}
                            {aluno.serie && <span> | {formatSerie(aluno.serie)}</span>}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-orange-600 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação (opcional)</label>
                  <input
                    type="text"
                    value={observacaoFila}
                    onChange={e => setObservacaoFila(e.target.value)}
                    placeholder="Motivo, contato do responsável..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
