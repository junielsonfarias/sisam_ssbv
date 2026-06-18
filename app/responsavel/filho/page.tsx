'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, BookOpen, CalendarCheck, AlertTriangle, ScanFace, LogIn, LogOut,
  Award, Percent, CalendarX, GraduationCap, History, School, ArrowRightLeft, ChevronDown,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Aluno {
  id: string; nome: string; codigo: string; serie: string; escola_nome: string
  turma_codigo: string | null; turma_nome: string | null; situacao: string
}
interface Disciplina { id: string; nome: string; codigo: string; abreviacao: string }
interface Periodo { id: string; nome: string; numero: number }
interface Frequencia { bimestre: number; aulas_dadas: number; faltas: number; percentual_frequencia: number; periodo_nome: string }

export default function FilhoPageWrapper() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>}><FilhoPage /></Suspense>
}

function FilhoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunoId = searchParams.get('id')
  const abaInicial = searchParams.get('aba') || 'boletim'

  const [aba, setAba] = useState<'boletim' | 'frequencia' | 'presenca' | 'matricula'>(abaInicial as any)
  const [anoLetivo, setAnoLetivo] = useState('')
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [matriculaInfo, setMatriculaInfo] = useState<any>(null)
  const [carregandoHist, setCarregandoHist] = useState(false)
  const [presencaResumo, setPresencaResumo] = useState<Array<{ data: string; hora_entrada: string | null; hora_saida: string | null; metodo: string }>>([])
  const [presencaEventos, setPresencaEventos] = useState<Record<string, Array<{ tipo: 'entrada' | 'saida'; registrado_em: string; origem: string }>>>({})
  const [carregandoPresenca, setCarregandoPresenca] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [notas, setNotas] = useState<Record<string, Record<string, any>>>({})
  const [frequencia, setFrequencia] = useState<Frequencia[]>([])
  const [freqGeral, setFreqGeral] = useState(0)
  const [totalFaltas, setTotalFaltas] = useState(0)

  useEffect(() => {
    if (!alunoId) { router.push('/responsavel/dashboard'); return }
    carregarAnos()
    carregarDados()
  }, [alunoId])

  // Histórico de matrícula (carrega ao abrir a aba)
  useEffect(() => {
    if (aba !== 'matricula' || !alunoId) return
    setCarregandoHist(true)
    fetch(`/api/responsavel/historico-matricula?aluno_id=${alunoId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setMatriculaInfo(d.matricula); setHistorico(d.historico || []) } })
      .finally(() => setCarregandoHist(false))
  }, [aba, alunoId])

  // Carregar historico facial quando troca para a aba presenca
  useEffect(() => {
    if (aba !== 'presenca' || !alunoId) return
    const hoje = new Date()
    const inicio = new Date(hoje)
    inicio.setDate(inicio.getDate() - 30)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    setCarregandoPresenca(true)
    fetch(`/api/responsavel/presenca-facial?filho_id=${alunoId}&inicio=${fmt(inicio)}&fim=${fmt(hoje)}`, {
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPresencaResumo(data.resumo || [])
          setPresencaEventos(data.eventos_por_dia || {})
        }
      })
      .finally(() => setCarregandoPresenca(false))
  }, [aba, alunoId])

  const carregarAnos = async () => {
    try {
      const res = await fetch(`/api/responsavel/anos-disponiveis?aluno_id=${alunoId}`, { credentials: 'include' })
      if (res.ok) { const d = await res.json(); setAnosDisponiveis(d.anos || []) }
    } catch { /* */ }
  }

  const carregarDados = async (ano?: string) => {
    setCarregando(true)
    try {
      const url = `/api/responsavel/boletim?aluno_id=${alunoId}${ano ? `&ano_letivo=${ano}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) { router.push('/responsavel/dashboard'); return }
      const data = await res.json()
      setAluno(data.aluno)
      setDisciplinas(data.disciplinas || [])
      setPeriodos(data.periodos || [])
      setNotas(data.notas || {})
      setFrequencia(data.frequencia || [])
      setFreqGeral(data.frequencia_geral || 0)
      setTotalFaltas(data.total_faltas || 0)
      setAnoLetivo(prev => prev || data.aluno?.ano_letivo || String(new Date().getFullYear()))
    } catch { /* offline */ } finally {
      setCarregando(false)
    }
  }

  const onChangeAno = (ano: string) => { setAnoLetivo(ano); carregarDados(ano) }

  if (carregando) return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>
  if (!aluno) return null

  // ---- helpers de cor ----
  const corNota = (n: number | null) => {
    if (n === null || n === undefined || isNaN(n)) return 'text-gray-400'
    return n >= 6 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  }
  const badgeNota = (n: number | null) => {
    if (n === null || n === undefined || isNaN(n)) return 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300'
    return n >= 6
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }
  const corFreq = (p: number) => {
    if (p >= 90) return 'text-emerald-600 dark:text-emerald-400'
    if (p >= 75) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }
  const strokeFreq = (p: number) => (p >= 90 ? 'text-emerald-500' : p >= 75 ? 'text-amber-500' : 'text-red-500')

  const labelSit = (s: string | null) => {
    const m: Record<string, string> = { cursando: 'Cursando', aprovado: 'Aprovado', reprovado: 'Reprovado', transferido: 'Transferido', abandono: 'Abandono', remanejado: 'Remanejado', progressao_parcial: 'Progressão parcial' }
    return s ? (m[s] || s) : '—'
  }
  const corSit = (s: string | null) => {
    if (s === 'aprovado' || s === 'cursando') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    if (s === 'reprovado' || s === 'abandono') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    if (s === 'transferido' || s === 'remanejado') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    if (s === 'progressao_parcial') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
  }
  const fmtData = (iso: string | null) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

  // ---- valores derivados ----
  const iniciais = aluno.nome.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  const mediasDisc = disciplinas.map(d => {
    const nd = notas[d.id] || {}
    const vals = Object.values(nd).map((n: any) => parseFloat(n.nota_final)).filter((v) => !isNaN(v))
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }).filter((m): m is number => m !== null)
  const mediaGeral = mediasDisc.length ? mediasDisc.reduce((a, b) => a + b, 0) / mediasDisc.length : null

  const TABS = [
    { id: 'boletim' as const, label: 'Boletim', Icon: BookOpen, cor: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    { id: 'frequencia' as const, label: 'Frequência', Icon: CalendarCheck, cor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { id: 'presenca' as const, label: 'Presença', Icon: ScanFace, cor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { id: 'matricula' as const, label: 'Matrícula', Icon: History, cor: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  ]

  const ring = { r: 30, c: 2 * Math.PI * 30 }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-gray-50 dark:from-slate-900 dark:to-slate-900 pb-10">
      {/* ===================== HERO ===================== */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-7">
          <button
            onClick={() => router.push('/responsavel/dashboard')}
            className="inline-flex items-center gap-1.5 text-indigo-100 hover:text-white text-sm font-medium min-h-[44px] active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Meus filhos
          </button>

          <div className="flex items-start justify-between gap-3 mt-1">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-2xl font-extrabold shrink-0 backdrop-blur-sm">
                {iniciais}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight truncate">{aluno.nome}</h1>
                <p className="text-indigo-100 text-sm mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  {aluno.serie}{aluno.turma_codigo ? ` · ${aluno.turma_codigo}` : ''}
                </p>
                <p className="text-indigo-200 text-xs truncate mt-0.5">{aluno.escola_nome}</p>
              </div>
            </div>
            {anosDisponiveis.length > 0 && (
              <div className="shrink-0 relative">
                <select
                  value={anoLetivo}
                  onChange={(e) => onChangeAno(e.target.value)}
                  aria-label="Ano letivo"
                  className="appearance-none bg-white/15 hover:bg-white/25 text-white text-sm font-bold rounded-xl pl-3 pr-8 py-2 ring-1 ring-white/25 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                >
                  {anosDisponiveis.map((a) => <option key={a} value={a} className="text-gray-900">{a}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/80" />
              </div>
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 ring-1 ring-white/15">
              <Award className="w-4 h-4 text-indigo-100 mb-1" />
              <p className="text-2xl font-extrabold leading-none">{mediaGeral !== null ? mediaGeral.toFixed(1) : '—'}</p>
              <p className="text-[11px] text-indigo-100 mt-1">Média geral</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 ring-1 ring-white/15">
              <Percent className="w-4 h-4 text-indigo-100 mb-1" />
              <p className="text-2xl font-extrabold leading-none">{freqGeral}<span className="text-base">%</span></p>
              <p className="text-[11px] text-indigo-100 mt-1">Frequência</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 ring-1 ring-white/15">
              <CalendarX className="w-4 h-4 text-indigo-100 mb-1" />
              <p className="text-2xl font-extrabold leading-none">{totalFaltas}</p>
              <p className="text-[11px] text-indigo-100 mt-1">Faltas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== TABS (pílulas) ===================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 relative z-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-indigo-900/5 border border-gray-100 dark:border-slate-700 p-1.5 flex gap-1">
          {TABS.map(({ id, label, Icon, cor, bg }) => {
            const ativo = aba === id
            return (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`flex-1 inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[48px] ${
                  ativo ? `${bg} ${cor} shadow-sm` : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===================== CONTEÚDO ===================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-3.5">
        {/* ---------- BOLETIM ---------- */}
        {aba === 'boletim' && (
          disciplinas.length === 0 ? (
            <EmptyState Icon={BookOpen} texto="Nenhuma nota lançada ainda" />
          ) : (
            disciplinas.map(d => {
              const notasDisc = notas[d.id] || {}
              const vals = Object.values(notasDisc).map((n: any) => parseFloat(n.nota_final)).filter((v) => !isNaN(v))
              const media = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
              return (
                <div key={d.id} className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 border-t-4 shadow-sm overflow-hidden ${media === null ? 'border-t-gray-200 dark:border-t-slate-600' : media >= 6 ? 'border-t-emerald-400' : 'border-t-red-400'}`}>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {d.abreviacao?.slice(0, 3) || d.nome.slice(0, 3)}
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{d.nome}</p>
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-bold ${badgeNota(media)}`}>
                      {media !== null ? media.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="px-3 pb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(periodos.length, 1))}, minmax(0,1fr))` }}>
                    {periodos.map(p => {
                      const nota = notasDisc[p.numero]
                      const valor = nota ? parseFloat(nota.nota_final) : null
                      return (
                        <div key={p.id} className="rounded-xl bg-gray-50 dark:bg-slate-700/40 px-1 py-2 text-center">
                          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{p.numero}º Bim</p>
                          <p className={`text-base font-bold mt-0.5 ${corNota(valor)}`}>
                            {valor !== null ? valor.toFixed(1) : '—'}
                          </p>
                          <div className="flex items-center justify-center gap-1 mt-0.5 min-h-[14px]">
                            {nota?.nota_recuperacao && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400">R{parseFloat(nota.nota_recuperacao).toFixed(1)}</span>
                            )}
                            {nota?.faltas > 0 && (
                              <span className="text-[9px] text-gray-400">{nota.faltas}F</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )
        )}

        {/* ---------- FREQUÊNCIA ---------- */}
        {aba === 'frequencia' && (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <svg width="84" height="84" viewBox="0 0 80 80" className="-rotate-90">
                    <circle cx="40" cy="40" r={ring.r} fill="none" strokeWidth="8" className="text-gray-100 dark:text-slate-700" stroke="currentColor" />
                    <circle cx="40" cy="40" r={ring.r} fill="none" strokeWidth="8" strokeLinecap="round"
                      className={strokeFreq(freqGeral)} stroke="currentColor"
                      strokeDasharray={ring.c} strokeDashoffset={ring.c * (1 - Math.min(100, freqGeral) / 100)} />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-lg font-extrabold ${corFreq(freqGeral)}`}>
                    {freqGeral}%
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">Frequência geral</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total de faltas no ano: <strong className="text-gray-700 dark:text-gray-200">{totalFaltas}</strong></p>
                  {freqGeral < 75 ? (
                    <div className="mt-2 inline-flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                      <span>Abaixo de 75% — risco de reprovação por falta.</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Frequência dentro do esperado.</p>
                  )}
                </div>
              </div>
            </div>

            {frequencia.length === 0 ? (
              <EmptyState Icon={CalendarCheck} texto="Nenhuma frequência lançada ainda" />
            ) : (
              frequencia.map(f => {
                const pct = parseFloat(String(f.percentual_frequencia)) || 0
                return (
                  <div key={f.bimestre} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{f.periodo_nome || `${f.bimestre}º Bimestre`}</p>
                      <p className={`text-lg font-bold ${corFreq(pct)}`}>{pct.toFixed(0)}%</p>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="flex gap-4 text-[11px] text-gray-500 dark:text-gray-400 mt-2.5">
                      <span>Aulas: <strong className="text-gray-700 dark:text-gray-200">{f.aulas_dadas || 0}</strong></span>
                      <span>Presenças: <strong className="text-gray-700 dark:text-gray-200">{(f.aulas_dadas || 0) - (f.faltas || 0)}</strong></span>
                      <span className={f.faltas > 0 ? 'text-red-500 font-semibold' : ''}>Faltas: {f.faltas || 0}</span>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ---------- ENTRADA / SAÍDA ---------- */}
        {aba === 'presenca' && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 p-3.5 flex items-start gap-2.5">
              <ScanFace className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Registros pelo terminal de reconhecimento facial — <strong>últimos 30 dias</strong>.
                Scans muito próximos (&lt; 30 min) são filtrados como duplicados.
              </p>
            </div>

            {carregandoPresenca ? (
              <div className="py-10"><LoadingSpinner centered /></div>
            ) : presencaResumo.length === 0 ? (
              <EmptyState Icon={ScanFace} texto="Nenhum registro de entrada/saída nos últimos 30 dias." />
            ) : (
              presencaResumo.map((dia) => {
                const eventos = presencaEventos[dia.data] || []
                const dataFmt = new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                return (
                  <div key={dia.data} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-slate-700/60">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{dataFmt}</p>
                      <div className="flex gap-2">
                        {dia.hora_entrada && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <LogIn className="w-3 h-3" aria-hidden="true" /> {String(dia.hora_entrada).slice(0, 5)}
                          </span>
                        )}
                        {dia.hora_saida && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            <LogOut className="w-3 h-3" aria-hidden="true" /> {String(dia.hora_saida).slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                    {eventos.length > 0 && (
                      <div className="divide-y divide-gray-50 dark:divide-slate-700/60">
                        {eventos.map(e => {
                          const hh = new Date(e.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                          const entrada = e.tipo === 'entrada'
                          return (
                            <div key={e.registrado_em + e.tipo} className="px-4 py-2.5 flex items-center justify-between text-xs">
                              <span className={`flex items-center gap-2 font-medium ${entrada ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${entrada ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                  {entrada ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                                </span>
                                {entrada ? 'Entrada' : 'Saída'}
                              </span>
                              <span className="text-gray-500 dark:text-gray-300 font-mono">{hh}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ---------- MATRÍCULA / HISTÓRICO ---------- */}
        {aba === 'matricula' && (
          carregandoHist ? (
            <div className="py-10"><LoadingSpinner centered /></div>
          ) : (
            <>
              {matriculaInfo && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 dark:border-slate-700/60 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <School className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Matrícula atual
                    </p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${corSit(matriculaInfo.situacao)}`}>{labelSit(matriculaInfo.situacao)}</span>
                  </div>
                  <dl className="divide-y divide-gray-50 dark:divide-slate-700/60 text-sm">
                    {[
                      ['Ano letivo', matriculaInfo.ano_letivo],
                      ['Escola', matriculaInfo.escola_nome],
                      ['Turma', matriculaInfo.turma_codigo ? `${matriculaInfo.turma_codigo}${matriculaInfo.turma_nome ? ` · ${matriculaInfo.turma_nome}` : ''}` : '—'],
                      ['Série', matriculaInfo.serie],
                      ['Matrícula nº', matriculaInfo.codigo || '—'],
                      ['Data de matrícula', fmtData(matriculaInfo.data_matricula)],
                    ].map(([k, v]) => (
                      <div key={k as string} className="px-4 py-2.5 flex items-center justify-between gap-3">
                        <dt className="text-gray-500 dark:text-gray-400 shrink-0">{k}</dt>
                        <dd className="font-medium text-gray-800 dark:text-gray-100 text-right truncate">{(v as string) || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 pt-1">Linha do tempo</p>
              {historico.length === 0 ? (
                <EmptyState Icon={History} texto="Nenhuma movimentação registrada." />
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
                  {historico.map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="w-3.5 h-3.5 rounded-full bg-violet-500 ring-4 ring-violet-100 dark:ring-violet-900/40 mt-1 shrink-0" />
                        {i < historico.length - 1 && <span className="w-0.5 flex-1 bg-gray-100 dark:bg-slate-700 my-1" />}
                      </div>
                      <div className="flex-1 pb-4 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${corSit(h.situacao)}`}>{labelSit(h.situacao)}</span>
                          <span className="text-xs text-gray-400">{fmtData(h.data)}</span>
                        </div>
                        {(h.escola_origem_nome || h.escola_destino_nome) && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 flex items-center gap-1.5">
                            <ArrowRightLeft className="w-3 h-3 shrink-0" />
                            <span className="truncate">{h.escola_origem_nome || '—'} → {h.escola_destino_nome || '—'}</span>
                          </p>
                        )}
                        {h.observacao && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{h.observacao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  )
}

function EmptyState({ Icon, texto }: { Icon: React.ComponentType<{ className?: string }>; texto: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-gray-100 dark:border-slate-700 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-gray-300 dark:text-gray-500" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{texto}</p>
    </div>
  )
}
