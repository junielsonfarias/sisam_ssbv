'use client'

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter } from 'recharts'
import { School, BarChart3, Users } from 'lucide-react'
import { isAnosIniciais } from '@/lib/disciplinas-mapping'
import { FiltrosGraficos, getHeatmapColor } from './constants'

interface ChartsAvancadosProps {
  dados: any
  filtros: FiltrosGraficos
  prepararDadosComparativo: () => any[]
}

export function ComparativoChart({ dados, prepararDadosComparativo }: ChartsAvancadosProps) {
  if (!dados.comparativo_escolas) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Comparativo Detalhado (Top 5 e Bottom 5)</h3>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={prepararDadosComparativo()}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="escola"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={100}
          />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="LP" name="LP" fill="#4F46E5" />
          {dados.comparativo_escolas.temAnosFinais && (
            <Bar dataKey="CH" name="CH" fill="#10B981" />
          )}
          <Bar dataKey="MAT" name="MAT" fill="#F59E0B" />
          {dados.comparativo_escolas.temAnosFinais && (
            <Bar dataKey="CN" name="CN" fill="#EF4444" />
          )}
          {dados.comparativo_escolas.temAnosIniciais && (
            <Bar dataKey="PT" name="PT" fill="#8B5CF6" />
          )}
          <Bar dataKey="Média" name="Média" fill="#6B7280" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AcertosErrosChart({ dados, filtros }: ChartsAvancadosProps) {
  if (!dados.acertos_erros || dados.acertos_erros.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          Acertos e Erros {filtros.disciplina ? `- ${filtros.disciplina === 'LP' ? 'Língua Portuguesa' : filtros.disciplina === 'CH' ? 'Ciências Humanas' : filtros.disciplina === 'MAT' ? 'Matemática' : filtros.disciplina === 'CN' ? 'Ciências da Natureza' : filtros.disciplina}` : '(Geral)'}
        </h3>
        {dados.acertos_erros_meta?.tipo === 'por_questao' && (
          <span className="ml-auto text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium">
            {dados.acertos_erros_meta.total_questoes} questões
          </span>
        )}
      </div>

      {/* Se são dados por questão (disciplina selecionada), usar layout horizontal */}
      {dados.acertos_erros_meta?.tipo === 'por_questao' ? (
        <>
          {/* Informação de presença */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex flex-wrap items-center gap-4 text-sm">
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
            {dados.acertos_erros_meta?.total_faltantes > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                ⚠️ Os dados de acertos/erros consideram apenas os {dados.acertos_erros_meta?.total_presentes} alunos presentes.
              </p>
            )}
          </div>

          <ResponsiveContainer width="100%" height={Math.max(400, dados.acertos_erros.length * 40)}>
            <BarChart data={dados.acertos_erros} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                label={{ value: 'Número de Alunos (Presentes)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                type="category"
                dataKey="nome"
                width={60}
                tick={{ fontSize: 12, fontWeight: 500 }}
              />
              <Tooltip
                formatter={(value: any, name: string) => [
                  `${value} alunos`,
                  name === 'acertos' ? 'Acertaram' : 'Erraram'
                ]}
                labelFormatter={(label) => `Questão ${label.replace('Q', '')}`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend
                formatter={(value) => value === 'acertos' ? 'Acertos (alunos)' : 'Erros (alunos)'}
              />
              <Bar dataKey="acertos" name="acertos" fill="#10B981" stackId="a" />
              <Bar dataKey="erros" name="erros" fill="#EF4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <strong>Resumo por Questão:</strong> {dados.acertos_erros_meta?.total_presentes || 0} alunos presentes
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              {dados.acertos_erros.map((item: any) => (
                <div key={item.nome} className="flex justify-between bg-white dark:bg-slate-800 p-2 rounded border">
                  <span className="font-medium">{item.nome}:</span>
                  <span>
                    <span className="text-green-600">{item.acertos}</span>
                    {' / '}
                    <span className="text-red-600">{item.erros}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Layout original para dados agrupados por escola/turma */
        <>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dados.acertos_erros} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 11 }}
                width={150}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="acertos" name="Acertos" fill="#10B981" stackId="a" />
              <Bar dataKey="erros" name="Erros" fill="#EF4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
          {dados.acertos_erros[0]?.total_alunos && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>Total de alunos analisados: {dados.acertos_erros.reduce((acc: number, item: any) => acc + (item.total_alunos || 0), 0)}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function QuestoesChart({ dados }: ChartsAvancadosProps) {
  if (!dados.questoes || dados.questoes.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          Taxa de Acerto por Questão ({dados.questoes.length} questões)
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(400, dados.questoes.length * 25)}>
        <BarChart data={dados.questoes} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} label={{ value: 'Taxa de Acerto (%)', position: 'insideBottom', offset: -5 }} />
          <YAxis
            type="category"
            dataKey="codigo"
            width={80}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: any) => [`${value}%`, 'Taxa de Acerto']}
            labelFormatter={(label) => `Questão ${label}`}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
          />
          <Legend />
          <Bar dataKey="taxa_acerto" name="Taxa de Acerto (%)" fill="#EF4444">
            {dados.questoes.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.taxa_acerto < 30 ? '#EF4444' : entry.taxa_acerto < 50 ? '#F59E0B' : entry.taxa_acerto < 70 ? '#10B981' : '#4F46E5'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Total de questões analisadas: {dados.questoes.length}</p>
        <p className="text-xs mt-1">Cores: Vermelho (&lt;30%), Laranja (30-50%), Verde (50-70%), Azul (&gt;70%)</p>
      </div>
    </div>
  )
}

export function HeatmapChart({ dados }: ChartsAvancadosProps) {
  if (!dados.heatmap || dados.heatmap.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Heatmap de Desempenho (Escolas × Disciplinas)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300 dark:border-slate-600">
              <th className="px-3 md:px-4 py-2.5 md:py-3 text-left font-bold text-gray-900 text-sm md:text-base uppercase">Escola</th>
              <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-sm md:text-base uppercase">LP</th>
              <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-sm md:text-base uppercase">CH</th>
              <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-sm md:text-base uppercase">MAT</th>
              <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-sm md:text-base uppercase">CN</th>
              <th className="px-3 md:px-4 py-2.5 md:py-3 text-center font-bold text-gray-900 text-base md:text-lg uppercase">Geral</th>
            </tr>
          </thead>
          <tbody>
            {dados.heatmap.map((item: any, index: number) => {
              return (
                <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-700">
                  <td className="px-3 md:px-4 py-2.5 md:py-3 font-medium text-sm md:text-base text-gray-900 dark:text-white">{item.escola}</td>
                  <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getHeatmapColor(item.LP)} text-white font-bold text-sm md:text-base`}>{item.LP.toFixed(2)}</td>
                  <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getHeatmapColor(item.CH)} text-white font-bold text-sm md:text-base`}>{item.CH.toFixed(2)}</td>
                  <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getHeatmapColor(item.MAT)} text-white font-bold text-sm md:text-base`}>{item.MAT.toFixed(2)}</td>
                  <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getHeatmapColor(item.CN)} text-white font-bold text-sm md:text-base`}>{item.CN.toFixed(2)}</td>
                  <td className={`px-3 md:px-4 py-2.5 md:py-3 text-center ${getHeatmapColor(item.Geral)} text-white font-bold text-base md:text-lg`}>{item.Geral.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RadarChartSection({ dados }: ChartsAvancadosProps) {
  if (!dados.radar || dados.radar.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Perfil de Desempenho (Radar Chart)</h3>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={dados.radar.slice(0, 5)}>
          <PolarGrid />
          <PolarAngleAxis dataKey="nome" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 10]} />
          <Radar name="LP" dataKey="LP" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.6} />
          <Radar name="CH" dataKey="CH" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
          <Radar name="MAT" dataKey="MAT" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
          <Radar name="CN" dataKey="CN" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BoxplotChart({ dados }: ChartsAvancadosProps) {
  if (!dados.boxplot || dados.boxplot.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição Detalhada de Notas (Box Plot)</h3>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={dados.boxplot}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="categoria" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
          <YAxis domain={[0, 10]} />
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === 'min') return [`${value}`, 'Mínimo']
              if (name === 'q1') return [`${value}`, 'Q1 (25%)']
              if (name === 'mediana') return [`${value}`, 'Mediana']
              if (name === 'q3') return [`${value}`, 'Q3 (75%)']
              if (name === 'max') return [`${value}`, 'Máximo']
              if (name === 'media') return [`${value}`, 'Média']
              return [value, name]
            }}
          />
          <Legend />
          <Bar dataKey="min" name="Mínimo" fill="#EF4444" />
          <Bar dataKey="q1" name="Q1 (25%)" fill="#F59E0B" />
          <Bar dataKey="mediana" name="Mediana" fill="#10B981" />
          <Bar dataKey="q3" name="Q3 (75%)" fill="#3B82F6" />
          <Bar dataKey="max" name="Máximo" fill="#8B5CF6" />
          <Bar dataKey="media" name="Média" fill="#EC4899" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CorrelacaoChart({ dados }: ChartsAvancadosProps) {
  if (!dados.correlacao || dados.correlacao.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Correlação entre Disciplinas</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={dados.correlacao}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="LP" name="LP" domain={[0, 10]} label={{ value: 'Língua Portuguesa', position: 'insideBottom', offset: -5 }} />
            <YAxis type="number" dataKey="MAT" name="MAT" domain={[0, 10]} label={{ value: 'Matemática', angle: -90, position: 'insideLeft' }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Alunos" data={dados.correlacao} fill="#4F46E5" />
          </ScatterChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={dados.correlacao}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="CH" name="CH" domain={[0, 10]} label={{ value: 'Ciências Humanas', position: 'insideBottom', offset: -5 }} />
            <YAxis type="number" dataKey="CN" name="CN" domain={[0, 10]} label={{ value: 'Ciências da Natureza', angle: -90, position: 'insideLeft' }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Alunos" data={dados.correlacao} fill="#10B981" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-2">Cada ponto representa um aluno. Pontos próximos à diagonal indicam desempenho similar entre as disciplinas.</p>
    </div>
  )
}

export function RankingChart({ dados, filtros }: ChartsAvancadosProps) {
  if (!dados.ranking || dados.ranking.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Ranking de Desempenho</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700">
              <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Posição</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Nome</th>
              {dados.ranking[0]?.escola && <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Escola</th>}
              <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Alunos</th>
              {dados.ranking[0]?.media_lp !== undefined && (
                <>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">LP</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">MAT</th>
                  {isAnosIniciais(filtros.serie) ? (
                    <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">PROD</th>
                  ) : (
                    <>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">CH</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">CN</th>
                    </>
                  )}
                </>
              )}
              <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">Média Geral</th>
            </tr>
          </thead>
          <tbody>
            {dados.ranking.map((item: any, index: number) => (
              <tr key={index} className={`border-b ${index < 3 ? 'bg-yellow-50' : ''}`}>
                <td className="px-4 py-2 text-center font-bold">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : item.posicao}
                </td>
                <td className="px-4 py-2 font-medium">{item.nome}</td>
                {item.escola && <td className="px-4 py-2">{item.escola}</td>}
                <td className="px-4 py-2 text-center">{item.total_alunos}</td>
                {item.media_lp !== undefined && (
                  <>
                    <td className="px-4 py-2 text-center">{item.media_lp?.toFixed(2) ?? 'N/A'}</td>
                    <td className="px-4 py-2 text-center">{item.media_mat?.toFixed(2) ?? 'N/A'}</td>
                    {isAnosIniciais(filtros.serie) ? (
                      <td className="px-4 py-2 text-center">{item.media_producao?.toFixed(2) ?? 'N/A'}</td>
                    ) : (
                      <>
                        <td className="px-4 py-2 text-center">{item.media_ch?.toFixed(2) ?? 'N/A'}</td>
                        <td className="px-4 py-2 text-center">{item.media_cn?.toFixed(2) ?? 'N/A'}</td>
                      </>
                    )}
                  </>
                )}
                <td className="px-4 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{item.media_geral.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AprovacaoChart({ dados }: ChartsAvancadosProps) {
  if (!dados.aprovacao || dados.aprovacao.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Aprovação Estimada</h3>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={dados.aprovacao}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="categoria"
            tick={{ fontSize: 11 }}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis domain={[0, 100]} label={{ value: 'Taxa de Aprovação (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value: any) => [`${value.toFixed(2)}%`, 'Taxa']}
          />
          <Legend />
          <Bar dataKey="taxa_6" name="≥ 6.0" fill="#10B981" />
          <Bar dataKey="taxa_7" name="≥ 7.0" fill="#3B82F6" />
          <Bar dataKey="taxa_8" name="≥ 8.0" fill="#8B5CF6" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Legenda: Verde (≥6.0), Azul (≥7.0), Roxo (≥8.0)</p>
      </div>
    </div>
  )
}

export function GapsChart({ dados }: ChartsAvancadosProps) {
  if (!dados.gaps || dados.gaps.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Análise de Gaps (Desigualdade de Desempenho)</h3>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={dados.gaps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="categoria"
            tick={{ fontSize: 11 }}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="melhor_media" name="Melhor Média" fill="#10B981" />
          <Bar dataKey="media_geral" name="Média Geral" fill="#3B82F6" />
          <Bar dataKey="pior_media" name="Pior Média" fill="#EF4444" />
          <Bar dataKey="gap" name="Gap (Diferença)" fill="#F59E0B" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Gap = Diferença entre melhor e pior média. Valores maiores indicam maior desigualdade.</p>
      </div>
    </div>
  )
}
