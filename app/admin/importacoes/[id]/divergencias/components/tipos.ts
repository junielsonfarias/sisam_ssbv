/** Tipos compartilhados da UI de triagem de divergências (ADR-001). */

export type StatusDivergencia = 'pendente' | 'vinculado' | 'ignorado'
export type TipoDivergencia = 'turma' | 'aluno'

/** Filtro de status na UI ('' = todos). */
export type FiltroStatus = StatusDivergencia | ''
/** Filtro de tipo na UI ('' = todos). */
export type FiltroTipo = TipoDivergencia | ''

/** Resumo da importação retornado pela API de triagem. */
export interface ImportacaoResumo {
  id: string
  nome_arquivo: string | null
  ano_letivo: number | string | null
  status: string | null
}

/**
 * Divergência de triagem: uma turma/aluno do ETL que não foi encontrado no
 * cadastro mestre (Gestor). Espelha as colunas retornadas pelo
 * GET /api/admin/importacoes/[id]/triagem.
 */
export interface Divergencia {
  id: string
  tipo: TipoDivergencia
  dado_etl: Record<string, unknown>
  chave_tentada: string | null
  status: StatusDivergencia
  vinculado_a_id: string | null
  criado_em: string
  resolvido_em: string | null
  resolvido_por: string | null
  resolvido_por_nome: string | null
}

/** Totais por status retornados pela API. */
export interface TotaisDivergencias {
  total: number
  pendentes: number
  vinculadas: number
  ignoradas: number
}
