'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  LayoutGrid, Users, BookOpen, CalendarCheck, ArrowLeftRight,
  TrendingUp, TrendingDown, AlertTriangle, RotateCcw, GraduationCap,
  CheckCircle, XCircle, BarChart3, RefreshCw, Printer
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import dynamic from 'next/dynamic'

// Lazy load Recharts para evitar SSR issues
const PieChartComponent = dynamic(() => import('recharts').then(mod => {
  const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = mod
  return function PieChartWrapper({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''} labelLine={false} fontSize={11}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(value: number) => [value, 'Alunos']} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

const BarChartComponent = dynamic(() => import('recharts').then(mod => {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = mod
  return function BarChartWrapper({ data, dataKey, nameKey, barColor, media }: {
    data: any[]; dataKey: string; nameKey: string; barColor?: string; media?: number
  }) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
          <Tooltip />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={media !== undefined ? (entry[dataKey] >= media ? '#10b981' : '#ef4444') : (barColor || '#6366f1')} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

const AreaChartComponent = dynamic(() => import('recharts').then(mod => {
  const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod
  return function AreaChartWrapper({ data }: { data: { name: string; valor: number }[] }) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area type="monotone" dataKey="valor" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

interface EscolaSimples { id: string; nome: string }

interface DashboardData {
  alunos: {
    total: number; cursando: number; transferidos: number; abandono: number
    aprovados: number; reprovados: number; pcd: number
  }
  turmas: { total: number; series: number }
  notas: {
    total_alunos_com_nota: number; total_lancamentos: number
    media_geral: number; abaixo_media: number; acima_media: number
    em_recuperacao: number
    por_disciplina: { disciplina: string; abreviacao: string | null; media: number; total: number; abaixo: number }[]
  }
  frequencia: {
    total_com_frequencia: number; media_frequencia: number
    abaixo_75: number; entre_75_90: number; acima_90: number; total_faltas: number
  }
  transferencias: {
    saidas: number; entradas: number; dentro_municipio: number; fora_municipio: number
  }
  conselho: {
    total_conselhos: number; turmas_com_conselho: number; total_pareceres: number
    aprovados: number; reprovados: number; recuperacao: number; progressao: number
  }
  distribuicao_serie: { serie: string; total: number }[]
}

export default function DashboardGestorPage() {
  const toast = useToast()
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [data, setData] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth/verificar')
        if (authRes.ok) {
          const d = await authRes.json()
          if (d.usuario) {
            const tipo = d.usuario.tipo_usuario === 'administrador' ? 'admin' : d.usuario.tipo_usuario
            setTipoUsuario(tipo)
            if (d.usuario.escola_id) setEscolaId(d.usuario.escola_id)
          }
        }
      } catch (e) { console.error(e) }
    }
    init()
  }, [])

  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.json())
        .then(d => setEscolas(Array.isArray(d) ? d : []))
        .catch(() => setEscolas([]))
    }
  }, [tipoUsuario])

  const carregarDashboard = async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo })
      if (escolaId) params.set('escola_id', escolaId)
      const res = await fetch(`/api/admin/dashboard-gestor?${params}`)
      if (res.ok) {
        setData(await res.json())
      } else {
        toast.error('Erro ao carregar dashboard')
      }
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (tipoUsuario) carregarDashboard()
  }, [tipoUsuario, escolaId, anoLetivo])

  const escolaNome = escolas.find(e => e.id === escolaId)?.nome

  // Preparar dados para gráficos
  const dadosSituacao = data ? [
    { name: 'Cursando', value: data.alunos.cursando },
    { name: 'Aprovados', value: data.alunos.aprovados },
    { name: 'Reprovados', value: data.alunos.reprovados },
    { name: 'Transferidos', value: data.alunos.transferidos },
    { name: 'Abandono', value: data.alunos.abandono },
  ].filter(d => d.value > 0) : []

  const coresSituacao = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#6b7280']

  const dadosFrequencia = data ? [
    { name: '≥ 90%', value: data.frequencia.acima_90 },
    { name: '75-89%', value: data.frequencia.entre_75_90 },
    { name: '< 75%', value: data.frequencia.abaixo_75 },
  ].filter(d => d.value > 0) : []

  const coresFrequencia = ['#10b981', '#eab308', '#ef4444']

  const dadosConselho = data ? [
    { name: 'Aprovados', value: data.conselho.aprovados },
    { name: 'Reprovados', value: data.conselho.reprovados },
    { name: 'Recuperação', value: data.conselho.recuperacao },
    { name: 'Progressão', value: data.conselho.progressao },
  ].filter(d => d.value > 0) : []

  const coresConselho = ['#10b981', '#ef4444', '#f97316', '#3b82f6']

  const dadosDisciplinas = data?.notas.por_disciplina.map(d => ({
    name: d.abreviacao || d.disciplina,
    media: d.media,
    abaixo: d.abaixo
  })) || []

  const dadosSeries = data?.distribuicao_serie.map(s => ({
    name: s.serie,
    valor: s.total
  })) || []

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dashboard do Gestor Escolar</h1>
                <p className="text-sm opacity-90">
                  Visão geral — {escolaNome || 'Todas as escolas'} — {anoLetivo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={anoLetivo}
                onChange={e => setAnoLetivo(e.target.value)}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
                  <option key={a} value={a} className="text-gray-900">{a}</option>
                ))}
              </select>

              {tipoUsuario !== 'escola' && (
                <select
                  value={escolaId}
                  onChange={e => setEscolaId(e.target.value)}
                  className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white max-w-[200px]"
                >
                  <option value="" className="text-gray-900">Todas as escolas</option>
                  {escolas.map(e => (
                    <option key={e.id} value={e.id} className="text-gray-900">{e.nome}</option>
                  ))}
                </select>
              )}

              <button onClick={() => window.print()} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Imprimir">
                <Printer className="w-5 h-5" />
              </button>
              <button onClick={carregarDashboard} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Atualizar">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-xl font-bold">Dashboard do Gestor Escolar</h1>
          <p className="text-sm text-gray-600">{escolaNome || 'Todas as escolas'} — Ano Letivo {anoLetivo}</p>
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando dashboard..." centered />
        ) : data ? (
          <>
            {/* Linha 1: Cards principais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <CardMetrica icon={Users} label="Alunos Ativos" valor={data.alunos.cursando} cor="blue" sublabel={`${data.alunos.total} total`} />
              <CardMetrica icon={GraduationCap} label="Turmas" valor={data.turmas.total} cor="indigo" sublabel={`${data.turmas.series} séries`} />
              <CardMetrica icon={TrendingUp} label="Média Geral" valor={data.notas.media_geral.toFixed(1)} cor={data.notas.media_geral >= 6 ? 'emerald' : 'red'} sublabel={`${data.notas.total_lancamentos} notas`} />
              <CardMetrica icon={CalendarCheck} label="Frequência" valor={data.frequencia.media_frequencia ? `${data.frequencia.media_frequencia}%` : '-'} cor={data.frequencia.media_frequencia >= 75 ? 'emerald' : 'red'} sublabel={`${data.frequencia.total_com_frequencia} alunos`} />
              <CardMetrica icon={ArrowLeftRight} label="Transferências" valor={data.transferencias.saidas + data.transferencias.entradas} cor="orange" sublabel={`${data.transferencias.saidas} saídas / ${data.transferencias.entradas} entradas`} />
              <CardMetrica icon={Users} label="Conselhos" valor={data.conselho.total_conselhos} cor="violet" sublabel={`${data.conselho.turmas_com_conselho} turmas`} />
            </div>

            {/* Linha 2: Gráfico Pizza Situação + Pizza Frequência */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" /> Situação dos Alunos
                </h3>
                {dadosSituacao.length > 0 ? (
                  <PieChartComponent data={dadosSituacao} colors={coresSituacao} />
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Sem dados</p>
                )}
                {data.alunos.pcd > 0 && (
                  <div className="text-center pt-2 border-t border-gray-100 dark:border-slate-700">
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{data.alunos.pcd} aluno(s) PCD</span>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <CalendarCheck className="w-4 h-4" /> Distribuição de Frequência
                </h3>
                {dadosFrequencia.length > 0 ? (
                  <>
                    <PieChartComponent data={dadosFrequencia} colors={coresFrequencia} />
                    <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-slate-700">
                      <span>Total de faltas: <strong>{data.frequencia.total_faltas}</strong></span>
                      <span>Média: <strong className={data.frequencia.media_frequencia >= 75 ? 'text-emerald-600' : 'text-red-600'}>{data.frequencia.media_frequencia}%</strong></span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Nenhuma frequência registrada</p>
                )}
              </div>
            </div>

            {/* Linha 3: Barras Disciplinas + Area Séries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4" /> Média por Disciplina
                </h3>
                {dadosDisciplinas.length > 0 ? (
                  <>
                    <BarChartComponent data={dadosDisciplinas} dataKey="media" nameKey="name" media={6} />
                    <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-slate-700 mt-2">
                      <span>{data.notas.abaixo_media} abaixo da média</span>
                      <span className="text-gray-400">Linha vermelha = média &lt; 6</span>
                      <span>{data.notas.em_recuperacao} em recuperação</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Nenhuma nota lançada</p>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4" /> Alunos por Série
                </h3>
                {dadosSeries.length > 0 ? (
                  <AreaChartComponent data={dadosSeries} />
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Sem dados</p>
                )}
              </div>
            </div>

            {/* Linha 4: Transferências + Conselho de Classe */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4" /> Movimentação de Alunos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                    <TrendingDown className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.transferencias.saidas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saídas</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.transferencias.entradas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Entradas</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <span>Dentro: <strong>{data.transferencias.dentro_municipio}</strong></span>
                  <span className={`text-lg font-bold ${data.transferencias.entradas - data.transferencias.saidas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Saldo: {data.transferencias.entradas - data.transferencias.saidas >= 0 ? '+' : ''}{data.transferencias.entradas - data.transferencias.saidas}
                  </span>
                  <span>Fora: <strong>{data.transferencias.fora_municipio}</strong></span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" /> Conselho de Classe
                </h3>
                {dadosConselho.length > 0 ? (
                  <>
                    <PieChartComponent data={dadosConselho} colors={coresConselho} />
                    <div className="flex justify-center gap-6 text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-slate-700">
                      <span>{data.conselho.total_conselhos} conselhos</span>
                      <span>{data.conselho.total_pareceres} pareceres</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Nenhum conselho registrado</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Componentes auxiliares
// ============================================

function CardMetrica({ icon: Icon, label, valor, cor, sublabel }: {
  icon: any; label: string; valor: string | number; cor: string; sublabel?: string
}) {
  const cores: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
  }

  const coreTexto: Record<string, string> = {
    blue: 'text-blue-700 dark:text-blue-300',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    red: 'text-red-700 dark:text-red-300',
    orange: 'text-orange-700 dark:text-orange-300',
    indigo: 'text-indigo-700 dark:text-indigo-300',
    violet: 'text-violet-700 dark:text-violet-300',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
      <div className={`rounded-lg p-2 w-fit ${cores[cor] || cores.blue}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className={`text-2xl font-bold mt-2 ${coreTexto[cor] || coreTexto.blue}`}>{valor}</p>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
      {sublabel && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sublabel}</p>}
    </div>
  )
}
