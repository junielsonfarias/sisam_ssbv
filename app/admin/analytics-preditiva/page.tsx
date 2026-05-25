'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Activity,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Users,
  TrendingUp,
  Eye,
  X,
  School,
  Info,
  RefreshCw,
  Search,
  Download,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type NivelRisco = 'baixo' | 'medio' | 'alto'

interface FatorRisco {
  nome: string
  contribuicao: number
  detalhe: string
}

interface Predicao {
  aluno_id: string
  aluno_nome: string
  escola_id: string | null
  escola_nome: string | null
  turma_codigo: string | null
  score: number
  nivel: NivelRisco
  fatores: FatorRisco[]
}

interface Estatisticas {
  total_avaliados: number
  alto_risco: number
  medio_risco: number
  baixo_risco: number
  percentual_alto: number
  percentual_medio_ou_alto: number
}

interface Escola { id: string; nome: string }

const NIVEL_CONFIG: Record<NivelRisco, { label: string; cor: string; bg: string; barCor: string; icone: typeof AlertTriangle }> = {
  alto: {
    label: 'Alto risco',
    cor: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/30',
    barCor: 'bg-red-500',
    icone: AlertOctagon,
  },
  medio: {
    label: 'Médio risco',
    cor: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    barCor: 'bg-amber-500',
    icone: AlertTriangle,
  },
  baixo: {
    label: 'Baixo risco',
    cor: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/30',
    barCor: 'bg-green-500',
    icone: ShieldCheck,
  },
}

