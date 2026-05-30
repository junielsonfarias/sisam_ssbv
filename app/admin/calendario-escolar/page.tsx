'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, X, Save, Trash2, AlertTriangle, Check } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Periodo {
  id: string
  numero: number
  nome: string
  tipo: string
  data_inicio: string | null
  data_fim: string | null
  ano_letivo: string
  dias_letivos_estimados: number
}

interface Marcacao {
  id: string
  tipo: string
  data: string
  titulo: string
  descricao: string | null
  conta_dia_letivo: boolean
  carga_horaria: number
  escola_id: string | null
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const TIPOS_OPCOES: Array<{ valor: string; rotulo: string; letivo: boolean }> = [
  // === LETIVOS (conta como dia letivo) ===
  { valor: 'letivo', rotulo: 'Dia letivo', letivo: true },
  { valor: 'reposicao', rotulo: 'Reposição (sábado letivo)', letivo: true },
  { valor: 'evento_pedagogico', rotulo: 'Evento pedagógico (letivo)', letivo: true },
  // === NÃO LETIVOS ===
  { valor: 'feriado_nacional', rotulo: 'Feriado nacional', letivo: false },
  { valor: 'feriado_estadual', rotulo: 'Feriado estadual', letivo: false },
  { valor: 'feriado_municipal', rotulo: 'Feriado municipal', letivo: false },
  { valor: 'feriado_religioso', rotulo: 'Feriado religioso', letivo: false },
  { valor: 'recesso', rotulo: 'Recesso escolar', letivo: false },
  { valor: 'paralisacao', rotulo: 'Paralisação', letivo: false },
  { valor: 'planejamento', rotulo: 'Planejamento (não letivo)', letivo: false },
  { valor: 'conselho_classe', rotulo: 'Conselho de classe', letivo: false },
  { valor: 'reuniao_pais', rotulo: 'Reunião com pais', letivo: false },
]

/** Sugere tipo default conforme o dia da semana. */
function tipoSugerido(dataIso: string): string {
  const dow = new Date(dataIso + 'T12:00:00').getDay()
  const fimDeSemana = dow === 0 || dow === 6
  return fimDeSemana ? 'reposicao' : 'letivo'
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function dateInRange(date: Date, inicio: string | null, fim: string | null): boolean {
  if (!inicio || !fim) return false
  const d = date.getTime()
  const s = new Date(inicio + 'T00:00:00').getTime()
  const e = new Date(fim + 'T23:59:59').getTime()
  return d >= s && d <= e
}
function pad(n: number) { return n.toString().padStart(2, '0') }
function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function CalendarioEscolar() {
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()))
  const [anoLetivoId, setAnoLetivoId] = useState<string | null>(null)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>([])
  const [anosCadastrados, setAnosCadastrados] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [criandoAno, setCriandoAno] = useState(false)

  // Modal de edicao
  const [dataEdicao, setDataEdicao] = useState<string | null>(null)
  const [formTipo, setFormTipo] = useState('feriado_nacional')
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formContaLetivo, setFormContaLetivo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Lista os anos cadastrados em anos_letivos + ano atual (caso falte cadastrar).
  // Ao selecionar um ano sem cadastro, o aviso amber aparece com botao
  // de criacao rapida.
  const anoCorrente = String(new Date().getFullYear())
  const anos = (() => {
    const set = new Set<string>(anosCadastrados)
    set.add(anoCorrente) // sempre permite escolher o corrente
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  })()

  const fetchDados = useCallback(async () => {
    try {
      setCarregando(true)
      const res = await fetch(`/api/admin/calendario-escolar?ano_letivo=${anoLetivo}`)
      if (!res.ok) throw new Error('Erro')
      const data = await res.json()
      setPeriodos(data.periodos || [])
      setMarcacoes(data.marcacoes || [])
      setAnoLetivoId(data.ano_letivo_id || null)
    } catch {
      setPeriodos([])
      setMarcacoes([])
      setAnoLetivoId(null)
    } finally {
      setCarregando(false)
    }
  }, [anoLetivo])

  useEffect(() => { fetchDados() }, [fetchDados])

  // Carrega lista de anos letivos cadastrados (para o dropdown)
  useEffect(() => {
    fetch('/api/admin/anos-letivos')
      .then(r => r.ok ? r.json() : { anos: [] })
      .then(data => {
        const anos = Array.isArray(data?.anos)
          ? data.anos
          : Array.isArray(data) ? data : []
        const lista = anos
          .map((a: { ano?: string }) => a?.ano)
          .filter((x: unknown): x is string => typeof x === 'string')
        setAnosCadastrados(lista)
      })
      .catch(() => setAnosCadastrados([]))
  }, [])

