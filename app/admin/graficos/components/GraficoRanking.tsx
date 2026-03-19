'use client'

import dynamic from 'next/dynamic'
import { BarChart3 } from 'lucide-react'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartDownloadButton, TableDownloadButton } from '@/components/charts/ChartDownloadButton'
import { isAnosIniciais, isAnosFinais } from '@/lib/disciplinas-mapping'
import { GraficoRankingProps } from './types'

const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })

export default function GraficoRanking({
  dados,
  filtros,
  FiltrosAtivosTag,
}: GraficoRankingProps) {
  return (
    <>
      {/* Ranking Interativo */}
      {dados.ranking && dados.ranking.length > 0 && (() => {
        const temAnosIniciais = dados.ranking_meta?.tem_anos_iniciais ?? isAnosIniciais(filtros.serie) ?? (filtros.tipo_ensino === 'anos_iniciais')
        const temAnosFinais = dados.ranking_meta?.tem_anos_finais ?? isAnosFinais(filtros.serie) ?? (filtros.tipo_ensino === 'anos_finais')
        const mostrarPROD = temAnosIniciais && (!temAnosFinais || filtros.tipo_ensino === 'anos_iniciais' || isAnosIniciais(filtros.serie))
        const mostrarCHCN = temAnosFinais && (!temAnosIniciais || filtros.tipo_ensino === 'anos_finais' || isAnosFinais(filtros.serie))

        return (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Ranking de Desempenho</h3>
              {dados.ranking[0]?.media_ai !== undefined && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {temAnosIniciais && temAnosFinais ? '(AI + AF)' : temAnosIniciais ? '(Anos Iniciais)' : '(Anos Finais)'}
                </span>
              )}
              <div className="ml-auto">
                <TableDownloadButton
                  data={dados.ranking}
                  fileName="ranking-desempenho"
                  columns={[
                    { key: 'posicao', label: 'Posição' },
                    { key: 'nome', label: 'Nome' },
                    ...(dados.ranking[0]?.escola ? [{ key: 'escola', label: 'Escola' }] : []),
                    { key: 'total_alunos', label: 'Alunos' },
                    { key: 'media_lp', label: 'LP' },
                    { key: 'media_mat', label: 'MAT' },
                    ...(mostrarPROD ? [{ key: 'media_producao', label: 'PROD' }] : []),
                    ...(mostrarCHCN ? [{ key: 'media_ch', label: 'CH' }, { key: 'media_cn', label: 'CN' }] : []),
                    ...(temAnosIniciais ? [{ key: 'media_ai', label: 'Média AI' }] : []),
                    ...(temAnosFinais ? [{ key: 'media_af', label: 'Média AF' }] : []),
                    { key: 'media_geral', label: 'Média Geral' }
                  ]}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-700 border-b-2 border-gray-300 dark:border-slate-600">
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">Posição</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-bold text-gray-900 dark:text-white text-sm sm:text-base">Nome</th>
                    {dados.ranking[0]?.escola && <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left font-bold text-gray-900 dark:text-white text-sm sm:text-base">Escola</th>}
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">Alunos</th>
                    {dados.ranking[0]?.media_lp !== undefined && (
                      <>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">LP</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">MAT</th>
                        {mostrarPROD && (
                          <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">PROD</th>
                        )}
                        {mostrarCHCN && (
                          <>
                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">CH</th>
                            <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-sm sm:text-base">CN</th>
                          </>
                        )}
                      </>
                    )}
                    {dados.ranking[0]?.media_ai !== undefined && temAnosIniciais && (
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-green-700 dark:text-green-400 text-sm sm:text-base">AI</th>
                    )}
                    {dados.ranking[0]?.media_af !== undefined && temAnosFinais && (
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-blue-700 dark:text-blue-400 text-sm sm:text-base">AF</th>
                    )}
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-gray-900 dark:text-white text-base sm:text-lg">Média Geral</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.ranking.map((item: any, index: number) => (
                    <tr key={index} className={`border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 ${index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-base sm:text-lg dark:text-white">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : item.posicao}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-sm sm:text-base text-gray-900 dark:text-white">{item.nome}</td>
                      {item.escola && <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.escola}</td>}
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.total_alunos}</td>
                      {item.media_lp !== undefined && (
                        <>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_lp?.toFixed(2) ?? 'N/A'}</td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_mat?.toFixed(2) ?? 'N/A'}</td>
                          {mostrarPROD && (
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_producao?.toFixed(2) ?? 'N/A'}</td>
                          )}
                          {mostrarCHCN && (
                            <>
                              <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_ch?.toFixed(2) ?? 'N/A'}</td>
                              <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-300">{item.media_cn?.toFixed(2) ?? 'N/A'}</td>
                            </>
                          )}
                        </>
                      )}
                      {item.media_ai !== undefined && temAnosIniciais && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-green-600 dark:text-green-400">{item.media_ai > 0 ? item.media_ai.toFixed(2) : '-'}</td>
                      )}
                      {item.media_af !== undefined && temAnosFinais && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-semibold text-sm sm:text-base text-blue-600 dark:text-blue-400">{item.media_af > 0 ? item.media_af.toFixed(2) : '-'}</td>
                      )}
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-base sm:text-lg text-indigo-600 dark:text-indigo-400">{item.media_geral.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Taxa de Aprovacao */}
      {dados.aprovacao && dados.aprovacao.length > 0 && (
        <div id="chart-aprovacao" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Aprovação Estimada</h3>
            </div>
            <ChartDownloadButton chartId="chart-aprovacao" fileName="taxa-aprovacao" />
          </div>
          <FiltrosAtivosTag className="mb-4" />
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={Math.max(400, Math.min(550, dados.aprovacao.length * 45))}>
            <BarChart data={dados.aprovacao} margin={{ top: 25, right: 20, left: 15, bottom: dados.aprovacao.length > 5 ? 80 : 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="categoria"
                tick={{ fontSize: 11, fontWeight: 500 }}
                angle={dados.aprovacao.length > 5 ? -35 : -15}
                textAnchor="end"
                height={Math.max(60, Math.min(100, dados.aprovacao.length * 10))}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fontWeight: 500 }}
                label={{ value: 'Taxa de Aprovação (%)', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600 }}
                tickCount={6}
              />
              <Tooltip
                formatter={(value: any) => [`${value.toFixed(2)}%`, 'Taxa']}
                contentStyle={{ fontSize: 13, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', maxWidth: 280 }}
                labelStyle={{ fontSize: 13, fontWeight: 600, marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8, paddingBottom: 4 }} />
              <Bar dataKey="taxa_6" name="≥ 6.0" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="taxa_7" name="≥ 7.0" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="taxa_8" name="≥ 8.0" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Legenda: Verde (≥6.0), Azul (≥7.0), Roxo (≥8.0)</p>
          </div>
        </div>
      )}

      {/* Analise de Gaps */}
      {dados.gaps && dados.gaps.length > 0 && (
        <div id="chart-gaps" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Análise de Gaps (Desigualdade de Desempenho)</h3>
            </div>
            <ChartDownloadButton chartId="chart-gaps" fileName="analise-gaps" />
          </div>
          <FiltrosAtivosTag className="mb-4" />
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={Math.max(400, Math.min(550, dados.gaps.length * 45))}>
            <BarChart data={dados.gaps} margin={{ top: 25, right: 20, left: 15, bottom: dados.gaps.length > 5 ? 80 : 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="categoria"
                tick={{ fontSize: 11, fontWeight: 500 }}
                angle={dados.gaps.length > 5 ? -35 : -15}
                textAnchor="end"
                height={Math.max(60, Math.min(100, dados.gaps.length * 10))}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fontWeight: 500 }}
                label={{ value: 'Nota', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600 }}
                tickCount={6}
              />
              <Tooltip
                contentStyle={{ fontSize: 13, fontWeight: 500, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', maxWidth: 280 }}
                labelStyle={{ fontSize: 13, fontWeight: 600, marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8, paddingBottom: 4 }} />
              <Bar dataKey="melhor_media" name="Melhor Média" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="media_geral" name="Média Geral" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pior_media" name="Pior Média" fill="#EF4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gap" name="Gap (Diferença)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Gap = Diferença entre melhor e pior média. Valores maiores indicam maior desigualdade.</p>
          </div>
        </div>
      )}
    </>
  )
}
