'use client'

import { BookMarked, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { INPUT_CLS, Titulo, TIPOS_OBRA } from './types'

interface Props {
  titulos: Titulo[]
  busca: string
  carregando: boolean
  onChangeBusca: (b: string) => void
}

export function AbaTitulos({ titulos, busca, carregando, onChangeBusca }: Props) {
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => onChangeBusca(e.target.value)}
            placeholder="Buscar título, autor, ISBN, código PNLD..."
            className={`${INPUT_CLS} w-full pl-9`}
          />
        </div>
      </div>
      {carregando ? (
        <LoadingSpinner centered />
      ) : titulos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum título no catálogo</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/30">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Título</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Tipo</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Autor</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Cód PNLD</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">Ano escolar</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-300">PNLD</th>
                </tr>
              </thead>
              <tbody>
                {titulos.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="py-2 px-4 font-semibold text-gray-800 dark:text-gray-200">{t.titulo}</td>
                    <td className="py-2 px-4 text-xs text-gray-500">
                      {TIPOS_OBRA.find((x) => x.v === t.tipo_obra)?.label || t.tipo_obra}
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-500">{t.autor || '—'}</td>
                    <td className="py-2 px-4 font-mono text-xs text-teal-600">{t.codigo_pnld || '—'}</td>
                    <td className="py-2 px-4 text-right text-xs text-gray-500">{t.ano_escolar ? `${t.ano_escolar}º` : '—'}</td>
                    <td className="py-2 px-4 text-right font-mono text-xs text-gray-500">{t.ano_pnld}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
