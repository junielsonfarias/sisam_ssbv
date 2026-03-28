'use client'

import { useState, useEffect } from 'react'
import {
  Users, School, GraduationCap, TrendingUp, AlertTriangle, BarChart3,
  ArrowUp, ArrowDown, Loader2
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface KPIs {
  total_alunos: number
  total_escolas: number
  total_turmas: number
  media_sisam: number | null
}

interface EscolaRanking {
  id: string
  nome: string
  media_sisam: string
  total_avaliados: string
}

interface Distribuicao {
  situacao: string
  total: number
}

interface TabelaEscola {
  id: string
  nome: string
  total_alunos: string
  total_turmas: string
  media_sisam: string | null
  frequencia_media: string | null
}

interface DadosExecutivo {
  ano_letivo: string
  kpis: KPIs
  alertas: {
    escolas_freq_baixa: number
    turmas_superlotadas: number
    turmas_superlotadas_lista: any[]
  }
  ranking: { top5: EscolaRanking[]; bottom5: EscolaRanking[] }
  distribuicao: Distribuicao[]
  tabela_escolas: TabelaEscola[]
}

const CORES_SITUACAO: Record<string, string> = {
  cursando: '#3b82f6',
  aprovado: '#22c55e',
  reprovado: '#ef4444',
  transferido: '#f59e0b',
  abandono: '#6b7280',
  desistente: '#8b5cf6',
  sem_situacao: '#d1d5db',
}

const LABELS_SITUACAO: Record<string, string> = {
  cursando: 'Cursando',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  transferido: 'Transferido',
  abandono: 'Abandono',
  desistente: 'Desistente',
  sem_situacao: 'Sem situacao',
}

function PainelExecutivo() {
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()))
  const [dados, setDados] = useState<DadosExecutivo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetchDados()
  }, [anoLetivo])

  const fetchDados = async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/admin/executivo?ano_letivo=${anoLetivo}`)
      if (!res.ok) throw new Error('Erro ao carregar dados')
      const data = await res.json()
      setDados(data)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  if (erro) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-2 text-red-600 dark:text-red-400">{erro}</p>
        <button onClick={fetchDados} className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800">
          Tentar novamente
        </button>
      </div>
    )
  }

  const kpis = [
    { icon: Users, label: 'Total de Alunos', valor: dados?.kpis.total_alunos ?? '-', cor: 'from-blue-500 to-blue-600' },
    { icon: School, label: 'Escolas Ativas', valor: dados?.kpis.total_escolas ?? '-', cor: 'from-emerald-500 to-emerald-600' },
    { icon: GraduationCap, label: 'Turmas', valor: dados?.kpis.total_turmas ?? '-', cor: 'from-purple-500 to-purple-600' },
    { icon: TrendingUp, label: 'Media SISAM', valor: dados?.kpis.media_sisam ?? '-', cor: 'from-amber-500 to-amber-600' },
  ]

  // Dados para o grafico de pizza
  const dadosPizza = (dados?.distribuicao || []).map(d => ({
    name: LABELS_SITUACAO[d.situacao] || d.situacao,
    value: d.total,
    fill: CORES_SITUACAO[d.situacao] || '#d1d5db',
  }))

  // Dados para barra ranking
  const dadosTop5 = (dados?.ranking.top5 || []).map(e => ({
    nome: e.nome.length > 25 ? e.nome.substring(0, 25) + '...' : e.nome,
    media: parseFloat(e.media_sisam),
  }))
  const dadosBottom5 = (dados?.ranking.bottom5 || []).map(e => ({
    nome: e.nome.length > 25 ? e.nome.substring(0, 25) + '...' : e.nome,
    media: parseFloat(e.media_sisam),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl px-6 py-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6" /> Painel Executivo
            </h1>
            <p className="text-slate-300 text-sm mt-1">Visao geral do municipio</p>
          </div>
          <select
            value={anoLetivo}
            onChange={e => setAnoLetivo(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <span className="ml-3 text-slate-500">Carregando dados...</span>
        </div>
      ) : dados ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${kpi.cor} p-2.5 rounded-lg`}>
                    <kpi.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.valor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Alertas */}
          {(dados.alertas.escolas_freq_baixa > 0 || dados.alertas.turmas_superlotadas > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dados.alertas.escolas_freq_baixa > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-800 dark:text-amber-200">Frequencia Baixa</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {dados.alertas.escolas_freq_baixa} escola(s) com frequencia abaixo de 75%
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {dados.alertas.turmas_superlotadas > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-200">Turmas Superlotadas</p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {dados.alertas.turmas_superlotadas} turma(s) com mais de 35 alunos
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Graficos - 2 colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking escolas */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-emerald-500" /> Top 5 Escolas (Media SISAM)
              </h2>
              {dadosTop5.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosTop5} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 10]} />
                    <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="media" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados de avaliacao SISAM</p>
              )}

              {dadosBottom5.length > 0 && (
                <>
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-4 mt-6 flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-red-500" /> 5 Escolas com Menor Media
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dadosBottom5} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 10]} />
                      <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="media" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* Distribuicao por situacao */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                Distribuicao por Situacao
              </h2>
              {dadosPizza.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={dadosPizza}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {dadosPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados de alunos</p>
              )}
            </div>
          </div>

          {/* Tabela de escolas */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Todas as Escolas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Escola</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Alunos</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Turmas</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Media SISAM</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Frequencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {dados.tabela_escolas.map(escola => {
                    const freq = escola.frequencia_media ? parseFloat(escola.frequencia_media) : null
                    return (
                      <tr key={escola.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{escola.nome}</td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{escola.total_alunos}</td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{escola.total_turmas}</td>
                        <td className="px-4 py-3 text-center">
                          {escola.media_sisam ? (
                            <span className={`font-semibold ${parseFloat(escola.media_sisam) >= 6 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {escola.media_sisam}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {freq !== null ? (
                            <span className={`font-semibold ${freq >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {freq}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {dados.tabela_escolas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        Nenhuma escola encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function PainelExecutivoPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      <PainelExecutivo />
    </ProtectedRoute>
  )
}
