'use client'

import { Library } from 'lucide-react'
import { ItemAcervo } from './types'

interface Props {
  acervo: ItemAcervo[]
  onEmprestar: (itemId: string) => void
  onReservar: (itemId: string) => void
}

export function ListaAcervo({ acervo, onEmprestar, onReservar }: Props) {
  if (acervo.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <Library className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum item no acervo</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/30">
            <tr>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Título</th>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Autor</th>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">ISBN</th>
              <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Localização</th>
              <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Disp/Total</th>
              <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ação</th>
            </tr>
          </thead>
          <tbody>
            {acervo.map((i) => (
              <tr key={i.id} className="border-b border-gray-100 dark:border-slate-700/50">
                <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{i.titulo}</td>
                <td className="py-2 px-4 text-gray-500 text-xs">{i.autor || '—'}</td>
                <td className="py-2 px-4 text-gray-500 text-xs font-mono">{i.isbn || '—'}</td>
                <td className="py-2 px-4 text-gray-500 text-xs">
                  {[i.estante, i.prateleira].filter(Boolean).join(' / ') || '—'}
                </td>
                <td className="py-2 px-4 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    i.qtd_disponivel > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {i.qtd_disponivel}/{i.qtd_total}
                  </span>
                </td>
                <td className="py-2 px-4 text-right">
                  {i.qtd_disponivel > 0 ? (
                    <button
                      onClick={() => onEmprestar(i.id)}
                      className="px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-200"
                    >
                      Emprestar
                    </button>
                  ) : (
                    <button
                      onClick={() => onReservar(i.id)}
                      className="px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-200"
                    >
                      Reservar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
