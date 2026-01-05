'use client'

import { useEffect, useState, useCallback } from 'react'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Database } from 'lucide-react'
import {
  isOnline,
  hasOfflineData,
  syncOfflineData,
  getSyncDate,
  getSyncStatus,
  clearAllOfflineData,
  getPolos,
  getEscolas,
  getResultados
} from '@/lib/offline-storage'

interface OfflineSyncManagerProps {
  userId: string | null
  autoSync?: boolean
  showStatus?: boolean
}

export function OfflineSyncManager({ userId, autoSync = true, showStatus = true }: OfflineSyncManagerProps) {
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [dataCount, setDataCount] = useState(0)
  const [initialSyncDone, setInitialSyncDone] = useState(false)

  // Verificar status online e dados offline
  useEffect(() => {
    if (typeof window === 'undefined') return

    setOnline(navigator.onLine)
    const hasOffline = hasOfflineData()
    setHasData(hasOffline)
    setDataCount(getResultados().length)

    console.log('[OfflineSyncManager] Inicializado:', {
      online: navigator.onLine,
      hasData: hasOffline,
      resultados: getResultados().length
    })

    const handleOnline = () => {
      console.log('[OfflineSyncManager] Voltou online')
      setOnline(true)
    }
    const handleOffline = () => {
      console.log('[OfflineSyncManager] Ficou offline')
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Atualizar contagem quando dados mudam
  useEffect(() => {
    const checkData = () => {
      const count = getResultados().length
      setDataCount(count)
      setHasData(count > 0 || getPolos().length > 0)
    }
    checkData()
    // Verificar periodicamente
    const interval = setInterval(checkData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Sincronização automática após login
  useEffect(() => {
    if (!userId || !autoSync || !online) return

    // Verificar se já tem dados sincronizados
    const existingData = getResultados().length
    if (existingData > 0 && initialSyncDone) {
      console.log('[OfflineSyncManager] Dados já sincronizados:', existingData)
      return
    }

    const doInitialSync = async () => {
      console.log('[OfflineSyncManager] Iniciando sincronização automática...')
      setSyncing(true)
      setSyncMessage('Sincronizando dados para uso offline...')

      const result = await syncOfflineData()

      console.log('[OfflineSyncManager] Resultado da sincronização:', result)

      if (result.success) {
        setSyncMessage('Dados sincronizados!')
        setHasData(true)
        setDataCount(getResultados().length)
      } else {
        setSyncMessage(`Erro: ${result.message}`)
      }

      setSyncing(false)
      setInitialSyncDone(true)

      // Limpar mensagem após 5 segundos
      setTimeout(() => setSyncMessage(null), 5000)
    }

    // Pequeno delay para garantir que o componente está montado
    const timer = setTimeout(doInitialSync, 1000)
    return () => clearTimeout(timer)
  }, [userId, autoSync, online])

  const handleManualSync = useCallback(async () => {
    if (!online || syncing) return

    console.log('[OfflineSyncManager] Sincronização manual iniciada')
    setSyncing(true)
    setSyncMessage('Sincronizando...')

    const result = await syncOfflineData()

    console.log('[OfflineSyncManager] Resultado da sincronização manual:', result)

    if (result.success) {
      setSyncMessage('Sincronizado!')
      setHasData(true)
      setDataCount(getResultados().length)
    } else {
      setSyncMessage(`Erro: ${result.message}`)
    }

    setSyncing(false)
    setTimeout(() => setSyncMessage(null), 5000)
  }, [online, syncing])

  if (!showStatus) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Status de conexão */}
      {online ? (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <Cloud className="w-4 h-4" />
          <span className="hidden sm:inline">Online</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
          <CloudOff className="w-4 h-4" />
          <span className="hidden sm:inline">Offline</span>
        </span>
      )}

      {/* Status de sincronização */}
      {syncing && (
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">Sincronizando...</span>
        </span>
      )}

      {/* Mensagem de progresso */}
      {syncMessage && !syncing && (
        <span className={`flex items-center gap-1 ${
          syncMessage.includes('Erro') ? 'text-red-600' : 'text-green-600'
        }`}>
          {syncMessage.includes('Erro') ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span className="hidden sm:inline text-xs">{syncMessage}</span>
        </span>
      )}

      {/* Botão de sincronização manual */}
      {online && !syncing && (
        <button
          onClick={handleManualSync}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Sincronizar dados para uso offline"
        >
          <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Indicador de dados offline disponíveis */}
      {hasData && (
        <span
          className="flex items-center gap-1 text-gray-500"
          title={`${dataCount} resultados disponíveis offline`}
        >
          <Database className="w-4 h-4" />
          <span className="hidden md:inline text-xs">{dataCount}</span>
        </span>
      )}

      {/* Aviso quando offline sem dados */}
      {!online && !hasData && (
        <span className="text-xs text-red-500">
          Sem dados offline
        </span>
      )}
    </div>
  )
}

// Componente para exibir o status de sincronização em um card
export function SyncStatusCard({ userId }: { userId: string | null }) {
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncDate, setSyncDate] = useState<Date | null>(null)
  const [dataCount, setDataCount] = useState({ polos: 0, escolas: 0, resultados: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setOnline(navigator.onLine)
    setSyncDate(getSyncDate())
    setDataCount({
      polos: getPolos().length,
      escolas: getEscolas().length,
      resultados: getResultados().length
    })

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleSync = async () => {
    if (syncing || !online) return

    setSyncing(true)
    setError(null)

    const result = await syncOfflineData()

    if (result.success) {
      setSyncDate(getSyncDate())
      setDataCount({
        polos: getPolos().length,
        escolas: getEscolas().length,
        resultados: getResultados().length
      })
    } else {
      setError(result.message)
    }

    setSyncing(false)
  }

  const handleClear = () => {
    clearAllOfflineData()
    setSyncDate(null)
    setDataCount({ polos: 0, escolas: 0, resultados: 0 })
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
          {online ? (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <Cloud className="w-4 h-4" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-orange-600 text-sm">
              <CloudOff className="w-4 h-4" />
              Offline
            </span>
          )}
        </div>

        {/* Última sincronização */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Ultima sincronizacao:</span>
          <span className="text-sm text-gray-900 dark:text-white">
            {syncDate ? syncDate.toLocaleString('pt-BR') : 'Nunca'}
          </span>
        </div>

        {/* Dados sincronizados */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Polos: {dataCount.polos}</p>
          <p>Escolas: {dataCount.escolas}</p>
          <p>Resultados: {dataCount.resultados}</p>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSync}
            disabled={!online || syncing}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>

          <button
            onClick={handleClear}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  )
}
