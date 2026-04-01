/**
 * IndexedDB para o Portal do Professor (PWA Offline)
 * Armazena turmas, alunos, disciplinas, períodos e filas de lançamentos pendentes.
 * Funções offline avançadas (notas avulsas e diário) em professor-db-offline.ts.
 */

// Re-exportar funções e tipos do módulo offline
export type { NotaPendente, DiarioRegistro } from './professor-db-offline'
export {
  saveNotasPendentes,
  getNotasPendentesAvulsas,
  clearNotasPendentesAvulsas,
  syncNotasPendentes,
  saveDiarioPendente,
  getDiarioPendente,
  clearDiarioPendente,
  syncDiarioPendente,
} from './professor-db-offline'

const DB_NAME = 'educatec-professor'
const DB_VERSION = 2 // v2: adiciona NOTAS_PENDENTES_QUEUE e DIARIO_QUEUE

const STORES = {
  TURMAS: 'turmas',
  ALUNOS: 'alunos',
  DISCIPLINAS: 'disciplinas',
  PERIODOS: 'periodos',
  CONFIG_NOTAS: 'config_notas',
  FREQUENCIA_QUEUE: 'frequencia_queue',
  NOTAS_QUEUE: 'notas_queue',
  NOTAS_PENDENTES_QUEUE: 'notas_pendentes_queue',
  DIARIO_QUEUE: 'diario_queue',
  SYNC_META: 'sync_meta',
}

let dbCache: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbCache) return Promise.resolve(dbCache)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORES.TURMAS)) {
        db.createObjectStore(STORES.TURMAS, { keyPath: 'turma_id' })
      }
      if (!db.objectStoreNames.contains(STORES.ALUNOS)) {
        const store = db.createObjectStore(STORES.ALUNOS, { keyPath: 'id' })
        store.createIndex('turma_id', 'turma_id', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.DISCIPLINAS)) {
        const store = db.createObjectStore(STORES.DISCIPLINAS, { keyPath: 'id' })
        store.createIndex('turma_id', 'turma_id', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.PERIODOS)) {
        db.createObjectStore(STORES.PERIODOS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.CONFIG_NOTAS)) {
        db.createObjectStore(STORES.CONFIG_NOTAS, { keyPath: 'escola_id' })
      }
      if (!db.objectStoreNames.contains(STORES.FREQUENCIA_QUEUE)) {
        db.createObjectStore(STORES.FREQUENCIA_QUEUE, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(STORES.NOTAS_QUEUE)) {
        db.createObjectStore(STORES.NOTAS_QUEUE, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(STORES.NOTAS_PENDENTES_QUEUE)) {
        const store = db.createObjectStore(STORES.NOTAS_PENDENTES_QUEUE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('aluno_id', 'aluno_id', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.DIARIO_QUEUE)) {
        const store = db.createObjectStore(STORES.DIARIO_QUEUE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('turma_id', 'turma_id', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => {
      dbCache = request.result
      resolve(dbCache)
    }
    request.onerror = () => reject(request.error)
  })
}

// ===== Turmas =====
export async function salvarTurmas(turmas: any[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.TURMAS, 'readwrite')
  const store = tx.objectStore(STORES.TURMAS)
  store.clear()
  for (const t of turmas) store.put(t)
}

export async function obterTurmas(): Promise<any[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TURMAS, 'readonly')
    const request = tx.objectStore(STORES.TURMAS).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ===== Alunos =====
export async function salvarAlunos(turmaId: string, alunos: any[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.ALUNOS, 'readwrite')
  const store = tx.objectStore(STORES.ALUNOS)
  // Limpar alunos desta turma
  const index = store.index('turma_id')
  const existentes = await new Promise<any[]>((resolve, reject) => {
    const req = index.getAll(turmaId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const a of existentes) store.delete(a.id)
  // Inserir novos
  for (const a of alunos) store.put({ ...a, turma_id: turmaId })
}

export async function obterAlunos(turmaId: string): Promise<any[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ALUNOS, 'readonly')
    const index = tx.objectStore(STORES.ALUNOS).index('turma_id')
    const request = index.getAll(turmaId)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ===== Períodos =====
export async function salvarPeriodos(periodos: any[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.PERIODOS, 'readwrite')
  const store = tx.objectStore(STORES.PERIODOS)
  store.clear()
  for (const p of periodos) store.put(p)
}

export async function obterPeriodos(): Promise<any[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PERIODOS, 'readonly')
    const request = tx.objectStore(STORES.PERIODOS).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ===== Filas de pendentes =====
export async function enfileirarFrequencia(dados: any): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORES.FREQUENCIA_QUEUE, 'readwrite')
    tx.objectStore(STORES.FREQUENCIA_QUEUE).add({ ...dados, timestamp: Date.now() })
    return true
  } catch (error: unknown) {
    console.error('[ProfessorDB] Erro ao enfileirar frequência:', error)
    if ((error as Error).name === 'QuotaExceededError') {
      // Limpar pendentes antigos para liberar espaço
      await limparPendentesAntigos()
      try {
        const db = await openDB()
        const tx = db.transaction(STORES.FREQUENCIA_QUEUE, 'readwrite')
        tx.objectStore(STORES.FREQUENCIA_QUEUE).add({ ...dados, timestamp: Date.now() })
        return true
      } catch { return false }
    }
    return false
  }
}

export async function obterFrequenciasPendentes(): Promise<any[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FREQUENCIA_QUEUE, 'readonly')
    const request = tx.objectStore(STORES.FREQUENCIA_QUEUE).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function limparFrequenciasPendentes(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.FREQUENCIA_QUEUE, 'readwrite')
  tx.objectStore(STORES.FREQUENCIA_QUEUE).clear()
}

export async function enfileirarNotas(dados: any): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORES.NOTAS_QUEUE, 'readwrite')
    tx.objectStore(STORES.NOTAS_QUEUE).add({ ...dados, timestamp: Date.now() })
    return true
  } catch (error: unknown) {
    console.error('[ProfessorDB] Erro ao enfileirar notas:', error)
    if ((error as Error).name === 'QuotaExceededError') {
      await limparPendentesAntigos()
      try {
        const db = await openDB()
        const tx = db.transaction(STORES.NOTAS_QUEUE, 'readwrite')
        tx.objectStore(STORES.NOTAS_QUEUE).add({ ...dados, timestamp: Date.now() })
        return true
      } catch { return false }
    }
    return false
  }
}

