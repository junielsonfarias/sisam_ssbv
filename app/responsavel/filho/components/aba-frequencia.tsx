'use client'

import { CalendarCheck, AlertTriangle } from 'lucide-react'
import { EmptyState } from './shared'
import { corFreq, strokeFreq } from './helpers'
import type { Frequencia } from './helpers'

interface AbaFrequenciaProps {
  frequencia: Frequencia[]
  freqGeral: number
  totalFaltas: number
}

const ring = { r: 30, c: 2 * Math.PI * 30 }

export function AbaFrequencia({ frequencia, freqGeral, totalFaltas }: AbaFrequenciaProps) {
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <svg width="84" height="84" viewBox="0 0 80 80" className="-rotate-90">
              <circle cx="40" cy="40" r={ring.r} fill="none" strokeWidth="8" className="text-gray-100 dark:text-slate-700" stroke="currentColor" />
              <circle cx="40" cy="40" r={ring.r} fill="none" strokeWidth="8" strokeLinecap="round"
                className={strokeFreq(freqGeral)} stroke="currentColor"
                strokeDasharray={ring.c} strokeDashoffset={ring.c * (1 - Math.min(100, freqGeral) / 100)} />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-extrabold ${corFreq(freqGeral)}`}>
              {freqGeral}%
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Frequência geral</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total de faltas no ano: <strong className="text-gray-700 dark:text-gray-200">{totalFaltas}</strong></p>
            {freqGeral < 75 ? (
              <div className="mt-2 inline-flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>Abaixo de 75% — risco de reprovação por falta.</span>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Frequência dentro do esperado.</p>
            )}
          </div>
        </div>
      </div>

      {frequencia.length === 0 ? (
        <EmptyState Icon={CalendarCheck} texto="Nenhuma frequência lançada ainda" />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="text-left font-semibold px-4 py-2.5">Período</th>
                  <th className="text-center font-semibold px-3 py-2.5">Aulas</th>
                  <th className="text-center font-semibold px-3 py-2.5">Pres.</th>
                  <th className="text-center font-semibold px-3 py-2.5">Faltas</th>
                  <th className="text-right font-semibold px-4 py-2.5">Freq.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {frequencia.map(f => {
                  const pct = parseFloat(String(f.percentual_frequencia)) || 0
                  const presencas = (f.aulas_dadas || 0) - (f.faltas || 0)
                  const baixo = pct < 75
                  return (
                    <tr key={f.bimestre} className={baixo ? 'bg-red-50/60 dark:bg-red-900/10' : ''}>
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white whitespace-nowrap">
                        {f.periodo_nome || `${f.bimestre}º Bimestre`}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-300 tabular-nums">{f.aulas_dadas || 0}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-300 tabular-nums">{presencas}</td>
                      <td className={`px-3 py-2.5 text-center tabular-nums ${f.faltas > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>{f.faltas || 0}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-bold tabular-nums ${corFreq(pct)}`}>{pct.toFixed(0)}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-slate-700">
            Mínimo de 75% de frequência para aprovação · faltas em vermelho · linha destacada = abaixo do mínimo
          </p>
        </div>
      )}
    </>
  )
}
