'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, BookOpen, CalendarCheck, ScanFace,
  Award, Percent, CalendarX, GraduationCap, ChevronDown,
  FileText, RotateCcw, Landmark, ClipboardList,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  AbaBoletim, AbaRecuperacao, AbaSisam, AbaTarefas, AbaFrequencia, AbaPresenca, AbaMatricula,
} from './components'
import type { Aluno, Disciplina, Periodo, Frequencia } from './components/helpers'

export default function FilhoPageWrapper() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>}><FilhoPage /></Suspense>
}

function FilhoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alunoId = searchParams.get('id')
  const abaInicial = searchParams.get('aba') || 'boletim'

  const [aba, setAba] = useState<'boletim' | 'recuperacao' | 'sisam' | 'tarefas' | 'frequencia' | 'presenca' | 'matricula'>(abaInicial as any)
  const [anoLetivo, setAnoLetivo] = useState('')
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [matriculaInfo, setMatriculaInfo] = useState<any>(null)
  const [dadosAluno, setDadosAluno] = useState<any>(null)
  const [carregandoHist, setCarregandoHist] = useState(false)
  const [sisamResultados, setSisamResultados] = useState<any[]>([])
  const [carregandoSisam, setCarregandoSisam] = useState(false)
  const [tarefas, setTarefas] = useState<any[]>([])
  const [carregandoTarefas, setCarregandoTarefas] = useState(false)
  const [presencaResumo, setPresencaResumo] = useState<Array<{ data: string; hora_entrada: string | null; hora_saida: string | null; metodo: string }>>([])
  const [presencaEventos, setPresencaEventos] = useState<Record<string, Array<{ tipo: 'entrada' | 'saida'; registrado_em: string; origem: string }>>>({})
  const [carregandoPresenca, setCarregandoPresenca] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [notas, setNotas] = useState<Record<string, Record<string, any>>>({})
  const [medias, setMedias] = useState<Record<string, number | null>>({})
  const [mediaGeral, setMediaGeral] = useState<number | null>(null)
  const [mediaAprovacao, setMediaAprovacao] = useState(6)
  const [frequencia, setFrequencia] = useState<Frequencia[]>([])
  const [freqGeral, setFreqGeral] = useState(0)
  const [totalFaltas, setTotalFaltas] = useState(0)

  useEffect(() => {
    if (!alunoId) { router.push('/responsavel/dashboard'); return }
    carregarAnos()
    carregarDados()
  }, [alunoId])

  // Dados cadastrais + histórico de matrícula (carrega ao abrir a aba "Dados")
  useEffect(() => {
    if (aba !== 'matricula' || !alunoId) return
    setCarregandoHist(true)
    Promise.all([
      fetch(`/api/responsavel/historico-matricula?aluno_id=${alunoId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch(`/api/responsavel/aluno-detalhes?aluno_id=${alunoId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ])
      .then(([hist, det]) => {
        if (hist) { setMatriculaInfo(hist.matricula); setHistorico(hist.historico || []) }
        if (det) setDadosAluno(det.aluno)
      })
      .finally(() => setCarregandoHist(false))
  }, [aba, alunoId])

  // Resultados SISAM (carrega ao abrir a aba)
  useEffect(() => {
    if (aba !== 'sisam' || !alunoId) return
    setCarregandoSisam(true)
    fetch(`/api/responsavel/resultados-sisam?aluno_id=${alunoId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSisamResultados(d.resultados || []) })
      .finally(() => setCarregandoSisam(false))
  }, [aba, alunoId])

  // Tarefas da turma (carrega ao abrir a aba)
  useEffect(() => {
    if (aba !== 'tarefas' || !alunoId) return
    setCarregandoTarefas(true)
    fetch(`/api/responsavel/tarefas?aluno_id=${alunoId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTarefas(d.tarefas || []) })
      .finally(() => setCarregandoTarefas(false))
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
      setMedias(data.medias || {})
      setMediaGeral(data.media_geral ?? null)
      setMediaAprovacao(data.media_aprovacao || 6)
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

  // ---- valores derivados ----
  // medias e mediaGeral vêm da API (mesmo cálculo do boletim oficial/fechamento).
  const iniciais = aluno.nome.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'

  const TABS = [
    { id: 'boletim' as const, label: 'Boletim', Icon: BookOpen, cor: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    { id: 'recuperacao' as const, label: 'Recuperação', Icon: RotateCcw, cor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { id: 'sisam' as const, label: 'SISAM', Icon: Landmark, cor: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    { id: 'tarefas' as const, label: 'Tarefas', Icon: ClipboardList, cor: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    { id: 'frequencia' as const, label: 'Frequência', Icon: CalendarCheck, cor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { id: 'presenca' as const, label: 'Presença', Icon: ScanFace, cor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { id: 'matricula' as const, label: 'Dados', Icon: FileText, cor: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-gray-50 dark:from-slate-900 dark:to-slate-900 pb-10">
      {/* ===================== HERO ===================== */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-7">
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4 relative z-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-indigo-900/5 border border-gray-100 dark:border-slate-700 p-1.5 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(({ id, label, Icon, cor, bg }) => {
            const ativo = aba === id
            return (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`shrink-0 sm:flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[48px] whitespace-nowrap ${
                  ativo ? `${bg} ${cor} shadow-sm` : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" /> {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===================== CONTEÚDO ===================== */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-3.5">
        {aba === 'boletim' && (
          <AbaBoletim disciplinas={disciplinas} periodos={periodos} notas={notas} medias={medias} mediaAprovacao={mediaAprovacao} />
        )}

        {aba === 'recuperacao' && (
          <AbaRecuperacao disciplinas={disciplinas} periodos={periodos} notas={notas} />
        )}

        {aba === 'sisam' && (
          <AbaSisam carregandoSisam={carregandoSisam} sisamResultados={sisamResultados} />
        )}

        {aba === 'tarefas' && (
          <AbaTarefas carregandoTarefas={carregandoTarefas} tarefas={tarefas} />
        )}

        {aba === 'frequencia' && (
          <AbaFrequencia frequencia={frequencia} freqGeral={freqGeral} totalFaltas={totalFaltas} />
        )}

        {aba === 'presenca' && (
          <AbaPresenca carregandoPresenca={carregandoPresenca} presencaResumo={presencaResumo} presencaEventos={presencaEventos} />
        )}

        {aba === 'matricula' && (
          <AbaMatricula carregandoHist={carregandoHist} dadosAluno={dadosAluno} matriculaInfo={matriculaInfo} historico={historico} />
        )}
      </div>
    </div>
  )
}
