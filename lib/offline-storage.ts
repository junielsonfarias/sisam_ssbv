// Sistema de armazenamento offline unificado
// Usa IndexedDB como armazenamento principal e localStorage como fallback
// Mantém os dois sincronizados para garantir compatibilidade

import { offlineDB, STORES as IDB_STORES, isIndexedDBAvailable } from './offline-db'
import { toNumber } from './utils-numeros'

const STORAGE_KEYS = {
  USER: 'sisam_offline_user',
  POLOS: 'sisam_offline_polos',
  ESCOLAS: 'sisam_offline_escolas',
  TURMAS: 'sisam_offline_turmas',
  RESULTADOS: 'sisam_offline_resultados',
  ALUNOS: 'sisam_offline_alunos',
  QUESTOES: 'sisam_offline_questoes',
  CONFIG_SERIES: 'sisam_offline_config_series',
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
  id: number | string
  aluno_id: number | string
  aluno_nome: string
  escola_id: number | string
  escola_nome: string
  turma_id: number | string
  turma_codigo: string
  polo_id: number | string
  serie: string
  ano_letivo: string
  presenca: string
  nota_lp: number | string
  nota_mat: number | string
  nota_ch: number | string
  nota_cn: number | string
  media_aluno: number | string
  // Campos adicionais
  nota_producao?: number | string
  nivel_aprendizagem?: string
  // Acertos por disciplina
  total_acertos_lp?: number | string
  total_acertos_mat?: number | string
  total_acertos_ch?: number | string
  total_acertos_cn?: number | string
  // Total de questões por disciplina (para calcular erros)
  total_questoes_lp?: number | string
  total_questoes_mat?: number | string
  total_questoes_ch?: number | string
  total_questoes_cn?: number | string
  // Campos de configuração de questões por série (vindos da API)
  qtd_questoes_lp?: number | null
  qtd_questoes_mat?: number | null
  qtd_questoes_ch?: number | null
  qtd_questoes_cn?: number | null
  // Níveis por disciplina (Anos Iniciais)
  nivel_lp?: string
  nivel_mat?: string
  nivel_prod?: string
  nivel_aluno?: string
}

// Interface para alunos offline
export interface OfflineAluno {
  id: string
  nome: string
  escola_id: string
  turma_id?: string
}

