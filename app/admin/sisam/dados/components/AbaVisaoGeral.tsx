'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { Search } from 'lucide-react'
import { isAnosIniciais as isAnosIniciaisLib } from '@/lib/disciplinas-mapping'
import {
  CustomTooltip,
} from '@/components/dados'
import { COLORS } from '@/lib/dados/constants'
import {
  getNivelName,
  formatarSerie,
} from '@/lib/dados/utils'
import type { AbaVisaoGeralProps } from './types'

export default function AbaVisaoGeral({ dados, pesquisaRealizada, filtroSerie, filtroTipoEnsino, filtroDisciplina }: AbaVisaoGeralProps) {
  if (!pesquisaRealizada) {
    return (
      <div className="mt-4">
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
          <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grafico de Barras - Medias por Serie */}
          {dados.mediasPorSerie.length > 0 && (() => {
            // Separar dados em anos iniciais (2, 3, 5) e anos finais (6-9)
            const anosIniciais = dados.mediasPorSerie
              .filter(item => {
                const num = item.serie?.match(/(\d+)/)?.[1]
                return num === '2' || num === '3' || num === '5'
              })
              .map(item => ({
                serie: formatarSerie(item.serie),
                media_lp: item.media_lp,
                media_mat: item.media_mat,
                media_prod: item.media_prod,
                presentes: item.presentes
              }))

            const anosFinais = dados.mediasPorSerie
              .filter(item => {
                const num = item.serie?.match(/(\d+)/)?.[1]
                return num === '6' || num === '7' || num === '8' || num === '9'
              })
              .map(item => ({
                serie: formatarSerie(item.serie),
                media_lp: item.media_lp,
                media_mat: item.media_mat,
                media_ch: item.media_ch,
                media_cn: item.media_cn,
                presentes: item.presentes
              }))

            // Calcular medias ponderadas por etapa
            const calcMedias = (arr: any[], campos: string[]) => {
              const result: Record<string, number> = {}
              campos.forEach(campo => {
                let somaMedia = 0
                let somaPresentes = 0
                arr.forEach(i => {
                  if (i[campo] && i[campo] > 0 && i.presentes > 0) {
                    somaMedia += i[campo] * i.presentes
                    somaPresentes += i.presentes
                  }
                })
                result[campo] = somaPresentes > 0 ? somaMedia / somaPresentes : 0
              })
              return result
            }
            const mediasAI = calcMedias(anosIniciais, ['media_lp', 'media_mat', 'media_prod'])
            const mediasAF = calcMedias(anosFinais, ['media_lp', 'media_mat', 'media_ch', 'media_cn'])

            const labelAI = `Anos Iniciais (${anosIniciais.map(i => i.serie).join(', ')})`
            const labelAF = `Anos Finais (${anosFinais.map(i => i.serie).join(', ')})`

            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Media por Serie</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                    {anosIniciais.length + anosFinais.length} series
                  </span>
                </div>
                <div className="space-y-4">
                  {/* Anos Iniciais: LP, MAT, PROD.T */}
                  {anosIniciais.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{labelAI}</p>
                        <div className="flex gap-3 text-[10px]">
                          <span style={{ color: COLORS.disciplinas.lp }}>LP: <strong>{mediasAI.media_lp?.toFixed(2) || '-'}</strong></span>
                          <span style={{ color: COLORS.disciplinas.mat }}>MAT: <strong>{mediasAI.media_mat?.toFixed(2) || '-'}</strong></span>
                          <span style={{ color: COLORS.disciplinas.prod }}>PROD: <strong>{mediasAI.media_prod?.toFixed(2) || '-'}</strong></span>
                        </div>
                      </div>
                      <div className="h-[130px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={anosIniciais} barCategoryGap="15%" margin={{ top: 15, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="serie" tick={{ fill: '#6B7280', fontSize: 10 }} />
                            <YAxis domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 10 }} width={25} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="media_lp" name="LP" fill={COLORS.disciplinas.lp} radius={[2, 2, 0, 0]} label={{ position: 'top', fill: COLORS.disciplinas.lp, fontSize: 9, formatter: (v: number) => v?.toFixed(1) }} />
                            <Bar dataKey="media_mat" name="MAT" fill={COLORS.disciplinas.mat} radius={[2, 2, 0, 0]} label={{ position: 'top', fill: COLORS.disciplinas.mat, fontSize: 9, formatter: (v: number) => v?.toFixed(1) }} />
                            <Bar dataKey="media_prod" name="PROD.T" fill={COLORS.disciplinas.prod} radius={[2, 2, 0, 0]} label={{ position: 'top', fill: COLORS.disciplinas.prod, fontSize: 9, formatter: (v: number) => v?.toFixed(1) }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Anos Finais: LP, MAT, CH, CN */}
                  {anosFinais.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{labelAF}</p>
                        <div className="flex gap-3 text-[10px]">
                          <span style={{ color: COLORS.disciplinas.lp }}>LP: <strong>{mediasAF.media_lp?.toFixed(2) || '-'}</strong></span>
                          <span style={{ color: COLORS.disciplinas.mat }}>MAT: <strong>{mediasAF.media_mat?.toFixed(2) || '-'}</strong></span>
                          <span style={{ color: COLORS.disciplinas.ch }}>CH: <strong>{mediasAF.media_ch?.toFixed(2) || '-'}</strong></span>
                          <span style={{ color: COLORS.disciplinas.cn }}>CN: <strong>{mediasAF.media_cn?.toFixed(2) || '-'}</strong></span>
                        </div>
                      </div>
                      <div className="h-[130px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={anosFinais} barCategoryGap="15%" margin={{ top: 15, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="serie" tick={{ fill: '#6B7280', fontSize: 10 }} />
                            <YAxis domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 10 }} width={25} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="media_lp" name="LP" fill={COLORS.disciplinas.lp} radius={[2, 2, 0, 0]} label={{ position: 'top', fill: COLORS.disciplinas.lp, fontSize: 9, formatter: (v: number) => v?.toFixed(1) }} />
                            <Bar dataKey="media_mat" name="MAT" fill={COLORS.disciplinas.mat} radius={[2, 2, 0, 0]} label={{ position: 'top', fill: COLORS.disciplinas.mat, fontSize: 9, formatter: (v: number) => v?.toFixed(1) }} />
                            <Bar dataKey="media_ch" name="CH" fill={COLORS.disciplinas.ch} radius={[2, 2, 0, 0]} label={{ position: 'top', fill: COLORS.disciplinas.ch, fontSize: 9, formatter: (v: number) => v?.toFixed(1) }} />
                            <Bar dataKey="media_cn" name="CN" fill={COLORS.disciplinas.cn} radius={[2, 2, 0, 0]} label={{ position: 'top', fill: COLORS.disciplinas.cn, fontSize: 9, formatter: (v: number) => v?.toFixed(1) }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Legenda unificada */}
                  <div className="flex flex-wrap justify-center gap-4 pt-3 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.lp }}></div>
                      <span>Lingua Portuguesa</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.mat }}></div>
                      <span>Matematica</span>
                    </div>
                    {anosFinais.length > 0 && (
                      <>
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.ch }}></div>
                          <span>Ciencias Humanas</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.cn }}></div>
                          <span>Ciencias da Natureza</span>
                        </div>
                      </>
                    )}
                    {anosIniciais.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.disciplinas.prod }}></div>
                        <span>Producao Textual</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Grafico de Pizza - Niveis */}
          {dados.niveis.length > 0 && (() => {
            const niveisProcessados = dados.niveis.map(n => ({
              ...n,
              nivelOriginal: n.nivel,
              nivel: getNivelName(n.nivel)
            }))

            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribuicao por Nivel</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={niveisProcessados}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="quantidade"
                        nameKey="nivel"
                        label={({ nivel, percent }) => `${nivel}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {niveisProcessados.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS.niveis[entry.nivelOriginal as keyof typeof COLORS.niveis] || COLORS.niveis[entry.nivel as keyof typeof COLORS.niveis] || '#9CA3AF'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {niveisProcessados.map(n => (
                    <div key={n.nivelOriginal} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS.niveis[n.nivelOriginal as keyof typeof COLORS.niveis] || COLORS.niveis[n.nivel as keyof typeof COLORS.niveis] || '#9CA3AF' }}
                      ></div>
                      <span>{n.nivel}: {n.quantidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Distribuicao por Faixa de Nota */}
          {dados.faixasNota.length > 0 && (() => {
            const totalAlunos = dados.faixasNota.reduce((acc: number, item: any) => acc + (item.quantidade || 0), 0)
            const faixaLabels: Record<string, { label: string; desc: string }> = {
              '0 a 2': { label: 'Critico', desc: 'Notas de 0 a 2' },
              '2 a 4': { label: 'Insuficiente', desc: 'Notas de 2 a 4' },
              '4 a 6': { label: 'Regular', desc: 'Notas de 4 a 6' },
              '6 a 8': { label: 'Bom', desc: 'Notas de 6 a 8' },
              '8 a 10': { label: 'Excelente', desc: 'Notas de 8 a 10' }
            }

            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribuicao por Faixa de Nota</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                    {totalAlunos.toLocaleString('pt-BR')} alunos
                  </span>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dados.faixasNota} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="faixa" tick={{ fill: '#6B7280', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="quantidade" name="Alunos" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }}>
                        {dados.faixasNota.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.faixas[index] || COLORS.primary} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Cards de resumo por faixa */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  {dados.faixasNota.map((item: any, index: number) => {
                    const pct = totalAlunos > 0 ? ((item.quantidade / totalAlunos) * 100).toFixed(1) : '0'
                    const info = faixaLabels[item.faixa] || { label: item.faixa, desc: '' }
                    return (
                      <div key={item.faixa} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${COLORS.faixas[index]}15` }}>
                        <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: COLORS.faixas[index] }} />
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{info.label}</p>
                        <p className="text-sm font-bold" style={{ color: COLORS.faixas[index] }}>{item.quantidade}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{pct}%</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Grafico Comparativo Anos Iniciais vs Anos Finais */}
          {dados.mediasPorSerie.length > 0 && (() => {
            const anosIniciaisDados = dados.mediasPorSerie.filter(item => {
              const num = item.serie?.match(/(\d+)/)?.[1]
              return num === '2' || num === '3' || num === '5'
            })
            const anosFinaisDados = dados.mediasPorSerie.filter(item => {
              const num = item.serie?.match(/(\d+)/)?.[1]
              return num === '6' || num === '7' || num === '8' || num === '9'
            })

            const calcularMediaEtapa = (etapaDados: typeof dados.mediasPorSerie) => {
              if (etapaDados.length === 0) return { media_geral: 0, total_alunos: 0 }
              let somaPonderada = 0
              let totalAlunos = 0
              etapaDados.forEach(item => {
                const alunos = item.presentes || item.total_alunos || 0
                if (item.media_geral && item.media_geral > 0 && alunos > 0) {
                  somaPonderada += item.media_geral * alunos
                  totalAlunos += alunos
                }
              })
              return {
                media_geral: totalAlunos > 0 ? Math.round((somaPonderada / totalAlunos) * 100) / 100 : 0,
                total_alunos: totalAlunos
              }
            }

            const mediaAI = calcularMediaEtapa(anosIniciaisDados)
            const mediaAF = calcularMediaEtapa(anosFinaisDados)

            const dadosComparativo = [
              { etapa: 'Anos Iniciais', media: mediaAI.media_geral, alunos: mediaAI.total_alunos, cor: '#10B981' },
              { etapa: 'Anos Finais', media: mediaAF.media_geral, alunos: mediaAF.total_alunos, cor: '#3B82F6' }
            ].filter(d => d.alunos > 0)

            if (dadosComparativo.length === 0) return null

            const melhorEtapa = dadosComparativo.reduce((a, b) => a.media > b.media ? a : b)
            const totalAlunos = dadosComparativo.reduce((acc, d) => acc + d.alunos, 0)
            const mediaGeral = dadosComparativo.reduce((acc, d) => acc + d.media * d.alunos, 0) / totalAlunos
            const diferenca = dadosComparativo.length === 2 ? Math.abs(dadosComparativo[0].media - dadosComparativo[1].media) : 0

            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comparativo por Etapa de Ensino</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      Media geral: <span className="font-bold text-indigo-600 dark:text-indigo-400">{mediaGeral.toFixed(2)}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Total: <span className="font-bold">{totalAlunos.toLocaleString('pt-BR')}</span> alunos
                    </span>
                    {diferenca > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">
                        Diferenca: <span className="font-bold text-amber-600 dark:text-amber-400">{diferenca.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosComparativo} layout="vertical" barCategoryGap="30%" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 11 }} />
                      <YAxis type="category" dataKey="etapa" tick={{ fill: '#6B7280', fontSize: 12 }} width={100} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                                <p className="font-semibold text-gray-900 dark:text-white">{data.etapa}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Media: <span className="font-bold">{data.media.toFixed(2)}</span>
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Alunos: <span className="font-bold">{data.alunos.toLocaleString('pt-BR')}</span>
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="media" name="Media" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#374151', fontSize: 11, fontWeight: 'bold', formatter: (v: number) => v?.toFixed(2) }}>
                        {dadosComparativo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.cor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Cards com detalhes */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {dadosComparativo.map(item => (
                    <div
                      key={item.etapa}
                      className="p-3 rounded-lg border transition-all"
                      style={{
                        borderColor: item.cor,
                        backgroundColor: `${item.cor}10`,
                        boxShadow: item.etapa === melhorEtapa.etapa ? `0 0 0 3px ${item.cor}40` : 'none'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.etapa}</p>
                        {item.etapa === melhorEtapa.etapa && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: item.cor }}>Melhor</span>
                        )}
                      </div>
                      <p className="text-2xl font-bold" style={{ color: item.cor }}>{item.media.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.alunos.toLocaleString('pt-BR')} alunos</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Ranking de Polos */}
          {dados.mediasPorPolo.length > 0 && (() => {
            const polosOrdenados = [...dados.mediasPorPolo].sort((a: any, b: any) => (b.media_geral || 0) - (a.media_geral || 0)).slice(0, 8)
            const melhorPolo = polosOrdenados[0]
            const mediaGeralPolos = polosOrdenados.reduce((acc: number, p: any) => acc + (p.media_geral || 0), 0) / polosOrdenados.length

            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ranking de Polos</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Media geral: <span className="font-bold text-indigo-600 dark:text-indigo-400">{mediaGeralPolos.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={polosOrdenados} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 11 }} />
                      <YAxis type="category" dataKey="polo" width={100} tick={{ fill: '#6B7280', fontSize: 10 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                                <p className="font-semibold text-gray-900 dark:text-white">{data.polo}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Media: <span className="font-bold">{(data.media_geral || 0).toFixed(2)}</span></p>
                                {data.total_alunos && <p className="text-sm text-gray-600 dark:text-gray-400">Alunos: <span className="font-bold">{data.total_alunos}</span></p>}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="media_geral" name="Media" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#6B7280', fontSize: 10, formatter: (v: number) => v?.toFixed(2) }}>
                        {polosOrdenados.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS.ranking[index % COLORS.ranking.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Destaque do melhor polo */}
                {melhorPolo && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-lg">🏆</span>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Melhor desempenho</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{melhorPolo.polo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{(melhorPolo.media_geral || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">media geral</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
