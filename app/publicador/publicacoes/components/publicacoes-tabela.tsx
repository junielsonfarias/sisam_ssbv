'use client'

import { Pencil, Trash2, FileText, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { BADGE_COLORS, formatDate } from './constants'
import type { Publicacao } from './constants'

interface PublicacoesTabelaProps {
  publicacoes: Publicacao[]
  carregando: boolean
  pagina: number
  totalPaginas: number
  total: number
  onEditar: (pub: Publicacao) => void
  onExcluir: (id: string) => void
  onPagina: (atualizar: (p: number) => number) => void
}

export function PublicacoesTabela({
  publicacoes, carregando, pagina, totalPaginas, total, onEditar, onExcluir, onPagina,
}: PublicacoesTabelaProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {carregando ? (
        <div className="p-12 text-center text-slate-400">Carregando...</div>
      ) : publicacoes.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma publicação encontrada</p>
          <p className="text-slate-400 text-sm mt-1">Clique em &quot;Nova Publicação&quot; para começar</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">N&ordm;</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Título</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Órgão</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Data</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {publicacoes.map((pub) => (
                <tr key={pub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE_COLORS[pub.tipo] || 'bg-slate-100 text-slate-700'}`}>
                      {pub.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{pub.numero || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                    {pub.titulo}
                    {pub.url_arquivo && (
                      <a href={pub.url_arquivo} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex text-indigo-500 hover:text-indigo-700">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{pub.orgao}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(pub.data_publicacao)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEditar(pub)}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onExcluir(pub.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-500">
            Página {pagina} de {totalPaginas} ({total} registro(s))
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPagina(p => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
