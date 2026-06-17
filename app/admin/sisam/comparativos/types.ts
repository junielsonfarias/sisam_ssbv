export interface DadosComparativo {
  escola_id: string
  escola_nome: string
  polo_id: string
  polo_nome: string
  serie: string
  turma_id: string | null
  turma_codigo: string | null
  total_alunos: number
  alunos_presentes: number
  total_turmas?: number
  media_geral: number | string
  media_lp: number | string
  media_ch: number | string
  media_mat: number | string
  media_cn: number | string
  media_producao?: number | string
  media_acertos_lp: number | string
  media_acertos_ch: number | string
  media_acertos_mat: number | string
  media_acertos_cn: number | string
}
