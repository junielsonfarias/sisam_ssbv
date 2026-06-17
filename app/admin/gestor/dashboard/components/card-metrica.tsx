'use client'

import { ChevronRight } from 'lucide-react'

export function CardMetrica({ icon: Icon, label, valor, cor, sublabel, onClick }: {
  icon: any; label: string; valor: string | number; cor: string; sublabel?: string; onClick?: () => void
}) {
  const cores: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
  }
  const coreTexto: Record<string, string> = {
    blue: 'text-blue-700 dark:text-blue-300',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    red: 'text-red-700 dark:text-red-300',
    orange: 'text-orange-700 dark:text-orange-300',
    indigo: 'text-indigo-700 dark:text-indigo-300',
    violet: 'text-violet-700 dark:text-violet-300',
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 w-fit ${cores[cor] || cores.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
      </div>
      <p className={`text-2xl font-bold mt-2 ${coreTexto[cor] || coreTexto.blue}`}>{valor}</p>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
      {sublabel && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sublabel}</p>}
    </div>
  )
}