// Interface para configuração de séries offline
export interface OfflineConfigSerie {
  id: number
  serie: string
  tipo_ensino: string
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
  qtd_questoes_lp: number | null
  qtd_questoes_mat: number | null
  qtd_questoes_ch: number | null
  qtd_questoes_cn: number | null
  qtd_itens_producao: number | null
  disciplinas?: Array<{
    serie_id: number
    disciplina: string
    sigla: string
    ordem: number
    questao_inicio: number
    questao_fim: number
    qtd_questoes: number
    valor_questao: number
  }>
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
// isEssential: se true, tentará novamente após limpar dados não essenciais
function saveToStorage(key: string, data: any, isEssential: boolean = false): boolean {
  if (!isStorageAvailable()) return false
  try {
    const jsonData = JSON.stringify(data)
    localStorage.setItem(key, jsonData)
    console.log(`[OfflineStorage] Salvou ${key}: ${(jsonData.length / 1024).toFixed(2)}KB`)
    return true
  } catch (error: any) {
    console.error(`[OfflineStorage] Erro ao salvar ${key}:`, error)
    // Se exceder quota, limpar dados não essenciais e tentar novamente
    if (error.name === 'QuotaExceededError') {
      console.warn('[OfflineStorage] Quota excedida, limpando dados antigos...')
      clearOldData()

      // Tentar novamente apenas para dados essenciais
      if (isEssential) {
        try {
          const jsonData = JSON.stringify(data)
          localStorage.setItem(key, jsonData)
          console.log(`[OfflineStorage] Salvou ${key} após limpar: ${(jsonData.length / 1024).toFixed(2)}KB`)
          return true
        } catch (retryError) {
          console.error(`[OfflineStorage] Falha ao salvar ${key} mesmo após limpar:`, retryError)
        }
      }
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
// IMPORTANTE: Nunca apagar resultados, polos, escolas ou turmas - são essenciais!
function clearOldData(): void {
  // Manter dados essenciais - apenas remover questões (são grandes demais)
  const keysToRemove = [STORAGE_KEYS.QUESTOES]
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
    console.log('[OfflineStorage] Removido para liberar espaco:', key)
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

export async function savePolosAsync(polos: OfflinePolo[]): Promise<boolean> {
  // Salvar no localStorage (backup)
  const localSaved = saveToStorage(STORAGE_KEYS.POLOS, polos, true)

  // Salvar no IndexedDB (principal)
  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.saveData(IDB_STORES.POLOS, polos.map(p => ({ ...p, id: p.id })))
      console.log('[OfflineStorage] Polos salvos no IndexedDB:', polos.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar polos no IndexedDB:', error)
    }
  }

  return localSaved
}

export function savePolos(polos: OfflinePolo[]): boolean {
  // Manter compatibilidade com código síncrono existente
  const result = saveToStorage(STORAGE_KEYS.POLOS, polos, true)
  // Salvar no IndexedDB em background
  savePolosAsync(polos).catch(console.error)
  return result
}

export async function getPolosAsync(): Promise<OfflinePolo[]> {
  // Tentar IndexedDB primeiro
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflinePolo>(IDB_STORES.POLOS)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Polos carregados do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler polos do IndexedDB:', error)
    }
  }
  // Fallback para localStorage
  return readFromStorage<OfflinePolo[]>(STORAGE_KEYS.POLOS) || []
}

export function getPolos(): OfflinePolo[] {
  return readFromStorage<OfflinePolo[]>(STORAGE_KEYS.POLOS) || []
}

// ========== FUNÇÕES DE ESCOLAS ==========

export async function saveEscolasAsync(escolas: OfflineEscola[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.ESCOLAS, escolas, true)

  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.saveData(IDB_STORES.ESCOLAS, escolas.map(e => ({ ...e, id: e.id })))
      console.log('[OfflineStorage] Escolas salvas no IndexedDB:', escolas.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar escolas no IndexedDB:', error)
    }
  }

  return localSaved
}

export function saveEscolas(escolas: OfflineEscola[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.ESCOLAS, escolas, true)
  saveEscolasAsync(escolas).catch(console.error)
  return result
}

export async function getEscolasAsync(): Promise<OfflineEscola[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflineEscola>(IDB_STORES.ESCOLAS)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Escolas carregadas do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler escolas do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflineEscola[]>(STORAGE_KEYS.ESCOLAS) || []
}

export function getEscolas(): OfflineEscola[] {
  return readFromStorage<OfflineEscola[]>(STORAGE_KEYS.ESCOLAS) || []
}

// ========== FUNÇÕES DE TURMAS ==========

export async function saveTurmasAsync(turmas: OfflineTurma[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.TURMAS, turmas, true)

  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.saveData(IDB_STORES.TURMAS, turmas.map(t => ({ ...t, id: t.id })))
      console.log('[OfflineStorage] Turmas salvas no IndexedDB:', turmas.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar turmas no IndexedDB:', error)
    }
  }

  return localSaved
}

export function saveTurmas(turmas: OfflineTurma[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.TURMAS, turmas, true)
  saveTurmasAsync(turmas).catch(console.error)
  return result
}

export async function getTurmasAsync(): Promise<OfflineTurma[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflineTurma>(IDB_STORES.TURMAS)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Turmas carregadas do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler turmas do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflineTurma[]>(STORAGE_KEYS.TURMAS) || []
}

export function getTurmas(): OfflineTurma[] {
  return readFromStorage<OfflineTurma[]>(STORAGE_KEYS.TURMAS) || []
}

// ========== FUNÇÕES DE RESULTADOS ==========

