'use client'

import dynamic from 'next/dynamic'
import { BarChart3, Users } from 'lucide-react'
import { Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts'
import { ChartDownloadButton } from '@/components/charts/ChartDownloadButton'
import { GraficoAcertosErrosProps } from './types'

const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })

export default function GraficoAcertosErros({
  dados,
  filtros,
  FiltrosAtivosTag,
}: GraficoAcertosErrosProps) {
  return (
    <>
      {/* Acertos e Erros */}
      {dados.acertos_erros && dados.acertos_erros.length > 0 && (
        <div id="chart-acertos-erros" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Acertos e Erros {filtros.disciplina ? `- ${filtros.disciplina === 'LP' ? 'Língua Portuguesa' : filtros.disciplina === 'CH' ? 'Ciências Humanas' : filtros.disciplina === 'MAT' ? 'Matemática' : filtros.disciplina === 'CN' ? 'Ciências da Natureza' : filtros.disciplina}` : '(Geral)'}
              </h3>
              {dados.acertos_erros_meta?.tipo === 'por_questao' && (
                <span className="ml-3 text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                  {dados.acertos_erros_meta.total_questoes} questões
                </span>
              )}
            </div>
            <ChartDownloadButton chartId="chart-acertos-erros" fileName="acertos-erros" />
          </div>
          <FiltrosAtivosTag className="mb-4" />

          {/* Se sao dados por questao (disciplina selecionada), mostrar layout especial */}
          {dados.acertos_erros_meta?.tipo === 'por_questao' ? (
            <>
              {/* Informacao de presenca */}
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-300">
                      <strong>Total de alunos:</strong> {dados.acertos_erros_meta?.total_alunos_cadastrados || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-green-700 dark:text-green-300">
                      <strong>Presentes:</strong> {dados.acertos_erros_meta?.total_presentes || 0}
                    </span>
                  </div>
                  {dados.acertos_erros_meta?.total_faltantes > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span className="text-orange-700 dark:text-orange-300">
                        <strong>Faltantes:</strong> {dados.acertos_erros_meta?.total_faltantes || 0}
                      </span>
                    </div>
                  )}
                </div>
                {dados.acertos_erros_meta?.total_faltantes > 0 ? (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    ⚠️ Os dados de acertos/erros consideram apenas os {dados.acertos_erros_meta?.total_presentes} alunos presentes.
                  </p>
                ) : (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    📊 Mostrando acertos e erros por questão. Cada barra representa quantos alunos acertaram (verde) e erraram (vermelho).
                  </p>
                )}
              </div>
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={Math.max(400, dados.acertos_erros.length * 40)}>
                  <BarChart data={dados.acertos_erros} layout="vertical" margin={{ left: 10, right: 70, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fontWeight: 500 }}
                      label={{ value: 'Número de Alunos', position: 'insideBottom', offset: -5, fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={60}
                      tick={{ fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const acertos = payload.find(p => p.dataKey === 'acertos')?.value || 0
                          const erros = payload.find(p => p.dataKey === 'erros')?.value || 0
                          const total = Number(acertos) + Number(erros)
                          const taxaAcerto = total > 0 ? ((Number(acertos) / total) * 100).toFixed(1) : '0'
                          return (
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                              <p className="font-semibold text-gray-800 dark:text-white text-sm mb-2">Questão {label?.replace('Q', '')}</p>
                              <p className="text-green-600 dark:text-green-400 text-sm">
                                <span className="font-medium">Acertaram:</span> {Number(acertos)} alunos
                              </p>
                              <p className="text-red-600 dark:text-red-400 text-sm">
                                <span className="font-medium">Erraram:</span> {Number(erros)} alunos
                              </p>
                              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                                <span className="font-medium">Taxa de Acerto:</span> {taxaAcerto}%
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8, paddingBottom: 4 }}
                      formatter={(value) => value === 'acertos' ? 'Acertos (alunos)' : 'Erros (alunos)'}
                    />
                    <Bar dataKey="acertos" name="acertos" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]}>
                      <LabelList
                        dataKey="acertos"
                        position="insideRight"
                        formatter={(value: number) => value > 0 ? value : ''}
                        style={{ fontSize: 10, fontWeight: 600, fill: '#fff' }}
                      />
                    </Bar>
                    <Bar dataKey="erros" name="erros" fill="#EF4444" stackId="a" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="erros"
                        position="right"
                        formatter={(value: number) => value > 0 ? value : ''}
                        style={{ fontSize: 10, fontWeight: 600, fill: '#DC2626' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Resumo em tabela */}
              <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Resumo por Questão ({dados.acertos_erros_meta?.total_presentes || dados.acertos_erros[0]?.total_alunos || 0} alunos presentes)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 text-xs">
                  {dados.acertos_erros.map((item: any) => {
                    const taxa = item.total_alunos > 0 ? ((item.acertos / item.total_alunos) * 100).toFixed(0) : '0'
                    const corFundo = Number(taxa) < 30 ? 'bg-red-100 dark:bg-red-900/30 border-red-300' :
                                    Number(taxa) < 50 ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300' :
                                    Number(taxa) < 70 ? 'bg-green-100 dark:bg-green-900/30 border-green-300' :
                                    'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300'
                    return (
                      <div key={item.nome} className={`flex flex-col items-center p-2 rounded border ${corFundo}`}>
                        <span className="font-bold text-gray-800 dark:text-white">{item.nome}</span>
                        <div className="flex gap-1 mt-1">
                          <span className="text-green-700 dark:text-green-400 font-medium">{item.acertos}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-700 dark:text-red-400 font-medium">{item.erros}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{taxa}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Layout original para dados agrupados por escola/turma */
            <>
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={Math.max(300, Math.min(600, dados.acertos_erros.length * 60))}>
                  <BarChart data={dados.acertos_erros} layout="vertical" margin={{ left: 10, right: 70, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fontWeight: 500 }}
                      label={{ value: 'Quantidade', position: 'insideBottom', offset: -5, fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={Math.min(200, Math.max(80, dados.acertos_erros.reduce((max: number, item: any) => Math.max(max, (item.nome?.length || 0) * 6), 80)))}
                      tick={{ fontSize: 10, fontWeight: 500 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const acertos = payload.find(p => p.dataKey === 'acertos')?.value || 0
                          const erros = payload.find(p => p.dataKey === 'erros')?.value || 0
                          const total = Number(acertos) + Number(erros)
                          const taxaAcerto = total > 0 ? ((Number(acertos) / total) * 100).toFixed(1) : '0'
                          return (
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                              <p className="font-semibold text-gray-800 dark:text-white text-sm mb-2 break-words">{label}</p>
                              <p className="text-green-600 dark:text-green-400 text-sm">
                                <span className="font-medium">Acertos:</span> {Number(acertos).toLocaleString()}
                              </p>
                              <p className="text-red-600 dark:text-red-400 text-sm">
                                <span className="font-medium">Erros:</span> {Number(erros).toLocaleString()}
                              </p>
                              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                                <span className="font-medium">Taxa de Acerto:</span> {taxaAcerto}%
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8, paddingBottom: 4 }} />
                    <Bar dataKey="acertos" name="Acertos" fill="#10B981" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="acertos"
                        position="right"
                        formatter={(value: number) => value.toLocaleString()}
                        style={{ fontSize: 11, fontWeight: 600, fill: '#059669' }}
                      />
                    </Bar>
                    <Bar dataKey="erros" name="Erros" fill="#EF4444" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="erros"
                        position="right"
                        formatter={(value: number) => value.toLocaleString()}
                        style={{ fontSize: 11, fontWeight: 600, fill: '#DC2626' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {dados.acertos_erros[0]?.total_alunos && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <p>Total de alunos analisados: {dados.acertos_erros.reduce((acc: number, item: any) => acc + (item.total_alunos || 0), 0).toLocaleString()}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Taxa de Acerto por Questao */}
      {dados.questoes && dados.questoes.length > 0 && (
        <div id="chart-questoes" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Taxa de Acerto por Questão ({dados.questoes.length} questões)
              </h3>
            </div>
            <ChartDownloadButton chartId="chart-questoes" fileName="taxa-acerto-questoes" />
          </div>
          <FiltrosAtivosTag className="mb-3" />
          {/* Legenda de cores */}
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Crítico (&lt;30%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Atenção (30-50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Bom (50-70%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Excelente (&gt;70%)</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={Math.max(400, Math.min(700, dados.questoes.length * 26))}>
            <BarChart data={dados.questoes} layout="vertical" margin={{ left: 10, right: 55, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 500 }} label={{ value: 'Taxa de Acerto (%)', position: 'insideBottom', offset: -5, fontSize: 12, fontWeight: 600 }} tickCount={6} />
              <YAxis
                type="category"
                dataKey="codigo"
                width={65}
                tick={{ fontSize: 10, fontWeight: 500 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 max-w-[280px]">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1 break-words">Questão {label}</p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          <span className="font-medium">Taxa de Acerto:</span> {data.taxa_acerto}%
                        </p>
                        {data.total_respostas && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            <span className="font-medium">Total Respostas:</span> {data.total_respostas.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="taxa_acerto" name="Taxa de Acerto (%)" radius={[0, 4, 4, 0]}>
                {dados.questoes.map((entry: any, index: number) => (
                  <Cell key={`cell-questao-${index}`} fill={entry.taxa_acerto < 30 ? '#EF4444' : entry.taxa_acerto < 50 ? '#F59E0B' : entry.taxa_acerto < 70 ? '#10B981' : '#4F46E5'} />
                ))}
                <LabelList
                  dataKey="taxa_acerto"
                  position="right"
                  formatter={(value: number) => `${value}%`}
                  style={{ fontSize: 11, fontWeight: 600, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Total de questões analisadas: {dados.questoes.length}</p>
          </div>
        </div>
      )}
    </>
  )
}
