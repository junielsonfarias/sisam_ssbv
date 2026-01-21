'use client'

import { Search } from 'lucide-react'

interface EstadoBuscaInicialProps {
  titulo?: string
  mensagem?: string
  textoBotao?: string
}

/**
 * Componente para estado inicial antes de realizar uma pesquisa
 * Exibe mensagem orientando o usuario a clicar em Pesquisar
 */
export default function EstadoBuscaInicial({
  titulo = 'Pesquise os dados',
  mensagem,
  textoBotao = 'Pesquisar'
}: EstadoBuscaInicialProps) {
  const mensagemPadrao = `Clique no botão "${textoBotao}" para carregar os dados.`

  return (
    <div className="text-center py-16">
      <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
        <Search className="w-10 h-10 text-indigo-400" />
      </div>
      <p className="text-gray-700 dark:text-gray-200 font-semibold text-lg">{titulo}</p>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md mx-auto">
        {mensagem || mensagemPadrao}
      </p>
    </div>
  )
}