export async function saveResultadosAsync(resultados: OfflineResultado[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.RESULTADOS, resultados, true)

  if (isIndexedDBAvailable()) {
    try {
      // Garantir que todos os resultados tenham um ID válido
      const resultadosComId = resultados.map((r, index) => ({
        ...r,
        id: r.id || `temp_${index}`
      }))
      await offlineDB.saveData(IDB_STORES.RESULTADOS, resultadosComId as any)
      console.log('[OfflineStorage] Resultados salvos no IndexedDB:', resultados.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar resultados no IndexedDB:', error)
    }
  }

  return localSaved
}

export function saveResultados(resultados: OfflineResultado[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.RESULTADOS, resultados, true)
  saveResultadosAsync(resultados).catch(console.error)
  return result
}

export async function getResultadosAsync(): Promise<OfflineResultado[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflineResultado>(IDB_STORES.RESULTADOS)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Resultados carregados do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler resultados do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflineResultado[]>(STORAGE_KEYS.RESULTADOS) || []
}

export function getResultados(): OfflineResultado[] {
  return readFromStorage<OfflineResultado[]>(STORAGE_KEYS.RESULTADOS) || []
}

// ========== FUNÇÕES DE CONFIGURAÇÃO DE SÉRIES ==========

export async function saveConfigSeriesAsync(configs: OfflineConfigSerie[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.CONFIG_SERIES, configs, true)

  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.saveData(IDB_STORES.CONFIG_SERIES, configs.map(c => ({ ...c, id: c.id })))
      console.log('[OfflineStorage] Config séries salvas no IndexedDB:', configs.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar config séries no IndexedDB:', error)
    }
  }

  return localSaved
}

export function saveConfigSeries(configs: OfflineConfigSerie[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.CONFIG_SERIES, configs, true)
  saveConfigSeriesAsync(configs).catch(console.error)
  return result
}

export async function getConfigSeriesAsync(): Promise<OfflineConfigSerie[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflineConfigSerie>(IDB_STORES.CONFIG_SERIES)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Config séries carregadas do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler config séries do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflineConfigSerie[]>(STORAGE_KEYS.CONFIG_SERIES) || []
}

export function getConfigSeries(): OfflineConfigSerie[] {
  return readFromStorage<OfflineConfigSerie[]>(STORAGE_KEYS.CONFIG_SERIES) || []
}

// Obter configuração de uma série específica
export function getConfigSerieBySerie(serie: string): OfflineConfigSerie | null {
  const configs = getConfigSeries()
  const serieNum = serie.replace(/[^0-9]/g, '')
  return configs.find(c => c.serie === serieNum || c.serie === serie) || null
}

export async function getConfigSerieBySeriAsync(serie: string): Promise<OfflineConfigSerie | null> {
  const configs = await getConfigSeriesAsync()
  const serieNum = serie.replace(/[^0-9]/g, '')
  return configs.find(c => c.serie === serieNum || c.serie === serie) || null
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

export async function clearAllOfflineDataAsync(): Promise<void> {
  // Limpar localStorage
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })

  // Limpar IndexedDB
  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.clearAll()
      console.log('[OfflineStorage] IndexedDB limpo com sucesso')
    } catch (error) {
      console.error('[OfflineStorage] Erro ao limpar IndexedDB:', error)
    }
  }

  console.log('[OfflineStorage] Todos os dados offline foram limpos')
}