  async function criarAnoLetivo() {
    if (criandoAno || !/^\d{4}$/.test(anoLetivo)) return
    setCriandoAno(true)
    try {
      const res = await fetch('/api/admin/anos-letivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: anoLetivo, status: 'planejamento' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.mensagem || 'Erro ao criar ano letivo')
      setMensagem({ tipo: 'sucesso', texto: `Ano letivo ${anoLetivo} criado. Agora voce ja pode marcar feriados.` })
      setAnosCadastrados(prev => prev.includes(anoLetivo) ? prev : [...prev, anoLetivo])
      fetchDados()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao criar ano letivo' })
    } finally {
      setCriandoAno(false)
    }
  }

  const marcacoesPorData = useMemo(() => {
    const m = new Map<string, Marcacao>()
    for (const x of marcacoes) m.set(x.data.slice(0, 10), x)
    return m
  }, [marcacoes])

  function abrirModal(dataIso: string) {
    if (!anoLetivoId) {
      setMensagem({ tipo: 'erro', texto: 'Cadastre primeiro o Ano Letivo em /admin/anos-letivos.' })
      return
    }
    setDataEdicao(dataIso)
    const existente = marcacoesPorData.get(dataIso)
    if (existente) {
      setFormTipo(existente.tipo)
      setFormTitulo(existente.titulo)
      setFormDescricao(existente.descricao || '')
      setFormContaLetivo(existente.conta_dia_letivo)
    } else {
      // Default contextual: dia util sugere "letivo", fim de semana sugere "reposicao".
      const tipoDefault = tipoSugerido(dataIso)
      const op = TIPOS_OPCOES.find(t => t.valor === tipoDefault)
      setFormTipo(tipoDefault)
      setFormTitulo(op?.rotulo || '')
      setFormDescricao('')
      setFormContaLetivo(op?.letivo ?? false)
    }
    setMensagem(null)
  }

  function fecharModal() {
    setDataEdicao(null)
    setFormTipo('feriado_nacional')
    setFormTitulo('')
    setFormDescricao('')
    setFormContaLetivo(false)
  }

  // Quando muda o tipo, sugere conta_dia_letivo conforme o padrao
  function handleTipoChange(tipo: string) {
    setFormTipo(tipo)
    const op = TIPOS_OPCOES.find(t => t.valor === tipo)
    if (op) setFormContaLetivo(op.letivo)
  }

  async function salvar() {
    if (!dataEdicao || !anoLetivoId) return
    if (!formTitulo.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe um título para a marcação' })
      return
    }
    setSalvando(true)
    try {
      const existente = marcacoesPorData.get(dataEdicao)
      const url = existente
        ? `/api/admin/calendario-eventos?id=${existente.id}`
        : '/api/admin/calendario-eventos'
      const method = existente ? 'PATCH' : 'POST'
      const body: Record<string, unknown> = {
        tipo: formTipo,
        data: dataEdicao,
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim() || null,
        conta_dia_letivo: formContaLetivo,
        carga_horaria: 0,
      }
      if (!existente) {
        body.ano_letivo_id = anoLetivoId
        body.escola_id = null
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.mensagem || 'Erro ao salvar')
      setMensagem({ tipo: 'sucesso', texto: existente ? 'Marcação atualizada' : 'Marcação criada' })
      fecharModal()
      fetchDados()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao salvar' })
    } finally {
      setSalvando(false)
    }
  }

  async function remover() {
    if (!dataEdicao) return
    const existente = marcacoesPorData.get(dataEdicao)
    if (!existente) return
    if (!confirm('Remover esta marcação?')) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/admin/calendario-eventos?id=${existente.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.mensagem || 'Erro ao remover')
      setMensagem({ tipo: 'sucesso', texto: 'Marcação removida' })
      fecharModal()
      fetchDados()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao remover' })
    } finally {
      setSalvando(false)
    }
  }

  // Classifica o dia para visual
  function getDayInfo(year: number, month: number, day: number) {
    const date = new Date(year, month, day)
    const dow = date.getDay()
    const iso = isoDate(year, month, day)
    const marc = marcacoesPorData.get(iso)
    const fimSemana = dow === 0 || dow === 6
    const dentroPeriodo = periodos.some(p => dateInRange(date, p.data_inicio, p.data_fim))

    let cls = 'text-gray-600 dark:text-gray-400'
    let label = ''
    if (marc) {
      if (marc.conta_dia_letivo) {
        cls = 'bg-emerald-500/90 text-white font-bold'
        label = 'Letivo (' + marc.tipo + ')'
      } else {
        cls = 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold'
        label = marc.tipo.replace('_', ' ')
      }
    } else if (fimSemana) {
      cls = 'bg-gray-100 dark:bg-slate-700 text-gray-400'
    } else if (dentroPeriodo) {
      cls = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    }
    return { cls, label, marc, iso }
  }

