import { X, ShieldAlert } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Dispositivo } from './types'

interface ModalBloquearProps {
  dispositivo: Dispositivo
  salvando: boolean
  onConfirmar: () => void
  onClose: () => void
}

export function ModalBloquear({
  dispositivo,
  salvando,
  onConfirmar,
  onClose,
}: ModalBloquearProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bloquear Dispositivo
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium">Tem certeza que deseja bloquear este dispositivo?</p>
              <p className="mt-1">
                O dispositivo <strong>{dispositivo.nome}</strong> sera bloqueado
                e perdera acesso ao sistema imediatamente. Sua chave API sera invalidada.
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {salvando && <LoadingSpinner />}
            Bloquear
          </button>
        </div>
      </div>
    </div>
  )
}
