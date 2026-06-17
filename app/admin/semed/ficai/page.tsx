'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Home,
  Mail,
  MessageSquare,
  Users,
  RefreshCw,
  FileText,
  ArrowRight,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Caso {
  id: string
  aluno_id: string
  aluno_nome: string
  matricula: string | null
  escola_id: string
  escola_nome: string
  ano_letivo: string
  origem: string
  motivo: string
  detalhes_motivo: string | null
  status: string
  faltas_consecutivas: number | null
  pct_faltas_mes: number | null
  ultima_presenca: string | null
  aberto_em: string
  contato_responsavel_em: string | null
  encaminhado_em: string | null
  concluido_em: string | null
  observacoes: string | null
}

interface Acao {
  id: string
  tipo: string
  descricao: string
  anexo_url: string | null
  realizado_por_nome: string | null
  realizado_em: string
}

interface Estatisticas {
  total: number
  abertos: number
  resolvidos: number
  evasao_confirmada: number
  por_status: Record<string, number>
}

interface Escola {
  id: string
  nome: string
}

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aberto',
  contato_responsavel: 'Contato com responsável',
  aluno_retornou: 'Aluno retornou',
  encaminhado_conselho_tutelar: 'Conselho Tutelar',
  encaminhado_ministerio_publico: 'Ministério Público',
  concluido_aluno_transferido: 'Concluído — transferido',
  concluido_resolvido: 'Concluído — resolvido',
  concluido_evasao_confirmada: 'Concluído — evasão',
  cancelado: 'Cancelado',
}

const STATUS_BADGE: Record<string, string> = {
  aberto: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  contato_responsavel: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  aluno_retornou: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  encaminhado_conselho_tutelar: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  encaminhado_ministerio_publico: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  concluido_aluno_transferido: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  concluido_resolvido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  concluido_evasao_confirmada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  cancelado: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
}

const MOTIVO_LABEL: Record<string, string> = {
  infrequencia_50: '50%+ faltas no mês',
  ausencia_consecutiva: 'Ausência consecutiva',
  abandono_suspeito: 'Abandono suspeito',
  evasao_confirmada: 'Evasão confirmada',
  outro: 'Outro',
}

const ORIGEM_LABEL: Record<string, string> = {
  sistema: 'Detecção automática',
  manual_escola: 'Escola',
  manual_polo: 'Polo',
  manual_admin: 'Administrador',
}

