import { AlertTriangle, Trash2 } from 'lucide-react'
import { ConfiguracaoSerie } from '../types'

interface ConfirmarExclusaoModalProps {
  config: ConfiguracaoSerie
  excluindoSerie: string | null
  onConfirmar: (config: ConfiguracaoSerie) => void
  onCancelar: () => void
}

export default function ConfirmarExclusaoModal({
  config,
  excluindoSerie,
  onConfirmar,
  onCancelar,
}: ConfirmarExclusaoModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-60" onClick={onCancelar}></div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full relative z-10">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
              Excluir Série
            </h3>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir a série <strong>{config.nome_serie}</strong>?
              <br />
              <span className="text-sm text-red-500">Esta ação não pode ser desfeita.</span>
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onCancelar}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => onConfirmar(config)}
                disabled={excluindoSerie === config.id}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {excluindoSerie === config.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
