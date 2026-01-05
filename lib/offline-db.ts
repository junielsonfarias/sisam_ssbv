// Sistema de armazenamento offline usando IndexedDB

const DB_NAME = 'sisam-offline-db';
const DB_VERSION = 1;

// Stores (tabelas) do IndexedDB
const STORES = {
  RESULTADOS: 'resultados',
  ESCOLAS: 'escolas',
  POLOS: 'polos',
  TURMAS: 'turmas',
  ALUNOS: 'alunos',
  SYNC_META: 'sync_meta',
  USER_DATA: 'user_data'
};

interface SyncMeta {
  store: string;
  lastSync: string;
  userId: string;
}

class OfflineDB {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB não disponível no servidor'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Criar stores se não existirem
        if (!db.objectStoreNames.contains(STORES.RESULTADOS)) {
          const resultadosStore = db.createObjectStore(STORES.RESULTADOS, { keyPath: 'id' });
          resultadosStore.createIndex('escola_id', 'escola_id', { unique: false });
          resultadosStore.createIndex('turma_id', 'turma_id', { unique: false });
          resultadosStore.createIndex('serie', 'serie', { unique: false });
          resultadosStore.createIndex('ano_letivo', 'ano_letivo', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.ESCOLAS)) {
          const escolasStore = db.createObjectStore(STORES.ESCOLAS, { keyPath: 'id' });
          escolasStore.createIndex('polo_id', 'polo_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.POLOS)) {
          db.createObjectStore(STORES.POLOS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.TURMAS)) {
          const turmasStore = db.createObjectStore(STORES.TURMAS, { keyPath: 'id' });
          turmasStore.createIndex('escola_id', 'escola_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.ALUNOS)) {
          const alunosStore = db.createObjectStore(STORES.ALUNOS, { keyPath: 'id' });
          alunosStore.createIndex('escola_id', 'escola_id', { unique: false });
          alunosStore.createIndex('turma_id', 'turma_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
          const syncStore = db.createObjectStore(STORES.SYNC_META, { keyPath: ['store', 'userId'] });
          syncStore.createIndex('lastSync', 'lastSync', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          db.createObjectStore(STORES.USER_DATA, { keyPath: 'id' });
        }
      };
    });

    return this.dbPromise;
  }

  // Salvar dados em uma store
  async saveData<T extends { id: string | number }>(storeName: string, data: T[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Limpar store antes de inserir novos dados
      store.clear();

      data.forEach(item => {
        store.put(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Adicionar ou atualizar um único item
  async putItem<T extends { id: string | number }>(storeName: string, item: T): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      store.put(item);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Obter todos os dados de uma store
  async getData<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  // Obter dados por índice
  async getByIndex<T>(storeName: string, indexName: string, value: string | number): Promise<T[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  // Obter um item por ID
  async getById<T>(storeName: string, id: string | number): Promise<T | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as T || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Atualizar metadados de sincronização
  async updateSyncMeta(storeName: string, userId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_META, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_META);

      store.put({
        store: storeName,
        userId,
        lastSync: new Date().toISOString()
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Obter metadados de sincronização
  async getSyncMeta(storeName: string, userId: string): Promise<SyncMeta | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_META, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_META);
      const request = store.get([storeName, userId]);

      request.onsuccess = () => resolve(request.result as SyncMeta || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Verificar se precisa sincronizar (última sync > 1 hora)
  async needsSync(storeName: string, userId: string): Promise<boolean> {
    const meta = await this.getSyncMeta(storeName, userId);

    if (!meta) return true;

    const lastSync = new Date(meta.lastSync);
    const now = new Date();
    const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    return diffHours > 1; // Sincronizar se passou mais de 1 hora
  }

  // Limpar todos os dados
  async clearAll(): Promise<void> {
    const db = await this.getDB();

    const stores = Object.values(STORES);

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
  }

  // Limpar dados de um usuário específico
  async clearUserData(userId: string): Promise<void> {
    // Limpar sync_meta do usuário
    const db = await this.getDB();
    const stores = Object.values(STORES).filter(s => s !== STORES.SYNC_META);

    // Limpar todas as stores de dados
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
  }

  // Contar itens em uma store
  async count(storeName: string): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineDB = new OfflineDB();

// Exportar nomes das stores para uso externo
export { STORES };

// Helper para verificar se está online
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

// Helper para verificar se IndexedDB está disponível
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'indexedDB' in window;
}
