'use client'

import { BookOpen, TrendingUp, BarChart3, PieChart, School } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { COLORS, prepararDadosBarras, prepararDadosDisciplinas, prepararDadosPizza } from './helpers'

const cardCls = 'bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6'

/** Gráfico "Médias por Disciplina" (barras coloridas). */
export function GraficoDisciplinas({ disciplinas }: { disciplinas: any }) {
  if (!disciplinas) return null
  const data = prepararDadosDisciplinas(disciplinas.labels, disciplinas.dados)
  return (
    <div className={cardCls}>
      <div className="flex items-center mb-4">
        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Médias por Disciplina</h3>
        {disciplinas.totalAlunos && (
          <span className="ml-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {disciplinas.totalAlunos} alunos
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 14, fontWeight: 500 }} interval={0} angle={-15} textAnchor="end" height={100} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 14, fontWeight: 500 }} label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }} />
          <Tooltip contentStyle={{ fontSize: 14, fontWeight: 500 }} labelStyle={{ fontSize: 14, fontWeight: 600 }} />
          <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
          <Bar dataKey="value" name="Média">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
          <ReferenceLine y={7} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Meta (7.0)', position: 'right', fontSize: 14, fontWeight: 600 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Gráfico "Desempenho por Escola" (barras horizontais). Usado no polo. */
export function GraficoEscolas({ escolas }: { escolas: any }) {
  if (!escolas || !escolas.labels || escolas.labels.length === 0) return null
  return (
    <div className={cardCls}>
      <div className="flex items-center mb-4">
        <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Desempenho por Escola</h3>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(350, escolas.labels.length * 40)}>
        <BarChart data={prepararDadosBarras(escolas.labels, escolas.dados)} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12, fontWeight: 500 }} />
          <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 11, fontWeight: 500 }} />
          <Tooltip contentStyle={{ fontSize: 14, fontWeight: 500 }} labelStyle={{ fontSize: 14, fontWeight: 600 }} />
          <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
          <Bar dataKey="value" name="Média" fill="#10B981" />
          <ReferenceLine x={7} stroke="#4F46E5" strokeDasharray="3 3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Gráfico "Desempenho por Série" (linha). */
export function GraficoSeries({ series }: { series: any }) {
  if (!series || !series.labels || series.labels.length === 0) return null
  return (
    <div className={cardCls}>
      <div className="flex items-center mb-4">
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Desempenho por Série</h3>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={prepararDadosBarras(series.labels, series.dados)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 14, fontWeight: 500 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 14, fontWeight: 500 }} label={{ value: 'Média', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }} />
          <Tooltip contentStyle={{ fontSize: 14, fontWeight: 500 }} labelStyle={{ fontSize: 14, fontWeight: 600 }} />
          <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500, paddingTop: 10 }} />
          <Line type="monotone" dataKey="value" name="Média" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Gráfico "Distribuição de Notas" (barras). */
export function GraficoDistribuicao({ distribuicao }: { distribuicao: any }) {
  if (!distribuicao) return null
  return (
    <div className={cardCls}>
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição de Notas</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={prepararDadosBarras(distribuicao.labels, distribuicao.dados)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 500 }} />
          <YAxis tick={{ fontSize: 12, fontWeight: 500 }} />
          <Tooltip contentStyle={{ fontSize: 14, fontWeight: 500 }} />
          <Legend wrapperStyle={{ fontSize: 14, fontWeight: 500 }} />
          <Bar dataKey="value" name="Quantidade de Alunos" fill="#F59E0B" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Gráfico "Taxa de Presença" (pizza). */
export function GraficoPresenca({ presenca }: { presenca: any }) {
  if (!presenca) return null
  const data = prepararDadosPizza(presenca.labels, presenca.dados)
  return (
    <div className={cardCls}>
      <div className="flex items-center mb-4">
        <PieChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-pink-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Presença</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPie>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RechartsPie>
      </ResponsiveContainer>
    </div>
  )
}
