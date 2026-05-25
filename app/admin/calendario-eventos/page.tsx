'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Calendar,
  CalendarDays,
  CalendarPlus,
  Filter,
  Plus,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  Coffee,
  Briefcase,
  Users,
  AlertOctagon,
  Sparkles,
  Info,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConfirmModal } from '@/components/ui/confirm-modal'

type TipoEvento =
  | 'letivo' | 'feriado_nacional' | 'feriado_estadual' | 'feriado_municipal'
  | 'feriado_religioso' | 'recesso' | 'planejamento' | 'conselho_classe'
  | 'reuniao_pais' | 'evento_pedagogico' | 'paralisacao' | 'reposicao'

interface Evento {
  id: string
  ano_letivo_id: string
  ano_letivo_nome: string | null
  escola_id: string | null
  escola_nome: string | null
  tipo: TipoEvento
  data: string
  titulo: string
  descricao: string | null
  conta_dia_letivo: boolean
  carga_horaria: number
  criado_em: string
}

interface Estatisticas {
  total: number
  feriados: number
  recessos: number
  reposicoes: number
  planejamentos: number
  pedagogicos: number
  dias_letivos_extras: number
  gerais: number
  especificos: number
}

interface AnoLetivo { id: string; ano: string }
interface Escola { id: string; nome: string }