  // Bimestres e semestres podem coexistir no mesmo ano (sincronizacao
  // automatica da Pt.6 deriva 2 semestres a partir dos 4 bimestres).
  // Somar TODOS daria duplicacao (1ºSem = 1ºBim+2ºBim, etc.). Escolhemos
  // 1 tipo primario (mais granular) para o grid principal + total, e
  // mostramos os demais em "Visao alternativa" abaixo.
  const TIPO_PRIORIDADE = ['bimestre', 'trimestre', 'semestre', 'anual'] as const
  const { tipoPrimario, periodosPrimarios, periodosSecundarios } = useMemo(() => {
    const tiposPresentes = new Set(periodos.map(p => p.tipo))
    const primario = TIPO_PRIORIDADE.find(t => tiposPresentes.has(t)) ?? (periodos[0]?.tipo ?? null)
    const primarios = periodos.filter(p => p.tipo === primario)
    const secundarios = periodos.filter(p => p.tipo !== primario)
    return { tipoPrimario: primario, periodosPrimarios: primarios, periodosSecundarios: secundarios }
  }, [periodos])

  const totalDiasLetivos = useMemo(
    () => periodosPrimarios.reduce((acc, p) => acc + (p.dias_letivos_estimados || 0), 0),
    [periodosPrimarios]
  )

  const rotuloTipo = (tipo: string): string => {
    const map: Record<string, string> = {
      bimestre: 'bimestres', trimestre: 'trimestres', semestre: 'semestres', anual: 'período anual',
    }
    return map[tipo] ?? tipo
  }
  const anoNum = parseInt(anoLetivo)

