import React from 'react'

/** Estado vazio padrão (cartão arredondado com ícone). Usado no portal do responsável. */
export function EmptyCard({ Icon, titulo, texto }: {
  Icon: React.ComponentType<{ className?: string }>
  titulo: string
  texto?: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-gray-100 dark:border-slate-700 shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-gray-300 dark:text-gray-500" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{titulo}</p>
      {texto && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">{texto}</p>}
    </div>
  )
}