const TIPO_CONFIG: Record<TipoEvento, { label: string; cor: string; bg: string; corDot: string; conta: boolean; ch: number }> = {
  letivo: { label: 'Dia Letivo', cor: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', corDot: 'bg-emerald-500', conta: true, ch: 4 },
  feriado_nacional: { label: 'Feriado Nacional', cor: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30', corDot: 'bg-red-500', conta: false, ch: 0 },
  feriado_estadual: { label: 'Feriado Estadual', cor: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30', corDot: 'bg-orange-500', conta: false, ch: 0 },
  feriado_municipal: { label: 'Feriado Municipal', cor: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30', corDot: 'bg-amber-500', conta: false, ch: 0 },
  feriado_religioso: { label: 'Feriado Religioso', cor: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/30', corDot: 'bg-yellow-500', conta: false, ch: 0 },
  recesso: { label: 'Recesso', cor: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700/30', corDot: 'bg-slate-500', conta: false, ch: 0 },
  planejamento: { label: 'Planejamento Docente', cor: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-900/30', corDot: 'bg-indigo-500', conta: true, ch: 4 },
  conselho_classe: { label: 'Conselho de Classe', cor: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/30', corDot: 'bg-purple-500', conta: false, ch: 0 },
  reuniao_pais: { label: 'Reunião de Pais', cor: 'text-pink-700 dark:text-pink-300', bg: 'bg-pink-100 dark:bg-pink-900/30', corDot: 'bg-pink-500', conta: false, ch: 0 },
  evento_pedagogico: { label: 'Evento Pedagógico', cor: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-100 dark:bg-cyan-900/30', corDot: 'bg-cyan-500', conta: false, ch: 0 },
  paralisacao: { label: 'Paralisação', cor: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-900/30', corDot: 'bg-rose-500', conta: false, ch: 0 },
  reposicao: { label: 'Reposição de Aulas', cor: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30', corDot: 'bg-blue-500', conta: true, ch: 4 },
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function formatarDataISO(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

interface FormState {
  ano_letivo_id: string
  escola_id: string
  tipo: TipoEvento
  data: string
  titulo: string
  descricao: string
  conta_dia_letivo: boolean
  carga_horaria: number
}

const INITIAL_FORM: FormState = {
  ano_letivo_id: '',
  escola_id: '',
  tipo: 'feriado_nacional',
  data: '',
  titulo: '',
  descricao: '',
  conta_dia_letivo: false,
  carga_horaria: 0,
}

function CalendarioAvancado() {
  const toast = useToast()

  const [eventos, setEventos] = useState<Evento[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [anosLetivos, setAnosLetivos] = useState<AnoLetivo[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Filtros
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  // Confirmação de exclusão
  const [excluindo, setExcluindo] = useState<Evento | null>(null)

  // Carregar dados de referência
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/api/admin/anos-letivos', { signal: controller.signal }).then((r) => r.json()),
      fetch('/api/admin/escolas', { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([anos, escs]) => {
        const anosArr: AnoLetivo[] = (Array.isArray(anos) ? anos : []).map((a: { id: string; ano: string | number }) => ({
          id: a.id, ano: String(a.ano),
        }))
        setAnosLetivos(anosArr)
        setEscolas(Array.isArray(escs) ? escs : [])
        // pré-selecionar ano atual ou primeiro disponível
        const anoAtual = String(new Date().getFullYear())
        const found = anosArr.find((a) => a.ano === anoAtual) || anosArr[0]
        if (found) {
          setFiltroAno(found.id)
          setForm((f) => ({ ...f, ano_letivo_id: found.id }))
        }
      })
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[CalEvt] ref', e) })
    return () => controller.abort()
  }, [])

  const carregar = useCallback(async (signal?: AbortSignal) => {
    setCarregando(true)
    try {
      const p = new URLSearchParams()
      if (filtroAno) p.set('ano_letivo_id', filtroAno)
      if (filtroTipo) p.set('tipo', filtroTipo)
      if (filtroEscola === 'geral') p.set('escola_id', 'geral')
      else if (filtroEscola) p.set('escola_id', filtroEscola)
      if (filtroMes) p.set('mes', filtroMes)
      const res = await fetch(`/api/admin/calendario-eventos?${p}`, { signal })
      const data = await res.json()
      setEventos(data.eventos || [])
      setEstatisticas(data.estatisticas || null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao carregar eventos')
    } finally {
      setCarregando(false)
    }
  }, [filtroAno, filtroTipo, filtroEscola, filtroMes, toast])

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => carregar(controller.signal), 200)
    return () => { clearTimeout(t); controller.abort() }
  }, [carregar])

  // ============================================================
  // Form handlers
  // ============================================================

  const abrirNovo = () => {
    const padrao = filtroAno || anosLetivos[0]?.id || ''
    setEditando(null)
    setForm({ ...INITIAL_FORM, ano_letivo_id: padrao })
    setModalAberto(true)
  }

  const abrirEdicao = (ev: Evento) => {
    setEditando(ev)
    setForm({
      ano_letivo_id: ev.ano_letivo_id,
      escola_id: ev.escola_id || '',
      tipo: ev.tipo,
      data: ev.data?.slice(0, 10) || '',
      titulo: ev.titulo,
      descricao: ev.descricao || '',
      conta_dia_letivo: ev.conta_dia_letivo,
      carga_horaria: Number(ev.carga_horaria) || 0,
    })
    setModalAberto(true)
  }

  const fecharModal = () => {
    if (salvando) return
    setModalAberto(false)
    setEditando(null)
  }

  const aplicarTipoPadrao = (tipo: TipoEvento) => {
    const cfg = TIPO_CONFIG[tipo]
    setForm((f) => ({
      ...f,
      tipo,
      conta_dia_letivo: cfg.conta,
      carga_horaria: cfg.ch,
    }))
  }

  const salvar = async () => {
    if (!form.ano_letivo_id) return toast.error('Selecione o ano letivo')
    if (!form.data) return toast.error('Informe a data')
    if (!form.titulo || form.titulo.length < 2) return toast.error('Título obrigatório')

    setSalvando(true)
    try {
      const payload = {
        ano_letivo_id: form.ano_letivo_id,
        escola_id: form.escola_id || null,
        tipo: form.tipo,
        data: form.data,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        conta_dia_letivo: form.conta_dia_letivo,
        carga_horaria: form.carga_horaria,
      }

      const url = editando
        ? `/api/admin/calendario-eventos?id=${editando.id}`
        : '/api/admin/calendario-eventos'
      const method = editando ? 'PATCH' : 'POST'
      // Em edição não enviamos ano_letivo_id/escola_id (PATCH schema não aceita)
      const corpo = editando
        ? {
            tipo: payload.tipo,
            data: payload.data,
            titulo: payload.titulo,
            descricao: payload.descricao,
            conta_dia_letivo: payload.conta_dia_letivo,
            carga_horaria: payload.carga_horaria,
          }
        : payload

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem || 'Erro ao salvar')

      toast.success(editando ? 'Evento atualizado' : 'Evento criado')
      setModalAberto(false)
      setEditando(null)
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExcluir = async () => {
    if (!excluindo) return
    try {
      const res = await fetch(`/api/admin/calendario-eventos?id=${excluindo.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem || 'Erro')
      toast.success('Evento removido')
      setExcluindo(null)
      carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  // ============================================================
  // Mini-calendário visual (mapa por dia)
  // ============================================================

  const mapaEventos = useMemo(() => {
    const m = new Map<string, Evento>()
    eventos.forEach((e) => { m.set(e.data.slice(0, 10), e) })
    return m
  }, [eventos])

  const anoSelecionado = useMemo(() => {
    const al = anosLetivos.find((a) => a.id === filtroAno)
    return al ? parseInt(al.ano, 10) : new Date().getFullYear()
  }, [filtroAno, anosLetivos])

  // ============================================================
  // Render
  // ============================================================

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Calendário Escolar Avançado</h1>
              <p className="text-emerald-100 text-sm">Gestão de eventos, feriados, recessos, reposições e dias letivos especiais (LDB Art. 24)</p>
            </div>
          </div>
          <button
            onClick={abrirNovo}
            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-bold flex items-center gap-2 transition"
          >
            <CalendarPlus className="w-4 h-4" /> Novo evento
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">12 tipos de evento — afetam contagem de dias letivos</p>
          <p>Eventos com <strong>escola = Todas</strong> aplicam ao município inteiro. Reposição e Planejamento contam como dia letivo; feriados e recessos não. A função SQL <code>contar_dias_letivos()</code> calcula automaticamente o saldo por escola/período (base para validação dos 200 dias / 800h da LDB).</p>
        </div>
      </div>

      {/* KPIs */}
      {estatisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 text-center">
            <Calendar className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{estatisticas.total}</p>
            <p className="text-xs text-emerald-600">Total</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 text-center">
            <AlertOctagon className="w-4 h-4 text-red-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-700 dark:text-red-300">{estatisticas.feriados}</p>
            <p className="text-xs text-red-600">Feriados</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-700/30 rounded-xl p-3 text-center">
            <Coffee className="w-4 h-4 text-slate-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{estatisticas.recessos}</p>
            <p className="text-xs text-slate-500">Recessos</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
            <RotateCcw className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{estatisticas.reposicoes}</p>
            <p className="text-xs text-blue-600">Reposições</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3 text-center">
            <Briefcase className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{estatisticas.planejamentos}</p>
            <p className="text-xs text-indigo-600">Planejam.</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 text-center">
            <Users className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{estatisticas.pedagogicos}</p>
            <p className="text-xs text-purple-600">Pedagógicos</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 text-center">
            <Sparkles className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-700 dark:text-green-300">{estatisticas.dias_letivos_extras}</p>
            <p className="text-xs text-green-600">Conta letivo</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-3 text-center">
            <Filter className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {estatisticas.gerais}
              <span className="text-xs text-amber-500"> / {estatisticas.especificos}</span>
            </p>
            <p className="text-xs text-amber-600">Gerais / Esc.</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className={inputCls}>
            <option value="">Todos anos letivos</option>
            {anosLetivos.map((a) => <option key={a.id} value={a.id}>{a.ano}</option>)}
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={inputCls}>
            <option value="">Todos tipos</option>
            {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
            <option value="">Todas escolas (+ gerais)</option>
            <option value="geral">Apenas gerais (município)</option>
            {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className={inputCls}>
            <option value="">Todos meses</option>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Mini calendário anual visual */}
      {filtroAno && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
            Visão do ano <span className="text-emerald-600">{anoSelecionado}</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, mesIdx) => {
              const totalDias = getDaysInMonth(anoSelecionado, mesIdx)
              const primeiroDia = getFirstDayOfWeek(anoSelecionado, mesIdx)
              return (
                <div key={mesIdx} className="border border-gray-100 dark:border-slate-700 rounded-lg p-2">
                  <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 text-center">{MESES[mesIdx]}</h3>
                  <div className="grid grid-cols-7 gap-px text-center">
                    {DIAS_SEMANA_CURTOS.map((d, i) => (
                      <div key={i} className="text-[9px] font-bold text-gray-400">{d}</div>
                    ))}
                    {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: totalDias }).map((_, i) => {
                      const dia = i + 1
                      const dataStr = `${anoSelecionado}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                      const ev = mapaEventos.get(dataStr)
                      const dow = new Date(anoSelecionado, mesIdx, dia).getDay()
                      const fds = dow === 0 || dow === 6
                      if (ev) {
                        const cfg = TIPO_CONFIG[ev.tipo]
                        return (
                          <button
                            key={dia}
                            onClick={() => abrirEdicao(ev)}
                            className={`text-[10px] py-0.5 rounded font-bold ${cfg.bg} ${cfg.cor} hover:ring-2 hover:ring-emerald-400`}
                            title={`${cfg.label}: ${ev.titulo}`}
                          >
                            {dia}
                          </button>
                        )
                      }
                      return (
                        <div key={dia} className={`text-[10px] py-0.5 ${fds ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          {dia}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Legenda */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex flex-wrap gap-2 text-[10px]">
            {Object.entries(TIPO_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded ${v.corDot}`} />
                <span className="text-gray-500">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de eventos */}
      {carregando ? (
        <LoadingSpinner centered />
      ) : eventos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">Nenhum evento com os filtros atuais</p>
          <button onClick={abrirNovo} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
            <Plus className="w-4 h-4 inline mr-1" /> Criar primeiro evento
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {eventos.map((ev) => {
            const cfg = TIPO_CONFIG[ev.tipo]
            return (
              <div key={ev.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-1.5 h-12 rounded ${cfg.corDot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.cor}`}>
                        {cfg.label}
                      </span>
                      {ev.conta_dia_letivo && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          Conta letivo {ev.carga_horaria > 0 && `· ${ev.carga_horaria}h`}
                        </span>
                      )}
                      {!ev.escola_id && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                          Município
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{ev.titulo}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      <span className="font-mono">{formatarDataISO(ev.data)}</span>
                      {ev.ano_letivo_nome && <span>· Ano {ev.ano_letivo_nome}</span>}
                      {ev.escola_nome && <span>· {ev.escola_nome}</span>}
                    </div>
                    {ev.descricao && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{ev.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirEdicao(ev)}
                    className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExcluindo(ev)}
                    className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de criar / editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {editando ? 'Editar evento' : 'Novo evento'}
              </h2>
              <button onClick={fecharModal} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!editando && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Ano letivo *</label>
                    <select
                      value={form.ano_letivo_id}
                      onChange={(e) => setForm({ ...form, ano_letivo_id: e.target.value })}
                      className={`${inputCls} w-full`}
                    >
                      <option value="">Selecione...</option>
                      {anosLetivos.map((a) => <option key={a.id} value={a.id}>{a.ano}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Escola</label>
                    <select
                      value={form.escola_id}
                      onChange={(e) => setForm({ ...form, escola_id: e.target.value })}
                      className={`${inputCls} w-full`}
                    >
                      <option value="">Todas (município)</option>
                      {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Tipo *</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => aplicarTipoPadrao(e.target.value as TipoEvento)}
                    className={`${inputCls} w-full`}
                  >
                    {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Data *</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className={`${inputCls} w-full`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  maxLength={255}
                  placeholder="Ex: Independência do Brasil, Reposição de greve, Recesso julho..."
                  className={`${inputCls} w-full`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  maxLength={2000}
                  placeholder="Observações sobre o evento (opcional)"
                  className={`${inputCls} w-full resize-y`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Conta como dia letivo?</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      id="conta-letivo"
                      type="checkbox"
                      checked={form.conta_dia_letivo}
                      onChange={(e) => setForm({ ...form, conta_dia_letivo: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="conta-letivo" className="text-sm text-gray-700 dark:text-gray-200">
                      Sim, este dia entra no cômputo dos 200 dias letivos
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Carga horária do dia</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={form.carga_horaria}
                    onChange={(e) => setForm({ ...form, carga_horaria: parseFloat(e.target.value) || 0 })}
                    className={`${inputCls} w-full`}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Horas de aula computadas (0 para feriado)</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-3 flex justify-end gap-2">
              <button
                onClick={fecharModal}
                disabled={salvando}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1"
              >
                {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        aberto={!!excluindo}
        titulo="Excluir evento do calendário"
        mensagem={
          excluindo
            ? `Confirma a exclusão de "${excluindo.titulo}" (${formatarDataISO(excluindo.data)})? Isso pode afetar a contagem de dias letivos.`
            : ''
        }
        variant="danger"
        textoConfirmar="Excluir"
        onConfirmar={confirmarExcluir}
        onFechar={() => setExcluindo(null)}
      />
    </div>
  )
}

export default function CalendarioAvancadoPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <CalendarioAvancado />
    </ProtectedRoute>
  )
}
