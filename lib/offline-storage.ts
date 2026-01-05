// Sistema de armazenamento offline usando localStorage
// Mais simples e confiável que IndexedDB

const STORAGE_KEYS = {
  USER: 'sisam_offline_user',
  POLOS: 'sisam_offline_polos',
  ESCOLAS: 'sisam_offline_escolas',
  TURMAS: 'sisam_offline_turmas',
  RESULTADOS: 'sisam_offline_resultados',
  ALUNOS: 'sisam_offline_alunos',
  SYNC_DATE: 'sisam_offline_sync_date',
  SYNC_STATUS: 'sisam_offline_sync_status'
}

export interface OfflineUser {
  id: string
  nome: string
  email: string
  tipo_usuario: string
  polo_id?: number
  escola_id?: number
  polo_nome?: string
  escola_nome?: string
}

export interface OfflinePolo {
  id: number
  nome: string
}

export interface OfflineEscola {
  id: number
  nome: string
  polo_id: number
  polo_nome?: string
}

export interface OfflineTurma {
  id: number
  codigo: string
  escola_id: number
  serie: string
}

export interface OfflineResultado {
  id: number
  aluno_id: number
  aluno_nome: string
  escola_id: number
  escola_nome: string
  turma_id: number
  turma_codigo: string
  polo_id: number
  serie: string
  ano_letivo: string
  presenca: string
  nota_lp: number
  nota_mat: number
  nota_ch: number
  nota_cn: number
  media_aluno: number
}

// Verificar se está online
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

// Verificar se localStorage está disponível
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

// Salvar dados no localStorage com compressão básica
function saveToStorage(key: string, data: any): boolean {
  if (!isStorageAvailable()) return false
  try {
    const jsonData = JSON.stringify(data)
    localStorage.setItem(key, jsonData)
    console.log(`[OfflineStorage] Salvou ${key}: ${(jsonData.length / 1024).toFixed(2)}KB`)
    return true
  } catch (error: any) {
    console.error(`[OfflineStorage] Erro ao salvar ${key}:`, error)
    // Se exceder quota, tentar limpar dados antigos
    if (error.name === 'QuotaExceededError') {
      console.warn('[OfflineStorage] Quota excedida, limpando dados antigos...')
      clearOldData()
    }
    return false
  }
}

// Ler dados do localStorage
function readFromStorage<T>(key: string): T | null {
  if (!isStorageAvailable()) return null
  try {
    const data = localStorage.getItem(key)
    if (!data) return null
    return JSON.parse(data) as T
  } catch (error) {
    console.error(`[OfflineStorage] Erro ao ler ${key}:`, error)
    return null
  }
}

// Limpar dados antigos para liberar espaço
function clearOldData(): void {
  // Manter apenas dados essenciais
  const keysToKeep = [STORAGE_KEYS.USER, STORAGE_KEYS.SYNC_DATE]
  Object.values(STORAGE_KEYS).forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key)
    }
  })
}

// ========== FUNÇÕES DE USUÁRIO ==========

export function saveUser(user: OfflineUser): boolean {
  return saveToStorage(STORAGE_KEYS.USER, user)
}

export function getUser(): OfflineUser | null {
  return readFromStorage<OfflineUser>(STORAGE_KEYS.USER)
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEYS.USER)
}

// ========== FUNÇÕES DE POLOS ==========

export function savePolos(polos: OfflinePolo[]): boolean {
  return saveToStorage(STORAGE_KEYS.POLOS, polos)
}

export function getPolos(): OfflinePolo[] {
  return readFromStorage<OfflinePolo[]>(STORAGE_KEYS.POLOS) || []
}

// ========== FUNÇÕES DE ESCOLAS ==========

export function saveEscolas(escolas: OfflineEscola[]): boolean {
  return saveToStorage(STORAGE_KEYS.ESCOLAS, escolas)
}

export function getEscolas(): OfflineEscola[] {
  return readFromStorage<OfflineEscola[]>(STORAGE_KEYS.ESCOLAS) || []
}

// ========== FUNÇÕES DE TURMAS ==========

