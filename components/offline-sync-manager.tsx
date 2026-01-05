'use client'

import { useEffect, useState, useCallback } from 'react'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Database } from 'lucide-react'
import { useOfflineSync, STORES } from '@/hooks/useOfflineSync'

interface OfflineSyncManagerProps {
  userId: string | null
  autoSync?: boolean
  showStatus?: boolean
}

export function OfflineSyncManager({ userId, autoSync = true, showStatus = true }: OfflineSyncManagerProps) {
  const { status, syncAll, clearOfflineData } = useOfflineSync(userId)
  const [initialSyncDone, setInitialSyncDone] = useState(false)
  const [syncProgress, setSyncProgress] = useState<string | null>(null)

  // Sincronização automática após login
  useEffect(() => {
    if (!userId || !autoSync || initialSyncDone) return

    const doInitialSync = async () => {
      if (status.isOnline) {
        setSyncProgress('Iniciando sincronização...')
        try {
          await syncAll()
          setSyncProgress('Sincronização concluída!')
          setTimeout(() => setSyncProgress(null), 3000)
        } catch (error) {
          setSyncProgress('Erro na sincronização')
          setTimeout(() => setSyncProgress(null), 5000)
        }
        setInitialSyncDone(true)
      }
    }

    // Pequeno delay para garantir que o componente está montado
    const timer = setTimeout(doInitialSync, 1000)
    return () => clearTimeout(timer)
  }, [userId, autoSync, status.isOnline, initialSyncDone, syncAll])

  const handleManualSync = useCallback(async () => {
    if (!userId || status.isSyncing) return

    setSyncProgress('Sincronizando dados...')
    try {
      await syncAll()
      setSyncProgress('Dados sincronizados!')
      setTimeout(() => setSyncProgress(null), 3000)
    } catch (error) {
      setSyncProgress('Erro ao sincronizar')
      setTimeout(() => setSyncProgress(null), 5000)
    }
  }, [userId, status.isSyncing, syncAll])

  if (!showStatus) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Status de conexão */}
      {status.isOnline ? (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <Cloud className="w-4 h-4" />
          <span className="hidden sm:inline">Online</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
          <CloudOff className="w-4 h-4" />
          <span className="hidden sm:inline">Offline</span>
        </span>
      )}

      {/* Status de sincronização */}
      {status.isSyncing && (
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">Sincronizando...</span>
        </span>
      )}

      {/* Mensagem de progresso */}
      {syncProgress && !status.isSyncing && (
        <span className={`flex items-center gap-1 ${
          syncProgress.includes('Erro') ? 'text-red-600' : 'text-green-600'
        }`}>
          {syncProgress.includes('Erro') ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{syncProgress}</span>
        </span>
      )}

      {/* Botão de sincronização manual */}
      {status.isOnline && !status.isSyncing && (
        <button
          onClick={handleManualSync}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Sincronizar dados"
        >
          <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Indicador de dados offline disponíveis */}
      {status.syncedStores.length > 0 && (
        <span className="flex items-center gap-1 text-gray-500" title={`${status.syncedStores.length} tabelas sincronizadas`}>
          <Database className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{status.syncedStores.length}</span>
        </span>
      )}
    </div>
  )
}

// Componente para exibir o status de sincronização em um card
export function SyncStatusCard({ userId }: { userId: string | null }) {
  const { status, syncAll, clearOfflineData } = useOfflineSync(userId)
  const [clearing, setClearing] = useState(false)

  const handleClearData = async () => {
    if (clearing) return
    setClearing(true)
    try {
      await clearOfflineData()
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Database className="w-5 h-5" />
        Dados Offline
      </h3>

      <div className="space-y-3">
        {/* Status de conexão */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
          {status.isOnline ? (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <Cloud className="w-4 h-4" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-yellow-600 text-sm">
              <CloudOff className="w-4 h-4" />
              Offline
            </span>
          )}
        </div>

        {/* Última sincronização */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Ultima sincronizacao:</span>
          <span className="text-sm text-gray-900 dark:text-white">
            {status.lastSync
              ? status.lastSync.toLocaleString('pt-BR')
              : 'Nunca'}
          </span>
        </div>

        {/* Tabelas sincronizadas */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Tabelas sincronizadas:</span>
          <span className="text-sm text-gray-900 dark:text-white">
            {status.syncedStores.length} de 5
          </span>
        </div>

        {/* Erro */}
        {status.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
            <p className="text-sm text-red-700 dark:text-red-400">{status.error}</p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => syncAll()}
            disabled={!status.isOnline || status.isSyncing}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${status.isSyncing ? 'animate-spin' : ''}`} />
            {status.isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>

          <button
            onClick={handleClearData}
            disabled={clearing}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  )
}
