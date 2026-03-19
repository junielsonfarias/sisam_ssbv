'use client'

import dynamic from 'next/dynamic'
import { BarChart3 } from 'lucide-react'
import { Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Scatter, LabelList } from 'recharts'
import { ChartDownloadButton, TableDownloadButton } from '@/components/charts/ChartDownloadButton'
import { GraficoAnaliseProps } from './types'

const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const RadarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.RadarChart })), { ssr: false })
const ScatterChart = dynamic(() => import('recharts').then(mod => ({ default: mod.ScatterChart })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })

export default function GraficoAnalises({
  dados,
  FiltrosAtivosTag,
}: GraficoAnaliseProps) {
  return (
    <>
      {/* Heatmap de Desempenho */}
      {dados.heatmap && dados.heatmap.length > 0 && (() => {
        const temAnosIniciais = dados.heatmap.some((item: any) => item.anos_iniciais)
        const temAnosFinais = dados.heatmap.some((item: any) => !item.anos_iniciais)

        const getColor = (value: number | null) => {
          if (value === null) return 'bg-gray-200 dark:bg-gray-600'
          if (value >= 8) return 'bg-green-500'
          if (value >= 6) return 'bg-green-300 dark:bg-green-600'
          if (value >= 4) return 'bg-yellow-300 dark:bg-yellow-600'
          return 'bg-red-300 dark:bg-red-600'
        }

        return (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Heatmap de Desempenho (Escolas × Disciplinas)</h3>
              </div>
              <TableDownloadButton
                data={dados.heatmap.map((item: any) => ({
                  escola: item.escola,
                  LP: item.LP?.toFixed(2) || '-',
                  ...(temAnosFinais ? { CH: item.CH?.toFixed(2) || '-' } : {}),
                  MAT: item.MAT?.toFixed(2) || '-',
                  ...(temAnosFinais ? { CN: item.CN?.toFixed(2) || '-' } : {}),
                  ...(temAnosIniciais ? { PT: item.PT?.toFixed(2) || '-' } : {}),
                  Geral: item.Geral?.toFixed(2) || '-'
                }))}
                fileName="heatmap-desempenho"
                columns={[
                  { key: 'escola', label: 'Escola' },
                  { key: 'LP', label: 'LP' },
                  ...(temAnosFinais ? [{ key: 'CH', label: 'CH' }] : []),
                  { key: 'MAT', label: 'MAT' },
                  ...(temAnosFinais ? [{ key: 'CN', label: 'CN' }] : []),
                  ...(temAnosIniciais ? [{ key: 'PT', label: 'PT' }] : []),
                  { key: 'Geral', label: 'Geral' }
                ]}
              />
            </div>
            <FiltrosAtivosTag className="mb-4" />
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-700 border-b-2 border-gray-300 dark:border-slate-600">
                    <th className="px-3 md:px-4 py-2.5 md:py-3 text-left font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">Escola</th>
                    <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">LP</th>
                    {temAnosFinais && <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">CH</th>}
                    <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">MAT</th>
                    {temAnosFinais && <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">CN</th>}
                    {temAnosIniciais && <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-sm md:text-base uppercase">PT</th>}
                    <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 dark:text-white text-base md:text-lg uppercase">Geral</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.heatmap.map((item: any, index: number) => (
                    <tr key={index} className="border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-3 md:px-4 py-2.5 md:py-3 font-medium text-sm md:text-base text-gray-900 dark:text-white">{item.escola}</td>
                      <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.LP)} text-white font-bold text-sm md:text-base`}>
                        {item.LP?.toFixed(2) || '-'}
                      </td>
                      {temAnosFinais && (
                        <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.CH)} text-white font-bold text-sm md:text-base`}>
                          {item.CH !== null ? item.CH.toFixed(2) : '-'}
                        </td>
                      )}
                      <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.MAT)} text-white font-bold text-sm md:text-base`}>
                        {item.MAT?.toFixed(2) || '-'}
                      </td>
                      {temAnosFinais && (
                        <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.CN)} text-white font-bold text-sm md:text-base`}>
                          {item.CN !== null ? item.CN.toFixed(2) : '-'}
                        </td>
                      )}
                      {temAnosIniciais && (
                        <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.PT)} text-white font-bold text-sm md:text-base`}>
                          {item.PT !== null ? item.PT.toFixed(2) : '-'}
                        </td>
                      )}
                      <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getColor(item.Geral)} text-white font-bold text-base md:text-lg`}>
                        {item.Geral?.toFixed(2) || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Radar Chart */}
      {dados.radar && dados.radar.length > 0 && (() => {
        const temAnosIniciais = dados.radar.some((item: any) => item.anos_iniciais)
        const temAnosFinais = dados.radar.some((item: any) => !item.anos_iniciais)

        return (
          <div id="chart-radar" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Perfil de Desempenho (Radar Chart)</h3>
              </div>
              <ChartDownloadButton chartId="chart-radar" fileName="perfil-desempenho-radar" />
            </div>
            <FiltrosAtivosTag className="mb-4" />
            <div>
            <ResponsiveContainer width="100%" height={Math.max(400, dados.radar.length * 80)}>
              <RadarChart data={dados.radar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="nome" tick={{ fontSize: 13, fontWeight: 500 }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 13, fontWeight: 500 }} />
                <Radar name="LP" dataKey="LP" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.6} strokeWidth={2} />
                {temAnosFinais && <Radar name="CH" dataKey="CH" stroke="#10B981" fill="#10B981" fillOpacity={0.6} strokeWidth={2} />}
                <Radar name="MAT" dataKey="MAT" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} strokeWidth={2} />
                {temAnosFinais && <Radar name="CN" dataKey="CN" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} strokeWidth={2} />}
                {temAnosIniciais && <Radar name="PT" dataKey="PT" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} strokeWidth={2} />}
                <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                  labelStyle={{ fontSize: 14, fontWeight: 600, marginBottom: '4px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
            </div>
          </div>
        )
      })()}

      {/* Box Plot (simulado com barras) */}
      {dados.boxplot && dados.boxplot.length > 0 && (
        <div id="chart-boxplot" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição Detalhada de Notas (Box Plot)</h3>
            </div>
            <ChartDownloadButton chartId="chart-boxplot" fileName="boxplot-distribuicao" />
          </div>
          <FiltrosAtivosTag className="mb-4" />
          {/* Tabela resumo com estatisticas */}
          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">Categoria</th>
                  <th className="px-3 py-2 text-center font-semibold text-red-600">Mín</th>
                  <th className="px-3 py-2 text-center font-semibold text-amber-600">Q1</th>
                  <th className="px-3 py-2 text-center font-semibold text-green-600">Mediana</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-600">Q3</th>
                  <th className="px-3 py-2 text-center font-semibold text-purple-600">Máx</th>
                  <th className="px-3 py-2 text-center font-semibold text-pink-600">Média</th>
                </tr>
              </thead>
              <tbody>
                {dados.boxplot.map((item: any, index: number) => (
                  <tr key={index} className="border-b dark:border-slate-600">
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{item.categoria}</td>
                    <td className="px-3 py-2 text-center text-red-600 font-semibold">{item.min?.toFixed(2) || '-'}</td>
                    <td className="px-3 py-2 text-center text-amber-600 font-semibold">{item.q1?.toFixed(2) || '-'}</td>
                    <td className="px-3 py-2 text-center text-green-600 font-semibold">{item.mediana?.toFixed(2) || '-'}</td>
                    <td className="px-3 py-2 text-center text-blue-600 font-semibold">{item.q3?.toFixed(2) || '-'}</td>
                    <td className="px-3 py-2 text-center text-purple-600 font-semibold">{item.max?.toFixed(2) || '-'}</td>
                    <td className="px-3 py-2 text-center text-pink-600 font-bold">{item.media?.toFixed(2) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={Math.max(420, Math.min(600, dados.boxplot.length * 50))}>
            <BarChart data={dados.boxplot} margin={{ top: 25, right: 20, left: 15, bottom: dados.boxplot.length > 5 ? 80 : 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="categoria"
                tick={{ fontSize: 11, fontWeight: 500 }}
                angle={dados.boxplot.length > 5 ? -35 : -20}
                textAnchor="end"
                height={Math.max(70, Math.min(100, dados.boxplot.length * 10))}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fontWeight: 500 }}
                label={{ value: 'Nota', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600 }}
                tickCount={6}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-2 break-words">{label}</p>
                        {payload.map((entry: any, index: number) => (
                          <p key={index} className="text-sm" style={{ color: entry.color }}>
                            <span className="font-medium">{entry.name}:</span> {Number(entry.value).toFixed(2)}
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8, paddingBottom: 4 }} />
              <Bar dataKey="min" name="Mínimo" fill="#EF4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="q1" name="Q1 (25%)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="mediana" name="Mediana" fill="#10B981" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="mediana" position="top" formatter={(value: number) => value?.toFixed(1)} style={{ fontSize: 11, fontWeight: 600, fill: '#059669' }} />
              </Bar>
              <Bar dataKey="q3" name="Q3 (75%)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="max" name="Máximo" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="media" name="Média" fill="#EC4899" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="media" position="top" formatter={(value: number) => value?.toFixed(1)} style={{ fontSize: 11, fontWeight: 700, fill: '#DB2777' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Correlacao entre Disciplinas */}
      {dados.correlacao && dados.correlacao.length > 0 && (() => {
        const _meta = dados.correlacao_meta || { tem_anos_finais: true, tem_anos_iniciais: false }
        const dadosFinais = dados.correlacao.filter((d: any) => d.tipo === 'anos_finais')
        const dadosIniciais = dados.correlacao.filter((d: any) => d.tipo === 'anos_iniciais')

        return (
          <div id="chart-correlacao" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Correlação entre Disciplinas</h3>
              </div>
              <ChartDownloadButton chartId="chart-correlacao" fileName="correlacao-disciplinas" />
            </div>
            <FiltrosAtivosTag className="mb-4" />
            <div>
            {/* Anos Iniciais: LP x MAT (e LP x PT se houver) */}
            {dadosIniciais.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Anos Iniciais (2º, 3º, 5º ano)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LP x MAT */}
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={dadosIniciais}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                      <YAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Matemática', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <Scatter name="Alunos" data={dadosIniciais} fill="#4F46E5" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* LP x PT (se houver PT) */}
                  {dadosIniciais.some((d: any) => d.PT !== null) && (
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={dadosIniciais.filter((d: any) => d.PT !== null)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                        <YAxis type="number" dataKey="PT" name="PT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Produção Textual', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                        <Scatter name="Alunos" data={dadosIniciais.filter((d: any) => d.PT !== null)} fill="#8B5CF6" opacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* Anos Finais: LP x CH x MAT x CN */}
            {dadosFinais.length > 0 && (
              <div>
                {dadosIniciais.length > 0 && <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Anos Finais (6º ao 9º ano)</h4>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* LP x MAT */}
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={dadosFinais}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                      <YAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Matemática', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <Scatter name="Alunos" data={dadosFinais} fill="#4F46E5" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* LP x CH */}
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={dadosFinais}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                      <YAxis type="number" dataKey="CH" name="CH" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências Humanas', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <Scatter name="Alunos" data={dadosFinais} fill="#10B981" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* LP x CN */}
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={dadosFinais}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                      <YAxis type="number" dataKey="CN" name="CN" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências da Natureza', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <Scatter name="Alunos" data={dadosFinais} fill="#F59E0B" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* CH x MAT */}
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={dadosFinais}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="CH" name="CH" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências Humanas', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                      <YAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Matemática', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <Scatter name="Alunos" data={dadosFinais} fill="#EF4444" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* CH x CN */}
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={dadosFinais}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="CH" name="CH" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências Humanas', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                      <YAxis type="number" dataKey="CN" name="CN" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências da Natureza', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <Scatter name="Alunos" data={dadosFinais} fill="#8B5CF6" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* MAT x CN */}
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={dadosFinais}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Matemática', position: 'insideBottom', offset: -5, style: { fontSize: '13px', fontWeight: 600 } }} />
                      <YAxis type="number" dataKey="CN" name="CN" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} label={{ value: 'Ciências da Natureza', angle: -90, position: 'insideLeft', style: { fontSize: '13px', fontWeight: 600 } }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 14, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <Scatter name="Alunos" data={dadosFinais} fill="#EC4899" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Cada ponto representa um aluno. Pontos próximos à diagonal indicam desempenho similar entre as disciplinas.</p>
          </div>
        )
      })()}
    </>
  )
}
