// ============================================================================
// Tipos compartilhados do service de Notas
// ============================================================================

export interface NotaInput {
  aluno_id: string
  nota?: number | null
  nota_recuperacao?: number | null
  faltas?: number
  observacao?: string | null
  conceito?: string | null
  parecer_descritivo?: string | null
}

/**
 * Regra de cálculo da nota_final quando há nota de recuperação.
 * - 'substituicao': nota_final = MAX(nota, recuperação) — padrão.
 * - 'ponderada': nota_final = (nota * peso_avaliacao) + (recuperação * peso_recuperacao).
 */
export const REGRAS_RECUPERACAO = ['substituicao', 'ponderada'] as const
export type RegraRecuperacao = (typeof REGRAS_RECUPERACAO)[number]
export const REGRA_RECUPERACAO_PADRAO: RegraRecuperacao = 'substituicao'

export interface ConfigNotas {
  nota_maxima: number
  media_aprovacao: number
  permite_recuperacao: boolean
  peso_avaliacao?: number
  peso_recuperacao?: number
  /**
   * Regra explícita de recuperação. Default 'substituicao'.
   * Só aplica média ponderada quando === 'ponderada' E os pesos existirem.
   */
  regra_recuperacao?: RegraRecuperacao
}

export interface NotaSnapshot {
  nota: number | null
  nota_recuperacao: number | null
  nota_final: number | null
}

export interface LinhaAuditoriaNota {
  aluno_id: string
  acao: 'lancamento' | 'alteracao'
  nota_anterior: number | null
  nota_nova: number | null
  nota_recuperacao_anterior: number | null
  nota_recuperacao_nova: number | null
  nota_final_anterior: number | null
  nota_final_nova: number | null
}