export function saveTurmas(turmas: OfflineTurma[]): boolean {
  return saveToStorage(STORAGE_KEYS.TURMAS, turmas)
}

export function getTurmas(): OfflineTurma[] {
  return readFromStorage<OfflineTurma[]>(STORAGE_KEYS.TURMAS) || []
}

// ========== FUNÇÕES DE RESULTADOS ==========

export function saveResultados(resultados: OfflineResultado[]): boolean {
  return saveToStorage(STORAGE_KEYS.RESULTADOS, resultados)
}

export function getResultados(): OfflineResultado[] {
  return readFromStorage<OfflineResultado[]>(STORAGE_KEYS.RESULTADOS) || []
}

// ========== FUNÇÕES DE SINCRONIZAÇÃO ==========

export function setSyncDate(): void {
  localStorage.setItem(STORAGE_KEYS.SYNC_DATE, new Date().toISOString())
}

export function getSyncDate(): Date | null {
  const date = localStorage.getItem(STORAGE_KEYS.SYNC_DATE)
  return date ? new Date(date) : null
}

export function setSyncStatus(status: 'syncing' | 'success' | 'error' | 'idle'): void {
  localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, status)
}

export function getSyncStatus(): string {
  return localStorage.getItem(STORAGE_KEYS.SYNC_STATUS) || 'idle'
}

// ========== VERIFICAR SE TEM DADOS OFFLINE ==========

export function hasOfflineData(): boolean {
  const resultados = getResultados()
  const polos = getPolos()
  const escolas = getEscolas()
  return resultados.length > 0 || polos.length > 0 || escolas.length > 0
}

// ========== LIMPAR TODOS OS DADOS OFFLINE ==========

export function clearAllOfflineData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
  console.log('[OfflineStorage] Todos os dados offline foram limpos')
}

// ========== SINCRONIZAR DADOS DO SERVIDOR ==========

export async function syncOfflineData(): Promise<{ success: boolean; message: string }> {
  if (!isOnline()) {
    return { success: false, message: 'Sem conexão com a internet' }
  }

  setSyncStatus('syncing')
  console.log('[OfflineStorage] Iniciando sincronização...')

  try {
    // Buscar todos os dados em paralelo
    const [polosRes, escolasRes, turmasRes, resultadosRes] = await Promise.all([
      fetch('/api/offline/polos'),
      fetch('/api/offline/escolas'),
      fetch('/api/offline/turmas'),
      fetch('/api/offline/resultados')
    ])

    // Verificar erros
    if (!polosRes.ok || !escolasRes.ok || !turmasRes.ok || !resultadosRes.ok) {
      throw new Error('Erro ao buscar dados do servidor')
    }

    // Parsear dados
    const [polos, escolas, turmas, resultados] = await Promise.all([
      polosRes.json(),
      escolasRes.json(),
      turmasRes.json(),
      resultadosRes.json()
    ])

    console.log('[OfflineStorage] Dados recebidos:', {
      polos: polos.length,
      escolas: escolas.length,
      turmas: turmas.length,
      resultados: resultados.length
    })

    // Salvar no localStorage
    const savedPolos = savePolos(polos)
    const savedEscolas = saveEscolas(escolas)
    const savedTurmas = saveTurmas(turmas)
    const savedResultados = saveResultados(resultados)

    if (savedPolos && savedEscolas && savedTurmas && savedResultados) {
      setSyncDate()
      setSyncStatus('success')
      console.log('[OfflineStorage] Sincronização concluída com sucesso!')
      return {
        success: true,
        message: `Sincronizado: ${polos.length} polos, ${escolas.length} escolas, ${turmas.length} turmas, ${resultados.length} resultados`
      }
    } else {
      setSyncStatus('error')
      return { success: false, message: 'Erro ao salvar dados no dispositivo' }
    }
  } catch (error: any) {
    console.error('[OfflineStorage] Erro na sincronização:', error)
    setSyncStatus('error')
    return { success: false, message: error.message || 'Erro desconhecido' }
  }
}

// ========== FILTRAR RESULTADOS ==========

