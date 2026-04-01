'use client'

import { Search, UserCheck, UserX } from 'lucide-react'

interface FiltrosUsuariosProps {
  busca: string
  setBusca: (v: string) => void
  filtroStatus: 'todos' | 'ativos' | 'inativos'
  setFiltroStatus: (v: 'todos' | 'ativos' | 'inativos') => void
}

export default function FiltrosUsuarios({
  busca, setBusca, filtroStatus, setFiltroStatus,
}: FiltrosUsuariosProps) {
  return (
    <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 sm:pl-12 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-slate-800"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroStatus === 'todos'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroStatus('ativos')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroStatus === 'ativos'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Ativos
          </button>
          <button
            onClick={() => setFiltroStatus('inativos')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              filtroStatus === 'inativos'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <UserX className="w-4 h-4" />
            Inativos
          </button>
        </div>
      </div>
    </div>
  )
}
