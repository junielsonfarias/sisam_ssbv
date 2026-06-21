'use client'

import { RotateCcw } from 'lucide-react'
import { EmptyState } from './shared'
import { fmtNota } from './helpers'
import type { Disciplina, Periodo } from './helpers'

interface AbaRecuperacaoProps {
  disciplinas: Disciplina[]
  periodos: Periodo[]
  notas: Record<string, Record<string, any>>
}

export function AbaRecuperacao({ disciplinas, periodos, notas }: AbaRecuperacaoProps) {
  // Períodos que a escola lançou recuperação (1 coluna por bimestre/etc.)
  const temRecupNoPeriodo = (p: Periodo) => disciplinas.some(d => {
    const n = (notas[d.id] || {})[p.numero]
    return n && n.nota_recuperacao !== null && n.nota_recuperacao !== undefined && n.nota_recuperacao !== ''
  })
  const periodosRecup = periodos.filter(temRecupNoPeriodo)
  // Disciplinas que tiveram recuperação em algum período
  const discsRecup = disciplinas.filter(d => periodosRecup.some(p => {
    const n = (notas[d.id] || {})[p.numero]
    return n && n.nota_recuperacao !== null && n.nota_recuperacao !== undefined && n.nota_recuperacao !== ''
  }))
  return (
    <>
      <div className="bg-amber-50 dark:bg-amber-900/15 rounded-2xl border border-amber-100 dark:border-amber-800 p-3.5 flex items-start gap-2.5">
        <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          Recuperação por <strong>período</strong>, conforme a escola lançou. Cada coluna é um período de recuperação; o valor maior é a nota; abaixo, a nota original (<span className="whitespace-nowrap">de&nbsp;X</span>).
        </p>
      </div>
      {discsRecup.length === 0 ? (
        <EmptyState Icon={RotateCcw} texto="Nenhuma nota de recuperação lançada." />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/40 text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 font-semibold sticky left-0 bg-gray-50 dark:bg-slate-700/40 z-10">Disciplina</th>
                  {periodosRecup.map(p => (
                    <th key={p.id} className="px-2 py-2.5 text-center font-semibold whitespace-nowrap" title={p.nome}>{p.numero}º</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/60">
                {discsRecup.map(d => {
                  const nd = notas[d.id] || {}
                  return (
                    <tr key={d.id}>
                      <td className="px-3 py-2 sticky left-0 z-10 bg-white dark:bg-slate-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold" title={d.nome}>
                            {d.abreviacao?.slice(0, 3) || d.nome.slice(0, 3)}
                          </span>
                          <span className="font-medium text-gray-800 dark:text-gray-100 truncate hidden sm:inline">{d.nome}</span>
                        </div>
                      </td>
                      {periodosRecup.map(p => {
                        const n = nd[p.numero]
                        const temR = n && n.nota_recuperacao !== null && n.nota_recuperacao !== undefined && n.nota_recuperacao !== ''
                        if (!temR) return <td key={p.id} className="px-2 py-2 text-center text-gray-300 dark:text-gray-600">—</td>
                        const r = parseFloat(String(n.nota_recuperacao))
                        const recuperou = !isNaN(r) && r >= 6
                        return (
                          <td key={p.id} className="px-2 py-2 text-center whitespace-nowrap">
                            <span className={`block font-bold tabular-nums ${recuperou ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{fmtNota(n.nota_recuperacao)}</span>
                            <span className="block text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">de {fmtNota(n.nota_final)}</span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-slate-700/60 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-emerald-600 dark:text-emerald-400">≥6 recuperado</span>
            <span className="text-red-500">&lt;6 não recuperado</span>
            <span>“de X” = nota original do período</span>
          </div>
        </div>
      )}
    </>
  )
}
