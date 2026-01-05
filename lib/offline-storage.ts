// Sistema de armazenamento offline usando localStorage
// Mais simples e confiável que IndexedDB

const STORAGE_KEYS = {
  USER: 'sisam_offline_user',
  POLOS: 'sisam_offline_polos',
  ESCOLAS: 'sisam_offline_escolas',
  TURMAS: 'sisam_offline_turmas',
  RESULTADOS: 'sisam_offline_resultados',
  ALUNOS: 'sisam_offline_alunos',
  QUESTOES: 'sisam_offline_questoes',
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
  // Campos adicionais para questões
  nota_producao?: number | string
  nivel_aprendizagem?: string
  total_acertos_lp?: number | string
  total_acertos_mat?: number | string
  total_acertos_ch?: number | string
  total_acertos_cn?: number | string
}

// Interface para alunos offline
export interface OfflineAluno {
  id: string
  nome: string
  escola_id: string
  turma_id?: string
}

// Interface para questoes/respostas offline
export interface OfflineQuestao {
  id: number | string
  aluno_id: number | string
  aluno_nome: string
  aluno_codigo?: string
  questao_id?: number | string
  questao_codigo: string
  acertou: boolean
  resposta_aluno?: string
  area_conhecimento?: string
  disciplina?: string
  ano_letivo?: string
  escola_id?: number | string
  questao_descricao?: string
  gabarito?: string
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

// ========== FUNÇÕES DE QUESTÕES ==========

export function saveQuestoes(questoes: OfflineQuestao[]): boolean {
  return saveToStorage(STORAGE_KEYS.QUESTOES, questoes)
}

export function getQuestoes(): OfflineQuestao[] {
  return readFromStorage<OfflineQuestao[]>(STORAGE_KEYS.QUESTOES) || []
}

// Buscar questões de um aluno específico
export function getQuestoesByAlunoId(alunoId: string | number, anoLetivo?: string): OfflineQuestao[] {
  const questoes = getQuestoes()
  const alunoIdStr = String(alunoId)

  let questoesDoAluno = questoes.filter(q => String(q.aluno_id) === alunoIdStr)

  // Se tiver ano letivo, filtrar por ele
  if (anoLetivo) {
    questoesDoAluno = questoesDoAluno.filter(q => q.ano_letivo === anoLetivo)
  }

  return questoesDoAluno
}

// Organizar questões por área de conhecimento
export function organizarQuestoesPorArea(questoes: OfflineQuestao[]): {
  questoes: Record<string, OfflineQuestao[]>
  estatisticas: {
    total: number
    acertos: number
    erros: number
    por_area: Record<string, { total: number; acertos: number; erros: number }>
  }
} {
  const questoesPorArea: Record<string, OfflineQuestao[]> = {
    'Língua Portuguesa': [],
    'Ciências Humanas': [],
    'Matemática': [],
    'Ciências da Natureza': [],
  }

  questoes.forEach((questao) => {
    const area = questao.area_conhecimento || questao.disciplina || 'Outras'

    // Mapear áreas
    let areaNormalizada = 'Outras'
    if (area.includes('Português') || area.includes('LP') || area.includes('Língua Portuguesa')) {
      areaNormalizada = 'Língua Portuguesa'
    } else if (area.includes('Humanas') || area.includes('CH') || area.includes('Ciências Humanas')) {
      areaNormalizada = 'Ciências Humanas'
    } else if (area.includes('Matemática') || area.includes('MAT') || area.includes('Matematica')) {
      areaNormalizada = 'Matemática'
    } else if (area.includes('Natureza') || area.includes('CN') || area.includes('Ciências da Natureza')) {
      areaNormalizada = 'Ciências da Natureza'
    }

    // Determinar faixa de questões por área baseado no código
    const questaoNum = parseInt(questao.questao_codigo?.replace('Q', '') || '0')
    if (questaoNum >= 1 && questaoNum <= 20) {
      areaNormalizada = 'Língua Portuguesa'
    } else if (questaoNum >= 21 && questaoNum <= 30) {
      areaNormalizada = 'Ciências Humanas'
    } else if (questaoNum >= 31 && questaoNum <= 50) {
      areaNormalizada = 'Matemática'
    } else if (questaoNum >= 51 && questaoNum <= 60) {
      areaNormalizada = 'Ciências da Natureza'
    }

    if (!questoesPorArea[areaNormalizada]) {
      questoesPorArea[areaNormalizada] = []
    }

    questoesPorArea[areaNormalizada].push(questao)
  })

  // Ordenar questões por número dentro de cada área
  Object.keys(questoesPorArea).forEach((area) => {
    questoesPorArea[area].sort((a, b) => {
      const numA = parseInt(a.questao_codigo?.replace('Q', '') || '0')
      const numB = parseInt(b.questao_codigo?.replace('Q', '') || '0')
      return numA - numB
    })
  })

  // Calcular estatísticas
  const totalQuestoes = questoes.length
  const totalAcertos = questoes.filter((q) => q.acertou).length
  const totalErros = totalQuestoes - totalAcertos

  const estatisticasPorArea: Record<string, { total: number; acertos: number; erros: number }> = {}
  Object.keys(questoesPorArea).forEach((area) => {
    const questoesArea = questoesPorArea[area]
    estatisticasPorArea[area] = {
      total: questoesArea.length,
      acertos: questoesArea.filter((q) => q.acertou).length,
      erros: questoesArea.filter((q) => !q.acertou).length,
    }
  })

  return {
    questoes: questoesPorArea,
    estatisticas: {
      total: totalQuestoes,
      acertos: totalAcertos,
      erros: totalErros,
      por_area: estatisticasPorArea
    }
  }
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
    // Buscar todos os dados em paralelo (incluindo questões)
    const [polosRes, escolasRes, turmasRes, resultadosRes, questoesRes] = await Promise.all([
      fetch('/api/offline/polos'),
      fetch('/api/offline/escolas'),
      fetch('/api/offline/turmas'),
      fetch('/api/offline/resultados'),
      fetch('/api/offline/questoes')
    ])

    // Verificar erros (questões é opcional - pode não existir)
    if (!polosRes.ok || !escolasRes.ok || !turmasRes.ok || !resultadosRes.ok) {
      throw new Error('Erro ao buscar dados do servidor')
    }

    // Parsear dados - APIs retornam { dados: [...], total: ..., sincronizado_em: ... }
    const [polosData, escolasData, turmasData, resultadosData] = await Promise.all([
      polosRes.json(),
      escolasRes.json(),
      turmasRes.json(),
      resultadosRes.json()
    ])

    // Parsear questões separadamente (pode falhar se API não existir)
    let questoesData: any = { dados: [] }
    if (questoesRes.ok) {
      questoesData = await questoesRes.json()
    } else {
      console.warn('[OfflineStorage] API de questões não disponível ou retornou erro')
    }

    // Extrair arrays de dados (APIs retornam objeto com propriedade 'dados')
    const polos = Array.isArray(polosData) ? polosData : (polosData.dados || [])
    const escolas = Array.isArray(escolasData) ? escolasData : (escolasData.dados || [])
    const turmas = Array.isArray(turmasData) ? turmasData : (turmasData.dados || [])
    const resultados = Array.isArray(resultadosData) ? resultadosData : (resultadosData.dados || [])
    const questoes = Array.isArray(questoesData) ? questoesData : (questoesData.dados || [])

    console.log('[OfflineStorage] Dados recebidos:', {
      polos: polos.length,
      escolas: escolas.length,
      turmas: turmas.length,
      resultados: resultados.length,
      questoes: questoes.length
    })

    // Verificar se há dados para salvar
    if (resultados.length === 0) {
      console.warn('[OfflineStorage] Nenhum resultado encontrado para sincronizar')
    }

    // Salvar no localStorage
    const savedPolos = savePolos(polos)
    const savedEscolas = saveEscolas(escolas)
    const savedTurmas = saveTurmas(turmas)
    const savedResultados = saveResultados(resultados)
    const savedQuestoes = saveQuestoes(questoes)

    console.log('[OfflineStorage] Questões salvas:', savedQuestoes ? questoes.length : 'FALHOU')

    if (savedPolos && savedEscolas && savedTurmas && savedResultados) {
      setSyncDate()
      setSyncStatus('success')
      console.log('[OfflineStorage] Sincronização concluída com sucesso!')
      return {
        success: true,
        message: `Sincronizado: ${polos.length} polos, ${escolas.length} escolas, ${turmas.length} turmas, ${resultados.length} resultados, ${questoes.length} questoes`
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

  console.log('[filterResultados] Iniciando filtro com:', filters)
  console.log('[filterResultados] Total de resultados antes do filtro:', resultados.length)
  console.log('[filterResultados] Total de escolas:', escolas.length)

  // Filtrar por polo - comparar como string para suportar UUIDs
  if (filters.polo_id && filters.polo_id !== '' && filters.polo_id !== 'todos') {
    const poloIdStr = String(filters.polo_id)
    // Encontrar escolas do polo (comparando como string)
    const escolasDoPolo = escolas.filter(e => String(e.polo_id) === poloIdStr).map(e => String(e.id))
    console.log('[filterResultados] Polo ID:', poloIdStr, 'Escolas do polo:', escolasDoPolo.length)
    if (escolasDoPolo.length > 0) {
      resultados = resultados.filter(r => escolasDoPolo.includes(String(r.escola_id)))
    } else {
      // Se não encontrar escolas pelo polo_id, tentar filtrar diretamente pelo polo_id nos resultados
      resultados = resultados.filter(r => String(r.polo_id) === poloIdStr)
    }
    console.log('[filterResultados] Resultados após filtro de polo:', resultados.length)
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

// Função auxiliar para converter valor para número
function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? 0 : num
}

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
    media_geral: calcMedia(presentes.map(r => r.media_aluno))
  }
}

// ========== BUSCAR RESULTADO DE UM ALUNO ==========

export function getResultadoByAlunoId(alunoId: string | number, anoLetivo?: string): OfflineResultado | null {
  const resultados = getResultados()
  const alunoIdStr = String(alunoId)

  let resultado = resultados.find(r => String(r.aluno_id) === alunoIdStr)

  // Se tiver ano letivo, filtrar por ele
  if (anoLetivo && resultado) {
    resultado = resultados.find(r =>
      String(r.aluno_id) === alunoIdStr && r.ano_letivo === anoLetivo
    )
  }

  return resultado || null
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
