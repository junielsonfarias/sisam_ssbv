import { Users, CheckCircle, XCircle, BarChart3 } from 'lucide-react'

interface Resumo {
  total_alunos: number
  total_presentes: number
  total_ausentes: number
  taxa_presenca: number
}

interface KpiCardsProps {
  resumo: Resumo
  carregandoResumo: boolean
}

export function KpiCards({ resumo, carregandoResumo }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total de Alunos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {carregandoResumo ? '-' : resumo.total_alunos}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Presentes</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {carregandoResumo ? '-' : resumo.total_presentes}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ausentes</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {carregandoResumo ? '-' : resumo.total_ausentes}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Presenca</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {carregandoResumo ? '-' : `${Number(resumo.taxa_presenca).toFixed(1)}%`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
