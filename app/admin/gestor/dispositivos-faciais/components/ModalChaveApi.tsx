import { AlertTriangle, Copy, Check } from 'lucide-react'
import { ModalBase } from '@/components/ui/modal-base'

interface ModalChaveApiProps {
  apiKey: string
  copiado: boolean
  onCopiar: () => void
  onClose: () => void
}

export function ModalChaveApi({
  apiKey,
  copiado,
  onCopiar,
  onClose,
}: ModalChaveApiProps) {
  // Footer custom: 1 botao "Fechar" sem onSalvar. Nao usa ModalFooter
  // (que e desenhado para o par Cancelar/Salvar).
  return (
    <ModalBase aberto onFechar={onClose} titulo="Chave API do Dispositivo" largura="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Esta chave sera exibida apenas uma vez. Copie e armazene-a em um local seguro.
            Ela sera necessaria para autenticar o dispositivo.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Chave API
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={apiKey}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-sm"
            />
            <button
              onClick={onCopiar}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Fechar
        </button>
      </div>
    </ModalBase>
  )
}