export async function obterNotasPendentes(): Promise<any[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTAS_QUEUE, 'readonly')
    const request = tx.objectStore(STORES.NOTAS_QUEUE).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function limparNotasPendentes(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.NOTAS_QUEUE, 'readwrite')
  tx.objectStore(STORES.NOTAS_QUEUE).clear()
}

// ===== Sync Meta =====
export async function salvarSyncDate(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.SYNC_META, 'readwrite')
  tx.objectStore(STORES.SYNC_META).put({ key: 'last_sync', value: new Date().toISOString() })
}

export async function obterSyncDate(): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_META, 'readonly')
    const request = tx.objectStore(STORES.SYNC_META).get('last_sync')
    request.onsuccess = () => resolve(request.result?.value || null)
    request.onerror = () => reject(request.error)
  })
}

// ===== Limpeza =====

/**
 * Remove turmas e alunos órfãos que não fazem mais parte dos vínculos do professor.
 * Chamado após o sync para manter o IndexedDB limpo.
 */
export async function limparDadosOrfaos(turmaIdsValidos: string[]): Promise<{ turmasRemovidas: number; alunosRemovidos: number }> {
  const db = await openDB()
  let turmasRemovidas = 0
  let alunosRemovidos = 0

  // Limpar turmas que não estão mais vinculadas
  const turmasExistentes = await obterTurmas()
  const tx1 = db.transaction(STORES.TURMAS, 'readwrite')
  for (const turma of turmasExistentes) {
    if (!turmaIdsValidos.includes(turma.turma_id)) {
      tx1.objectStore(STORES.TURMAS).delete(turma.turma_id)
      turmasRemovidas++
    }
  }

  // Limpar alunos de turmas removidas
  const tx2 = db.transaction(STORES.ALUNOS, 'readwrite')
  const store2 = tx2.objectStore(STORES.ALUNOS)
  const todosAlunos = await new Promise<any[]>((resolve, reject) => {
    const req = store2.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const aluno of todosAlunos) {
    if (!turmaIdsValidos.includes(aluno.turma_id)) {
      store2.delete(aluno.id)
      alunosRemovidos++
    }
  }

  // Limpar disciplinas de turmas removidas
  const tx3 = db.transaction(STORES.DISCIPLINAS, 'readwrite')
  const store3 = tx3.objectStore(STORES.DISCIPLINAS)
  const todasDiscs = await new Promise<any[]>((resolve, reject) => {
    const req = store3.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const disc of todasDiscs) {
    if (disc.turma_id && !turmaIdsValidos.includes(disc.turma_id)) {
      store3.delete(disc.id)
    }
  }

  return { turmasRemovidas, alunosRemovidos }
}

/**
 * Remove registros pendentes antigos (mais de 7 dias) para evitar acúmulo
 */
export async function limparPendentesAntigos(): Promise<number> {
  const db = await openDB()
  const limite = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 dias
  let removidos = 0

  // Limpar frequências antigas
  const tx1 = db.transaction(STORES.FREQUENCIA_QUEUE, 'readwrite')
  const store1 = tx1.objectStore(STORES.FREQUENCIA_QUEUE)
  const freqs = await new Promise<any[]>((resolve, reject) => {
    const req = store1.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const f of freqs) {
    if (f.timestamp && f.timestamp < limite) {
      store1.delete(f.id)
      removidos++
    }
  }

  // Limpar notas antigas
  const tx2 = db.transaction(STORES.NOTAS_QUEUE, 'readwrite')
  const store2 = tx2.objectStore(STORES.NOTAS_QUEUE)
  const notas = await new Promise<any[]>((resolve, reject) => {
    const req = store2.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const n of notas) {
    if (n.timestamp && n.timestamp < limite) {
      store2.delete(n.id)
      removidos++
    }
  }

  // Limpar notas pendentes avulsas antigas
  const tx3 = db.transaction(STORES.NOTAS_PENDENTES_QUEUE, 'readwrite')
  const store3 = tx3.objectStore(STORES.NOTAS_PENDENTES_QUEUE)
  const notasAvulsas = await new Promise<any[]>((resolve, reject) => {
    const req = store3.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const n of notasAvulsas) {
    if (n.timestamp && n.timestamp < limite) {
      store3.delete(n.id)
      removidos++
    }
  }

  // Limpar diários pendentes antigos
  const tx4 = db.transaction(STORES.DIARIO_QUEUE, 'readwrite')
  const store4 = tx4.objectStore(STORES.DIARIO_QUEUE)
  const diarios = await new Promise<any[]>((resolve, reject) => {
    const req = store4.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  for (const d of diarios) {
    if (d.timestamp && d.timestamp < limite) {
      store4.delete(d.id)
      removidos++
    }
  }

  return removidos
}

// ===== Contadores =====
export async function contarPendentes(): Promise<{ frequencias: number; notas: number; notas_avulsas: number; diarios: number }> {
  const db = await openDB()
  const contar = (store: string) => new Promise<number>((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const request = tx.objectStore(store).count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const [frequencias, notas, notas_avulsas, diarios] = await Promise.all([
    contar(STORES.FREQUENCIA_QUEUE),
    contar(STORES.NOTAS_QUEUE),
    contar(STORES.NOTAS_PENDENTES_QUEUE),
    contar(STORES.DIARIO_QUEUE),
  ])
  return { frequencias, notas, notas_avulsas, diarios }
}

