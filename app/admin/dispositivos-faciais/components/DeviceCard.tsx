import {
  Edit,
  Smartphone,
  MapPin,
  Clock,
  Key,
  Ban,
  QrCode,
  Trash2,
} from 'lucide-react'
import { Dispositivo, isOnline, tempoRelativo, getStatusBadge, getStatusLabel } from './types'

interface DeviceCardProps {
  dispositivo: Dispositivo
  onEditar: (d: Dispositivo) => void
  onQrCode: (d: Dispositivo) => void
  onRegenerarChave: (d: Dispositivo) => void
  onBloquear: (d: Dispositivo) => void
  onExcluir: (d: Dispositivo) => void
  onEstatisticas: (d: Dispositivo) => void
}

export function DeviceCard({
  dispositivo,
  onEditar,
  onQrCode,
  onRegenerarChave,
  onBloquear,
  onExcluir,
  onEstatisticas,
}: DeviceCardProps) {
  const online = isOnline(dispositivo.ultimo_ping) && dispositivo.status === 'ativo'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <button
            onClick={() => onEstatisticas(dispositivo)}
            className="flex items-center gap-2 group text-left"
          >
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                online
                  ? 'bg-green-500 animate-pulse'
                  : dispositivo.status === 'bloqueado'
                    ? 'bg-red-500'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <span className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {dispositivo.nome}
            </span>
          </button>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(dispositivo.status)}`}
          >
            {getStatusLabel(dispositivo.status)}
          </span>
        </div>

        {/* Info rows */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{dispositivo.escola_nome || '-'}</span>
          </div>

          {dispositivo.localizacao && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{dispositivo.localizacao}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Ultimo ping:{' '}
              <span className={online ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                {tempoRelativo(dispositivo.ultimo_ping)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer - Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditar(dispositivo)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => onQrCode(dispositivo)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Code
            </button>
            <button
              onClick={() => onRegenerarChave(dispositivo)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
              title="Regenerar Chave"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          </div>

          {dispositivo.status !== 'bloqueado' && (
            <button
              onClick={() => onBloquear(dispositivo)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Bloquear"
            >
              <Ban className="w-3.5 h-3.5" />
              Bloquear
            </button>
          )}
          {dispositivo.status === 'bloqueado' && (
            <button
              onClick={() => onExcluir(dispositivo)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Excluir permanentemente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
