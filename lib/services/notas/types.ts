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

export interface ConfigNotas {
  nota_maxima: number
  media_aprovacao: number
  permite_recuperacao: boolean
  peso_avaliacao?: number
  peso_recuperacao?: number
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
