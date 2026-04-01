'use client'

import { useState, useEffect } from 'react'
import {
  ChartWrapper,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from '@/components/charts/lazy-charts'

interface Disciplina {
  nome: string
  abreviacao: string
  codigo: string
}

interface GraficoEvolucaoProps {
  turmaId: string | null
}

const CORES_DISCIPLINAS: Record<string, string> = {
  LP: '#3b82f6',   // blue
  MAT: '#22c55e',  // green
  CIE: '#f97316',  // orange
  HIS: '#a855f7',  // purple
  GEO: '#f59e0b',  // amber
  ART: '#ec4899',  // pink
  EDF: '#06b6d4',  // cyan
  REL: '#8b5cf6',  // violet
  ING: '#ef4444',  // red
}

export default function GraficoEvolucao({ turmaId }: GraficoEvolucaoProps) {
  const [dados, setDados] = useState<Record<string, string | number>[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!turmaId) return
    setCarregando(true)
    fetch(`/api/professor/dashboard/evolucao?turma_id=${turmaId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setDados(data.dados)
          setDisciplinas(data.disciplinas)
        }
      })
      .finally(() => setCarregando(false))
  }, [turmaId])

  if (!turmaId) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Evolução da Turma</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          Selecione uma turma para ver a evolução
        </p>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Evolução da Turma</h3>
        <div className="h-[280px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Evolução da Turma</h3>
      {dados.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          Sem dados de notas para esta turma
        </p>
      ) : (
        <ChartWrapper height={280}>
          <LineChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="periodo" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, #fff)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {disciplinas.map((d) => (
              <Line
                key={d.codigo}
                type="monotone"
                dataKey={d.codigo}
                name={d.abreviacao || d.codigo}
                stroke={CORES_DISCIPLINAS[d.codigo] || '#6b7280'}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ChartWrapper>
      )}
    </div>
  )
}
