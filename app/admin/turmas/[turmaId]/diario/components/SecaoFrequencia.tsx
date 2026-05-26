'use client'

import { ClipboardList } from 'lucide-react'
import type { FrequenciaLinha, Periodo } from './types'
import { formatarPercentual, corPercentual } from './formatters'

interface Props {
  frequencia: FrequenciaLinha[]
  periodo: Periodo | null
  filtroPorPeriodo: boolean
}

export default function SecaoFrequencia({ frequencia, periodo, filtroPorPeriodo }: Props) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Frequência {periodo ? `— ${periodo.nome}` : '(consolidado)'}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{frequencia.length} alunos</span>
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-semibold">Aluno</th>
              {!filtroPorPeriodo && <th className="px-4 py-2 font-semibold">Período</th>}
              <th className="px-4 py-2 font-semibold text-right">Dias Letivos</th>
              <th className="px-4 py-2 font-semibold text-right">Presenças</th>
              <th className="px-4 py-2 font-semibold text-right">Faltas</th>
              <th className="px-4 py-2 font-semibold text-right">Just.</th>
              <th className="px-4 py-2 font-semibold text-right">%</th>
              <th className="px-4 py-2 font-semibold">Lançado por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {frequencia.map((f, i) => (
              <tr key={`${f.aluno_id}-${f.freq_id || i}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-2 text-gray-900 dark:text-white">{f.aluno_nome}</td>
                {!filtroPorPeriodo && (
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                    {f.periodo_numero ? `${f.periodo_numero}º` : '—'}
                  </td>
                )}
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{f.dias_letivos ?? '—'}</td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{f.presencas ?? '—'}</td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{f.faltas ?? '—'}</td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{f.faltas_justificadas ?? '—'}</td>
                <td className={`px-4 py-2 text-right font-semibold ${corPercentual(f.percentual_frequencia)}`}>
                  {formatarPercentual(f.percentual_frequencia)}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{f.registrado_por_nome || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
        {frequencia.map((f, i) => (
          <li key={`m-${f.aluno_id}-${f.freq_id || i}`} className="p-4 active:bg-gray-50 dark:active:bg-slate-700/30">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                  {f.aluno_nome}
                </div>
                {!filtroPorPeriodo && f.periodo_numero && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {f.periodo_numero}º período
                  </div>
                )}
              </div>
              <div className={`text-lg font-bold tabular-nums shrink-0 ${corPercentual(f.percentual_frequencia)}`}>
                {formatarPercentual(f.percentual_frequencia)}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
              <div className="bg-gray-50 dark:bg-slate-900/40 rounded px-2 py-1.5">
                <div className="text-[9px] uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Dias</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{f.dias_letivos ?? '—'}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1.5">
                <div className="text-[9px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide">Pres.</div>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">{f.presencas ?? '—'}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded px-2 py-1.5">
                <div className="text-[9px] uppercase font-semibold text-red-600 dark:text-red-400 tracking-wide">Faltas</div>
                <div className="text-sm font-semibold text-red-700 dark:text-red-300 tabular-nums">{f.faltas ?? '—'}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1.5">
                <div className="text-[9px] uppercase font-semibold text-amber-600 dark:text-amber-400 tracking-wide">Just.</div>
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-300 tabular-nums">{f.faltas_justificadas ?? '—'}</div>
              </div>
            </div>

            {f.registrado_por_nome && (
              <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Lançado por <span className="font-medium">{f.registrado_por_nome}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
