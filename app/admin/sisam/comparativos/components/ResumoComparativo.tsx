import { School, BookOpen } from 'lucide-react'

interface ResumoComparativoProps {
  totalEscolasComparadas: number
  totalSeries: number
}

export default function ResumoComparativo({ totalEscolasComparadas, totalSeries }: ResumoComparativoProps) {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <School className="w-6 h-6 text-indigo-600" />
          <div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">Escolas comparadas</p>
            <p className="text-2xl font-bold text-indigo-900">{totalEscolasComparadas}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">Séries analisadas</p>
            <p className="text-2xl font-bold text-indigo-900">{totalSeries}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
