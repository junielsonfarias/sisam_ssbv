'use client'

import { RefreshCw } from 'lucide-react'
import { formatarSerie } from '@/lib/dados/utils'

interface SeriesChipsProps {
  series: string[]
  serieSelecionada: string
  onChange: (serie: string) => void
  carregando?: boolean
}

/**
 * Componente de chips para selecao rapida de serie
 */
export default function SeriesChips({
  series,
  serieSelecionada,
  onChange,
  carregando = false
}: SeriesChipsProps) {
  if (!series || series.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-2">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase self-center mr-2 flex items-center gap-2">
        Serie:
        {carregando && (
          <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
        )}
      </span>
      <button
        onClick={() => onChange('')}
        disabled={carregando}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-70 ${
          !serieSelecionada
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
        }`}
      >
        Todas
      </button>
      {series.map((serie) => (
        <button
          key={serie}
          onClick={() => onChange(serie)}
          disabled={carregando}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-70 ${
            serieSelecionada === serie
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          {formatarSerie(serie)}
        </button>
      ))}
    </div>
  )
}
