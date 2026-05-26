// ============================================================================
// Tipos compartilhados entre FormNovoVinculo, a page pai e demais componentes
// ============================================================================
export interface Professor {
  id: string
  nome: string
  email: string
  escolas?: string[] // vem do ARRAY_AGG do service de professores
}

export interface Turma {
  id: string
  codigo?: string
  nome: string | null
  serie: string
  turno: string
  escola_id: string
  escola_nome: string
}

export interface Disciplina {
  id: string
  nome: string
}

export interface Escola {
  id: string
  nome: string
}

export interface VinculoSubmitPayload {
  professor_id: string
  turma_ids: string[]
  tipo_vinculo: 'polivalente' | 'disciplina'
  disciplina_id?: string
}

// ============================================================================
// Helpers de série / tipo de vínculo
// ============================================================================

export function isAnosFinais(serie: string): boolean {
  const num = serie.replace(/[^\d]/g, '')
  return ['6', '7', '8', '9'].includes(num)
}

export function tipoDaSerie(serie: string): 'polivalente' | 'disciplina' {
  return isAnosFinais(serie) ? 'disciplina' : 'polivalente'
}

// Ordem pedagógica: ed. infantil (creche → pré II) antes do fundamental (1º → 9º).
// Códigos não previstos caem no final em ordem alfabética.
export const SERIE_ORDEM = ['CRE', 'PRE1', 'PRE2', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function ordenarSeries(series: string[]): string[] {
  return [...series].sort((a, b) => {
    const ia = SERIE_ORDEM.indexOf(a)
    const ib = SERIE_ORDEM.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

export function ordenarTurmas(turmas: Turma[]): Turma[] {
  return [...turmas].sort((a, b) => {
    const ia = SERIE_ORDEM.indexOf(a.serie)
    const ib = SERIE_ORDEM.indexOf(b.serie)
    const sa = ia !== -1 ? ia : 999
    const sb = ib !== -1 ? ib : 999
    if (sa !== sb) return sa - sb
    return (a.codigo || a.nome || '').localeCompare(b.codigo || b.nome || '')
  })
}

// Converte o código curto da série (ex: "3", "PRE1") em label legível (ex: "3º Ano", "Pré I")
export function formatarSerie(s: string): string {
  if (s === 'CRE') return 'Creche'
  if (s === 'PRE1') return 'Pré I'
  if (s === 'PRE2') return 'Pré II'
  if (/^\d+$/.test(s)) return `${s}º Ano`
  return s
}
