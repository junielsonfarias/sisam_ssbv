'use client'

import dynamic from 'next/dynamic'
import { BookOpen, School, TrendingUp, Users, BarChart3, PieChart } from 'lucide-react'
import { Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, LabelList } from 'recharts'
import { ChartDownloadButton } from '@/components/charts/ChartDownloadButton'
import { GraficoGeralProps } from './types'

const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false })
const RechartsPie = dynamic(() => import('recharts').then(mod => ({ default: mod.PieChart })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })

export default function GraficoGeral({
  dados,
  FiltrosAtivosTag,
  prepararDadosDisciplinas,
  prepararDadosEscolas,
  prepararDadosBarras,
  prepararDadosPizza,
  prepararDadosComparativo,
}: GraficoGeralProps) {
  return (
    <>
      {/* Medias por Disciplina */}
      {dados.disciplinas && (
        <div id="chart-disciplinas" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center mb-2">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Médias por Disciplina</h3>
            <span className="ml-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 mr-2">
              {dados.disciplinas.totalAlunos} alunos
            </span>
            <ChartDownloadButton chartId="chart-disciplinas" fileName="medias-disciplinas" title="Baixar gráfico de disciplinas" />
          </div>
          <FiltrosAtivosTag className="mb-4" />
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados)} margin={{ top: 25, right: 20, left: 15, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontWeight: 500 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={90}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fontWeight: 500 }}
                label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600 }}
                tickCount={6}
              />
              <Tooltip
                contentStyle={{ fontSize: 13, fontWeight: 500, maxWidth: 280 }}
                labelStyle={{ fontSize: 13, fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
              <Bar dataKey="value" name="Média" radius={[4, 4, 0, 0]}>
                {prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value: number) => value.toFixed(2)}
                  style={{ fontSize: 13, fontWeight: 700, fill: '#374151' }}
                />
              </Bar>
              <ReferenceLine y={7} stroke="#10B981" strokeDasharray="3 3" label={{ value: "Meta (7.0)", position: "right", fontSize: 14, fontWeight: 600 }} />
            </BarChart>
          </ResponsiveContainer>
          </div>

          {/* Indicadores Estatisticos */}
          {dados.disciplinas.desvios && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {dados.disciplinas.labels.map((label: string, index: number) => {
                const media = dados.disciplinas.dados[index] || 0
                const desvio = dados.disciplinas.desvios[index] || 0
                const taxaAprov = dados.disciplinas.taxas_aprovacao?.[index] || 0
                const getFaixa = (nota: number) => {
                  if (nota >= 8) return { nome: 'Excelente', cor: 'text-green-600', bg: 'bg-green-50' }
                  if (nota >= 6) return { nome: 'Bom', cor: 'text-blue-600', bg: 'bg-blue-50' }
                  if (nota >= 4) return { nome: 'Regular', cor: 'text-yellow-600', bg: 'bg-yellow-50' }
                  return { nome: 'Insuficiente', cor: 'text-red-600', bg: 'bg-red-50' }
                }
                const faixa = getFaixa(media)

                return (
                  <div key={index} className={`p-3 rounded-lg ${faixa.bg}`}>
                    <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
                    <p className="text-lg font-bold text-gray-900">{media.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">Desvio: {desvio.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">Aprovação: {taxaAprov.toFixed(1)}%</p>
                    <p className={`text-xs font-semibold mt-1 ${faixa.cor}`}>{faixa.nome}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Top Escolas */}
      {dados.escolas && dados.escolas.labels.length > 0 && (
        <div id="chart-escolas" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600 dark:text-green-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Desempenho por Escola {dados.escolas.disciplina && dados.escolas.disciplina !== 'Média Geral' ? `- ${dados.escolas.disciplina}` : ''}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {dados.escolas.totais && (
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {dados.escolas.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                </span>
              )}
              <ChartDownloadButton chartId="chart-escolas" fileName="desempenho-escolas" />
            </div>
          </div>
          <FiltrosAtivosTag className="mb-3" />
          {/* Legenda de cores */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Bom (≥7.0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Regular (5.0-6.9)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Baixo (&lt;5.0)</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={Math.max(450, Math.min(800, dados.escolas.labels.length * 40))}>
            <BarChart
              data={prepararDadosEscolas(dados.escolas.labels, dados.escolas.dados, dados.escolas.totais)}
              layout="vertical"
              margin={{ left: 15, right: 70, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 10]}
                tick={{ fontSize: 12, fontWeight: 500 }}
                label={{ value: 'Média', position: 'insideBottom', offset: -5, fontSize: 13, fontWeight: 600 }}
                tickCount={6}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={Math.min(280, Math.max(160, dados.escolas.labels.reduce((max: number, label: string) => Math.max(max, label.length * 7), 160)))}
                tick={{ fontSize: 11, fontWeight: 500 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1 break-words">{data.name}</p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Média:</span> {data.value.toFixed(2)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Alunos:</span> {data.alunos.toLocaleString()}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" name="Média" radius={[0, 4, 4, 0]}>
                {prepararDadosEscolas(dados.escolas.labels, dados.escolas.dados, dados.escolas.totais).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(value: number) => value.toFixed(2)}
                  style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Desempenho por Serie */}
      {dados.series && dados.series.labels.length > 0 && (
        <div id="chart-series" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600 dark:text-purple-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Desempenho por Série {dados.series.disciplina && dados.series.disciplina !== 'Média Geral' ? `- ${dados.series.disciplina}` : ''}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {dados.series.totais && (
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {dados.series.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                </span>
              )}
              <ChartDownloadButton chartId="chart-series" fileName="desempenho-series" />
            </div>
          </div>
          <FiltrosAtivosTag className="mb-4" />
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={prepararDadosEscolas(dados.series.labels, dados.series.dados, dados.series.totais)} margin={{ top: 25, right: 25, left: 15, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fontWeight: 500 }}
                label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600 }}
                tickCount={6}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1 break-words">{data.name}</p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Média:</span> {data.value.toFixed(2)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Alunos:</span> {data.alunos.toLocaleString()}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
              <Line type="monotone" dataKey="value" name="Média" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 8, fill: '#8B5CF6' }}>
                <LabelList
                  dataKey="value"
                  position="top"
                  offset={15}
                  formatter={(value: number) => value.toFixed(2)}
                  style={{ fontSize: 14, fontWeight: 700, fill: '#6B21A8' }}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Desempenho por Polo */}
      {dados.polos && dados.polos.labels.length > 0 && (
        <div id="chart-polos" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Desempenho por Polo {dados.polos.disciplina && dados.polos.disciplina !== 'Média Geral' ? `- ${dados.polos.disciplina}` : ''}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {dados.polos.totais && (
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {dados.polos.totais.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
                </span>
              )}
              <ChartDownloadButton chartId="chart-polos" fileName="desempenho-polos" />
            </div>
          </div>
          <FiltrosAtivosTag className="mb-3" />
          {/* Legenda de cores */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Bom (≥7.0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Regular (5.0-6.9)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Baixo (&lt;5.0)</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={Math.max(400, Math.min(550, prepararDadosEscolas(dados.polos.labels, dados.polos.dados, dados.polos.totais).length * 50))}>
            <BarChart data={prepararDadosEscolas(dados.polos.labels, dados.polos.dados, dados.polos.totais)} margin={{ top: 25, right: 20, left: 15, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 500 }}
                interval={0}
                angle={dados.polos.labels.length > 6 ? -35 : -20}
                textAnchor="end"
                height={Math.max(70, Math.min(100, dados.polos.labels.length * 10))}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fontWeight: 500 }}
                label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600 }}
                tickCount={6}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1 break-words">{data.name}</p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Média:</span> {data.value.toFixed(2)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Alunos:</span> {data.alunos.toLocaleString()}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" name="Média" radius={[4, 4, 0, 0]}>
                {prepararDadosEscolas(dados.polos.labels, dados.polos.dados, dados.polos.totais).map((entry, index) => (
                  <Cell key={`cell-polo-${index}`} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value: number) => value.toFixed(2)}
                  style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Distribuicao de Notas */}
      {dados.distribuicao && (
        <div id="chart-distribuicao" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600 dark:text-orange-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Distribuição de Notas {dados.distribuicao.disciplina && dados.distribuicao.disciplina !== 'Geral' ? `- ${dados.distribuicao.disciplina}` : ''}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {dados.distribuicao.dados.reduce((a: number, b: number) => a + b, 0).toLocaleString()} alunos
              </span>
              <ChartDownloadButton chartId="chart-distribuicao" fileName="distribuicao-notas" />
            </div>
          </div>
          <FiltrosAtivosTag className="mb-4" />
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={prepararDadosBarras(dados.distribuicao.labels, dados.distribuicao.dados, 'Alunos')} margin={{ top: 25, right: 20, left: 15, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 500 }} />
              <YAxis tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Alunos', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const total = dados.distribuicao.dados.reduce((a: number, b: number) => a + b, 0)
                    const percentual = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1 break-words">Faixa: {data.name}</p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Alunos:</span> {data.value.toLocaleString()}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Percentual:</span> {percentual}%
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
              <Bar dataKey="value" name="Quantidade de Alunos" radius={[4, 4, 0, 0]}>
                {prepararDadosBarras(dados.distribuicao.labels, dados.distribuicao.dados, 'Alunos').map((entry, index) => {
                  const faixa = entry.name
                  let cor = '#F59E0B'
                  if (faixa.includes('0-2') || faixa.includes('0 a 2')) cor = '#EF4444'
                  else if (faixa.includes('2-4') || faixa.includes('2 a 4') || faixa.includes('3-4') || faixa.includes('3 a 4')) cor = '#F97316'
                  else if (faixa.includes('4-6') || faixa.includes('4 a 6') || faixa.includes('5-6') || faixa.includes('5 a 6')) cor = '#F59E0B'
                  else if (faixa.includes('6-8') || faixa.includes('6 a 8') || faixa.includes('7-8') || faixa.includes('7 a 8')) cor = '#10B981'
                  else if (faixa.includes('8-10') || faixa.includes('8 a 10') || faixa.includes('9-10') || faixa.includes('9 a 10')) cor = '#059669'
                  return <Cell key={`cell-dist-${index}`} fill={cor} />
                })}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value: number) => value.toLocaleString()}
                  style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Taxa de Presenca */}
      {dados.presenca && (
        <div id="chart-presenca" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-pink-600 dark:text-pink-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Presença</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {dados.presenca.dados.reduce((a: number, b: number) => a + b, 0).toLocaleString()} total
              </span>
              <ChartDownloadButton chartId="chart-presenca" fileName="taxa-presenca" />
            </div>
          </div>
          <FiltrosAtivosTag className="mb-4" />
          {/* Legenda de cores */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Presentes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Faltantes</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/2">
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={prepararDadosPizza(dados.presenca.labels, dados.presenca.dados)}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value, percent }) => `${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {prepararDadosPizza(dados.presenca.labels, dados.presenca.dados).map((entry, index) => {
                      const nomeNormalizado = entry.name.toLowerCase()
                      const isPresente = nomeNormalizado.includes('present') || nomeNormalizado === 'p'
                      const cor = isPresente ? '#22C55E' : '#EF4444'
                      return <Cell key={`cell-presenca-${index}`} fill={cor} />
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        const total = dados.presenca.dados.reduce((a: number, b: number) => a + b, 0)
                        const percentual = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-gray-800 dark:text-white text-sm">{data.name}</p>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                              <span className="font-medium">Quantidade:</span> {data.value.toLocaleString()}
                            </p>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                              <span className="font-medium">Percentual:</span> {percentual}%
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500 }} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            {/* Cards de resumo */}
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
              {prepararDadosPizza(dados.presenca.labels, dados.presenca.dados).map((item, index) => {
                const total = dados.presenca.dados.reduce((a: number, b: number) => a + b, 0)
                const percentual = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
                const nomeNormalizado = item.name.toLowerCase()
                const isPresente = nomeNormalizado.includes('present') || nomeNormalizado === 'p'
                return (
                  <div key={index} className={`p-4 rounded-lg ${isPresente ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className={`text-sm font-medium ${isPresente ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.name}
                    </p>
                    <p className={`text-2xl font-bold ${isPresente ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {item.value.toLocaleString()}
                    </p>
                    <p className={`text-lg font-semibold ${isPresente ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {percentual}%
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comparativo Detalhado de Escolas */}
      {dados.comparativo_escolas && (
        <div id="chart-comparativo" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600 dark:text-red-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Comparativo Detalhado{dados.comparativo_escolas.escolas.length <= 10 ? ' (Top 5 e Bottom 5)' : ''}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {dados.comparativo_escolas.totais?.reduce((a: number, b: number) => a + b, 0).toLocaleString() || 0} alunos
              </span>
              <ChartDownloadButton chartId="chart-comparativo" fileName="comparativo-escolas" />
            </div>
          </div>
          <FiltrosAtivosTag className="mb-3" />
          {/* Legenda de disciplinas */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4F46E5' }}></span>
              <span className="text-gray-600 dark:text-gray-400">LP</span>
            </div>
            {dados.comparativo_escolas.temAnosFinais && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }}></span>
                <span className="text-gray-600 dark:text-gray-400">CH</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#F59E0B' }}></span>
              <span className="text-gray-600 dark:text-gray-400">MAT</span>
            </div>
            {dados.comparativo_escolas.temAnosFinais && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#EF4444' }}></span>
                <span className="text-gray-600 dark:text-gray-400">CN</span>
              </div>
            )}
            {dados.comparativo_escolas.temAnosIniciais && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8B5CF6' }}></span>
                <span className="text-gray-600 dark:text-gray-400">PT</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#374151' }}></span>
              <span className="text-gray-600 dark:text-gray-400 font-semibold">Média Geral</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={Math.max(450, Math.min(600, dados.comparativo_escolas.escolas.length * 50))}>
            <BarChart data={prepararDadosComparativo()} margin={{ top: 25, right: 20, left: 15, bottom: dados.comparativo_escolas.escolas.length > 6 ? 100 : 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="escola"
                tick={{ fontSize: 11, fontWeight: 500 }}
                interval={0}
                angle={dados.comparativo_escolas.escolas.length > 6 ? -45 : -25}
                textAnchor="end"
                height={Math.max(80, Math.min(120, dados.comparativo_escolas.escolas.length * 12))}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fontWeight: 500 }}
                label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600 }}
                tickCount={6}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 min-w-[180px] max-w-[280px]">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-2 border-b pb-1 break-words">{label}</p>
                        {payload.map((entry: any, index: number) => (
                          <p key={index} className="text-sm flex justify-between" style={{ color: entry.color }}>
                            <span className="font-medium">{entry.name}:</span>
                            <span className="font-semibold ml-2">{Number(entry.value).toFixed(2)}</span>
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8, paddingBottom: 4 }} />
              <Bar dataKey="LP" name="LP" fill="#4F46E5" radius={[3, 3, 0, 0]} />
              {dados.comparativo_escolas.temAnosFinais && (
                <Bar dataKey="CH" name="CH" fill="#10B981" radius={[3, 3, 0, 0]} />
              )}
              <Bar dataKey="MAT" name="MAT" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              {dados.comparativo_escolas.temAnosFinais && (
                <Bar dataKey="CN" name="CN" fill="#EF4444" radius={[3, 3, 0, 0]} />
              )}
              {dados.comparativo_escolas.temAnosIniciais && (
                <Bar dataKey="PT" name="PT" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              )}
              <Bar dataKey="Média" name="Média Geral" fill="#374151" radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="Média"
                  position="top"
                  formatter={(value: number) => value.toFixed(1)}
                  style={{ fontSize: 11, fontWeight: 700, fill: '#1F2937' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  )
}
