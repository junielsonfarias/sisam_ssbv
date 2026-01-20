'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

type TamanhoIcone = 'sm' | 'md'

interface PaginationControlsProps {
  paginaAtual: number
  totalPaginas: number
  total?: number
  itensPorPagina?: number
  temProxima: boolean
  temAnterior: boolean
  onProxima: () => void
  onAnterior: () => void
  mostrarContagem?: boolean
  tamanhoIcone?: TamanhoIcone
  className?: string
}

const tamanhoClasses: Record<TamanhoIcone, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5'
}

/**
 * Componente reutilizavel para controles de paginacao
 * Usado em tabelas e listas para navegar entre paginas
 */
export default function PaginationControls({
  paginaAtual,
  totalPaginas,
  total,
  itensPorPagina = 50,
  temProxima,
  temAnterior,
  onProxima,
  onAnterior,
  mostrarContagem = false,
  tamanhoIcone = 'md',
  className = ''
}: PaginationControlsProps) {
  if (totalPaginas <= 1) return null

  const iconSize = tamanhoClasses[tamanhoIcone]

  // Calcular intervalo de itens sendo exibidos
  const inicio = ((paginaAtual - 1) * itensPorPagina) + 1
  const fim = total ? Math.min(paginaAtual * itensPorPagina, total) : paginaAtual * itensPorPagina

  return (
    <div className={`px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between ${className}`}>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {mostrarContagem && total ? (
          <>Mostrando {inicio} - {fim} de {total}</>
        ) : (
          <>Pagina {paginaAtual} de {totalPaginas}</>
        )}
      </div>
      <div className="flex items-center gap-2">
        {mostrarContagem && (
          <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
            Pagina {paginaAtual} de {totalPaginas}
          </span>
        )}
        <button
          onClick={onAnterior}
          disabled={!temAnterior}
          className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
          title="Pagina anterior"
        >
          <ChevronLeft className={iconSize} />
        </button>
        <button
          onClick={onProxima}
          disabled={!temProxima}
          className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
          title="Proxima pagina"
        >
          <ChevronRight className={iconSize} />
        </button>
      </div>
    </div>
  )
}