const TIPO_ACAO_OPCOES = [
  { v: 'contato_telefone', label: 'Contato por telefone', icon: Phone },
  { v: 'contato_visita', label: 'Visita domiciliar', icon: Home },
  { v: 'contato_email', label: 'E-mail', icon: Mail },
  { v: 'contato_whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { v: 'reuniao_responsavel', label: 'Reunião com responsável', icon: Users },
  { v: 'aluno_retornou', label: 'Aluno retornou às aulas', icon: CheckCircle },
  { v: 'encaminhamento_conselho_tutelar', label: 'Encaminhamento Conselho Tutelar', icon: ArrowRight },
  { v: 'encaminhamento_ministerio_publico', label: 'Encaminhamento Ministério Público', icon: ArrowRight },
  { v: 'oficio_emitido', label: 'Ofício emitido', icon: FileText },
  { v: 'observacao', label: 'Observação', icon: FileText },
]

function FicaiAdmin() {
  const toast = useToast()
  // AbortController para handler "abrirDetalhes" — cliques rapidos em casos
  // diferentes devem cancelar o anterior para evitar setDetalhes do caso errado
  const abrirDetalhesAbortRef = useRef<AbortController | null>(null)
  const [casos, setCasos] = useState<Caso[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    total: 0,
    abertos: 0,
    resolvidos: 0,
    evasao_confirmada: 0,
    por_status: {},
  })
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [detectando, setDetectando] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [detalhes, setDetalhes] = useState<(Caso & { acoes: Acao[] }) | null>(null)
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)

  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()))
  const [apenasAbertos, setApenasAbertos] = useState(true)
  const [busca, setBusca] = useState('')

  const [novoStatus, setNovoStatus] = useState('')
  const [observacaoStatus, setObservacaoStatus] = useState('')
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [tipoAcao, setTipoAcao] = useState('contato_telefone')
  const [descricaoAcao, setDescricaoAcao] = useState('')
  const [salvandoAcao, setSalvandoAcao] = useState(false)

  const carregarEscolas = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/admin/escolas', { signal })
      const data = await res.json()
      setEscolas(Array.isArray(data) ? data : [])
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
    }
  }, [])

  const carregarCasos = useCallback(async (signal?: AbortSignal) => {
    try {
      setCarregando(true)
      const params = new URLSearchParams({ ano: filtroAno, limite: '100' })
      if (filtroEscola) params.set('escola', filtroEscola)
      if (filtroStatus) params.set('status', filtroStatus)
      if (apenasAbertos && !filtroStatus) params.set('apenasAbertos', 'true')

      const [casosRes, statsRes] = await Promise.all([
        fetch(`/api/admin/ficai?${params}`, { signal }),
        fetch(`/api/admin/ficai?estatisticas=true&ano=${filtroAno}`, { signal }),
      ])
      const casosData = await casosRes.json()
      const statsData = await statsRes.json()
      setCasos(casosData.casos || [])
      setEstatisticas(statsData.estatisticas || estatisticas)
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      toast.error('Erro ao carregar casos FICAI')
    } finally {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroAno, filtroEscola, filtroStatus, apenasAbertos])

  useEffect(() => {
    const controller = new AbortController()
    carregarEscolas(controller.signal)
    return () => controller.abort()
  }, [carregarEscolas])

  useEffect(() => {
    const controller = new AbortController()
    carregarCasos(controller.signal)
    return () => controller.abort()
  }, [carregarCasos])

  async function abrirDetalhes(caso: Caso) {
    if (expandido === caso.id) {
      setExpandido(null)
      setDetalhes(null)
      return
    }
    // Cancela request anterior (se houver) — evita race
    abrirDetalhesAbortRef.current?.abort()
    const controller = new AbortController()
    abrirDetalhesAbortRef.current = controller

    setExpandido(caso.id)
    setNovoStatus(caso.status)
    setObservacaoStatus('')
    setDescricaoAcao('')
    setTipoAcao('contato_telefone')
    setCarregandoDetalhes(true)
    try {
      const res = await fetch(`/api/admin/ficai/${caso.id}`, { signal: controller.signal })
      const data = await res.json()
      setDetalhes(data.caso)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar detalhes')
    } finally {
      if (abrirDetalhesAbortRef.current === controller) {
        setCarregandoDetalhes(false)
      }
    }
  }

  async function rodarDeteccao() {
    setDetectando(true)
    try {
      const res = await fetch('/api/admin/ficai/detectar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anoLetivo: filtroAno }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem || 'Erro')
      toast.success(data.mensagem)
      carregarCasos()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setDetectando(false)
    }
  }

  async function atualizarStatus(casoId: string) {
    if (!novoStatus) return
    setSalvandoStatus(true)
    try {
      const res = await fetch(`/api/admin/ficai/${casoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, observacao: observacaoStatus || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Status atualizado')
      setObservacaoStatus('')
      const detRes = await fetch(`/api/admin/ficai/${casoId}`)
      const detData = await detRes.json()
      setDetalhes(detData.caso)
      carregarCasos()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvandoStatus(false)
    }
  }

  async function registrarAcao(casoId: string) {
    if (!descricaoAcao.trim()) {
      toast.error('Informe uma descrição para a ação')
      return
    }
    setSalvandoAcao(true)
    try {
      const res = await fetch(`/api/admin/ficai/${casoId}/acao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tipoAcao, descricao: descricaoAcao.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.mensagem || 'Erro')
      }
      toast.success('Ação registrada')
      setDescricaoAcao('')
      const detRes = await fetch(`/api/admin/ficai/${casoId}`)
      const detData = await detRes.json()
      setDetalhes(detData.caso)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSalvandoAcao(false)
    }
  }

  const casosFiltrados = casos.filter((c) =>
    !busca.trim() ||
    c.aluno_nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.matricula || '').includes(busca) ||
    c.escola_nome.toLowerCase().includes(busca.toLowerCase())
  )

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-amber-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">FICAI — Busca Ativa</h1>
              <p className="text-amber-100 text-sm">Ficha de Comunicação do Aluno Infrequente (ECA Art. 56)</p>
            </div>
          </div>
          <button
            onClick={rodarDeteccao}
            disabled={detectando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {detectando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {detectando ? 'Detectando...' : 'Rodar detecção automática'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{estatisticas.abertos}</p>
          <p className="text-xs text-amber-600">Em andamento</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{estatisticas.resolvidos}</p>
          <p className="text-xs text-green-600">Resolvidos</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
          <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{estatisticas.evasao_confirmada}</p>
          <p className="text-xs text-red-600">Evasão confirmada</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 text-center">
          <AlertTriangle className="w-5 h-5 text-slate-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{estatisticas.total}</p>
          <p className="text-xs text-slate-600">Total no ano</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por aluno, matrícula ou escola..."
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
            <option value="">Todas as escolas</option>
            {escolas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputCls}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className={inputCls}>
            {[2024, 2025, 2026, 2027].map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={apenasAbertos}
              onChange={(e) => setApenasAbertos(e.target.checked)}
              disabled={!!filtroStatus}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            Apenas em andamento
          </label>
          <button
            onClick={() => carregarCasos()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600"
            title="Recarregar"
            aria-label="Recarregar lista de casos FICAI"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {carregando ? (
        <LoadingSpinner centered />
      ) : casosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum caso FICAI encontrado com os filtros atuais</p>
          <button
            onClick={rodarDeteccao}
            disabled={detectando}
            className="mt-4 text-amber-600 text-sm font-semibold hover:text-amber-700"
          >
            Rodar detecção automática
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {casosFiltrados.map((caso) => (
            <div key={caso.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => abrirDetalhes(caso)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[caso.status] || 'bg-slate-100 text-slate-700'}`}>
                      {STATUS_LABEL[caso.status] || caso.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      {MOTIVO_LABEL[caso.motivo] || caso.motivo}
                    </span>
                    <span className="text-xs text-gray-400">{ORIGEM_LABEL[caso.origem] || caso.origem}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {caso.aluno_nome}
                    {caso.matricula && <span className="text-gray-400 font-normal ml-2">#{caso.matricula}</span>}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                    <span>{caso.escola_nome}</span>
                    <span>Aberto em {new Date(caso.aberto_em).toLocaleDateString('pt-BR')}</span>
                    {caso.faltas_consecutivas != null && <span>{caso.faltas_consecutivas} faltas consecutivas</span>}
                    {caso.pct_faltas_mes != null && <span>{caso.pct_faltas_mes}% faltas no mês</span>}
                  </div>
                </div>
                {expandido === caso.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {expandido === caso.id && (
                <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50">
                  {carregandoDetalhes ? (
                    <div className="py-6 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
                    </div>
                  ) : detalhes ? (
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Atualizar status do caso
                          </h3>
                          <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className={`${inputCls} w-full mb-3`}>
                            {Object.entries(STATUS_LABEL).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <textarea
                            value={observacaoStatus}
                            onChange={(e) => setObservacaoStatus(e.target.value)}
                            rows={2}
                            className={`${inputCls} w-full mb-3`}
                            placeholder="Observação (opcional)"
                          />
                          <button
                            onClick={() => atualizarStatus(caso.id)}
                            disabled={salvandoStatus || novoStatus === detalhes.status}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-50"
                          >
                            {salvandoStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Atualizar status
                          </button>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Registrar ação
                          </h3>
                          <select value={tipoAcao} onChange={(e) => setTipoAcao(e.target.value)} className={`${inputCls} w-full mb-3`}>
                            {TIPO_ACAO_OPCOES.map((t) => (
                              <option key={t.v} value={t.v}>{t.label}</option>
                            ))}
                          </select>
                          <textarea
                            value={descricaoAcao}
                            onChange={(e) => setDescricaoAcao(e.target.value)}
                            rows={3}
                            className={`${inputCls} w-full mb-3`}
                            placeholder="Descreva a ação realizada (mínimo 5 caracteres)..."
                          />
                          <button
                            onClick={() => registrarAcao(caso.id)}
                            disabled={salvandoAcao || descricaoAcao.trim().length < 5}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50"
                          >
                            {salvandoAcao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Registrar ação
                          </button>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Linha do tempo ({detalhes.acoes.length})
                        </h3>
                        {detalhes.acoes.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">Nenhuma ação registrada ainda</p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {detalhes.acoes.map((a) => {
                              const opt = TIPO_ACAO_OPCOES.find((o) => o.v === a.tipo)
                              const Icon = opt?.icon || FileText
                              return (
                                <div key={a.id} className="flex gap-3 pb-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
                                  <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-amber-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{opt?.label || a.tipo}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words mt-1">{a.descricao}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {a.realizado_por_nome ? `${a.realizado_por_nome} • ` : ''}
                                      {new Date(a.realizado_em).toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FicaiAdminPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']} requerModulo="semed">
      <FicaiAdmin />
    </ProtectedRoute>
  )
}
