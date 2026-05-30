import { AlertTriangle, Copy, Check } from 'lucide-react'
import { ModalBase } from '@/components/ui/modal-base'
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
    <ModalBase aberto onFechar={onClose} titulo="QR Code de Configuracao" largura="lg">
      <div className="space-y-4">
        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : qrCodeData ? (
          <>
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Atencao!</p>
                <p className="mt-1">{qrCodeData.aviso}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Dispositivo:</strong> {qrCodeData.dispositivo.nome}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Escola:</strong> {qrCodeData.dispositivo.escola_nome}
              </p>
            </div>

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

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Instrucoes:</strong> Copie os dados acima e configure no dispositivo de reconhecimento facial.
                O dispositivo usara esses dados para se conectar ao SISAM automaticamente.
              </p>
            </div>
          </>
        ) : null}
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
