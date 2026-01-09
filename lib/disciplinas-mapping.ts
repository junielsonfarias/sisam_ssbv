/**
 * Mapeamentos centralizados de disciplinas
 * Evita duplicação de lógica de comparação em múltiplos arquivos
 */

// Aliases para cada disciplina (usado para comparação flexível)
export const DISCIPLINAS_ALIASES: Record<string, string[]> = {
  'língua portuguesa': ['lp', 'portugues', 'português', 'lingua portuguesa', 'linguaportuguesa'],
  'matemática': ['mat', 'matematica'],
  'ciências humanas': ['ch', 'ciencias humanas', 'cienciashumanas'],
  'ciências da natureza': ['cn', 'ciencias da natureza', 'ciencias natureza', 'cienciasdanatureza']
}

// Disciplinas válidas por tipo de ensino
export const DISCIPLINAS_ANOS_INICIAIS = ['Língua Portuguesa', 'Matemática', 'LP', 'MAT', 'Português', 'Matematica']
export const DISCIPLINAS_ANOS_FINAIS = [
  'Língua Portuguesa', 'Matemática', 'Ciências Humanas', 'Ciências da Natureza',
  'LP', 'MAT', 'CH', 'CN', 'Português', 'Matematica'
]

// Séries de anos iniciais (2º, 3º, 5º)
export const SERIES_ANOS_INICIAIS = ['2', '3', '5']

/**
 * Extrai o número da série de uma string
 * Ex: "2º Ano" -> "2", "5º ano A" -> "5"
 */
export function extrairNumeroSerie(serie: string | null | undefined): string | null {
  if (!serie) return null
  const match = serie.match(/(\d+)/)
  return match ? match[1] : null
}

/**
 * Verifica se é anos iniciais baseado na série
 */
export function isAnosIniciais(serie: string | null | undefined): boolean {
  const numero = extrairNumeroSerie(serie)
  return SERIES_ANOS_INICIAIS.includes(numero || '')
}

/**
 * Retorna disciplinas válidas para uma série
 */
export function getDisciplinasValidas(serie: string | null | undefined): string[] {
  return isAnosIniciais(serie) ? DISCIPLINAS_ANOS_INICIAIS : DISCIPLINAS_ANOS_FINAIS
}

/**
 * Normaliza nome de disciplina para comparação
 */
export function normalizarDisciplina(nome: string | null | undefined): string {
  if (!nome) return ''
  return nome.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Compara duas disciplinas de forma flexível
 * Aceita aliases e variações de escrita
 */
export function compararDisciplinas(
  disciplina1: string | null | undefined,
  disciplina2: string | null | undefined
): boolean {
  if (!disciplina1 || !disciplina2) return false

  const d1 = normalizarDisciplina(disciplina1)
  const d2 = normalizarDisciplina(disciplina2)

  // Comparação direta
  if (d1 === d2) return true

  // Verificar aliases
  for (const [chave, aliases] of Object.entries(DISCIPLINAS_ALIASES)) {
    const chaveNorm = normalizarDisciplina(chave)
    const todasVariantes = [chaveNorm, ...aliases.map(a => normalizarDisciplina(a))]

    const d1Match = todasVariantes.some(v => d1.includes(v) || v.includes(d1))
    const d2Match = todasVariantes.some(v => d2.includes(v) || v.includes(d2))

    if (d1Match && d2Match) return true
  }

  return false
}

/**
 * Compara duas séries de forma flexível
 * Extrai apenas o número e compara
 */
export function compararSeries(
  serie1: string | null | undefined,
  serie2: string | null | undefined
): boolean {
  if (!serie1 || !serie2) return false

  const num1 = extrairNumeroSerie(serie1)
  const num2 = extrairNumeroSerie(serie2)

  // Se não conseguiu extrair número, comparação case-insensitive
  if (!num1 || !num2) {
    return serie1.toLowerCase().trim() === serie2.toLowerCase().trim()
  }

  return num1 === num2
}

/**
 * Verifica se uma disciplina é válida para uma série
 */
export function isDisciplinaValidaParaSerie(
  disciplina: string | null | undefined,
  serie: string | null | undefined
): boolean {
  if (!disciplina) return false

  const disciplinasValidas = getDisciplinasValidas(serie)
  return disciplinasValidas.some(dv =>
    compararDisciplinas(disciplina, dv)
  )
}
