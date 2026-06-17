'use client'

import { MapPin, School } from 'lucide-react'
import { DadosComparativoEscola } from '../types'
import { isAnosIniciais } from '../utils'
import { NotaCellWithNivel } from './NotaCellWithNivel'
import { PoloSimples } from '@/lib/dados/types'

interface TabelaComparativoEscolaProps {
  serie: string
  dadosEscolasPorPolo: Record<string, DadosComparativoEscola[]>
  polos: PoloSimples[]
  filtroEscolaId: string
}

export function TabelaComparativoEscola({ serie, dadosEscolasPorPolo, polos, filtroEscolaId }: TabelaComparativoEscolaProps) {
  if (Object.entries(dadosEscolasPorPolo).length === 0 || filtroEscolaId) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-blue-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 sm:px-6 py-4 border-b border-blue-200">
        <h3 className="text-lg sm:text-xl font-bold text-blue-900 flex items-center">
          <School className="w-5 h-5 mr-2" />
          {serie} - Comparativo por Escola
        </h3>
        <p className="text-sm text-blue-700 mt-1">
          Dados consolidados por escola dentro de cada polo
        </p>
      </div>

      {Object.entries(dadosEscolasPorPolo).map(([poloId, escolasData]) => {
        const poloNome = polos.find(p => p.id === poloId)?.nome || `Polo ${poloId}`
        return (
          <div key={poloId} className="mb-6 last:mb-0">
            <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-200">
              <h4 className="text-base sm:text-lg font-semibold text-blue-900 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {poloNome}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] sm:min-w-[700px] lg:min-w-[900px]">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="text-left py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[150px]">Escola</th>
                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">Turmas</th>
                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[90px] sm:min-w-[100px]">Total Alunos</th>
                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Presentes</th>
                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Faltantes</th>
                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">LP</th>
                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">MAT</th>
                    {isAnosIniciais(serie) ? (
                      <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">PROD</th>
                    ) : (
                      <>
                        <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">CH</th>
                        <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[80px] sm:min-w-[100px]">CN</th>
                      </>
                    )}
                    <th className="text-center py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm uppercase whitespace-nowrap min-w-[100px] sm:min-w-[120px]">Média Geral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {[...escolasData].sort((a, b) => {
                    const mediaA = typeof a.media_geral === 'string' ? parseFloat(a.media_geral) : (a.media_geral || 0)
                    const mediaB = typeof b.media_geral === 'string' ? parseFloat(b.media_geral) : (b.media_geral || 0)
                    return mediaB - mediaA
                  }).map((item, index) => {
                    const faltantes = item.total_alunos - item.alunos_presentes
                    const percentualFaltantes = item.total_alunos > 0 ? ((faltantes / item.total_alunos) * 100).toFixed(1) : '0.0'
                    const percentualPresentes = item.total_alunos > 0 ? ((item.alunos_presentes / item.total_alunos) * 100).toFixed(1) : '0.0'
                    return (
                    <tr key={`escola-${item.escola_id}-${item.serie}-${index}`} className="hover:bg-blue-50 bg-blue-50/30">
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <School className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-600" />
                          <span className="font-bold text-gray-900 text-xs sm:text-sm">{item.escola_nome}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold text-xs">
                          {item.total_turmas || 0} turma(s)
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <span className="text-gray-700 font-bold text-xs sm:text-sm">{item.total_alunos}</span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <span className="text-green-700 font-medium text-xs sm:text-sm">
                          {item.alunos_presentes} ({percentualPresentes}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <span className={`font-medium text-xs sm:text-sm ${faltantes > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {faltantes} ({percentualFaltantes}%)
                        </span>
                      </td>
                      <NotaCellWithNivel valor={item.media_lp} />
                      <NotaCellWithNivel valor={item.media_mat} />
                      {isAnosIniciais(serie) ? (
                        <NotaCellWithNivel valor={item.media_producao} />
                      ) : (
                        <>
                          <NotaCellWithNivel valor={item.media_ch} />
                          <NotaCellWithNivel valor={item.media_cn} />
                        </>
                      )}
                      <NotaCellWithNivel valor={item.media_geral} isMediaGeral />
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
