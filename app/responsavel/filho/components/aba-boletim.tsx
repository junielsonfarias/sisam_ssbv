'use client'

import { BookOpen } from 'lucide-react'
import { EmptyState } from './shared'
import { corNota, badgeNota } from './helpers'
import type { Disciplina, Periodo } from './helpers'

interface AbaBoletimProps {
  disciplinas: Disciplina[]
  periodos: Periodo[]
  notas: Record<string, Record<string, any>>
  medias: Record<string, number | null>
  mediaAprovacao: number
}

export function AbaBoletim({ disciplinas, periodos, notas, medias, mediaAprovacao }: AbaBoletimProps) {
  if (disciplinas.length === 0) {
    return <EmptyState Icon={BookOpen} texto="Nenhuma nota lançada ainda" />
  }
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/40 text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <th className="text-left px-3 py-2.5 font-semibold sticky left-0 bg-gray-50 dark:bg-slate-700/40 z-10">Disciplina</th>
              {periodos.map(p => (
                <th key={p.id} className="px-1.5 py-2.5 text-center font-semibold w-11">{p.numero}º</th>
              ))}
              <th className="px-3 py-2.5 text-center font-semibold">Média</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-700/60">
            {disciplinas.map(d => {
              const notasDisc = notas[d.id] || {}
              const media = medias[d.id] ?? null
              const abaixo = media !== null && media < mediaAprovacao
              const bgRow = abaixo ? 'bg-red-50/60 dark:bg-red-900/10' : 'bg-white dark:bg-slate-800'
              return (
                <tr key={d.id} className={abaixo ? 'bg-red-50/60 dark:bg-red-900/10' : ''}>
                  <td className={`px-3 py-2 sticky left-0 z-10 ${bgRow}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold" title={d.nome}>
                        {d.abreviacao?.slice(0, 3) || d.nome.slice(0, 3)}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-100 truncate hidden sm:inline">{d.nome}</span>
                    </div>
                  </td>
                  {periodos.map(p => {
                    const nota = notasDisc[p.numero]
                    const valor = nota ? parseFloat(nota.nota_final) : null
                    return (
                      <td key={p.id} className="px-1.5 py-2 text-center whitespace-nowrap">
                        <span className={`font-bold ${corNota(valor)}`}>{valor !== null ? valor.toFixed(1) : '—'}</span>
                        {nota?.nota_recuperacao && <sup className="text-[9px] text-amber-500 ml-0.5">R</sup>}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-sm font-bold ${badgeNota(media)}`}>{media !== null ? media.toFixed(1) : '—'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-slate-700/60 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Média p/ aprovação: <strong>{mediaAprovacao.toFixed(1).replace('.', ',')}</strong></span>
        <span className="text-emerald-600 dark:text-emerald-400">≥{mediaAprovacao.toFixed(0)} aprovado</span>
        <span className="text-red-500">abaixo = atenção</span>
        <span><sup className="text-amber-500">R</sup> = recuperação</span>
      </div>
    </div>
  )
}
