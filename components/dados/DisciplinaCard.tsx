'use client'

import { CORES_DISCIPLINA_CARD } from '@/lib/dados/constants'

interface DisciplinaCardProps {
  titulo: string
  media: number
  cor: keyof typeof CORES_DISCIPLINA_CARD
  sigla: string
  destaque?: boolean
}

export default function DisciplinaCard({ titulo, media, cor, sigla, destaque = false }: DisciplinaCardProps) {
  const c = CORES_DISCIPLINA_CARD[cor] || CORES_DISCIPLINA_CARD.blue
  const porcentagem = Math.min((media / 10) * 100, 100)

  return (
    <div className={`${c.bg} rounded-xl p-4 border-2 ${c.border} hover:shadow-md transition-shadow ${destaque ? `ring-2 ${c.ring} shadow-lg scale-105` : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{sigla}</span>
        <span className={`text-xl font-bold ${c.text}`}>
          {media > 0 ? media.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
        </span>
      </div>
      <div className="w-full bg-white dark:bg-slate-800 rounded-full h-2.5 mb-2 shadow-inner">
        <div
          className={`h-2.5 rounded-full ${c.bar} transition-all duration-500 shadow-sm`}
          style={{ width: `${porcentagem}%` }}
        ></div>
      </div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{titulo}</p>
      {media > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{porcentagem.toFixed(1)}% da nota máxima</p>
      )}
    </div>
  )
}
