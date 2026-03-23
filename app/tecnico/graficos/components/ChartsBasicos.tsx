'use client'

import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { BookOpen, School, TrendingUp, Users, BarChart3, PieChart } from 'lucide-react'
import { COLORS, prepararDadosBarras, prepararDadosDisciplinas, prepararDadosPizza, getFaixa } from './constants'

interface ChartsBasicosProps {
  dados: any
}

export function DisciplinasChart({ dados }: ChartsBasicosProps) {
  if (!dados.disciplinas) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Médias por Disciplina</h3>
        <span className="ml-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          {dados.disciplinas.totalAlunos} alunos
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" name="Média">
            {prepararDadosDisciplinas(dados.disciplinas.labels, dados.disciplinas.dados).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
          {/* Linha de referência para meta (7.0) */}
          <ReferenceLine y={7} stroke="#10B981" strokeDasharray="3 3" label={{ value: "Meta (7.0)", position: "right" }} />
        </BarChart>
      </ResponsiveContainer>

      {/* Indicadores Estatísticos */}
      {dados.disciplinas.desvios && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {dados.disciplinas.labels.map((label: string, index: number) => {
            const media = dados.disciplinas.dados[index] || 0
            const desvio = dados.disciplinas.desvios[index] || 0
            const taxaAprov = dados.disciplinas.taxas_aprovacao?.[index] || 0
            const faixa = getFaixa(media)

            return (
              <div key={index} className={`p-3 rounded-lg ${faixa.bg}`}>
                <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{media.toFixed(2)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Desvio: {desvio.toFixed(2)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Aprovação: {taxaAprov.toFixed(1)}%</p>
                <p className={`text-xs font-semibold mt-1 ${faixa.cor}`}>{faixa.nome}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function EscolasChart({ dados }: ChartsBasicosProps) {
  if (!dados.escolas || !dados.escolas.labels.length) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <School className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Desempenho por Escola</h3>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(500, Math.min(800, dados.escolas.labels.length * 50))}>
        <BarChart
          data={prepararDadosBarras(dados.escolas.labels, dados.escolas.dados, 'Média')}
          layout="vertical"
          margin={{ left: 15, right: 40, top: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, 10]}
            tick={{ fontSize: 13, fontWeight: 500 }}
            label={{ value: 'Média', position: 'insideBottom', offset: -5, fontSize: 14, fontWeight: 600 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={Math.min(300, Math.max(180, dados.escolas.labels.reduce((max: number, label: string) => Math.max(max, label.length * 7.5), 180)))}
            tick={{ fontSize: 12, fontWeight: 500 }}
          />
          <Tooltip
            contentStyle={{ fontSize: 13, fontWeight: 500 }}
            labelStyle={{ fontSize: 13, fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, fontWeight: 500, paddingTop: 10 }} />
          <Bar dataKey="value" name="Média" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SeriesChart({ dados }: ChartsBasicosProps) {
  if (!dados.series || !dados.series.labels.length) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Desempenho por Série</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={prepararDadosBarras(dados.series.labels, dados.series.dados, 'Média')}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" name="Média" stroke="#8B5CF6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PolosChart({ dados }: ChartsBasicosProps) {
  if (!dados.polos || !dados.polos.labels.length) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <Users className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Desempenho por Polo</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={prepararDadosBarras(dados.polos.labels, dados.polos.dados, 'Média')}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" name="Média" fill="#06B6D4" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DistribuicaoChart({ dados }: ChartsBasicosProps) {
  if (!dados.distribuicao) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Distribuição de Notas</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={prepararDadosBarras(dados.distribuicao.labels, dados.distribuicao.dados, 'Alunos')}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" name="Quantidade de Alunos" fill="#F59E0B" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PresencaChart({ dados }: ChartsBasicosProps) {
  if (!dados.presenca) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <PieChart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-pink-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Taxa de Presença</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPie>
          <Pie
            data={prepararDadosPizza(dados.presenca.labels, dados.presenca.dados)}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {prepararDadosPizza(dados.presenca.labels, dados.presenca.dados).map((entry, index) => (
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
