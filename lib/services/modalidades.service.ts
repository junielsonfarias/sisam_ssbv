/**
 * Service para Modalidades de Ensino.
 *
 * Centraliza regras de cada modalidade: regular, EJA, Ed. Infantil (creche/pré).
 *
 * @module services/modalidades
 */

export type Modalidade =
  | 'regular'
  | 'eja_fundamental'
  | 'ed_infantil_creche'
  | 'ed_infantil_pre'

export const MODALIDADE_LABEL: Record<Modalidade, string> = {
  regular: 'Regular',
  eja_fundamental: 'EJA - Ensino Fundamental',
  ed_infantil_creche: 'Educação Infantil - Creche (0-3 anos)',
  ed_infantil_pre: 'Educação Infantil - Pré-escola (4-5 anos)',
}

export const MODALIDADE_AVALIACAO: Record<Modalidade, 'numerica' | 'descritiva' | 'mista'> = {
  regular: 'numerica',          // mas anos iniciais aceitam descritiva
  eja_fundamental: 'numerica',
  ed_infantil_creche: 'descritiva',
  ed_infantil_pre: 'descritiva',
}

export const MODALIDADE_PERIODO: Record<Modalidade, 'bimestre' | 'semestre' | 'anual'> = {
  regular: 'bimestre',
  eja_fundamental: 'semestre',
  ed_infantil_creche: 'anual',
  ed_infantil_pre: 'anual',
}

/** Indica se a modalidade exige nota numérica nos boletins. */
export function usaNotaNumerica(modalidade: Modalidade, ano?: number | null): boolean {
  if (modalidade === 'ed_infantil_creche' || modalidade === 'ed_infantil_pre') return false
  // Em regular, anos iniciais (1-5) podem optar por descritiva — mas a modalidade
  // padrão segue numérica; a escola decide via flag adicional.
  return true
}

/** Indica se a modalidade exige avaliação descritiva. */
export function usaAvaliacaoDescritiva(modalidade: Modalidade): boolean {
  return MODALIDADE_AVALIACAO[modalidade] !== 'numerica'
}

/** Quantos períodos por ano. */
export function quantidadePeriodos(modalidade: Modalidade): number {
  const tipo = MODALIDADE_PERIODO[modalidade]
  if (tipo === 'bimestre') return 4
  if (tipo === 'semestre') return 2
  return 1
}

/** Lista de modalidades para selects de UI. */
export function listarModalidades(): Array<{ value: Modalidade; label: string }> {
  return (Object.keys(MODALIDADE_LABEL) as Modalidade[]).map((m) => ({
    value: m,
    label: MODALIDADE_LABEL[m],
  }))
}
