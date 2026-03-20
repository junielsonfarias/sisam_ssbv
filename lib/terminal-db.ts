/**
 * IndexedDB para Terminal Facial PWA
 *
 * Armazena embeddings e fila de presenças offline no dispositivo.
 * Funciona sem internet — sincroniza quando reconectar.
 */

const DB_NAME = 'sisam-terminal'
const DB_VERSION = 1

const STORES = {
  CONFIG: 'config',           // Configuração do terminal (escola, turma, chave)
  EMBEDDINGS: 'embeddings',   // Embeddings faciais dos alunos
  PRESENCAS: 'presencas',     // Fila de presenças pendentes de sync
  SYNC_LOG: 'sync_log',       // Log de sincronizações
}

// ============================================================================
// ABRIR BANCO
// ============================================================================

// Cache da conexão — reutiliza a mesma instância
let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Config: chave-valor
      if (!db.objectStoreNames.contains(STORES.CONFIG)) {
        db.createObjectStore(STORES.CONFIG)
      }

      // Embeddings: indexado por aluno_id
      if (!db.objectStoreNames.contains(STORES.EMBEDDINGS)) {
        const store = db.createObjectStore(STORES.EMBEDDINGS, { keyPath: 'aluno_id' })
        store.createIndex('escola_id', 'escola_id', { unique: false })
      }

      // Presenças pendentes: auto-increment
      if (!db.objectStoreNames.contains(STORES.PRESENCAS)) {
        const store = db.createObjectStore(STORES.PRESENCAS, { keyPath: 'id', autoIncrement: true })
        store.createIndex('sync_status', 'sync_status', { unique: false })
      }

      // Sync log
      if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
        db.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id', autoIncrement: true })
      }
    }

    req.onsuccess = () => {
      dbInstance = req.result
      dbInstance.onclose = () => { dbInstance = null }
      resolve(dbInstance)
    }
    req.onerror = () => reject(req.error)
  })
}

// ============================================================================
// CONFIG
// ============================================================================

export interface TerminalConfig {
  escola_id: string
  escola_nome: string
  turma_id?: string
  turma_nome?: string
  confianca_minima: number
  cooldown_segundos: number
  server_url: string
  api_token: string // JWT ou API key
  ultima_sync_embeddings?: string
}

export async function salvarConfig(config: TerminalConfig): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.CONFIG, 'readwrite')
  tx.objectStore(STORES.CONFIG).put(config, 'terminal_config')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function obterConfig(): Promise<TerminalConfig | null> {
  const db = await openDB()
  const tx = db.transaction(STORES.CONFIG, 'readonly')
  const req = tx.objectStore(STORES.CONFIG).get('terminal_config')
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

// ============================================================================
// EMBEDDINGS
// ============================================================================

export interface EmbeddingLocal {
  aluno_id: string
  nome: string
  codigo: string | null
  escola_id: string
  turma_id: string | null
  turma_codigo: string | null
  serie: string | null
  embedding_base64: string
  atualizado_em: string
}

export async function salvarEmbeddings(embeddings: EmbeddingLocal[]): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORES.EMBEDDINGS, 'readwrite')
  const store = tx.objectStore(STORES.EMBEDDINGS)

  // Limpar embeddings antigos e inserir novos
  store.clear()
  for (const emb of embeddings) {
    store.put(emb)
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(embeddings.length)
    tx.onerror = () => reject(tx.error)
  })
}

export async function obterEmbeddings(escolaId?: string): Promise<EmbeddingLocal[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.EMBEDDINGS, 'readonly')
  const store = tx.objectStore(STORES.EMBEDDINGS)

  return new Promise((resolve, reject) => {
    if (escolaId) {
      const index = store.index('escola_id')
      const req = index.getAll(escolaId)
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    } else {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    }
  })
}

export async function contarEmbeddings(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORES.EMBEDDINGS, 'readonly')
  const req = tx.objectStore(STORES.EMBEDDINGS).count()
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ============================================================================
// PRESENÇAS (Fila offline)
// ============================================================================

export interface PresencaLocal {
  id?: number
  aluno_id: string
  nome: string
  timestamp: string // ISO
  confianca: number
  sync_status: 'pendente' | 'enviado' | 'erro'
  tentativas: number
  criado_em: string
}

