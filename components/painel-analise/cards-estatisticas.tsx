'use client'

import { Users, Target, CheckCircle2, X } from 'lucide-react'
import { EstatisticasAnalise, PaginacaoState } from './types'

interface CardsEstatisticasProps {
  estatisticas: EstatisticasAnalise
  paginacao: PaginacaoState
  mediaGeralCalculada: number
  carregando: boolean
}

export default function CardsEstatisticas({
  estatisticas,
  paginacao,
  mediaGeralCalculada,
  carregando
}: CardsEstatisticasProps) {
  if (!(estatisticas.totalAlunos > 0 || paginacao.total > 0 || carregando)) {
    return null
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${carregando ? 'opacity-50' : ''}`}>
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
          <span className="text-2xl sm:text-3xl font-bold">{estatisticas.totalAlunos || paginacao.total}</span>
        </div>
        <p className="text-xs sm:text-sm opacity-90">Total de Alunos</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <Target className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
          <span className="text-2xl sm:text-3xl font-bold">{mediaGeralCalculada > 0 ? mediaGeralCalculada.toFixed(2) : '-'}</span>
        </div>
        <p className="text-xs sm:text-sm opacity-90">Media Geral</p>
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
          <span className="text-2xl sm:text-3xl font-bold">{estatisticas.totalPresentes}</span>
        </div>
        <p className="text-xs sm:text-sm opacity-90">Presentes</p>
        <p className="text-[10px] sm:text-xs opacity-75 mt-1">
          {estatisticas.totalAlunos > 0 ? ((estatisticas.totalPresentes / estatisticas.totalAlunos) * 100).toFixed(1) : 0}%
        </p>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <X className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
          <span className="text-2xl sm:text-3xl font-bold">{estatisticas.totalFaltas}</span>
        </div>
        <p className="text-xs sm:text-sm opacity-90">Faltas</p>
        <p className="text-[10px] sm:text-xs opacity-75 mt-1">
          {estatisticas.totalAlunos > 0 ? ((estatisticas.totalFaltas / estatisticas.totalAlunos) * 100).toFixed(1) : 0}%
        </p>
      </div>
    </div>
  )
}
