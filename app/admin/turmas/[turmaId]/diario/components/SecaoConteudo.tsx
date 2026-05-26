'use client'

import { Calendar, FileText } from 'lucide-react'
import type { ConteudoLinha, Periodo } from './types'
import { formatarData } from './formatters'

interface Props {
  conteudo: ConteudoLinha[]
  periodo: Periodo | null
}

export default function SecaoConteudo({ conteudo, periodo }: Props) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Conteúdo do diário {periodo ? `— ${periodo.nome}` : '(todos os períodos)'}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{conteudo.length} aulas</span>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-slate-700">
        {conteudo.map(c => (
          <li key={c.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-slate-700/30">
            <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded">
                <Calendar className="w-3 h-3" />
                {formatarData(c.data_aula)}
              </span>
              {c.disciplina_nome && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded">
                  {c.disciplina_nome}
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-400">por <strong className="font-medium">{c.professor_nome}</strong></span>
            </div>
            {c.conteudo && (
              <div className="mb-2">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Conteúdo</div>
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{c.conteudo}</p>
              </div>
            )}
            {c.metodologia && (
              <div className="mb-2">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Metodologia</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.metodologia}</p>
              </div>
            )}
            {c.observacoes && (
              <div>
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Observações</div>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.observacoes}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