export function filterResultados(filters: {
  polo_id?: string | number
  escola_id?: string | number
  turma_id?: string | number
  serie?: string
  ano_letivo?: string
  presenca?: string
}): OfflineResultado[] {
  let resultados = getResultados()
  const escolas = getEscolas()

  // Filtrar por polo
  if (filters.polo_id && filters.polo_id !== '' && filters.polo_id !== 'todos') {
    const poloId = Number(filters.polo_id)
    const escolasDoPolo = escolas.filter(e => e.polo_id === poloId).map(e => e.id)
    resultados = resultados.filter(r => escolasDoPolo.includes(r.escola_id))
  }

  // Filtrar por escola
  if (filters.escola_id && filters.escola_id !== '' && filters.escola_id !== 'todas') {
    const escolaId = Number(filters.escola_id)
    resultados = resultados.filter(r => r.escola_id === escolaId)
  }

  // Filtrar por turma
  if (filters.turma_id && filters.turma_id !== '' && filters.turma_id !== 'todas') {
    const turmaId = Number(filters.turma_id)
    resultados = resultados.filter(r => r.turma_id === turmaId)
  }

  // Filtrar por série
  if (filters.serie && filters.serie !== '' && filters.serie !== 'todas') {
    resultados = resultados.filter(r => r.serie === filters.serie)
  }

  // Filtrar por ano letivo
  if (filters.ano_letivo && filters.ano_letivo !== '' && filters.ano_letivo !== 'todos') {
    resultados = resultados.filter(r => r.ano_letivo === filters.ano_letivo)
  }

  // Filtrar por presença
  if (filters.presenca && filters.presenca !== '' && filters.presenca !== 'Todas') {
    const presencaUpper = filters.presenca.toUpperCase()
    resultados = resultados.filter(r => r.presenca?.toUpperCase() === presencaUpper)
  }

  return resultados
}

// ========== CALCULAR ESTATÍSTICAS ==========

export function calcularEstatisticas(resultados: OfflineResultado[]): {
  total: number
  presentes: number
  faltosos: number
  media_lp: number
  media_mat: number
  media_ch: number
  media_cn: number
  media_geral: number
} {
  const presentes = resultados.filter(r => r.presenca?.toUpperCase() === 'P')
  const faltosos = resultados.filter(r => r.presenca?.toUpperCase() === 'F')

  const calcMedia = (arr: number[]): number => {
    const validos = arr.filter(n => n != null && !isNaN(n))
    if (validos.length === 0) return 0
    const sum = validos.reduce((a, b) => a + b, 0)
    return Number((sum / validos.length).toFixed(2))
  }

  return {
    total: resultados.length,
    presentes: presentes.length,
    faltosos: faltosos.length,
    media_lp: calcMedia(presentes.map(r => r.nota_lp)),
    media_mat: calcMedia(presentes.map(r => r.nota_mat)),
    media_ch: calcMedia(presentes.map(r => r.nota_ch)),
    media_cn: calcMedia(presentes.map(r => r.nota_cn)),
    media_geral: calcMedia(presentes.map(r => r.media_aluno))
  }
}

// ========== OBTER SÉRIES ÚNICAS ==========

export function getSeries(): string[] {
  const resultados = getResultados()
  const series = [...new Set(resultados.map(r => r.serie).filter(Boolean))]
  return series.sort()
}

// ========== OBTER ANOS LETIVOS ÚNICOS ==========

export function getAnosLetivos(): string[] {
  const resultados = getResultados()
  const anos = [...new Set(resultados.map(r => r.ano_letivo).filter(Boolean))]
  return anos.sort((a, b) => Number(b) - Number(a))
}

// ========== FILTRAR TURMAS ==========

export function filterTurmas(escola_id?: string | number, serie?: string): OfflineTurma[] {
  let turmas = getTurmas()

  if (escola_id && escola_id !== '' && escola_id !== 'todas') {
    const escolaId = Number(escola_id)
    turmas = turmas.filter(t => t.escola_id === escolaId)
  }

  if (serie && serie !== '' && serie !== 'todas') {
    turmas = turmas.filter(t => t.serie === serie)
  }

  return turmas
}
