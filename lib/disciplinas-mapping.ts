/**
 * Mapeamentos centralizados de disciplinas
 * Evita duplicação de lógica de comparação em múltiplos arquivos
 */

// Aliases para cada disciplina (usado para comparação flexível)
export const DISCIPLINAS_ALIASES: Record<string, string[]> = {
  'língua portuguesa': ['lp', 'portugues', 'português', 'lingua portuguesa', 'linguaportuguesa'],
  'matemática': ['mat', 'matematica'],
  'ciências humanas': ['ch', 'ciencias humanas', 'cienciashumanas'],
  'ciências da natureza': ['cn', 'ciencias da natureza', 'ciencias natureza', 'cienciasdanatureza'],
  'produção textual': ['pt', 'producao textual', 'producaotextual', 'redação', 'redacao']
}

// Disciplinas válidas por tipo de ensino
export const DISCIPLINAS_ANOS_INICIAIS = [
  'Língua Portuguesa', 'Matemática', 'Produção Textual',
  'LP', 'MAT', 'PT', 'Português', 'Matematica', 'Redação'
]
export const DISCIPLINAS_ANOS_FINAIS = [
  'Língua Portuguesa', 'Matemática', 'Ciências Humanas', 'Ciências da Natureza',
  'LP', 'MAT', 'CH', 'CN', 'Português', 'Matematica'
]

// Séries de anos iniciais (avaliação padronizada SISAM: 2º, 3º, 5º)
export const SERIES_ANOS_INICIAIS = ['2', '3', '5']

// Séries de anos finais (avaliação padronizada SISAM: 6º, 7º, 8º, 9º)
export const SERIES_ANOS_FINAIS = ['6', '7', '8', '9']

// Todas as séries por etapa (Gestão Escolar — inclui 1º, 4º, 6º, 7º)
export const SERIES_TODAS_INICIAIS = ['1', '2', '3', '4', '5']
export const SERIES_TODAS_FINAIS = ['6', '7', '8', '9']

// Campos de Experiência — Educação Infantil (BNCC)
export const CAMPOS_EXPERIENCIA = [
  { value: 'ETS', label: 'O eu, o outro e o nós' },
  { value: 'CMP', label: 'Corpo, gestos e movimentos' },
  { value: 'TSF', label: 'Traços, sons, cores e formas' },
  { value: 'EFO', label: 'Escuta, fala, pensamento e imaginação' },
  { value: 'ENQ', label: 'Espaços, tempos, quantidades, relações e transformações' },
]

// Disciplinas do Gestor Escolar por etapa (conforme BNCC)
export const DISCIPLINAS_GESTOR_ANOS_INICIAIS = [
  { value: 'LP', label: 'Língua Portuguesa' },
  { value: 'MAT', label: 'Matemática' },
  { value: 'CIE', label: 'Ciências' },
  { value: 'HIS', label: 'História' },
  { value: 'GEO', label: 'Geografia' },
  { value: 'ART', label: 'Artes' },
  { value: 'EDF', label: 'Educação Física' },
  { value: 'REL', label: 'Ensino Religioso' },
]

export const DISCIPLINAS_GESTOR_ANOS_FINAIS = [
  { value: 'LP', label: 'Língua Portuguesa' },
  { value: 'MAT', label: 'Matemática' },
  { value: 'CIE', label: 'Ciências' },
  { value: 'HIS', label: 'História' },
  { value: 'GEO', label: 'Geografia' },
  { value: 'ART', label: 'Artes' },
  { value: 'EDF', label: 'Educação Física' },
  { value: 'ING', label: 'Língua Inglesa' },
  { value: 'REL', label: 'Ensino Religioso' },
]

// Opções de disciplinas para UI (selects, dropdowns, etc.)
export interface DisciplinaOption {
  value: string
  label: string
}

export const DISCIPLINAS_OPTIONS_ANOS_INICIAIS: DisciplinaOption[] = [
  { value: 'LP', label: 'Língua Portuguesa' },
  { value: 'MAT', label: 'Matemática' },
  { value: 'PT', label: 'Produção Textual' }
]

export const DISCIPLINAS_OPTIONS_ANOS_FINAIS: DisciplinaOption[] = [
  { value: 'LP', label: 'Língua Portuguesa' },
  { value: 'CH', label: 'Ciências Humanas' },
  { value: 'MAT', label: 'Matemática' },
  { value: 'CN', label: 'Ciências da Natureza' }
]

/**
 * Retorna opções de disciplinas para UI baseado na série
 */
export function getDisciplinasOptions(serie: string | null | undefined): DisciplinaOption[] {
  return isAnosIniciais(serie) ? DISCIPLINAS_OPTIONS_ANOS_INICIAIS : DISCIPLINAS_OPTIONS_ANOS_FINAIS
}

// Re-exports de lib/config-series.ts (versão canônica)
import { extrairNumeroSerie as _extrairNumeroSerie, isAnosIniciais as _isAnosIniciais } from './config-series'
export const extrairNumeroSerie = _extrairNumeroSerie
export const isAnosIniciais = _isAnosIniciais

/**
 * Verifica se é anos finais baseado na série
 */
export function isAnosFinais(serie: string | null | undefined): boolean {
  const numero = _extrairNumeroSerie(serie)
  return SERIES_ANOS_FINAIS.includes(numero || '')
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
 * Verifica se uma string corresponde a uma variante de disciplina
 * Usa comparação mais rigorosa para evitar falsos positivos
 */
function matchDisciplina(texto: string, variantes: string[]): boolean {
  // Comparação exata primeiro
  if (variantes.includes(texto)) return true

  // Comparação por palavra completa (evita "at" matchando "matematica")
  const palavras = texto.split(/\s+/)
  for (const variante of variantes) {
    // Se a variante é um código curto (2-3 caracteres), exigir match exato
    if (variante.length <= 3) {
      if (texto === variante || palavras.includes(variante)) return true
    } else {
      // Para variantes longas, verificar se texto começa com ou é igual à variante
      if (texto === variante || texto.startsWith(variante + ' ') ||
          variante.startsWith(texto + ' ') || variante === texto) return true
    }
  }
  return false
}

/**
 * Compara duas disciplinas de forma flexível mas rigorosa
 * Aceita aliases e variações de escrita, mas evita falsos positivos
 * como "ciências humanas" vs "ciências da natureza"
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

  // Verificar aliases - ambas disciplinas devem pertencer ao MESMO grupo
  for (const [chave, aliases] of Object.entries(DISCIPLINAS_ALIASES)) {
    const chaveNorm = normalizarDisciplina(chave)
    const todasVariantes = [chaveNorm, ...aliases.map(a => normalizarDisciplina(a))]

    const d1Match = matchDisciplina(d1, todasVariantes)
    const d2Match = matchDisciplina(d2, todasVariantes)

    // Ambas devem pertencer ao mesmo grupo de disciplina
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
