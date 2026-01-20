'use client'

import { Search, Award, AlertCircle, RefreshCw, type LucideIcon } from 'lucide-react'

type EstadoTipo = 'carregando' | 'vazio' | 'nao-pesquisado' | 'erro'

interface EmptyStateProps {
  tipo: EstadoTipo
  icone?: LucideIcon
  titulo: string
  mensagem?: string
  acao?: {
    label: string
    onClick: () => void
  }
  className?: string
  compacto?: boolean
}

// Icones padrao por tipo
const iconesPadrao: Record<EstadoTipo, LucideIcon> = {
  carregando: RefreshCw,
  vazio: Award,
  'nao-pesquisado': Search,
  erro: AlertCircle
}

// Cores por tipo
const coresPorTipo: Record<EstadoTipo, string> = {
  carregando: 'text-indigo-400 dark:text-indigo-500',
  vazio: 'text-gray-300 dark:text-gray-600',
  'nao-pesquisado': 'text-indigo-300 dark:text-indigo-600',
  erro: 'text-red-400 dark:text-red-500'
}

/**
 * Componente reutilizavel para estados vazios, carregamento e erros
 * Usado em tabelas, listas e paineis para feedback visual
 */
export default function EmptyState({
  tipo,
  icone,
  titulo,
  mensagem,
  acao,
  className = '',
  compacto = false
}: EmptyStateProps) {
  const Icone = icone || iconesPadrao[tipo]
  const corIcone = coresPorTipo[tipo]
  const isCarregando = tipo === 'carregando'

  const tamanhoIcone = compacto ? 'w-10 h-10' : 'w-12 h-12'
  const paddingVertical = compacto ? 'py-8' : 'py-12'
  const tamanhoTitulo = compacto ? 'text-sm' : 'text-base'
  const tamanhoMensagem = compacto ? 'text-xs' : 'text-sm'

  return (
    <div className={`text-center ${paddingVertical} ${className}`}>
      <Icone
        className={`${tamanhoIcone} mx-auto ${corIcone} mb-3 ${isCarregando ? 'animate-spin' : ''}`}
      />
      <p className={`${tamanhoTitulo} font-medium text-gray-600 dark:text-gray-300`}>
        {titulo}
      </p>
      {mensagem && (
        <p className={`${tamanhoMensagem} mt-1 text-gray-500 dark:text-gray-400`}>
          {mensagem}
        </p>
      )}
      {acao && (
        <button
          onClick={acao.onClick}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          {acao.label}
        </button>
      )}
    </div>
  )
}

/**
 * Versao para uso em celulas de tabela (com colspan)
 */
interface TableEmptyStateProps extends Omit<EmptyStateProps, 'className'> {
  colSpan: number
}

export function TableEmptyState({ colSpan, ...props }: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4">
        <EmptyState {...props} compacto />
      </td>
    </tr>
  )
}
