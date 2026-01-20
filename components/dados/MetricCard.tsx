'use client'

import { LucideIcon } from 'lucide-react'
import { CORES_METRIC_CARD } from '@/lib/dados/constants'

interface MetricCardProps {
  titulo: string
  valor: number | string
  subtitulo?: string
  icon: LucideIcon
  cor: keyof typeof CORES_METRIC_CARD
  isDecimal?: boolean
}

export default function MetricCard({ titulo, valor, subtitulo, icon: Icon, cor, isDecimal }: MetricCardProps) {
  const corAtual = CORES_METRIC_CARD[cor] || CORES_METRIC_CARD.indigo

  const formatarValor = () => {
    if (typeof valor === 'number') {
      if (isDecimal) {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      return valor.toLocaleString('pt-BR')
    }
    return valor
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 ${corAtual.border} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${corAtual.iconBg}`}>
          <Icon className={`w-5 h-5 ${corAtual.text}`} />
        </div>
        {subtitulo && (
          <span className={`text-xs font-semibold ${corAtual.text} bg-white dark:bg-slate-700 px-2 py-1 rounded-md`}>
            {subtitulo}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${corAtual.text} mb-1`}>
        {formatarValor()}
      </p>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{titulo}</p>
    </div>
  )
}
