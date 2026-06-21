'use client'

import type { TotaisDivergencias } from './tipos'

interface TotaisTriagemProps {
  totais: TotaisDivergencias
}

const CARDS: {
  chave: keyof TotaisDivergencias
  rotulo: string
  classe: string
}[] = [
  { chave: 'total', rotulo: 'Total', classe: 'text-gray-900 dark:text-white' },
  { chave: 'pendentes', rotulo: 'Pendentes', classe: 'text-amber-600 dark:text-amber-400' },
  { chave: 'vinculadas', rotulo: 'Vinculadas', classe: 'text-green-600 dark:text-green-400' },
  { chave: 'ignoradas', rotulo: 'Ignoradas', classe: 'text-gray-500 dark:text-gray-400' },
]

/** KPIs por status das divergências de triagem. */
export function TotaisTriagem({ totais }: TotaisTriagemProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {CARDS.map((card) => (
        <div
          key={card.chave}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 px-4 py-3"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.rotulo}</p>
          <p className={`text-2xl font-bold mt-1 ${card.classe}`}>{totais[card.chave]}</p>
        </div>
      ))}
    </div>
  )
}
