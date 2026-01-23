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
  // Garantir que media seja um número válido (tratar null, undefined, NaN)
  const mediaValida = typeof media === 'number' && !isNaN(media) ? media : 0
  const porcentagem = Math.min(Math.max((mediaValida / 10) * 100, 0), 100)
  const temMedia = mediaValida > 0

  return (
    <div className={`${c.bg} rounded-xl p-4 border-2 ${c.border} hover:shadow-md transition-shadow ${destaque ? `ring-2 ${c.ring} shadow-lg scale-105` : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{sigla}</span>
        <span className={`text-xl font-bold ${c.text}`}>
          {temMedia ? mediaValida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
        </span>
      </div>
      {/* Barra de progresso - sempre visível com cor inline para garantir renderização */}
      <div className="w-full bg-white dark:bg-slate-800 rounded-full h-2.5 mb-2 shadow-inner">
        <div
          className="h-2.5 rounded-full transition-all duration-500 shadow-sm"
          style={{
            width: `${porcentagem}%`,
            backgroundColor: c.barColor || '#3B82F6'
          }}
        ></div>
      </div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{titulo}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {temMedia ? `${porcentagem.toFixed(1)}% da nota máxima` : 'Sem dados'}
      </p>
    </div>
  )
}
