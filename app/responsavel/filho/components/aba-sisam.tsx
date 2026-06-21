'use client'

import { Landmark } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from './shared'
import { fmtNota } from './helpers'

interface AbaSisamProps {
  carregandoSisam: boolean
  sisamResultados: any[]
}

export function AbaSisam({ carregandoSisam, sisamResultados }: AbaSisamProps) {
  if (carregandoSisam) {
    return <div className="py-10"><LoadingSpinner centered /></div>
  }
  return (
    <>
      <div className="bg-rose-50 dark:bg-rose-900/15 rounded-2xl border border-rose-100 dark:border-rose-800 p-3.5 flex items-start gap-2.5">
        <Landmark className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
          Resultados da <strong>Avaliação Municipal (SISAM)</strong> — desempenho por área de conhecimento e nível de aprendizagem.
        </p>
      </div>
      {sisamResultados.length === 0 ? (
        <EmptyState Icon={Landmark} texto="Nenhum resultado de avaliação municipal disponível." />
      ) : (
        sisamResultados.map((r, idx) => {
          const areas = [
            { sigla: 'LP', nome: 'Língua Portuguesa', nota: r.nota_lp },
            { sigla: 'MAT', nome: 'Matemática', nota: r.nota_mat },
            { sigla: 'CH', nome: 'Ciências Humanas', nota: r.nota_ch },
            { sigla: 'CN', nome: 'Ciências da Natureza', nota: r.nota_cn },
            { sigla: 'PROD', nome: 'Produção textual', nota: r.nota_producao },
          ].filter(a => a.nota !== null && a.nota !== undefined)
          return (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 dark:border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{r.avaliacao_nome || 'Avaliação Municipal'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{r.ano_letivo}{r.serie ? ` · ${r.serie}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.presenca === 'F' && <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Ausente</span>}
                  {r.media_aluno !== null && r.media_aluno !== undefined && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Média</p>
                      <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 leading-none">{fmtNota(r.media_aluno)}</p>
                    </div>
                  )}
                </div>
              </div>
              {areas.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-gray-50 dark:divide-slate-700/60">
                  {areas.map(a => (
                    <div key={a.sigla} className="p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400" title={a.nome}>{a.sigla}</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100 tabular-nums">{fmtNota(a.nota)}</p>
                    </div>
                  ))}
                </div>
              )}
              {r.nivel_aprendizagem && (
                <div className="px-4 py-2.5 border-t border-gray-50 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Nível de aprendizagem:</span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">{r.nivel_aprendizagem}</span>
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}
