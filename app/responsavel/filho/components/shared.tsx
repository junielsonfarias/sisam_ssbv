'use client'

import type React from 'react'

export function CardCampos({ titulo, Icon, campos, cols = 2 }: {
  titulo: string
  Icon: React.ComponentType<{ className?: string }>
  campos: Array<[string, React.ReactNode]>
  cols?: 2 | 3
}) {
  const visiveis = campos.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== '—')
  if (visiveis.length === 0) return null
  const grid = cols === 3
    ? 'grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3'
    : 'grid grid-cols-2 gap-x-4 gap-y-3'
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
      <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" /> {titulo}
      </p>
      <dl className={grid}>
        {visiveis.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 truncate">{k}</dt>
            <dd className="text-sm font-medium text-gray-800 dark:text-gray-100 break-words leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function EmptyState({ Icon, texto }: { Icon: React.ComponentType<{ className?: string }>; texto: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-gray-100 dark:border-slate-700 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-gray-300 dark:text-gray-500" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{texto}</p>
    </div>
  )
}
