/**
 * Fila de sincronização offline
 * Armazena operações pendentes em localStorage para envio posterior
 */

const QUEUE_KEY = 'educatec_sync_queue'

export interface SyncItem {
  id: string
  tipo: 'frequencia' | 'nota' | 'diario'
  endpoint: string
  method: 'POST' | 'PUT'
  body: Record<string, unknown>
  criadoEm: string
  tentativas: number
}

function gerarId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function lerFila(): SyncItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function salvarFila(fila: SyncItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(fila))
  } catch {
    // localStorage cheio — remover itens antigos
    const reduzida = fila.slice(-50)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(reduzida))
  }
}

/**
 * Adiciona um item na fila de sincronização
 */
export function adicionarNaFila(item: Omit<SyncItem, 'id' | 'criadoEm' | 'tentativas'>): void {
  const fila = lerFila()
  fila.push({
    ...item,
    id: gerarId(),
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  })
  salvarFila(fila)
}

/**
 * Retorna todos os itens da fila
 */
export function obterFila(): SyncItem[] {
  return lerFila()
}

/**
 * Remove um item da fila pelo id
 */
export function removerDaFila(id: string): void {
  const fila = lerFila().filter(item => item.id !== id)
  salvarFila(fila)
}

/**
 * Limpa toda a fila
 */
export function limparFila(): void {
  localStorage.removeItem(QUEUE_KEY)
}

/**
 * Retorna o total de itens pendentes
 */
export function totalPendentes(): number {
  return lerFila().length
}

/**
 * Total de itens com falha (tentativas >= 3)
 */
export function totalFalhas(): number {
  return lerFila().filter(item => item.tentativas >= 3).length
}

/**
 * Processa a fila — tenta enviar cada item pendente
 * Remove itens com sucesso, incrementa tentativas em falhas
 * Itens com >= 3 tentativas são marcados como falha permanente
 */
export async function processarFila(): Promise<{ sucesso: number; falhas: number }> {
  const fila = lerFila()
  if (fila.length === 0) return { sucesso: 0, falhas: 0 }

  let sucesso = 0
  let falhas = 0
  const novaFila: SyncItem[] = []

  for (const item of fila) {
    // Pular itens com muitas tentativas
    if (item.tentativas >= 3) {
      novaFila.push(item)
      falhas++
      continue
    }

    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      })

      if (res.ok) {
        sucesso++
        // Item removido (não vai para novaFila)
      } else {
        // Falha no servidor — incrementar tentativas
        novaFila.push({ ...item, tentativas: item.tentativas + 1 })
        falhas++
      }
    } catch {
      // Erro de rede — incrementar tentativas
      novaFila.push({ ...item, tentativas: item.tentativas + 1 })
      falhas++
    }
  }

  salvarFila(novaFila)
  return { sucesso, falhas }
}
