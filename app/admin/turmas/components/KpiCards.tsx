'use client'

import { Users, GraduationCap, School, LayoutGrid } from 'lucide-react'
import { Turma, EscolaSimples } from './types'

interface KpiCardsProps {
  turmas: Turma[]
  seriesUnicas: string[]
  escolas: EscolaSimples[]
}

export function KpiCards({ turmas, seriesUnicas, escolas }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-violet-100 dark:bg-violet-900/30 rounded-lg p-2">
            <LayoutGrid className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{turmas.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Turmas</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{turmas.reduce((acc, t) => acc + t.total_alunos, 0)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Alunos</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2">
            <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{seriesUnicas.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Series</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2">
            <School className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{escolas.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Escolas</p>
          </div>
        </div>
      </div>
    </div>
  )
}
