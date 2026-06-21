'use client'

import { Edit2, Trash2, Printer } from 'lucide-react'
import { periodoBadge, statusBadge } from './types'
import type { Plano } from './types'

interface PlanosListaProps {
  planos: Plano[]
  onImprimir: (plano: Plano) => void
  onEditar: (plano: Plano) => void
  onExcluir: (id: string) => void
}

export function PlanosLista({ planos, onImprimir, onEditar, onExcluir }: PlanosListaProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {planos.map(p => (
        <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${periodoBadge[p.periodo]?.cls || 'bg-gray-100 text-gray-600'}`}>
                {periodoBadge[p.periodo]?.label || p.periodo}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[p.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                {statusBadge[p.status]?.label || p.status}
              </span>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onImprimir(p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Imprimir">
                <Printer className="h-4 w-4" />
              </button>
              <button onClick={() => onEditar(p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="Editar">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => onExcluir(p.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500" title="Excluir">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {p.disciplina_nome && (
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-1">{p.disciplina_nome}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {new Date(p.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
            {p.data_fim ? ` — ${new Date(p.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
          </p>
          <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Objetivo</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{p.objetivo}</p>
          {p.habilidades_bncc && p.habilidades_bncc.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {p.habilidades_bncc.slice(0, 5).map(codigo => (
                <code
                  key={codigo}
                  className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-mono"
                >
                  {codigo}
                </code>
              ))}
              {p.habilidades_bncc.length > 5 && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400 self-center">
                  +{p.habilidades_bncc.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