function AnalyticsPreditiva() {
  const toast = useToast()
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [riscos, setRiscos] = useState<Predicao[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoStats, setCarregandoStats] = useState(false)
  const [calculou, setCalculou] = useState(false)

  // Filtros
  const [filtroEscola, setFiltroEscola] = useState('')
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()))
  const [filtroNivel, setFiltroNivel] = useState<'' | NivelRisco>('medio')
  const [filtroLimite, setFiltroLimite] = useState('100')
  const [busca, setBusca] = useState('')

  const [predicaoDetalhe, setPredicaoDetalhe] = useState<Predicao | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const statsAbortRef = useRef<AbortController | null>(null)

  // Carregar escolas
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/escolas', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setEscolas(Array.isArray(d) ? d : []))
      .catch((e) => { if ((e as Error).name !== 'AbortError') console.error('[Predit] escolas', e) })
    return () => controller.abort()
  }, [])

  const calcular = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setCarregando(true)
    setCalculou(true)
    try {
      const p = new URLSearchParams({ ano: filtroAno, limite: filtroLimite })
      if (filtroEscola) p.set('escola', filtroEscola)
      if (filtroNivel) p.set('nivel', filtroNivel)
      const res = await fetch(`/api/admin/analytics-preditiva?${p}`, { signal: controller.signal })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem || 'Erro')
      setRiscos(data.riscos || [])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error(e instanceof Error ? e.message : 'Erro ao calcular')
    } finally {
      if (abortRef.current === controller) setCarregando(false)
    }
  }, [filtroAno, filtroEscola, filtroNivel, filtroLimite, toast])

  const calcularEstatisticas = useCallback(async () => {
    statsAbortRef.current?.abort()
    const controller = new AbortController()
    statsAbortRef.current = controller
    setCarregandoStats(true)
    try {
      const p = new URLSearchParams({ ano: filtroAno, estatisticas: 'true' })
      const res = await fetch(`/api/admin/analytics-preditiva?${p}`, { signal: controller.signal })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem || 'Erro')
      setEstatisticas(data.estatisticas || null)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('Erro ao calcular estatísticas')
    } finally {
      if (statsAbortRef.current === controller) setCarregandoStats(false)
    }
  }, [filtroAno, toast])

  const exportarCSV = () => {
    if (riscos.length === 0) return toast.error('Nada para exportar')
    const linhas = [
      'aluno,escola,turma,score,nivel,fatores',
      ...riscos.map((r) => {
        const fat = r.fatores.map((f) => `${f.nome} (${f.contribuicao}pts)`).join('; ')
        return `"${r.aluno_nome}","${r.escola_nome || ''}","${r.turma_codigo || ''}",${r.score},${r.nivel},"${fat}"`
      }),
    ]
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-preditiva-${filtroAno}-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV gerado')
  }

  const riscosFiltrados = busca.trim().length >= 2
    ? riscos.filter((r) => r.aluno_nome.toLowerCase().includes(busca.toLowerCase().trim()))
    : riscos

  const inputCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-red-500 outline-none'

  return (
    <div>
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Analytics Preditiva — Risco de Evasão</h1>
            <p className="text-red-100 text-sm">Identificação proativa de alunos em risco com score 0-100 baseado em frequência, notas, FICAI e contexto social</p>
          </div>
        </div>
      </div>

      {/* Aviso metodológico */}
      <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-semibold mb-1">Sistema de pesos interpretável — não é Machine Learning</p>
          <p>Score 0–100 calculado a partir de 5 fatores pedagogicamente conhecidos: Frequência (peso 35), Notas (25), FICAI ativo (20), Contexto social — Bolsa Família + distorção idade-série (10) e Histórico instável (10). Use como <strong>triagem para ação proativa</strong>, não como verdade absoluta. Valide a acurácia ao longo de ciclos letivos e ajuste pesos se necessário.</p>
        </div>
      </div>

      {/* Faixas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['alto', 'medio', 'baixo'] as NivelRisco[]).map((n) => {
          const cfg = NIVEL_CONFIG[n]
          const Icone = cfg.icone
          return (
            <div key={n} className={`${cfg.bg} rounded-xl p-3 flex items-center gap-2`}>
              <Icone className={`w-5 h-5 ${cfg.cor}`} />
              <div className="text-sm">
                <p className={`font-bold ${cfg.cor}`}>{cfg.label}</p>
                <p className={`text-xs ${cfg.cor} opacity-75`}>
                  {n === 'alto' ? '61–100' : n === 'medio' ? '31–60' : '0–30'} pts
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Ano</label>
            <input
              type="number"
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
              min="2020"
              max="2099"
              className={`${inputCls} w-24`}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Escola</label>
            <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className={inputCls}>
              <option value="">Todas escolas</option>
              {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Nível mínimo</label>
            <select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value as '' | NivelRisco)} className={inputCls}>
              <option value="">Todos</option>
              <option value="medio">Médio + Alto</option>
              <option value="alto">Apenas alto</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 block">Limite</label>
            <select value={filtroLimite} onChange={(e) => setFiltroLimite(e.target.value)} className={inputCls}>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>
          <button
            onClick={calcular}
            disabled={carregando}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {carregando ? <LoadingSpinner /> : <RefreshCw className="w-4 h-4" />}
            {carregando ? 'Calculando...' : 'Calcular riscos'}
          </button>
          <button
            onClick={calcularEstatisticas}
            disabled={carregandoStats}
            className="px-4 py-2 rounded-lg border-2 border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            title="Calcula sobre TODOS os alunos do município (pode levar minutos)"
          >
            {carregandoStats ? <LoadingSpinner /> : <TrendingUp className="w-4 h-4" />}
            Panorama geral
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ⚠️ O cálculo executa até 5 queries por aluno. Para o município inteiro com 1000 alunos, pode levar 30–90 segundos.
        </p>
      </div>

      {/* Panorama */}
      {estatisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4">
            <Users className="w-5 h-5 text-indigo-600 mb-1" />
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{estatisticas.total_avaliados}</p>
            <p className="text-xs text-indigo-600">Alunos avaliados</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4">
            <AlertOctagon className="w-5 h-5 text-red-600 mb-1" />
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
              {estatisticas.alto_risco}
              <span className="text-sm text-red-500 ml-1">({estatisticas.percentual_alto}%)</span>
            </p>
            <p className="text-xs text-red-600">Alto risco</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 mb-1" />
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{estatisticas.medio_risco}</p>
            <p className="text-xs text-amber-600">Médio risco</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
            <ShieldCheck className="w-5 h-5 text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{estatisticas.baixo_risco}</p>
            <p className="text-xs text-green-600">Baixo risco</p>
          </div>
        </div>
      )}

      {/* Lista de riscos */}
      {calculou && (
        <>
          {/* Subbarra: busca + export */}
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar nome do aluno..."
                className={`${inputCls} w-full pl-9`}
              />
            </div>
            <span className="text-xs text-gray-500">
              {riscosFiltrados.length} resultado{riscosFiltrados.length !== 1 ? 's' : ''}
              {busca && ` (de ${riscos.length})`}
            </span>
            <button
              onClick={exportarCSV}
              disabled={riscos.length === 0}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          {carregando ? (
            <LoadingSpinner centered />
          ) : riscosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <ShieldCheck className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {busca ? 'Nenhum aluno encontrado com esse nome' : 'Nenhum aluno em risco com os filtros atuais 🎉'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {riscosFiltrados.map((p) => {
                const cfg = NIVEL_CONFIG[p.nivel]
                return (
                  <div key={p.aluno_id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                    <div className="flex flex-wrap items-start gap-3 justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.cor} flex items-center gap-1`}>
                            <cfg.icone className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          <span className={`text-xs font-bold ${cfg.cor}`}>
                            Score: {p.score}/100
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{p.aluno_nome}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                          {p.escola_nome && <span className="flex items-center gap-1"><School className="w-3 h-3" /> {p.escola_nome}</span>}
                          {p.turma_codigo && <span>Turma {p.turma_codigo}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setPredicaoDetalhe(p)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-200"
                      >
                        <Eye className="w-3 h-3" /> Detalhar fatores
                      </button>
                    </div>

                    {/* Barra de score */}
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden mb-2">
                      <div
                        className={`h-full ${cfg.barCor} transition-all`}
                        style={{ width: `${p.score}%` }}
                      />
                    </div>

                    {/* Top 3 fatores resumidos */}
                    {p.fatores.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.fatores.slice(0, 3).map((f, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                            {f.nome} <span className="text-slate-400">+{f.contribuicao}pts</span>
                          </span>
                        ))}
                        {p.fatores.length > 3 && (
                          <span className="text-[10px] text-slate-400 px-1">+{p.fatores.length - 3} fatores</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {!calculou && (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
            Configure os filtros acima e clique em <strong>Calcular riscos</strong> para gerar a triagem.
          </p>
          <p className="text-xs text-gray-400">
            Cálculo agrega frequência, notas, FICAI, perfil social e histórico em um score único.
          </p>
        </div>
      )}

      {/* Modal de detalhe */}
      {predicaoDetalhe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {predicaoDetalhe.aluno_nome}
                </h2>
                <p className="text-xs text-gray-500">
                  {predicaoDetalhe.escola_nome}
                  {predicaoDetalhe.turma_codigo && ` · Turma ${predicaoDetalhe.turma_codigo}`}
                </p>
              </div>
              <button onClick={() => setPredicaoDetalhe(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Score visual destacado */}
              <div className={`p-4 rounded-xl ${NIVEL_CONFIG[predicaoDetalhe.nivel].bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${NIVEL_CONFIG[predicaoDetalhe.nivel].cor}`}>
                    {NIVEL_CONFIG[predicaoDetalhe.nivel].label}
                  </span>
                  <span className={`text-3xl font-extrabold ${NIVEL_CONFIG[predicaoDetalhe.nivel].cor}`}>
                    {predicaoDetalhe.score}
                    <span className="text-base opacity-60">/100</span>
                  </span>
                </div>
                <div className="w-full bg-white/40 dark:bg-black/20 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${NIVEL_CONFIG[predicaoDetalhe.nivel].barCor}`}
                    style={{ width: `${predicaoDetalhe.score}%` }}
                  />
                </div>
              </div>

              {/* Fatores detalhados */}
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                  Fatores que contribuíram ({predicaoDetalhe.fatores.length})
                </p>
                {predicaoDetalhe.fatores.length === 0 ? (
                  <div className="text-center py-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700 dark:text-green-300 font-bold">Sem fatores de risco identificados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {predicaoDetalhe.fatores.map((f, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{f.nome}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{f.detalhe}</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 whitespace-nowrap">
                          +{f.contribuicao} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recomendações por nível */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Ação recomendada</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {predicaoDetalhe.nivel === 'alto' && (
                    <>Acionar busca ativa imediatamente. Abrir caso FICAI se ainda não houver, contatar família e agendar reunião com equipe pedagógica e Conselho Tutelar se necessário.</>
                  )}
                  {predicaoDetalhe.nivel === 'medio' && (
                    <>Monitorar de perto. Programar conversa com família, oferecer reforço escolar e revisar plano de acompanhamento. Reavaliar em 30 dias.</>
                  )}
                  {predicaoDetalhe.nivel === 'baixo' && (
                    <>Aluno com baixo risco. Continuar acompanhamento regular e celebrar bons indicadores.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPreditivaPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
      <AnalyticsPreditiva />
    </ProtectedRoute>
  )
}
