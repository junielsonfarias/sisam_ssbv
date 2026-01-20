'use client'

interface LoadingSpinnerProps {
  mensagem?: string
}

/**
 * Componente de loading spinner reutilizavel
 */
export default function LoadingSpinner({ mensagem = 'Carregando dados...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 mx-auto"></div>
        <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg">{mensagem}</p>
      </div>
    </div>
  )
}
