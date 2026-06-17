'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus, School,
  BarChart3, Filter, Award
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import dynamic from 'next/dynamic'

const EvolucaoBarChart = dynamic(() => import('recharts').then(mod => {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = mod
  return function ChartWrapper({ data, anos }: { data: any[]; anos: string[] }) {
    const cores = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']
    return (
      <ResponsiveContainer width="100%" height={Math.max(400, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="escola" tick={{ fontSize: 10 }} width={110} />
          <Tooltip formatter={(value: number) => value?.toFixed(2)} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          {anos.map((ano, i) => (
            <Bar key={ano} dataKey={ano} name={ano} fill={cores[i % cores.length]} radius={[0, 4, 4, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }
}), { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center text-gray-400 text-sm">Carregando gráfico...</div> })

export default function EvolucaoEscolasPage() {
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [polos, setPolos] = useState<{ id: string; nome: string }[]>([])
  const [filtroPoloId, setFiltroPoloId] = useState('')
  const [filtroSerie, setFiltroSerie] = useState('')

  useEffect(() => {
    fetch('/api/admin/polos').then(r => r.ok ? r.json() : []).then(data => {
      setPolos(Array.isArray(data) ? data : data.polos || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true)
      try {
        const params = new URLSearchParams()
        if (filtroPoloId) params.set('polo_id', filtroPoloId)
        if (filtroSerie) params.set('serie', filtroSerie)
        const res = await fetch(`/api/admin/evolucao-escolas?${params}`)
        if (res.ok) setDados(await res.json())
      } catch (err) {
        console.error('[EvolucaoEscolas] Erro:', (err as Error).message)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [filtroPoloId, filtroSerie])

  const getVariacaoIcon = (variacao: number | null) => {
    if (variacao === null) return <Minus className="w-4 h-4 text-gray-400" />
    if (variacao > 0) return <ArrowUp className="w-4 h-4 text-emerald-600" />
    if (variacao < 0) return <ArrowDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  const getVariacaoCor = (variacao: number | null) => {
    if (variacao === null) return 'text-gray-400'
    if (variacao > 0) return 'text-emerald-600'
    if (variacao < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  // Dados para gráfico
  const chartData = dados?.escolas?.slice(0, 20).map((e: any) => {
    const item: any = { escola: e.escola.length > 25 ? e.escola.substring(0, 22) + '...' : e.escola }
    for (const ano of (dados.anos || [])) {
      item[ano] = e.medias[ano] || 0
    }
    return item
  }) || []

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Evolução das Escolas — SISAM</h1>
          </div>
          <p className="text-emerald-100 text-sm">Acompanhamento da performance das escolas ao longo dos anos</p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Polo</label>
              <select value={filtroPoloId} onChange={e => setFiltroPoloId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm">
                <option value="">Todos os polos</option>
                {polos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Série</label>
              <select value={filtroSerie} onChange={e => setFiltroSerie(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm">
                <option value="">Todas as séries</option>
                {['1','2','3','4','5','6','7','8','9'].map(s => <option key={s} value={s}>{s}º Ano</option>)}
              </select>
            </div>
          </div>
        </div>

        {carregando ? <LoadingSpinner text="Carregando dados..." centered /> : (
          <>
            {/* KPIs */}
            {dados?.kpis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <School className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Escolas Avaliadas</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{dados.kpis.totalEscolas}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Média Geral</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{dados.kpis.mediaGeral?.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Melhoraram</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{dados.kpis.melhoraram}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Pioraram</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{dados.kpis.pioraram}</p>
                </div>
              </div>
            )}

            {/* Top 5 destaques */}
            {(dados?.top5Melhoraram?.length > 0 || dados?.top5Pioraram?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dados.top5Melhoraram?.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">Top 5 — Maior Evolução</h3>
                    </div>
                    <div className="space-y-2">
                      {dados.top5Melhoraram.map((e: any, i: number) => (
                        <div key={e.id} className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600 w-5">{i + 1}.</span>
                            <span className="text-sm text-gray-800 dark:text-gray-200">{e.escola}</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">+{e.variacao?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {dados.top5Pioraram?.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">Top 5 — Maior Queda</h3>
                    </div>
                    <div className="space-y-2">
                      {dados.top5Pioraram.map((e: any, i: number) => (
                        <div key={e.id} className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-600 w-5">{i + 1}.</span>
                            <span className="text-sm text-gray-800 dark:text-gray-200">{e.escola}</span>
                          </div>
                          <span className="text-sm font-bold text-red-600">{e.variacao?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabela */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Todas as Escolas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Escola</th>
                      {dados?.anos?.map((ano: string) => (
                        <th key={ano} className="text-center py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Média {ano}</th>
                      ))}
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Variação</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados?.escolas?.map((e: any, idx: number) => {
                      const isTop5 = dados.top5Melhoraram?.some((t: any) => t.id === e.id)
                      const isBottom5 = dados.top5Pioraram?.some((t: any) => t.id === e.id)
                      return (
                        <tr key={e.id} className={`border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 ${isTop5 ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : isBottom5 ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                          <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                            {e.escola}
                            {isTop5 && <span className="ml-2 text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">destaque</span>}
                          </td>
                          {dados.anos.map((ano: string) => (
                            <td key={ano} className="py-2.5 px-3 text-center font-medium text-gray-700 dark:text-gray-300">
                              {e.medias[ano]?.toFixed(2) || '-'}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getVariacaoIcon(e.variacao)}
                              <span className={`font-bold ${getVariacaoCor(e.variacao)}`}>
                                {e.variacao !== null ? (e.variacao > 0 ? '+' : '') + e.variacao.toFixed(2) : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-600 dark:text-gray-400">{e.totalAlunos}</td>
                        </tr>
                      )
                    })}
                    {(!dados?.escolas || dados.escolas.length === 0) && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-gray-400">Nenhum dado encontrado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráfico */}
            {chartData.length > 0 && dados?.anos?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Comparativo por Escola</h3>
                <EvolucaoBarChart data={chartData} anos={dados.anos} />
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
