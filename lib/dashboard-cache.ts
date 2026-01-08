/**
 * Dashboard Cache Service
 *
 * Gerencia cache local dos dados do dashboard para melhor performance.
 * Dados são carregados uma vez no login e usados em toda a sessão.
 * Cache é invalidado ao fazer logout ou fechar o navegador.
 */

const CACHE_KEY = 'sisam_dashboard_cache'
const CACHE_VERSION = '1.0'

export interface DashboardCache {
  version: string
  timestamp: number
  userId: string
  tipoUsuario: string
  estatisticas: any
  escolas: any[]
  turmas: any[]
  polos: any[]
  series: string[]
}

/**
 * Verifica se o cache existe e é válido
 */
export function isCacheValid(): boolean {
  try {
    const cacheStr = sessionStorage.getItem(CACHE_KEY)
    if (!cacheStr) return false

    const cache: DashboardCache = JSON.parse(cacheStr)

    // Verificar versão
    if (cache.version !== CACHE_VERSION) return false

    // Cache válido por 24 horas (mas como é sessionStorage, fecha com o browser)
    const maxAge = 24 * 60 * 60 * 1000 // 24 horas
    if (Date.now() - cache.timestamp > maxAge) return false

    return true
  } catch {
    return false
  }
}

/**
 * Obtém o cache do dashboard
 */
export function getCache(): DashboardCache | null {
  try {
    const cacheStr = sessionStorage.getItem(CACHE_KEY)
    if (!cacheStr) return null
    return JSON.parse(cacheStr)
  } catch {
    return null
  }
}

/**
 * Salva dados no cache
 */
export function saveCache(data: Omit<DashboardCache, 'version' | 'timestamp'>): void {
  try {
    const cache: DashboardCache = {
      ...data,
      version: CACHE_VERSION,
      timestamp: Date.now()
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('[DashboardCache] Erro ao salvar cache:', error)
  }
}

/**
 * Limpa o cache
 */
export function clearCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignorar erros
  }
}

/**
 * Sincroniza todos os dados necessários para o dashboard
 * Chamado após o login bem-sucedido
 */
export async function syncDashboardData(userId: string, tipoUsuario: string): Promise<DashboardCache> {
  console.log('[DashboardCache] Iniciando sincronização...')

  // Definir endpoints baseado no tipo de usuário
  const isAdmin = tipoUsuario === 'administrador' || tipoUsuario === 'tecnico'
  const isPolo = tipoUsuario === 'polo'
  const isEscola = tipoUsuario === 'escola'

  const baseUrl = isAdmin ? '/api/admin' : isPolo ? '/api/polo' : isEscola ? '/api/escola' : '/api/admin'

  // Carregar dados em paralelo
  const promises: Promise<any>[] = []

  // Estatísticas
  promises.push(
    fetch(`${baseUrl}/estatisticas`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)
  )

  // Escolas
  if (isAdmin || isPolo) {
    promises.push(
      fetch(`${baseUrl}/escolas`)
        .then(res => res.ok ? res.json() : [])
        .catch(() => [])
    )
  } else {
    promises.push(Promise.resolve([]))
  }

  // Turmas
  promises.push(
    fetch(`${baseUrl}/turmas`)
      .then(res => res.ok ? res.json() : [])
      .catch(() => [])
  )

  // Polos (apenas admin/tecnico)
  if (isAdmin) {
    promises.push(
      fetch(`${baseUrl}/polos`)
        .then(res => res.ok ? res.json() : [])
        .catch(() => [])
    )
  } else {
    promises.push(Promise.resolve([]))
  }

  // Configuração de séries
  promises.push(
    fetch('/api/admin/configuracao-series')
      .then(res => res.ok ? res.json() : { series: [] })
      .then(data => {
        if (data.series && Array.isArray(data.series)) {
          return data.series.map((s: any) => s.nome_serie || `${s.serie}º Ano`)
        }
        return ['2º Ano', '3º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano']
      })
      .catch(() => ['2º Ano', '3º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'])
  )

  const [estatisticas, escolasData, turmasData, polosData, series] = await Promise.all(promises)

  // Processar escolas
  const escolas = Array.isArray(escolasData) ? escolasData : escolasData?.escolas || []

  // Processar turmas
  const turmas = Array.isArray(turmasData) ? turmasData : turmasData?.turmas || []

  // Processar polos
  const polos = Array.isArray(polosData) ? polosData : []

  const cacheData: DashboardCache = {
    version: CACHE_VERSION,
    timestamp: Date.now(),
    userId,
    tipoUsuario,
    estatisticas: estatisticas || getDefaultEstatisticas(),
    escolas,
    turmas,
    polos,
    series
  }

  // Salvar no cache
  saveCache(cacheData)

  console.log('[DashboardCache] Sincronização concluída:', {
    escolas: escolas.length,
    turmas: turmas.length,
    polos: polos.length,
    series: series.length
  })

  return cacheData
}

/**
 * Estatísticas padrão quando não há dados
 */
function getDefaultEstatisticas() {
  return {
    totalEscolas: 0,
    totalPolos: 0,
    totalResultados: 0,
    totalAlunos: 0,
    totalTurmas: 0,
    totalAlunosPresentes: 0,
    totalAlunosFaltantes: 0,
    mediaGeral: 0,
    mediaAnosIniciais: 0,
    mediaAnosFinais: 0,
    totalAnosIniciais: 0,
    totalAnosFinais: 0
  }
}

/**
 * Obtém estatísticas do cache
 */
export function getCachedEstatisticas(): any {
  const cache = getCache()
  return cache?.estatisticas || getDefaultEstatisticas()
}

/**
 * Obtém escolas do cache
 */
export function getCachedEscolas(): any[] {
  const cache = getCache()
  return cache?.escolas || []
}

/**
 * Obtém turmas do cache
 */
export function getCachedTurmas(): any[] {
  const cache = getCache()
  return cache?.turmas || []
}

/**
 * Obtém polos do cache
 */
export function getCachedPolos(): any[] {
  const cache = getCache()
  return cache?.polos || []
}

/**
 * Obtém séries do cache
 */
export function getCachedSeries(): string[] {
  const cache = getCache()
  return cache?.series || ['2º Ano', '3º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano']
}

/**
 * Obtém tipo de usuário do cache
 */
export function getCachedTipoUsuario(): string {
  const cache = getCache()
  return cache?.tipoUsuario || ''
}
