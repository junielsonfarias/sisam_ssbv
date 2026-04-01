/**
 * Funções offline avançadas para o Portal do Professor (PWA)
 * Notas avulsas e diário de classe — salvar, recuperar, limpar e sincronizar.
 *
 * Usado por: components/professor/offline-sync.tsx
 * Depende de: lib/professor-db.ts (openDB, STORES)
 */

// ===== Interfaces =====

/** Nota pendente para sincronização offline */
export interface NotaPendente {
  aluno_id: string
  disciplina_id: string
  periodo_id: string
  nota: number
  tipo: 'avaliacao' | 'atividade'
  salvo_em: string // ISO date
}

/** Registro de diário de classe pendente para sincronização offline */
export interface DiarioRegistro {
  turma_id: string
  disciplina_id: string | null
  data_aula: string // YYYY-MM-DD
  conteudo: string
  metodologia: string | null
  observacoes: string | null
  salvo_em: string // ISO date
}

// ===== Constantes de stores (devem bater com professor-db.ts) =====

const STORES = {
  NOTAS_PENDENTES_QUEUE: 'notas_pendentes_queue',
  DIARIO_QUEUE: 'diario_queue',
}

// ===== Acesso ao DB (importado indiretamente via re-export) =====
// Reutilizamos a função openDB do professor-db.ts

const DB_NAME = 'educatec-professor'
const DB_VERSION = 2

let dbCache: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbCache) return Promise.resolve(dbCache)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = () => {
      dbCache = request.result
      resolve(dbCache)
    }
    request.onerror = () => reject(request.error)
  })
}

// ===== Notas Pendentes (offline) =====

/** Salva notas pendentes no IndexedDB para sincronização posterior */
export async function saveNotasPendentes(notas: NotaPendente[]): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORES.NOTAS_PENDENTES_QUEUE, 'readwrite')
    const store = tx.objectStore(STORES.NOTAS_PENDENTES_QUEUE)
    for (const nota of notas) {
      store.add({ ...nota, timestamp: Date.now() })
    }
    return true
  } catch (error: unknown) {
    console.error('[ProfessorDB] Erro ao salvar notas pendentes:', error)
    return false
  }
}

/** Retorna todas as notas pendentes armazenadas localmente */
export async function getNotasPendentesAvulsas(): Promise<NotaPendente[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.NOTAS_PENDENTES_QUEUE, 'readonly')
    const request = tx.objectStore(STORES.NOTAS_PENDENTES_QUEUE).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Limpa notas pendentes após sincronização bem-sucedida */
export async function clearNotasPendentesAvulsas(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.NOTAS_PENDENTES_QUEUE, 'readwrite')
  tx.objectStore(STORES.NOTAS_PENDENTES_QUEUE).clear()
}

/**
 * Envia notas pendentes para o servidor via POST /api/professor/sync.
 * Agrupa por disciplina+período para enviar no formato esperado pelo endpoint.
 */
export async function syncNotasPendentes(): Promise<{ ok: boolean; mensagem: string }> {
  const pendentes = await getNotasPendentesAvulsas()
  if (pendentes.length === 0) {
    return { ok: true, mensagem: 'Nenhuma nota pendente' }
  }

  try {
    const agrupadas: Record<string, { turma_id: string; disciplina_id: string; periodo_id: string; notas: any[] }> = {}
    for (const n of pendentes) {
      const chave = `${n.disciplina_id}:${n.periodo_id}`
      if (!agrupadas[chave]) {
        agrupadas[chave] = {
          turma_id: '',
          disciplina_id: n.disciplina_id,
          periodo_id: n.periodo_id,
          notas: [],
        }
      }
      agrupadas[chave].notas.push({ aluno_id: n.aluno_id, nota: n.nota })
    }

    const res = await fetch('/api/professor/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: Object.values(agrupadas) }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, mensagem: data.mensagem || 'Erro ao sincronizar notas' }

    await clearNotasPendentesAvulsas()
    return { ok: true, mensagem: data.mensagem || `${pendentes.length} nota(s) sincronizada(s)` }
  } catch (error: unknown) {
    return { ok: false, mensagem: (error as Error).message || 'Erro de rede ao sincronizar notas' }
  }
}

// ===== Diário de Classe (offline) =====

/** Salva registros de diário de classe para sincronização posterior */
export async function saveDiarioPendente(registros: DiarioRegistro[]): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORES.DIARIO_QUEUE, 'readwrite')
    const store = tx.objectStore(STORES.DIARIO_QUEUE)
    for (const reg of registros) {
      store.add({ ...reg, timestamp: Date.now() })
    }
    return true
  } catch (error: unknown) {
    console.error('[ProfessorDB] Erro ao salvar diário pendente:', error)
    return false
  }
}

/** Retorna todos os registros de diário pendentes armazenados localmente */
export async function getDiarioPendente(): Promise<DiarioRegistro[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DIARIO_QUEUE, 'readonly')
    const request = tx.objectStore(STORES.DIARIO_QUEUE).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Limpa registros de diário pendentes após sincronização bem-sucedida */
export async function clearDiarioPendente(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORES.DIARIO_QUEUE, 'readwrite')
  tx.objectStore(STORES.DIARIO_QUEUE).clear()
}

/**
 * Envia registros de diário pendentes para o servidor via POST /api/professor/diario.
 * Envia um por um pois o endpoint aceita um registro por vez.
 */
export async function syncDiarioPendente(): Promise<{ ok: boolean; mensagem: string }> {
  const pendentes = await getDiarioPendente()
  if (pendentes.length === 0) {
    return { ok: true, mensagem: 'Nenhum diário pendente' }
  }

  let salvos = 0
  const erros: string[] = []

  for (const reg of pendentes) {
    try {
      const res = await fetch('/api/professor/diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: reg.turma_id,
          disciplina_id: reg.disciplina_id,
          data_aula: reg.data_aula,
          conteudo: reg.conteudo,
          metodologia: reg.metodologia,
          observacoes: reg.observacoes,
        }),
      })
      if (res.ok) {
        salvos++
      } else {
        const data = await res.json().catch(() => ({}))
        erros.push(data.mensagem || `Erro ${res.status}`)
      }
    } catch (err: unknown) {
      erros.push((err as Error).message)
    }
  }

  await clearDiarioPendente()
  const mensagem = erros.length > 0
    ? `${salvos}/${pendentes.length} diário(s) sincronizado(s). Erros: ${erros.join(', ')}`
    : `${salvos} diário(s) sincronizado(s) com sucesso`
  return { ok: erros.length === 0, mensagem }
}
