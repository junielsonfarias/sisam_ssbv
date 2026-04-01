/**
 * Tipos e interfaces para armazenamento offline
 */

export type ModuloAtivo = 'educatec' | 'gestor' | 'professor'

export interface OfflineUser {
  id: string
  nome: string
  email: string
  tipo_usuario: string
  polo_id?: number
  escola_id?: number
  polo_nome?: string
  escola_nome?: string
  gestor_escolar_habilitado?: boolean
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
  nota_producao?: number | string
  nivel_aprendizagem?: string
  total_acertos_lp?: number | string
  total_acertos_mat?: number | string
  total_acertos_ch?: number | string
  total_acertos_cn?: number | string
  total_questoes_lp?: number | string
  total_questoes_mat?: number | string
  total_questoes_ch?: number | string
  total_questoes_cn?: number | string
  qtd_questoes_lp?: number | null
  qtd_questoes_mat?: number | null
  qtd_questoes_ch?: number | null
  qtd_questoes_cn?: number | null
  nivel_lp?: string
  nivel_mat?: string
  nivel_prod?: string
  nivel_aluno?: string
}

export interface OfflineAluno {
  id: string
  nome: string
  escola_id: string
  turma_id?: string
}

export interface OfflineConfigSerie {
  id: number
  serie: string
  tipo_ensino: string
  avalia_lp: boolean
  avalia_mat: boolean
  avalia_ch: boolean
  avalia_cn: boolean
  qtd_questoes_lp: number | null
  qtd_questoes_mat: number | null
  qtd_questoes_ch: number | null
  qtd_questoes_cn: number | null
  qtd_itens_producao: number | null
  disciplinas?: Array<{
    serie_id: number
    disciplina: string
    sigla: string
    ordem: number
    questao_inicio: number
    questao_fim: number
    qtd_questoes: number
    valor_questao: number
  }>
}

export interface EstatisticasAluno {
  encontrado: boolean
  aluno_nome?: string
  escola_nome?: string
  turma_codigo?: string
  serie?: string
  presenca?: string
  media_aluno?: number
  nota_lp?: number
  nota_mat?: number
  nota_ch?: number
  nota_cn?: number
  nota_producao?: number
  nivel_aprendizagem?: string
  nivel_lp?: string
  nivel_mat?: string
  nivel_prod?: string
  nivel_aluno?: string
  posicao_turma?: number
  total_turma?: number
  posicao_escola?: number
  total_escola?: number
}

export const STORAGE_KEYS = {
  USER: 'educatec_offline_user',
  MODULO_ATIVO: 'educatec_modulo_ativo',
  POLOS: 'educatec_offline_polos',
  ESCOLAS: 'educatec_offline_escolas',
  TURMAS: 'educatec_offline_turmas',
  RESULTADOS: 'educatec_offline_resultados',
  ALUNOS: 'educatec_offline_alunos',
  QUESTOES: 'educatec_offline_questoes',
  CONFIG_SERIES: 'educatec_offline_config_series',
  SYNC_DATE: 'educatec_offline_sync_date',
  SYNC_STATUS: 'educatec_offline_sync_status'
} as const
