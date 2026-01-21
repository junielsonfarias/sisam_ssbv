'use client'

import { type LucideIcon } from 'lucide-react'

type CorBorda = 'green' | 'cyan' | 'orange' | 'indigo' | 'blue' | 'emerald' | 'violet' | 'red'

interface CardEstatisticaProps {
  titulo: string
  valor: number | string
  subtitulo?: string
  Icone: LucideIcon
  corBorda: CorBorda
  formatarValor?: (valor: number | string) => string
  className?: string
}

const coresBorda: Record<CorBorda, string> = {
  green: 'border-green-500',
  cyan: 'border-cyan-500',
  orange: 'border-orange-500',
  indigo: 'border-indigo-500',
  blue: 'border-blue-500',
  emerald: 'border-emerald-500',
  violet: 'border-violet-500',
  red: 'border-red-500'
}

const coresIcone: Record<CorBorda, string> = {
  green: 'text-green-600 dark:text-green-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  orange: 'text-orange-600 dark:text-orange-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  violet: 'text-violet-600 dark:text-violet-400',
  red: 'text-red-600 dark:text-red-400'
}

/**
 * Card de estatistica reutilizavel para paineis
 * Exibe titulo, valor e icone com borda colorida
 */
export default function CardEstatistica({
  titulo,
  valor,
  subtitulo,
  Icone,
  corBorda,
  formatarValor,
  className = ''
}: CardEstatisticaProps) {
  const valorFormatado = formatarValor
    ? formatarValor(valor)
    : typeof valor === 'number'
      ? valor.toLocaleString('pt-BR')
      : valor

  return (
    <div className={`bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-5 rounded-lg shadow-md border-l-4 ${coresBorda[corBorda]} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">
            {titulo}
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mt-1">
            {valorFormatado}
          </p>
          {subtitulo && (
            <p className={`text-[10px] sm:text-xs mt-1 ${coresIcone[corBorda]}`}>
              {subtitulo}
            </p>
          )}
        </div>
        <Icone className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${coresIcone[corBorda]}`} />
      </div>
    </div>
  )
}
