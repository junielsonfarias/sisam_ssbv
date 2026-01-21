'use client'

import { X } from 'lucide-react'
import { ReactNode } from 'react'

interface ModalBaseProps {
  /** Se o modal está visível */
  aberto: boolean
  /** Função para fechar o modal */
  onFechar: () => void
  /** Título do modal */
  titulo: string
  /** Conteúdo do modal */
  children: ReactNode
  /** Largura máxima do modal (default: sm:max-w-lg) */
  largura?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const larguraClasses = {
  sm: 'max-w-[calc(100vw-2rem)] sm:max-w-sm',
  md: 'max-w-[calc(100vw-2rem)] sm:max-w-md',
  lg: 'max-w-[calc(100vw-2rem)] sm:max-w-lg',
  xl: 'max-w-[calc(100vw-2rem)] sm:max-w-xl',
  '2xl': 'max-w-[calc(100vw-2rem)] sm:max-w-2xl',
}

/**
 * Componente base para modais
 *
 * @example
 * <ModalBase
 *   aberto={mostrarModal}
 *   onFechar={fecharModal}
 *   titulo={isEdicao ? 'Editar Polo' : 'Novo Polo'}
 * >
 *   <form>...</form>
 * </ModalBase>
 */
export function ModalBase({
  aberto,
  onFechar,
  titulo,
  children,
  largura = 'lg',
}: ModalBaseProps) {
  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onFechar}
        />

        {/* Modal */}
        <div
          className={`inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-4 sm:my-8 sm:align-middle w-full ${larguraClasses[largura]}`}
        >
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {titulo}
              </h3>
              <button
                onClick={onFechar}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ModalFooterProps {
  /** Função para fechar o modal */
  onFechar: () => void
  /** Função para salvar */
  onSalvar: () => void
  /** Se está salvando */
  salvando?: boolean
  /** Se o botão de salvar deve estar desabilitado */
  desabilitado?: boolean
  /** Texto do botão de cancelar */
  textoCancelar?: string
  /** Texto do botão de salvar */
  textoSalvar?: string
  /** Texto do botão de salvar quando está salvando */
  textoSalvando?: string
}

/**
 * Footer padrão para modais com botões Cancelar e Salvar
 */
export function ModalFooter({
  onFechar,
  onSalvar,
  salvando = false,
  desabilitado = false,
  textoCancelar = 'Cancelar',
  textoSalvar = 'Salvar',
  textoSalvando = 'Salvando...',
}: ModalFooterProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
      <button
        type="button"
        onClick={onFechar}
        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm sm:text-base"
      >
        {textoCancelar}
      </button>
      <button
        type="button"
        onClick={onSalvar}
        disabled={salvando || desabilitado}
        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
      >
        {salvando ? textoSalvando : textoSalvar}
      </button>
    </div>
  )
}
