'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  LayoutGrid, Users, BookOpen, CalendarCheck, ArrowLeftRight,
  TrendingUp, TrendingDown, GraduationCap, Accessibility,
  BarChart3, RefreshCw, Printer
} from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSeries } from '@/lib/use-series'

import { PieChartComponent, BarChartComponent, AreaChartComponent } from './components/charts'
import { CardMetrica } from './components/card-metrica'
import { ModalKPI } from './components/modal-kpi'
import type { EscolaSimples, DashboardData, ModalType } from './components/types'

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
      } catch { }
    }
    init()
  }, [])

  useEffect(() => {
    if (tipoUsuario && tipoUsuario !== 'escola') {
      fetch('/api/admin/escolas')
        .then(r => r.ok ? r.json() : Promise.reject())
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
