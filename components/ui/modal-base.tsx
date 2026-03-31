'use client'

import { X } from 'lucide-react'
import { ReactNode, useEffect, useRef, useCallback } from 'react'

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
 * Componente base para modais com acessibilidade (WCAG 2.1 AA):
 * - Focus trap (Tab não sai do modal)
 * - Focus restoration (volta para o elemento que abriu)
 * - Escape para fechar
 * - aria-modal, role="dialog", aria-labelledby
 */
export function ModalBase({
  aberto,
  onFechar,
  titulo,
  children,
  largura = 'lg',
}: ModalBaseProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Salvar foco anterior e focar no modal ao abrir
  useEffect(() => {
    if (aberto) {
      previousFocusRef.current = document.activeElement as HTMLElement
      // Focar no primeiro elemento focável do modal após render
      requestAnimationFrame(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      })
    } else if (previousFocusRef.current) {
      // Restaurar foco ao fechar
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [aberto])

  // Focus trap + Escape para fechar
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onFechar()
      return
    }

    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onFechar])

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onFechar}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={modalRef}
          className={`inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left shadow-xl transform transition-all my-4 sm:my-8 sm:align-middle w-full max-h-[85vh] overflow-hidden flex flex-col ${larguraClasses[largura]}`}
        >
          {/* Header — fixed at top */}
          <div className="bg-white dark:bg-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 id="modal-titulo" className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {titulo}
              </h3>
              <button
                onClick={onFechar}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                aria-label="Fechar modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content — scrollable */}
          <div className="px-4 sm:px-6 pb-3 sm:pb-4 overflow-y-auto flex-1">
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
        aria-busy={salvando}
        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
      >
        {salvando ? textoSalvando : textoSalvar}
      </button>
    </div>
  )
}
