'use client'

import { Search } from 'lucide-react'

interface BarraBuscaPesquisarProps {
  placeholder?: string
  busca: string
  setBusca: (valor: string) => void
  onPesquisar: () => void
  carregando?: boolean
  textoBotao?: string
  textoBotaoCarregando?: string
}

/**
 * Barra de busca reutilizavel com input e botao de pesquisar
 * Suporta Enter para pesquisar e estado de carregamento
 */
export default function BarraBuscaPesquisar({
  placeholder = 'Buscar...',
  busca,
  setBusca,
  onPesquisar,
  carregando = false,
  textoBotao = 'Pesquisar',
  textoBotaoCarregando = 'Buscando...'
}: BarraBuscaPesquisarProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={placeholder}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onPesquisar()}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white dark:bg-slate-700"
          />
        </div>
        <button
          onClick={onPesquisar}
          disabled={carregando}
          className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg min-w-[100px] sm:min-w-[140px]"
        >
          {carregando ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span className="hidden sm:inline">{textoBotaoCarregando}</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>{textoBotao}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
