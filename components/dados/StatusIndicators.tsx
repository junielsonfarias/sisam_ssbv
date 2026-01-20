'use client'

import { WifiOff, Zap } from 'lucide-react'

interface StatusIndicatorsProps {
  modoOffline: boolean
  usandoDadosOffline: boolean
  usandoCache: boolean
}

/**
 * Componente que exibe indicadores de status (offline/cache)
 */
export default function StatusIndicators({
  modoOffline,
  usandoDadosOffline,
  usandoCache
}: StatusIndicatorsProps) {
  return (
    <>
      {/* Indicador de modo offline */}
      {(usandoDadosOffline || modoOffline) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">Modo Offline</p>
            <p className="text-xs text-orange-600">
              Exibindo dados sincronizados. Conecte-se para atualizar.
            </p>
          </div>
        </div>
      )}

      {/* Indicador de cache ativo */}
      {usandoCache && !usandoDadosOffline && !modoOffline && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-2 flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-xs font-medium text-green-700 dark:text-green-300">
            Carregamento instantaneo (usando cache local)
          </p>
        </div>
      )}
    </>
  )
}
