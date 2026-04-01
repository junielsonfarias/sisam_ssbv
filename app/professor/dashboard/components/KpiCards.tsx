'use client'

import { Users, BarChart3, CalendarCheck, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardsProps {
  totalAlunos: number
  mediaGeral: number | null
  frequenciaMedia: number
  alunosEmRisco: number
  mediaBimestreAnterior?: number | null
  frequenciaBimestreAnterior?: number | null
}

interface KpiItem {
  icon: React.ElementType
  label: string
  valor: string
  cor: string
  evolucao?: number | null
}

export default function KpiCards({
  totalAlunos,
  mediaGeral,
  frequenciaMedia,
  alunosEmRisco,
  mediaBimestreAnterior,
  frequenciaBimestreAnterior,
}: KpiCardsProps) {
  const calcEvolucao = (atual: number | null, anterior: number | null | undefined) => {
    if (atual == null || anterior == null || anterior === undefined) return null
    return parseFloat((atual - anterior).toFixed(1))
  }

  const kpis: KpiItem[] = [
    {
      icon: Users,
      label: 'Total de Alunos',
      valor: String(totalAlunos),
      cor: 'bg-blue-500',
    },
    {
      icon: BarChart3,
      label: 'Média Geral',
      valor: mediaGeral != null ? mediaGeral.toFixed(1) : '--',
      cor: mediaGeral != null && mediaGeral >= 6 ? 'bg-green-500' : 'bg-amber-500',
      evolucao: calcEvolucao(mediaGeral, mediaBimestreAnterior),
    },
    {
      icon: CalendarCheck,
      label: 'Frequência Média',
      valor: `${frequenciaMedia}%`,
      cor: frequenciaMedia >= 75 ? 'bg-green-500' : 'bg-red-500',
      evolucao: calcEvolucao(frequenciaMedia, frequenciaBimestreAnterior),
    },
    {
      icon: AlertTriangle,
      label: 'Alunos em Risco',
      valor: String(alunosEmRisco),
      cor: alunosEmRisco > 0 ? 'bg-red-500' : 'bg-green-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-3">
            <div className={`${kpi.cor} p-2.5 rounded-lg`}>
              <kpi.icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                {kpi.label}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{kpi.valor}</p>
                {kpi.evolucao != null && kpi.evolucao !== 0 && (
                  <span
                    className={`flex items-center text-xs font-medium ${
                      kpi.evolucao > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {kpi.evolucao > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 mr-0.5" />
                    )}
                    {kpi.evolucao > 0 ? '+' : ''}{kpi.evolucao}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
