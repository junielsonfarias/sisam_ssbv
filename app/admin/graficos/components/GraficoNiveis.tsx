'use client'

import dynamic from 'next/dynamic'
import { BarChart3 } from 'lucide-react'
import { Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartDownloadButton, TableDownloadButton } from '@/components/charts/ChartDownloadButton'
import { GraficoNiveisProps } from './types'

const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })

export default function GraficoNiveis({
  dados,
  FiltrosAtivosTag,
}: GraficoNiveisProps) {

  const renderNivelChart = (data: any, keyPrefix: string) => {
    const chartData = [
      { nivel: 'N1', quantidade: data.N1, fill: '#EF4444' },
      { nivel: 'N2', quantidade: data.N2, fill: '#F59E0B' },
      { nivel: 'N3', quantidade: data.N3, fill: '#3B82F6' },
      { nivel: 'N4', quantidade: data.N4, fill: '#10B981' }
    ]
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 15, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nivel" tick={{ fontSize: 11, fontWeight: 500 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, maxWidth: 200 }} />
          <Bar dataKey="quantidade" name="Alunos" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${keyPrefix}-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <>
      {/* Niveis por Disciplina (N1, N2, N3, N4) */}
      {dados.niveis_disciplina && (
        <div id="chart-niveis-disciplina" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição de Níveis por Disciplina</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {dados.niveis_disciplina.total_presentes} alunos
              </span>
              <ChartDownloadButton chartId="chart-niveis-disciplina" fileName="niveis-por-disciplina" />
            </div>
          </div>
          <FiltrosAtivosTag className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LP */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-3">Língua Portuguesa</h4>
              {renderNivelChart(dados.niveis_disciplina.LP, 'lp')}
            </div>
            {/* MAT */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">Matemática</h4>
              {renderNivelChart(dados.niveis_disciplina.MAT, 'mat')}
            </div>
            {/* PROD - apenas se tem anos iniciais */}
            {dados.niveis_disciplina.tem_anos_iniciais && (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-3">Produção Textual (Anos Iniciais)</h4>
                {renderNivelChart(dados.niveis_disciplina.PROD, 'prod')}
              </div>
            )}
            {/* GERAL */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">Nível Geral do Aluno</h4>
              {renderNivelChart(dados.niveis_disciplina.GERAL, 'geral')}
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded mr-1"></span> N1 (Insuficiente)</span>
              <span className="flex items-center"><span className="w-3 h-3 bg-amber-500 rounded mr-1"></span> N2 (Básico)</span>
              <span className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded mr-1"></span> N3 (Adequado)</span>
              <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-1"></span> N4 (Avançado)</span>
            </p>
          </div>
        </div>
      )}

      {/* Medias por Etapa (Anos Iniciais vs Anos Finais) */}
      {dados.medias_etapa && dados.medias_etapa.length > 0 && (
        <div id="chart-medias-etapa" className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Comparativo: Anos Iniciais vs Anos Finais</h3>
            </div>
            <div className="flex items-center gap-2">
              {dados.medias_etapa_totais && (
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  AI: {dados.medias_etapa_totais.total_ai} | AF: {dados.medias_etapa_totais.total_af}
                </span>
              )}
              <ChartDownloadButton chartId="chart-medias-etapa" fileName="comparativo-anos-iniciais-finais" />
            </div>
          </div>
          <FiltrosAtivosTag className="mb-4" />
          <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={Math.max(400, Math.min(650, dados.medias_etapa.length * 45))}>
            <BarChart data={dados.medias_etapa} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fontWeight: 500 }} tickCount={6} />
              <YAxis
                type="category"
                dataKey="escola"
                width={Math.min(220, Math.max(140, dados.medias_etapa.reduce((max: number, item: any) => Math.max(max, (item.escola?.length || 0) * 6.5), 140)))}
                tick={{ fontSize: 10, fontWeight: 500 }}
              />
              <Tooltip
                formatter={(value: any, name: string) => [value ? value.toFixed(2) : '-', name]}
                contentStyle={{ fontSize: 12, maxWidth: 280 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8, paddingBottom: 4 }} />
              <Bar dataKey="media_ai" name="Anos Iniciais (AI)" fill="#10B981" radius={[0, 3, 3, 0]} />
              <Bar dataKey="media_af" name="Anos Finais (AF)" fill="#3B82F6" radius={[0, 3, 3, 0]} />
              <Bar dataKey="media_geral" name="Média Geral" fill="#6B7280" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Anos Iniciais (2º, 3º, 5º)</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {dados.medias_etapa_totais?.total_ai || 0} alunos
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Anos Finais (6º ao 9º)</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {dados.medias_etapa_totais?.total_af || 0} alunos
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Geral</p>
              <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {dados.medias_etapa_totais?.total_alunos || 0} alunos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Niveis por Turma */}
      {dados.niveis_turma && dados.niveis_turma.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-4 sm:p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição de Níveis por Turma</h3>
            <div className="ml-auto">
              <TableDownloadButton
                data={dados.niveis_turma.map((item: any) => ({
                  turma: item.turma,
                  escola: item.escola,
                  serie: item.serie || (item.anos_iniciais ? 'AI' : 'AF'),
                  n1: item.niveis.N1,
                  n2: item.niveis.N2,
                  n3: item.niveis.N3,
                  n4: item.niveis.N4,
                  media_turma: item.media_turma?.toFixed(2) || '-',
                  nivel_predominante: item.nivel_predominante
                }))}
                fileName="niveis-por-turma"
                columns={[
                  { key: 'turma', label: 'Turma' },
                  { key: 'escola', label: 'Escola' },
                  { key: 'serie', label: 'Série' },
                  { key: 'n1', label: 'N1' },
                  { key: 'n2', label: 'N2' },
                  { key: 'n3', label: 'N3' },
                  { key: 'n4', label: 'N4' },
                  { key: 'media_turma', label: 'Média' },
                  { key: 'nivel_predominante', label: 'Nível Predominante' }
                ]}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700 border-b-2 border-gray-300 dark:border-slate-600">
                  <th className="px-3 py-2 text-left font-bold text-gray-900 dark:text-white text-sm">Turma</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-900 dark:text-white text-sm">Escola</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-white text-sm">Série</th>
                  <th className="px-3 py-2 text-center font-bold text-red-600 dark:text-red-400 text-sm">N1</th>
                  <th className="px-3 py-2 text-center font-bold text-amber-600 dark:text-amber-400 text-sm">N2</th>
                  <th className="px-3 py-2 text-center font-bold text-blue-600 dark:text-blue-400 text-sm">N3</th>
                  <th className="px-3 py-2 text-center font-bold text-green-600 dark:text-green-400 text-sm">N4</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-white text-sm">Média</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-900 dark:text-white text-sm">Nível</th>
                </tr>
              </thead>
              <tbody>
                {dados.niveis_turma.map((item: any, index: number) => {
                  const nivelCor = item.nivel_predominante === 'N4' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30' :
                                  item.nivel_predominante === 'N3' ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' :
                                  item.nivel_predominante === 'N2' ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' :
                                  'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
                  return (
                    <tr key={index} className="border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-3 py-2 font-semibold text-sm text-gray-900 dark:text-white">{item.turma}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{item.escola}</td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700 dark:text-gray-300">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.anos_iniciais ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                          {item.serie || (item.anos_iniciais ? 'AI' : 'AF')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-medium text-red-600 dark:text-red-400">{item.niveis.N1}</td>
                      <td className="px-3 py-2 text-center text-sm font-medium text-amber-600 dark:text-amber-400">{item.niveis.N2}</td>
                      <td className="px-3 py-2 text-center text-sm font-medium text-blue-600 dark:text-blue-400">{item.niveis.N3}</td>
                      <td className="px-3 py-2 text-center text-sm font-medium text-green-600 dark:text-green-400">{item.niveis.N4}</td>
                      <td className="px-3 py-2 text-center text-sm font-bold text-gray-900 dark:text-white">{item.media_turma?.toFixed(2) || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${nivelCor}`}>
                          {item.nivel_predominante}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Nível predominante = nível com maior quantidade de alunos na turma</p>
          </div>
        </div>
      )}
    </>
  )
}
