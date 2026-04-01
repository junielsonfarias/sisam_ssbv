'use client'

import { useState, useEffect } from 'react'
import {
  ChartWrapper,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from '@/components/charts/lazy-charts'

interface DadoComparativo {
  disciplina: string
  media_turma: number
  media_escola: number
}

interface ComparativoTurmaProps {
  turmaId: string | null
}

export default function ComparativoTurma({ turmaId }: ComparativoTurmaProps) {
  const [dados, setDados] = useState<DadoComparativo[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!turmaId) return
    setCarregando(true)
    fetch(`/api/professor/dashboard/comparativo?turma_id=${turmaId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setDados(data.dados)
      })
      .finally(() => setCarregando(false))
  }, [turmaId])

  if (!turmaId) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Turma vs Escola</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          Selecione uma turma para ver o comparativo
        </p>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Turma vs Escola</h3>
        <div className="h-[280px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Turma vs Escola</h3>
      {dados.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          Sem dados comparativos disponíveis
        </p>
      ) : (
        <ChartWrapper height={280}>
          <BarChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="disciplina" tick={{ fontSize: 11 }} stroke="#9ca3af" />
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
            <Bar dataKey="media_turma" name="Minha Turma" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="media_escola" name="Escola" fill="#9ca3af" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartWrapper>
      )}
    </div>
  )
}
