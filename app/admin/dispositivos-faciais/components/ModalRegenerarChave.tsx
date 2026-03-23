import { X, AlertTriangle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Dispositivo } from './types'

interface ModalRegenerarChaveProps {
  dispositivo: Dispositivo
  salvando: boolean
  onConfirmar: () => void
  onClose: () => void
}

export function ModalRegenerarChave({
  dispositivo,
  salvando,
  onConfirmar,
  onClose,
}: ModalRegenerarChaveProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Regenerar Chave API
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">Atencao!</p>
              <p className="mt-1">
                Ao regenerar a chave do dispositivo <strong>{dispositivo.nome}</strong>,
                a chave anterior sera invalidada e o dispositivo perdera acesso ate que a nova
                chave seja configurada.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={salvando}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {salvando && <LoadingSpinner />}
            Regenerar Chave
          </button>
        </div>
      </div>
    </div>
  )
}