export async function registrarPresenca(presenca: Omit<PresencaLocal, 'id' | 'sync_status' | 'tentativas' | 'criado_em'>): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORES.PRESENCAS, 'readwrite')
  const req = tx.objectStore(STORES.PRESENCAS).add({
    ...presenca,
    sync_status: 'pendente',
    tentativas: 0,
    criado_em: new Date().toISOString(),
  })
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export async function obterPresencasPendentes(): Promise<PresencaLocal[]> {
  const db = await openDB()
  const tx = db.transaction(STORES.PRESENCAS, 'readonly')
  const index = tx.objectStore(STORES.PRESENCAS).index('sync_status')
  const req = index.getAll('pendente')
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function marcarPresencasEnviadas(ids: number[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.PRESENCAS, 'readwrite')
  const store = tx.objectStore(STORES.PRESENCAS)

  for (const id of ids) {
    const req = store.get(id)
    req.onsuccess = () => {
      const record = req.result
      if (record) {
        record.sync_status = 'enviado'
        store.put(record)
      }
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function limparPresencasEnviadas(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORES.PRESENCAS, 'readwrite')
  const store = tx.objectStore(STORES.PRESENCAS)
  const index = store.index('sync_status')
  const req = index.getAll('enviado')

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const records = req.result || []
      for (const r of records) {
        store.delete(r.id)
      }
      tx.oncomplete = () => resolve(records.length)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function contarPresencasPendentes(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORES.PRESENCAS, 'readonly')
  const index = tx.objectStore(STORES.PRESENCAS).index('sync_status')
  const req = index.count('pendente')
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ============================================================================
// SINCRONIZAÇÃO
// ============================================================================

export async function sincronizarPresencas(apiUrl: string, _token: string): Promise<{ enviados: number; erros: number }> {
  const pendentes = await obterPresencasPendentes()
  if (pendentes.length === 0) return { enviados: 0, erros: 0 }

  let enviados = 0
  let erros = 0
  const idsEnviados: number[] = []

  // Enviar cada presença individualmente via endpoint JWT
  for (const p of pendentes) {
    try {
      const res = await fetch(`${apiUrl}/api/admin/facial/presenca-terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aluno_id: p.aluno_id,
          timestamp: p.timestamp,
          confianca: p.confianca,
        }),
      })

      if (res.ok) {
        enviados++
        if (p.id) idsEnviados.push(p.id)
      } else {
        erros++
      }
    } catch {
      erros++
    }
  }

  // Marcar enviados
  if (idsEnviados.length > 0) {
    await marcarPresencasEnviadas(idsEnviados)
  }

  // Log de sync
  try {
    const db = await openDB()
    const tx = db.transaction(STORES.SYNC_LOG, 'readwrite')
    tx.objectStore(STORES.SYNC_LOG).add({
      tipo: 'presencas',
      total: pendentes.length,
      enviados,
      erros,
      timestamp: new Date().toISOString(),
    })
  } catch { /* Log opcional */ }

  return { enviados, erros }
}

export async function baixarEmbeddings(
  apiUrl: string,
  _token: string, // Mantido por compatibilidade — auth via cookie httpOnly
  escolaId: string,
  turmaId?: string
): Promise<number> {
  const params = new URLSearchParams({ escola_id: escolaId })
  if (turmaId) params.set('turma_id', turmaId)

  // Cookie httpOnly já foi definido pelo login — browser envia automaticamente
  const url = apiUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const res = await fetch(`${url}/api/admin/facial/embeddings?${params}`, {
    credentials: 'include',
  })

  if (!res.ok) throw new Error('Erro ao baixar embeddings')

  const data = await res.json()
  const embeddings: EmbeddingLocal[] = (data.alunos || [])
    .filter((a: any) => a.embedding_base64)
    .map((a: any) => ({
      aluno_id: a.aluno_id,
      nome: a.nome || a.aluno_nome,
      codigo: a.codigo,
      escola_id: escolaId,
      turma_id: a.turma_id,
      turma_codigo: a.turma_codigo || null,
      serie: a.serie,
      embedding_base64: a.embedding_base64,
      atualizado_em: new Date().toISOString(),
    }))

  return await salvarEmbeddings(embeddings)
}
