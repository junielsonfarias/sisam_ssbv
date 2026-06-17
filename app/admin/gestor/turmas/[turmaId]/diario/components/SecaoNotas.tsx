'use client'

import { BookOpen } from 'lucide-react'
import type { NotaLinha, Periodo } from './types'
import { formatarNota, corNota } from './formatters'

interface Props {
  notas: NotaLinha[]
  periodo: Periodo | null
  filtroPorPeriodo: boolean
  totalAlunosComNotas: number
}

export default function SecaoNotas({ notas, periodo, filtroPorPeriodo, totalAlunosComNotas }: Props) {
  const validas = notas.filter(n => n.nota_id)
  if (validas.length === 0) return null

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Notas {periodo ? `— ${periodo.nome}` : '(todos os períodos)'}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{totalAlunosComNotas} alunos com notas</span>
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 font-semibold text-right w-10">#</th>
              <th className="px-4 py-2 font-semibold">Aluno</th>
              <th className="px-4 py-2 font-semibold">Disciplina</th>
              {!filtroPorPeriodo && <th className="px-4 py-2 font-semibold">Período</th>}
              <th className="px-4 py-2 font-semibold text-right">Nota</th>
              <th className="px-4 py-2 font-semibold text-right">Recuperação</th>
              <th className="px-4 py-2 font-semibold text-right">Final</th>
              <th className="px-4 py-2 font-semibold text-right">Faltas</th>
              <th className="px-4 py-2 font-semibold">Lançado por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {validas.map((n, i) => (
              <tr key={n.nota_id!} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2 text-right text-gray-400 dark:text-gray-500 tabular-nums">{i + 1}</td>
                <td className="px-4 py-2 text-gray-900 dark:text-white">{n.aluno_nome}</td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{n.disciplina_nome || '—'}</td>
                {!filtroPorPeriodo && (
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                    {n.periodo_numero ? `${n.periodo_numero}º` : '—'}
                  </td>
                )}
                <td className={`px-4 py-2 text-right font-semibold ${corNota(n.nota)}`}>{formatarNota(n.nota)}</td>
                <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">{formatarNota(n.nota_recuperacao)}</td>
                <td className={`px-4 py-2 text-right font-bold ${corNota(n.nota_final)}`}>{formatarNota(n.nota_final)}</td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">{n.faltas ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{n.registrado_por_nome || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
        {validas.map((n, i) => (
          <li key={`m-${n.nota_id!}`} className="p-4 active:bg-gray-50 dark:active:bg-slate-700/30">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">{i + 1}.</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{n.aluno_nome}</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap gap-x-2">
                  <span>{n.disciplina_nome || 'Sem disciplina'}</span>
                  {!filtroPorPeriodo && n.periodo_numero && (
                    <>
                      <span>·</span>
                      <span>{n.periodo_numero}º período</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[9px] uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Final</div>
                <div className={`text-2xl font-bold tabular-nums ${corNota(n.nota_final)}`}>
                  {formatarNota(n.nota_final)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="bg-gray-50 dark:bg-slate-900/40 rounded px-2 py-1.5">
                <div className="text-[9px] uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Nota</div>
                <div className={`text-sm font-semibold tabular-nums ${corNota(n.nota)}`}>{formatarNota(n.nota)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/40 rounded px-2 py-1.5">
                <div className="text-[9px] uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Recup.</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{formatarNota(n.nota_recuperacao)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/40 rounded px-2 py-1.5">
                <div className="text-[9px] uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Faltas</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{n.faltas ?? '—'}</div>
              </div>
            </div>

            {n.registrado_por_nome && (
              <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Lançado por <span className="font-medium">{n.registrado_por_nome}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