export function clearAllOfflineData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
  // Limpar IndexedDB em background
  if (isIndexedDBAvailable()) {
    offlineDB.clearAll().catch(console.error)
  }
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
    // Buscar todos os dados em paralelo (incluindo configuração de séries)
    const [polosRes, escolasRes, turmasRes, resultadosRes, configSeriesRes] = await Promise.all([
      fetch('/api/offline/polos'),
      fetch('/api/offline/escolas'),
      fetch('/api/offline/turmas'),
      fetch('/api/offline/resultados'),
      fetch('/api/offline/configuracao-series')
    ])

    // Verificar erros
    if (!polosRes.ok || !escolasRes.ok || !turmasRes.ok || !resultadosRes.ok) {
      throw new Error('Erro ao buscar dados do servidor')
    }

    // Parsear dados - APIs retornam { dados: [...], total: ..., sincronizado_em: ... }
    const [polosData, escolasData, turmasData, resultadosData, configSeriesData] = await Promise.all([
      polosRes.json(),
      escolasRes.json(),
      turmasRes.json(),
      resultadosRes.json(),
      configSeriesRes.ok ? configSeriesRes.json() : { dados: [] }
    ])

    // Extrair arrays de dados (APIs retornam objeto com propriedade 'dados')
    const polos = Array.isArray(polosData) ? polosData : (polosData.dados || [])
    const escolas = Array.isArray(escolasData) ? escolasData : (escolasData.dados || [])
    const turmas = Array.isArray(turmasData) ? turmasData : (turmasData.dados || [])
    const resultados = Array.isArray(resultadosData) ? resultadosData : (resultadosData.dados || [])
    const configSeries = Array.isArray(configSeriesData) ? configSeriesData : (configSeriesData.dados || [])

    console.log('[OfflineStorage] Dados recebidos:', {
      polos: polos.length,
      escolas: escolas.length,
      turmas: turmas.length,
      resultados: resultados.length,
      configSeries: configSeries.length
    })

    // Verificar se há dados para salvar
    if (resultados.length === 0) {
      console.warn('[OfflineStorage] Nenhum resultado encontrado para sincronizar')
    }

    // Salvar em ambos os sistemas (localStorage e IndexedDB)
    // Usar versões async para garantir que IndexedDB seja salvo
    const [savedPolos, savedEscolas, savedTurmas, savedResultados, savedConfigSeries] = await Promise.all([
      savePolosAsync(polos),
      saveEscolasAsync(escolas),
      saveTurmasAsync(turmas),
      saveResultadosAsync(resultados),
      saveConfigSeriesAsync(configSeries)
    ])

    if (savedPolos && savedEscolas && savedTurmas && savedResultados) {
      setSyncDate()
      setSyncStatus('success')
      console.log('[OfflineStorage] Sincronização concluída com sucesso! (localStorage + IndexedDB)')
      return {
        success: true,
        message: `Sincronizado: ${polos.length} polos, ${escolas.length} escolas, ${turmas.length} turmas, ${resultados.length} resultados, ${configSeries.length} config séries`
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

  console.log('[filterResultados] Iniciando filtro com:', JSON.stringify(filters))
  console.log('[filterResultados] Total de resultados antes do filtro:', resultados.length)
  console.log('[filterResultados] Total de escolas:', escolas.length)

  // Log de exemplo de dados para debug
  if (resultados.length > 0) {
    console.log('[filterResultados] Exemplo de resultado:', {
      id: resultados[0].id,
      aluno_id: resultados[0].aluno_id,
      escola_id: resultados[0].escola_id,
      polo_id: resultados[0].polo_id
    })
  }
  if (escolas.length > 0) {
    console.log('[filterResultados] Exemplo de escola:', {
      id: escolas[0].id,
      nome: escolas[0].nome,
      polo_id: escolas[0].polo_id
    })
  }

  // Filtrar por polo - comparar como string para suportar UUIDs
  if (filters.polo_id && filters.polo_id !== '' && filters.polo_id !== 'todos') {
    const poloIdStr = String(filters.polo_id)
    // Encontrar escolas do polo (comparando como string)
    const escolasDoPolo = escolas.filter(e => String(e.polo_id) === poloIdStr).map(e => String(e.id))
    console.log('[filterResultados] Polo ID:', poloIdStr, 'Escolas do polo:', escolasDoPolo)

    if (escolasDoPolo.length > 0) {
      const resultadosFiltrados = resultados.filter(r => escolasDoPolo.includes(String(r.escola_id)))
      console.log('[filterResultados] Resultados após filtro por escolas do polo:', resultadosFiltrados.length)
      resultados = resultadosFiltrados
    } else {
      // Se não encontrar escolas pelo polo_id, tentar filtrar diretamente pelo polo_id nos resultados
      const resultadosDireto = resultados.filter(r => String(r.polo_id) === poloIdStr)
      console.log('[filterResultados] Resultados após filtro direto por polo_id:', resultadosDireto.length)
      resultados = resultadosDireto
    }
    console.log('[filterResultados] Resultados após filtro de polo FINAL:', resultados.length)
  }

  // Filtrar por escola - comparar como string para suportar UUIDs
  if (filters.escola_id && filters.escola_id !== '' && filters.escola_id !== 'todas') {
    const escolaIdStr = String(filters.escola_id)
    resultados = resultados.filter(r => String(r.escola_id) === escolaIdStr)
    console.log('[filterResultados] Resultados após filtro de escola:', resultados.length)
  }

  // Filtrar por turma - comparar como string para suportar UUIDs
  if (filters.turma_id && filters.turma_id !== '' && filters.turma_id !== 'todas') {
    const turmaIdStr = String(filters.turma_id)
    resultados = resultados.filter(r => String(r.turma_id) === turmaIdStr)
    console.log('[filterResultados] Resultados após filtro de turma:', resultados.length)
  }

  // Filtrar por série
  if (filters.serie && filters.serie !== '' && filters.serie !== 'todas') {
    resultados = resultados.filter(r => r.serie === filters.serie)
    console.log('[filterResultados] Resultados após filtro de série:', resultados.length)
  }

  // Filtrar por ano letivo
  if (filters.ano_letivo && filters.ano_letivo !== '' && filters.ano_letivo !== 'todos') {
    resultados = resultados.filter(r => r.ano_letivo === filters.ano_letivo)
    console.log('[filterResultados] Resultados após filtro de ano letivo:', resultados.length)
  }

  // Filtrar por presença
  if (filters.presenca && filters.presenca !== '' && filters.presenca !== 'Todas') {
    const presencaUpper = filters.presenca.toUpperCase()
    resultados = resultados.filter(r => r.presenca?.toUpperCase() === presencaUpper)
    console.log('[filterResultados] Resultados após filtro de presença:', resultados.length)
  }

  console.log('[filterResultados] Total de resultados após todos os filtros:', resultados.length)
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
  media_producao: number
  media_geral: number
} {
  const presentes = resultados.filter(r => r.presenca?.toUpperCase() === 'P')
  const faltosos = resultados.filter(r => r.presenca?.toUpperCase() === 'F')

  const calcMedia = (valores: (number | string | null | undefined)[]): number => {
    const numeros = valores.map(v => toNumber(v)).filter(n => n > 0)
    if (numeros.length === 0) return 0
    const sum = numeros.reduce((a, b) => a + b, 0)
    return Number((sum / numeros.length).toFixed(2))
  }

  return {
    total: resultados.length,
    presentes: presentes.length,
    faltosos: faltosos.length,
    media_lp: calcMedia(presentes.map(r => r.nota_lp)),
    media_mat: calcMedia(presentes.map(r => r.nota_mat)),
    media_ch: calcMedia(presentes.map(r => r.nota_ch)),
    media_cn: calcMedia(presentes.map(r => r.nota_cn)),
    media_producao: calcMedia(presentes.map(r => (r as any).nota_producao)),
    media_geral: calcMedia(presentes.map(r => r.media_aluno))
  }
}

// ========== BUSCAR RESULTADO DE UM ALUNO ==========

export function getResultadoByAlunoId(alunoId: string | number, anoLetivo?: string): OfflineResultado | null {
  const resultados = getResultados()
  const alunoIdStr = String(alunoId)

  console.log('[getResultadoByAlunoId] Buscando aluno:', alunoIdStr, 'ano:', anoLetivo)
  console.log('[getResultadoByAlunoId] Total de resultados:', resultados.length)

  // Tentar encontrar por aluno_id primeiro
  let resultado = resultados.find(r => String(r.aluno_id) === alunoIdStr)

  // Se não encontrou por aluno_id, tentar por id do resultado
  if (!resultado) {
    resultado = resultados.find(r => String(r.id) === alunoIdStr)
    if (resultado) {
      console.log('[getResultadoByAlunoId] Encontrado por id do resultado')
    }
  } else {
    console.log('[getResultadoByAlunoId] Encontrado por aluno_id')
  }

  // Se tiver ano letivo e encontrou resultado, verificar se precisa filtrar
  if (anoLetivo && resultado) {
    const resultadoComAno = resultados.find(r =>
      (String(r.aluno_id) === alunoIdStr || String(r.id) === alunoIdStr) && r.ano_letivo === anoLetivo
    )
    if (resultadoComAno) {
      resultado = resultadoComAno
    }
  }

  console.log('[getResultadoByAlunoId] Resultado encontrado:', resultado ? 'SIM' : 'NAO')
  return resultado || null
}

// ========== OBTER ESTATÍSTICAS DO ALUNO ==========

export interface EstatisticasAluno {
  aluno: {
    id: string
    nome: string
    serie: string | null
    ano_letivo: string | null
    escola_nome: string
    turma_codigo: string | null
  }
  estatisticas: {
    total: number
    acertos: number
    erros: number
    por_area: {
      'Língua Portuguesa': { total: number; acertos: number; erros: number; media: number }
      'Ciências Humanas': { total: number; acertos: number; erros: number; media: number }
      'Matemática': { total: number; acertos: number; erros: number; media: number }
      'Ciências da Natureza': { total: number; acertos: number; erros: number; media: number }
    }
    media_geral: number
    nivel_aprendizagem: string | null
    nota_producao: number | null
  }
}

export function getEstatisticasAluno(alunoId: string | number, anoLetivo?: string): EstatisticasAluno | null {
  const resultado = getResultadoByAlunoId(alunoId, anoLetivo)
  if (!resultado) return null

  // Verificar se é anos iniciais (2º, 3º, 5º) para usar fallback correto
  const serieNum = resultado.serie?.toString().replace(/[^0-9]/g, '') || ''
  const isAnosIniciais = ['2', '3', '5'].includes(serieNum)

  // Total de questões por disciplina (do banco ou fallback baseado na série)
  // Anos iniciais: LP=14, MAT=14, CH=0, CN=0 (têm produção textual no lugar)
  // Anos finais: LP=20, MAT=20, CH=10, CN=10
  const totalLP = toNumber(resultado.total_questoes_lp) || toNumber(resultado.qtd_questoes_lp) || (isAnosIniciais ? 14 : 20)
  const totalCH = toNumber(resultado.total_questoes_ch) || toNumber(resultado.qtd_questoes_ch) || (isAnosIniciais ? 0 : 10)
  const totalMAT = toNumber(resultado.total_questoes_mat) || toNumber(resultado.qtd_questoes_mat) || (isAnosIniciais ? 14 : 20)
  const totalCN = toNumber(resultado.total_questoes_cn) || toNumber(resultado.qtd_questoes_cn) || (isAnosIniciais ? 0 : 10)

  // Acertos por disciplina
  const acertosLP = toNumber(resultado.total_acertos_lp)
  const acertosCH = toNumber(resultado.total_acertos_ch)
  const acertosMAT = toNumber(resultado.total_acertos_mat)
  const acertosCN = toNumber(resultado.total_acertos_cn)

  // Erros por disciplina
  const errosLP = totalLP - acertosLP
  const errosCH = totalCH - acertosCH
  const errosMAT = totalMAT - acertosMAT
  const errosCN = totalCN - acertosCN

  // Totais gerais
  const totalQuestoes = totalLP + totalCH + totalMAT + totalCN
  const totalAcertos = acertosLP + acertosCH + acertosMAT + acertosCN
  const totalErros = totalQuestoes - totalAcertos

  return {
    aluno: {
      id: String(resultado.aluno_id),
      nome: resultado.aluno_nome,
      serie: resultado.serie || null,
      ano_letivo: resultado.ano_letivo || null,
      escola_nome: resultado.escola_nome,
      turma_codigo: resultado.turma_codigo || null
    },
    estatisticas: {
      total: totalQuestoes,
      acertos: totalAcertos,
      erros: totalErros,
      por_area: {
        'Língua Portuguesa': {
          total: totalLP,
          acertos: acertosLP,
          erros: errosLP,
          media: toNumber(resultado.nota_lp)
        },
        'Ciências Humanas': {
          total: totalCH,
          acertos: acertosCH,
          erros: errosCH,
          media: toNumber(resultado.nota_ch)
        },
        'Matemática': {
          total: totalMAT,
          acertos: acertosMAT,
          erros: errosMAT,
          media: toNumber(resultado.nota_mat)
        },
        'Ciências da Natureza': {
          total: totalCN,
          acertos: acertosCN,
          erros: errosCN,
          media: toNumber(resultado.nota_cn)
        }
      },
      media_geral: toNumber(resultado.media_aluno),
      nivel_aprendizagem: resultado.nivel_aprendizagem || null,
      nota_producao: resultado.nota_producao ? toNumber(resultado.nota_producao) : null
    }
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
    const escolaIdStr = String(escola_id)
    turmas = turmas.filter(t => String(t.escola_id) === escolaIdStr)
  }

  if (serie && serie !== '' && serie !== 'todas') {
    turmas = turmas.filter(t => t.serie === serie)
  }

  return turmas
}
