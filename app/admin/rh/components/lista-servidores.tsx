'use client'

import { Briefcase, Eye } from 'lucide-react'
import { FORMACAO_LABEL, ServidorRow, VINCULO_BADGE, VINCULO_LABEL } from './types'

interface Props {
  servidores: ServidorRow[]
  onAbrirDetalhe: (id: string) => void
}

export function ListaServidores({ servidores, onAbrirDetalhe }: Props) {
  if (servidores.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum servidor encontrado com os filtros atuais</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/30">
            <tr>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Matrícula</th>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Nome</th>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Vínculo</th>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Cargo</th>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Formação</th>
              <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servidores.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className="py-3 px-4 font-mono text-xs text-gray-500">{s.matricula_funcional || '—'}</td>
                <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">{s.nome}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${VINCULO_BADGE[s.tipo_vinculo] || 'bg-slate-100 text-slate-700'}`}>
                    {VINCULO_LABEL(s.tipo_vinculo)}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{s.cargo || '—'}</td>
                <td className="py-3 px-4 text-xs text-gray-500">{FORMACAO_LABEL(s.formacao_maxima)}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onAbrirDetalhe(s.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-200 ml-auto"
                    aria-label={`Ver detalhes de ${s.nome}`}
                  >
                    <Eye className="w-3 h-3" /> Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
        {servidores.map((s) => (
          <div key={s.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{s.nome}</p>
                {s.matricula_funcional && <p className="text-xs text-gray-500 font-mono">#{s.matricula_funcional}</p>}
              </div>
              <button
                onClick={() => onAbrirDetalhe(s.id)}
                className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700"
                aria-label={`Ver detalhes de ${s.nome}`}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-bold ${VINCULO_BADGE[s.tipo_vinculo] || 'bg-slate-100'}`}>
                {VINCULO_LABEL(s.tipo_vinculo)}
              </span>
              {s.cargo && <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">{s.cargo}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
