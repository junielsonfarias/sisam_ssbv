import { X, AlertTriangle, Copy, Check } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { QrCodeData } from './types'

interface ModalQrCodeProps {
  qrCodeData: QrCodeData | null
  carregando: boolean
  copiado: boolean
  onCopiar: () => void
  onClose: () => void
}

export function ModalQrCode({
  qrCodeData,
  carregando,
  copiado,
  onCopiar,
  onClose,
}: ModalQrCodeProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            QR Code de Configuracao
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : qrCodeData ? (
            <>
              {/* Warning */}
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Atencao!</p>
                  <p className="mt-1">{qrCodeData.aviso}</p>
                </div>
              </div>

              {/* Device info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Dispositivo:</strong> {qrCodeData.dispositivo.nome}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Escola:</strong> {qrCodeData.dispositivo.escola_nome}
                </p>
              </div>

              {/* QR Data display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dados de Configuracao (JSON)
                  </label>
                  <button
                    onClick={onCopiar}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <pre className="p-3 bg-gray-900 dark:bg-gray-950 text-green-400 rounded-lg text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                  {(() => { try { return JSON.stringify(JSON.parse(qrCodeData.qr_data), null, 2) } catch { return qrCodeData.qr_data || '{}' } })()}
                </pre>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Instrucoes:</strong> Copie os dados acima e configure no dispositivo de reconhecimento facial.
                  O dispositivo usara esses dados para se conectar ao SISAM automaticamente.
                </p>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
