'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  LayoutGrid, Users, BookOpen, CalendarCheck, ArrowLeftRight,
  TrendingUp, TrendingDown, AlertTriangle, GraduationCap,
  BarChart3, RefreshCw, Printer, X, Accessibility, Phone, School,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'
import dynamic from 'next/dynamic'

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
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando...</div> })

const BarChartComponent = dynamic(() => import('recharts').then(mod => {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = mod
  return function BarChartWrapper({ data, dataKey, nameKey, media }: {
    data: any[]; dataKey: string; nameKey: string; media?: number
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
              <Cell key={i} fill={media !== undefined ? (entry[dataKey] >= media ? '#10b981' : '#ef4444') : '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando...</div> })

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
}), { ssr: false, loading: () => <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Carregando...</div> })

interface EscolaSimples { id: string; nome: string }

interface AlunoPcd {
  id: string; nome: string; serie: string; turma_codigo: string; turma_nome: string
  escola_nome: string; data_nascimento: string; tipo_deficiencia: string | null
  responsavel: string; telefone_responsavel: string
}

interface AlunoSituacao {
  id: string; nome: string; serie: string; situacao: string
  turma_codigo: string; escola_nome: string
}

interface TurmaDetalhe {
  id: string; codigo: string; nome: string; serie: string
  capacidade_maxima: number; escola_nome: string; total_alunos: number
}

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
  alunos_pcd: AlunoPcd[]
  alunos_situacao: AlunoSituacao[]
  turmas_detalhe: TurmaDetalhe[]
}

type ModalType = 'alunos' | 'turmas' | 'media' | 'frequencia' | 'transferencias' | 'pcd' | null

export default function DashboardGestorPage() {
  const toast = useToast()
  const { formatSerie } = useSeries()
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [escolaId, setEscolaId] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString())
  const [data, setData] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState<ModalType>(null)

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

  const dadosSituacao = data ? [
    { name: 'Cursando', value: data.alunos.cursando },
    { name: 'Aprovados', value: data.alunos.aprovados },
    { name: 'Reprovados', value: data.alunos.reprovados },
    { name: 'Transferidos', value: data.alunos.transferidos },
    { name: 'Abandono', value: data.alunos.abandono },
  ].filter(d => d.value > 0) : []

  const coresSituacao = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#6b7280']

  const dadosFrequencia = data ? [
    { name: '>= 90%', value: data.frequencia.acima_90 },
    { name: '75-89%', value: data.frequencia.entre_75_90 },
    { name: '< 75%', value: data.frequencia.abaixo_75 },
  ].filter(d => d.value > 0) : []

  const coresFrequencia = ['#10b981', '#eab308', '#ef4444']

  const dadosDisciplinas = data?.notas.por_disciplina.map(d => ({
    name: d.abreviacao || d.disciplina, media: d.media, abaixo: d.abaixo
  })) || []

  const dadosSeries = data?.distribuicao_serie.map(s => ({ name: s.serie, valor: s.total })) || []

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
                  {escolaNome || 'Todas as escolas'} — {anoLetivo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white">
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(a => (
                  <option key={a} value={a} className="text-gray-900">{a}</option>
                ))}
              </select>
              {tipoUsuario !== 'escola' && (
                <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
                  className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white max-w-[200px]">
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

        <div className="hidden print:block text-center mb-4">
          <h1 className="text-xl font-bold">Dashboard do Gestor Escolar</h1>
          <p className="text-sm text-gray-600">{escolaNome || 'Todas as escolas'} — Ano Letivo {anoLetivo}</p>
        </div>

        {carregando ? (
          <LoadingSpinner text="Carregando dashboard..." centered />
        ) : data ? (
          <>
            {/* KPI Cards - clicaveis */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <CardMetrica icon={Users} label="Alunos Ativos" valor={data.alunos.cursando} cor="blue"
                sublabel={`${data.alunos.total} total`} onClick={() => setModalAberto('alunos')} />
              <CardMetrica icon={GraduationCap} label="Turmas" valor={data.turmas.total} cor="indigo"
                sublabel={`${data.turmas.series} series`} onClick={() => setModalAberto('turmas')} />
              <CardMetrica icon={TrendingUp} label="Media Geral" valor={data.notas.media_geral.toFixed(1)}
                cor={data.notas.media_geral >= 6 ? 'emerald' : 'red'} sublabel={`${data.notas.total_lancamentos} notas`}
                onClick={() => setModalAberto('media')} />
              <CardMetrica icon={CalendarCheck} label="Frequencia" valor={data.frequencia.media_frequencia ? `${data.frequencia.media_frequencia}%` : '-'}
                cor={data.frequencia.media_frequencia >= 75 ? 'emerald' : 'red'} sublabel={`${data.frequencia.total_com_frequencia} alunos`}
                onClick={() => setModalAberto('frequencia')} />
              <CardMetrica icon={ArrowLeftRight} label="Transferencias" valor={data.transferencias.saidas + data.transferencias.entradas}
                cor="orange" sublabel={`${data.transferencias.saidas} saidas / ${data.transferencias.entradas} entradas`}
                onClick={() => setModalAberto('transferencias')} />
              <CardMetrica icon={Accessibility} label="Alunos PCD" valor={data.alunos.pcd} cor="violet"
                sublabel="Clique para ver lista" onClick={() => setModalAberto('pcd')} />
            </div>

            {/* Graficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" /> Situacao dos Alunos
                </h3>
                {dadosSituacao.length > 0 ? (
                  <PieChartComponent data={dadosSituacao} colors={coresSituacao} />
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Sem dados</p>
                )}
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <CalendarCheck className="w-4 h-4" /> Distribuicao de Frequencia
                </h3>
                {dadosFrequencia.length > 0 ? (
                  <>
                    <PieChartComponent data={dadosFrequencia} colors={coresFrequencia} />
                    <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-slate-700">
                      <span>Total de faltas: <strong>{data.frequencia.total_faltas}</strong></span>
                      <span>Media: <strong className={data.frequencia.media_frequencia >= 75 ? 'text-emerald-600' : 'text-red-600'}>{data.frequencia.media_frequencia}%</strong></span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Nenhuma frequencia registrada</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4" /> Media por Disciplina
                </h3>
                {dadosDisciplinas.length > 0 ? (
                  <>
                    <BarChartComponent data={dadosDisciplinas} dataKey="media" nameKey="name" media={6} />
                    <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-slate-700 mt-2">
                      <span>{data.notas.abaixo_media} abaixo da media</span>
                      <span>{data.notas.em_recuperacao} em recuperacao</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Nenhuma nota lancada</p>
                )}
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4" /> Alunos por Serie
                </h3>
                {dadosSeries.length > 0 ? (
                  <AreaChartComponent data={dadosSeries} />
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Sem dados</p>
                )}
              </div>
            </div>

            {/* Transferencias + PCD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4" /> Movimentacao de Alunos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                    <TrendingDown className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.transferencias.saidas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saidas</p>
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

              {/* Card PCD - tabela compacta 1 linha por aluno */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Accessibility className="w-4 h-4 text-violet-500" /> Alunos PCD
                  </h3>
                  <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-bold px-2.5 py-1 rounded-full">
                    {data.alunos.pcd}
                  </span>
                </div>
                {data.alunos_pcd && data.alunos_pcd.length > 0 ? (
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600">
                          <th className="pb-2 pr-2 font-medium">Nome</th>
                          <th className="pb-2 pr-2 font-medium whitespace-nowrap">Turma</th>
                          <th className="pb-2 pr-2 font-medium whitespace-nowrap">Serie</th>
                          <th className="pb-2 pr-2 font-medium">Responsavel</th>
                          <th className="pb-2 font-medium">Telefone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.alunos_pcd.map((a) => (
                          <tr key={a.id}
                            className="border-b border-gray-50 dark:border-slate-700/30 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 cursor-pointer"
                            onClick={() => setModalAberto('pcd')}>
                            <td className="py-1.5 pr-2 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{a.nome}</td>
                            <td className="py-1.5 pr-2 text-violet-600 dark:text-violet-400 font-medium">{a.turma_codigo}</td>
                            <td className="py-1.5 pr-2 text-gray-500">{formatSerie(a.serie)}</td>
                            <td className="py-1.5 pr-2 text-gray-500 truncate max-w-[140px]">{a.responsavel || '-'}</td>
                            <td className="py-1.5 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {a.telefone_responsavel || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Accessibility className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum aluno PCD registrado</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {/* Modais */}
        {modalAberto && data && (
          <ModalKPI tipo={modalAberto} data={data} onClose={() => setModalAberto(null)} />
        )}
      </div>
    </ProtectedRoute>
  )
}

// ============================================
// Modal KPI
// ============================================
function ModalKPI({ tipo, data, onClose }: { tipo: ModalType; data: DashboardData; onClose: () => void }) {
  const config: Record<string, { titulo: string; icon: any; cor: string }> = {
    alunos: { titulo: 'Alunos por Situacao', icon: Users, cor: 'blue' },
    turmas: { titulo: 'Detalhes das Turmas', icon: GraduationCap, cor: 'indigo' },
    media: { titulo: 'Notas por Disciplina', icon: TrendingUp, cor: 'emerald' },
    frequencia: { titulo: 'Detalhes de Frequencia', icon: CalendarCheck, cor: 'emerald' },
    transferencias: { titulo: 'Movimentacao de Alunos', icon: ArrowLeftRight, cor: 'orange' },
    pcd: { titulo: 'Alunos PCD', icon: Accessibility, cor: 'violet' },
  }

  const { titulo, icon: Icon, cor } = config[tipo!] || config.alunos

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 bg-${cor}-100 dark:bg-${cor}-900/40 text-${cor}-600 dark:text-${cor}-400`}>
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{titulo}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1">
          {tipo === 'alunos' && <ModalAlunos data={data} />}
          {tipo === 'turmas' && <ModalTurmas data={data} />}
          {tipo === 'media' && <ModalMedia data={data} />}
          {tipo === 'frequencia' && <ModalFrequencia data={data} />}
          {tipo === 'transferencias' && <ModalTransferencias data={data} />}
          {tipo === 'pcd' && <ModalPCD data={data} />}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Conteudo dos Modais
// ============================================

function ModalAlunos({ data }: { data: DashboardData }) {
  const { formatSerie } = useSeries()
  const situacoes = [
    { label: 'Cursando', valor: data.alunos.cursando, cor: 'bg-blue-500' },
    { label: 'Aprovados', valor: data.alunos.aprovados, cor: 'bg-emerald-500' },
    { label: 'Reprovados', valor: data.alunos.reprovados, cor: 'bg-red-500' },
    { label: 'Transferidos', valor: data.alunos.transferidos, cor: 'bg-orange-500' },
    { label: 'Abandono', valor: data.alunos.abandono, cor: 'bg-gray-500' },
  ]
  const total = data.alunos.total

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {situacoes.map(s => (
          <div key={s.label} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{s.valor}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${s.cor}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
            </div>
            {total > 0 && <p className="text-[10px] text-gray-400 mt-1">{((s.valor / total) * 100).toFixed(1)}%</p>}
          </div>
        ))}
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{data.alunos.pcd}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Accessibility className="w-3 h-3 text-violet-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">PCD</span>
          </div>
        </div>
      </div>

      {data.alunos_situacao && data.alunos_situacao.length > 0 && (
        <>
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-4">Lista de alunos ({data.alunos_situacao.length})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b dark:border-slate-600">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Serie</th>
                  <th className="pb-2 font-medium">Turma</th>
                  <th className="pb-2 font-medium">Situacao</th>
                  <th className="pb-2 font-medium">Escola</th>
                </tr>
              </thead>
              <tbody>
                {data.alunos_situacao.map((a, i) => (
                  <tr key={a.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{a.nome}</td>
                    <td className="py-2">{formatSerie(a.serie)}</td>
                    <td className="py-2">{a.turma_codigo}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.situacao === 'cursando' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        a.situacao === 'aprovado' ? 'bg-emerald-100 text-emerald-700' :
                        a.situacao === 'reprovado' ? 'bg-red-100 text-red-700' :
                        a.situacao === 'transferido' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{a.situacao}</span>
                    </td>
                    <td className="py-2 text-xs text-gray-500 truncate max-w-[150px]">{a.escola_nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function ModalTurmas({ data }: { data: DashboardData }) {
  const { formatSerie } = useSeries()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{data.turmas.total}</p>
          <p className="text-xs text-gray-500">Total de turmas</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{data.turmas.series}</p>
          <p className="text-xs text-gray-500">Series</p>
        </div>
      </div>

      {data.turmas_detalhe && data.turmas_detalhe.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b dark:border-slate-600">
                <th className="pb-2 font-medium">Turma</th>
                <th className="pb-2 font-medium">Serie</th>
                <th className="pb-2 font-medium">Alunos</th>
                <th className="pb-2 font-medium">Capacidade</th>
                <th className="pb-2 font-medium">Ocupacao</th>
                <th className="pb-2 font-medium">Escola</th>
              </tr>
            </thead>
            <tbody>
              {data.turmas_detalhe.map(t => {
                const ocupacao = t.capacidade_maxima > 0 ? Math.round((t.total_alunos / t.capacidade_maxima) * 100) : 0
                return (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{t.codigo}</td>
                    <td className="py-2">{formatSerie(t.serie)}</td>
                    <td className="py-2 font-semibold">{t.total_alunos}</td>
                    <td className="py-2 text-gray-500">{t.capacidade_maxima}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${ocupacao >= 90 ? 'bg-red-500' : ocupacao >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(ocupacao, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{ocupacao}%</span>
                      </div>
                    </td>
                    <td className="py-2 text-xs text-gray-500 truncate max-w-[120px]">{t.escola_nome}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ModalMedia({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{data.notas.media_geral.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Media Geral</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{data.notas.abaixo_media}</p>
          <p className="text-xs text-gray-500">Abaixo de 6</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{data.notas.em_recuperacao}</p>
          <p className="text-xs text-gray-500">Recuperacao</p>
        </div>
      </div>
      {data.notas.por_disciplina.length > 0 ? (
        <div className="space-y-2">
          {data.notas.por_disciplina.map(d => (
            <div key={d.disciplina} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{d.disciplina}</p>
                <div className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-full mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${d.media >= 6 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min((d.media / 10) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-lg font-bold ${d.media >= 6 ? 'text-emerald-600' : 'text-red-600'}`}>{d.media}</p>
                <p className="text-[10px] text-gray-400">{d.abaixo} abaixo</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Nenhuma nota lancada</p>
      )}
    </div>
  )
}

function ModalFrequencia({ data }: { data: DashboardData }) {
  const faixas = [
    { label: '>= 90%', valor: data.frequencia.acima_90, cor: 'bg-emerald-500', texto: 'text-emerald-600' },
    { label: '75-89%', valor: data.frequencia.entre_75_90, cor: 'bg-yellow-500', texto: 'text-yellow-600' },
    { label: '< 75%', valor: data.frequencia.abaixo_75, cor: 'bg-red-500', texto: 'text-red-600' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{data.frequencia.media_frequencia || 0}%</p>
          <p className="text-xs text-gray-500">Media</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{data.frequencia.total_com_frequencia}</p>
          <p className="text-xs text-gray-500">Com frequencia</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{data.frequencia.total_faltas}</p>
          <p className="text-xs text-gray-500">Total faltas</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{data.frequencia.abaixo_75}</p>
          <p className="text-xs text-gray-500">Infrequentes</p>
        </div>
      </div>
      <div className="space-y-2">
        {faixas.map(f => (
          <div key={f.label} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${f.cor}`} />
            <span className="text-sm font-medium flex-1">{f.label}</span>
            <span className={`text-lg font-bold ${f.texto}`}>{f.valor}</span>
            <span className="text-xs text-gray-400">alunos</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModalTransferencias({ data }: { data: DashboardData }) {
  const saldo = data.transferencias.entradas - data.transferencias.saidas
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-5 text-center">
          <TrendingDown className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{data.transferencias.saidas}</p>
          <p className="text-sm text-gray-500">Saidas</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-5 text-center">
          <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{data.transferencias.entradas}</p>
          <p className="text-sm text-gray-500">Entradas</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold">{data.transferencias.dentro_municipio}</p>
          <p className="text-xs text-gray-500">Dentro municipio</p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold">{data.transferencias.fora_municipio}</p>
          <p className="text-xs text-gray-500">Fora municipio</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${saldo >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <p className={`text-xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {saldo >= 0 ? '+' : ''}{saldo}
          </p>
          <p className="text-xs text-gray-500">Saldo</p>
        </div>
      </div>
    </div>
  )
}

function ModalPCD({ data }: { data: DashboardData }) {
  const { formatSerie } = useSeries()
  // Agrupar por escola
  const porEscola = (data.alunos_pcd || []).reduce<Record<string, AlunoPcd[]>>((acc, aluno) => {
    const escola = aluno.escola_nome || 'Sem escola'
    if (!acc[escola]) acc[escola] = []
    acc[escola].push(aluno)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20 rounded-xl p-5 flex items-center gap-4">
        <div className="bg-violet-100 dark:bg-violet-800/50 rounded-xl p-3">
          <Accessibility className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{data.alunos.pcd}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.alunos.pcd === 1 ? 'Aluno com deficiencia' : 'Alunos com deficiencia'}
            {data.alunos.total > 0 && (
              <span className="ml-1 text-xs text-gray-400">
                ({((data.alunos.pcd / data.alunos.total) * 100).toFixed(1)}% do total)
              </span>
            )}
          </p>
        </div>
      </div>

      {data.alunos_pcd && data.alunos_pcd.length > 0 ? (
        <div className="space-y-5">
          {Object.entries(porEscola).map(([escola, alunos]) => (
            <div key={escola}>
              {Object.keys(porEscola).length > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  <School className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">{escola}</h4>
                  <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 px-2 py-0.5 rounded-full">{alunos.length}</span>
                </div>
              )}
              <div className="space-y-3">
                {alunos.map((a, i) => (
                  <div key={a.id} className="bg-white dark:bg-slate-700/40 border border-gray-100 dark:border-slate-600/50 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="bg-violet-100 dark:bg-violet-800/50 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 dark:text-gray-100 text-[15px]">{a.nome}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-lg">
                            <GraduationCap className="w-3 h-3" /> {a.turma_codigo}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-2.5 py-1 rounded-lg">
                            {formatSerie(a.serie)}
                          </span>
                          {a.tipo_deficiencia && (
                            <span className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-800/40 text-violet-700 dark:text-violet-300 text-xs font-medium px-2.5 py-1 rounded-lg">
                              <Accessibility className="w-3 h-3" /> {a.tipo_deficiencia}
                            </span>
                          )}
                          {!a.tipo_deficiencia && (
                            <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700/40 text-gray-500 text-xs px-2.5 py-1 rounded-lg">
                              <AlertTriangle className="w-3 h-3" /> Tipo nao informado
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-600/30">
                          {a.data_nascimento && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Nasc: <strong>{new Date(a.data_nascimento).toLocaleDateString('pt-BR')}</strong>
                            </span>
                          )}
                          {a.responsavel && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Resp: <strong>{a.responsavel}</strong>
                            </span>
                          )}
                          {a.telefone_responsavel && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                              <Phone className="w-3 h-3" /> {a.telefone_responsavel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <Accessibility className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum aluno PCD registrado</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// Card KPI clicavel
// ============================================
function CardMetrica({ icon: Icon, label, valor, cor, sublabel, onClick }: {
  icon: any; label: string; valor: string | number; cor: string; sublabel?: string; onClick?: () => void
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
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 w-fit ${cores[cor] || cores.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
      </div>
      <p className={`text-2xl font-bold mt-2 ${coreTexto[cor] || coreTexto.blue}`}>{valor}</p>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
      {sublabel && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sublabel}</p>}
    </div>
  )
}
