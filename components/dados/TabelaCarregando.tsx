'use client'

import { type LucideIcon, RefreshCw } from 'lucide-react'

interface TabelaCarregandoProps {
  Icone?: LucideIcon
  mensagem?: string
  submensagem?: string
}

/**
 * Componente de loading para tabelas com visual sofisticado
 * Exibe icone animado, mensagem e submensagem
 */
export default function TabelaCarregando({
  Icone = RefreshCw,
  mensagem = 'Carregando dados...',
  submensagem = 'Aguarde um momento'
}: TabelaCarregandoProps) {
  return (
    <div className="text-center py-16">
      <div className="relative mx-auto w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-700"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
      <p className="text-gray-600 dark:text-gray-300 font-medium">{mensagem}</p>
      {submensagem && (
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{submensagem}</p>
      )}
    </div>
  )
}
