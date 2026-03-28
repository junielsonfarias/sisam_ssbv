'use client'

import React from 'react'

interface KpiCardProps {
  icon: React.ElementType
  valor: number | string
  label: string
  sublabel?: string
  cor?: 'violet' | 'blue' | 'emerald' | 'orange' | 'amber' | 'red' | 'indigo' | 'teal'
  onClick?: () => void
  className?: string
}

const corMap: Record<
  NonNullable<KpiCardProps['cor']>,
  { bg: string; text: string; border: string }
> = {
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-900/40',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-400 dark:border-violet-500',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-400 dark:border-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-400 dark:border-emerald-500',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-400 dark:border-orange-500',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-400 dark:border-amber-500',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-400 dark:border-red-500',
  },
  indigo: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-400 dark:border-indigo-500',
  },
  teal: {
    bg: 'bg-teal-100 dark:bg-teal-900/40',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-400 dark:border-teal-500',
  },
}

/**
 * KpiCard - Componente reutilizavel para exibir indicadores-chave (KPI)
 *
 * Exibe um icone em circulo colorido, valor grande, label e sublabel opcional.
 * Suporta variante clicavel com efeito hover e destaque de borda.
 */
export function KpiCard({
  icon: Icon,
  valor,
  label,
  sublabel,
  cor = 'indigo',
  onClick,
  className = '',
}: KpiCardProps) {
  const cores = corMap[cor]
  const isClickable = !!onClick

  const baseClasses =
    'rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 sm:p-5 transition-all duration-200'

  const clickableClasses = isClickable
    ? `cursor-pointer hover:shadow-md dark:hover:shadow-slate-900/50 hover:${cores.border}`
    : ''

  const Wrapper = isClickable ? 'button' : 'div'

  return (
    <Wrapper
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={`${baseClasses} ${clickableClasses} ${className} text-left w-full`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={`flex-shrink-0 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full ${cores.bg}`}
        >
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${cores.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {valor}
          </p>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
            {label}
          </p>
          {sublabel && (
            <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
              {sublabel}
            </p>
          )}
        </div>
      </div>
    </Wrapper>
  )
}