  return (
    <div>
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Calendário Escolar</h1>
              <p className="text-green-100 text-sm">Clique em um dia para marcar feriado, recesso, reposição ou planejamento.</p>
            </div>
          </div>
          <select
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-bold border-0 outline-none"
          >
            {anos.map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
          </select>
        </div>
      </div>

      {mensagem && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
          mensagem.tipo === 'sucesso'
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {mensagem.tipo === 'sucesso' ? <Check className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
          <span>{mensagem.texto}</span>
        </div>
      )}

      {!anoLetivoId && !carregando && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-2 flex-1">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Ano letivo <strong>{anoLetivo}</strong> ainda não cadastrado.
              Crie agora para poder marcar feriados, recessos e reposições.
            </span>
          </div>
          <button
            type="button"
            onClick={criarAnoLetivo}
            disabled={criandoAno}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold disabled:opacity-60 whitespace-nowrap"
          >
            {criandoAno ? 'Criando…' : `Criar ano ${anoLetivo}`}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-6 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300" />
          <span className="text-gray-600 dark:text-gray-300">Dia Letivo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-emerald-500" />
          <span className="text-gray-600 dark:text-gray-300">Letivo extra / Reposição</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-red-100 border border-red-300" />
          <span className="text-gray-600 dark:text-gray-300">Feriado / Recesso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-gray-100 dark:bg-slate-700 border border-gray-300" />
          <span className="text-gray-600 dark:text-gray-300">Fim de semana</span>
        </div>
      </div>

      {periodosPrimarios.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
              Por {tipoPrimario ? rotuloTipo(tipoPrimario) : 'período'}
            </h2>
            <span className="text-[11px] text-gray-400">
              {periodosPrimarios.length} {periodosPrimarios.length === 1 ? 'período' : 'períodos'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {periodosPrimarios.map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 text-center">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{p.nome || `${p.numero}º Bimestre`}</p>
                <p className="text-lg font-extrabold text-emerald-600">{p.dias_letivos_estimados}</p>
                <p className="text-xs text-gray-400">dias úteis</p>
              </div>
            ))}
          </div>

          {periodosSecundarios.length > 0 && (
            <div className="mb-6 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Visão alternativa ({rotuloTipo(periodosSecundarios[0].tipo)})
                </h3>
                <span
                  className="text-[10px] text-gray-400"
                  title="Cada período aqui é equivalente à soma dos bimestres correspondentes — não some com o total acima."
                >
                  derivado · não somar
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {periodosSecundarios.map(p => (
                  <div key={p.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-2 text-center">
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{p.nome || `${p.numero}º ${p.tipo}`}</p>
                    <p className="text-base font-bold text-gray-700 dark:text-gray-200">{p.dias_letivos_estimados}</p>
                    <p className="text-[10px] text-gray-400">dias úteis</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 mb-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Total estimado:{' '}
          <span className="font-extrabold text-emerald-600 text-lg">{totalDiasLetivos}</span> dias úteis
          {' · '}
          <span className="font-bold text-red-600">{marcacoes.filter(m => !m.conta_dia_letivo).length}</span> marcação(ões) não letiva(s)
          {' · '}
          <span className="font-bold text-emerald-600">{marcacoes.filter(m => m.conta_dia_letivo).length}</span> letiva(s) extra(s)
        </p>
      </div>

      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando calendário...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, mesIdx) => {
            const totalDias = getDaysInMonth(anoNum, mesIdx)
            const primeiroDia = getFirstDayOfWeek(anoNum, mesIdx)
            return (
              <div key={mesIdx} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 text-center">{MESES[mesIdx]}</h3>
                <div className="grid grid-cols-7 gap-px text-center">
                  {DIAS_SEMANA_CURTOS.map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-gray-400 py-0.5">{d}</div>
                  ))}
                  {Array.from({ length: primeiroDia }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {Array.from({ length: totalDias }).map((_, i) => {
                    const dia = i + 1
                    const { cls, label, iso } = getDayInfo(anoNum, mesIdx, dia)
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => abrirModal(iso)}
                        title={label || `Clique para marcar ${dia}/${pad(mesIdx + 1)}`}
                        aria-label={`${dia} de ${MESES[mesIdx]}${label ? ' — ' + label : ''}`}
                        className={`text-[11px] py-0.5 rounded transition-transform hover:scale-110 hover:ring-2 hover:ring-emerald-400 ${cls}`}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de edicao */}
      {dataEdicao && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 sm:rounded-xl rounded-t-2xl shadow-xl w-full sm:max-w-md flex flex-col max-h-[95vh]">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Marcação · {dataEdicao.split('-').reverse().join('/')}
              </h3>
              <button onClick={fecharModal} aria-label="Fechar" className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {/* Atalhos rapidos — clique 1x ja escolhe o tipo e prepara titulo */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                  Marcar rapidamente como
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleTipoChange('letivo')
                      if (!formTitulo.trim()) setFormTitulo('Dia letivo')
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      formTipo === 'letivo'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                    }`}
                  >
                    ✓ Dia Letivo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleTipoChange('reposicao')
                      if (!formTitulo.trim()) setFormTitulo('Reposição')
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      formTipo === 'reposicao'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                    }`}
                  >
                    ↺ Reposição
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleTipoChange('feriado_nacional')
                      if (!formTitulo.trim()) setFormTitulo('Feriado')
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      formTipo === 'feriado_nacional'
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30'
                    }`}
                  >
                    ✕ Feriado
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleTipoChange('recesso')
                      if (!formTitulo.trim()) setFormTitulo('Recesso escolar')
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      formTipo === 'recesso'
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30'
                    }`}
                  >
                    🏖 Recesso
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleTipoChange('planejamento')
                      if (!formTitulo.trim()) setFormTitulo('Planejamento')
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      formTipo === 'planejamento'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                    }`}
                  >
                    ✎ Planejamento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleTipoChange('paralisacao')
                      if (!formTitulo.trim()) setFormTitulo('Paralisação')
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      formTipo === 'paralisacao'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                    }`}
                  >
                    ⏸ Paralisação
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo (todas as opções)</label>
                <select
                  value={formTipo}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <optgroup label="Letivos">
                    {TIPOS_OPCOES.filter(t => t.letivo).map(t => (
                      <option key={t.valor} value={t.valor}>{t.rotulo}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Não letivos">
                    {TIPOS_OPCOES.filter(t => !t.letivo).map(t => (
                      <option key={t.valor} value={t.valor}>{t.rotulo}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Título *</label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Carnaval, Recesso de inverno..."
                  maxLength={255}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <label className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formContaLetivo}
                  onChange={(e) => setFormContaLetivo(e.target.checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Conta como dia letivo
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Marque para reposição/letivo extra. Deixe desmarcado para feriado/recesso/planejamento.
                  </div>
                </div>
              </label>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
                Esta marcação afeta o cálculo de dias letivos no diário,
                cobertura e relatórios de frequência (função SQL <code>contar_dias_letivos</code>).
              </div>
            </div>

            <div className="flex-shrink-0 flex flex-wrap justify-end gap-2 p-3 sm:p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl sm:rounded-b-xl">
              {marcacoesPorData.has(dataEdicao) && (
                <button
                  type="button"
                  onClick={remover}
                  disabled={salvando}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Remover
                </button>
              )}
              <button
                type="button"
                onClick={fecharModal}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !formTitulo.trim()}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CalendarioEscolarPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <CalendarioEscolar />
    </ProtectedRoute>
  )
}
