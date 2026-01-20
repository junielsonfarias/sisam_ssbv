'use client'

import { LucideIcon } from 'lucide-react'

export interface AbaConfig {
  id: string
  label: string
  icon: LucideIcon
}

interface AbaNavegacaoProps {
  abas: AbaConfig[]
  abaAtiva: string
  onChange: (abaId: string) => void
}

/**
 * Componente de navegacao por abas reutilizavel
 */
export default function AbaNavegacao({ abas, abaAtiva, onChange }: AbaNavegacaoProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {abas.map((aba) => {
          const Icon = aba.icon
          const isActive = abaAtiva === aba.id

          return (
            <button
              key={aba.id}
              onClick={() => onChange(aba.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">{aba.label}</span>
              <span className="xs:hidden sm:hidden">{aba.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
