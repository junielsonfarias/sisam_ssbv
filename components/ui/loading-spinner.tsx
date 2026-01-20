'use client'

interface LoadingSpinnerProps {
  /** Tamanho do spinner */
  size?: 'sm' | 'md' | 'lg'
  /** Texto a ser exibido abaixo do spinner */
  text?: string
  /** Classes CSS adicionais para o container */
  className?: string
  /** Se true, centraliza o spinner com padding */
  centered?: boolean
}

/**
 * Componente de loading spinner reutilizável
 *
 * @example
 * // Spinner simples em botão
 * <LoadingSpinner size="sm" />
 *
 * @example
 * // Spinner centralizado com texto
 * <LoadingSpinner size="lg" text="Carregando dados..." centered />
 */
export function LoadingSpinner({
  size = 'lg',
  text,
  className = '',
  centered = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2 border-white border-t-transparent',
    md: 'h-8 w-8 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent',
    lg: 'h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400',
  }

  const spinner = (
    <div className={`animate-spin rounded-full mx-auto ${sizeClasses[size]}`} />
  )

  if (!centered && !text) {
    return spinner
  }

  return (
    <div className={`${centered ? 'text-center py-12' : ''} ${className}`}>
      {spinner}
      {text && (
        <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm sm:text-base">
          {text}
        </p>
      )}
    </div>
  )
}

/**
 * Componente de spinner para uso em botões
 * Inclui texto opcional ao lado
 */
export function ButtonSpinner({ text }: { text?: string }) {
  return (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      {text && <span className="ml-2">{text}</span>}
    </>
  )
}
