'use client'

import { BookOpen, MapPin } from 'lucide-react'

interface Props {
  nomesPolos: string[]
  totalSeries: number
}

export function Resumo({ nomesPolos, totalSeries }: Props) {
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <MapPin className="w-6 h-6 text-indigo-600" />
          <div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">Polos comparados</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-900">{nomesPolos.join(' vs ')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">Séries analisadas</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-900">{totalSeries}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
