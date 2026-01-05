'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineDB, STORES, isOnline, isIndexedDBAvailable } from '@/lib/offline-db';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
  syncedStores: string[];
}

interface UseOfflineSyncReturn {
  status: SyncStatus;
  syncAll: () => Promise<void>;
  syncStore: (storeName: string) => Promise<void>;
  getOfflineData: <T>(storeName: string) => Promise<T[]>;
  getOfflineDataByIndex: <T>(storeName: string, indexName: string, value: string | number) => Promise<T[]>;
  clearOfflineData: () => Promise<void>;
  isDataAvailableOffline: (storeName: string) => Promise<boolean>;
}

export function useOfflineSync(userId: string | null): UseOfflineSyncReturn {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    error: null,
    syncedStores: []
  });

  // Atualizar status online/offline
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      // Auto-sync quando voltar online
      if (userId) {
        syncAll();
      }
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    // Set initial status
    setStatus(prev => ({ ...prev, isOnline: navigator.onLine }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  // Sincronizar uma store específica
  const syncStore = useCallback(async (storeName: string) => {
    if (!userId || !isOnline() || !isIndexedDBAvailable()) return;

    try {
      // Mapear store para endpoint de API
      const endpointMap: Record<string, string> = {
        [STORES.RESULTADOS]: '/api/offline/resultados',
        [STORES.ESCOLAS]: '/api/offline/escolas',
        [STORES.POLOS]: '/api/offline/polos',
        [STORES.TURMAS]: '/api/offline/turmas',
        [STORES.ALUNOS]: '/api/offline/alunos'
      };

      const endpoint = endpointMap[storeName];
      if (!endpoint) return;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Erro ao sincronizar ${storeName}`);
      }

      const data = await response.json();

      // Salvar dados no IndexedDB
      if (Array.isArray(data)) {
        await offlineDB.saveData(storeName, data);
      } else if (data.dados && Array.isArray(data.dados)) {
        await offlineDB.saveData(storeName, data.dados);
      }

      // Atualizar metadados de sync
      await offlineDB.updateSyncMeta(storeName, userId);

      setStatus(prev => ({
        ...prev,
        syncedStores: [...new Set([...prev.syncedStores, storeName])]
      }));
    } catch (error: any) {
      console.error(`Erro ao sincronizar ${storeName}:`, error);
      setStatus(prev => ({
        ...prev,
        error: `Erro ao sincronizar ${storeName}: ${error.message}`
      }));
    }
  }, [userId]);

  // Sincronizar todos os dados
  const syncAll = useCallback(async () => {
    if (!userId || !isOnline() || !isIndexedDBAvailable()) {
      return;
    }

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Sincronizar todas as stores em paralelo
      await Promise.all([
        syncStore(STORES.POLOS),
        syncStore(STORES.ESCOLAS),
        syncStore(STORES.TURMAS),
        syncStore(STORES.ALUNOS),
        syncStore(STORES.RESULTADOS)
      ]);

      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null
      }));
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message
      }));
    }
  }, [userId, syncStore]);

  // Obter dados offline
  const getOfflineData = useCallback(async <T>(storeName: string): Promise<T[]> => {
    if (!isIndexedDBAvailable()) return [];

    try {
      return await offlineDB.getData<T>(storeName);
    } catch (error) {
      console.error(`Erro ao obter dados offline de ${storeName}:`, error);
      return [];
    }
  }, []);

  // Obter dados offline por índice
  const getOfflineDataByIndex = useCallback(async <T>(
    storeName: string,
    indexName: string,
    value: string | number
  ): Promise<T[]> => {
    if (!isIndexedDBAvailable()) return [];

    try {
      return await offlineDB.getByIndex<T>(storeName, indexName, value);
    } catch (error) {
      console.error(`Erro ao obter dados offline de ${storeName} por ${indexName}:`, error);
      return [];
    }
  }, []);

  // Limpar dados offline
  const clearOfflineData = useCallback(async () => {
    if (!isIndexedDBAvailable()) return;

    try {
      await offlineDB.clearAll();
      setStatus(prev => ({
        ...prev,
        syncedStores: [],
        lastSync: null
      }));
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
    }
  }, []);

  // Verificar se há dados disponíveis offline
  const isDataAvailableOffline = useCallback(async (storeName: string): Promise<boolean> => {
    if (!isIndexedDBAvailable()) return false;

    try {
      const count = await offlineDB.count(storeName);
      return count > 0;
    } catch (error) {
      return false;
    }
  }, []);

  return {
    status,
    syncAll,
    syncStore,
    getOfflineData,
    getOfflineDataByIndex,
    clearOfflineData,
    isDataAvailableOffline
  };
}

export { STORES };
