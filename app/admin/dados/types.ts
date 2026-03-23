/**
 * Types locais para a página de Dados
 */

export interface Acumulador {
  total: number
  presentes: number
  faltantes: number
  soma_geral: number; count_geral: number
  soma_lp: number; count_lp: number
  soma_mat: number; count_mat: number
  soma_ch: number; count_ch: number
  soma_cn: number; count_cn: number
  soma_prod: number; count_prod: number
}

export const criarAcumulador = (): Acumulador => ({
  total: 0, presentes: 0, faltantes: 0,
  soma_geral: 0, count_geral: 0,
  soma_lp: 0, count_lp: 0,
  soma_mat: 0, count_mat: 0,
  soma_ch: 0, count_ch: 0,
  soma_cn: 0, count_cn: 0,
  soma_prod: 0, count_prod: 0
})

export interface FiltrosCache {
  polo_id: string
  escola_id: string
  turma_id: string
  ano_letivo: string
  presenca: string
  nivel: string
  faixa_media: string
  disciplina: string
  tipo_ensino: string
}
