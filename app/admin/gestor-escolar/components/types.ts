export interface Disciplina {
  id: string
  nome: string
  codigo: string | null
  abreviacao: string | null
  ordem: number
  ativo: boolean
}

export interface Periodo {
  id: string
  nome: string
  tipo: string
  numero: number
  ano_letivo: string
  data_inicio: string | null
  data_fim: string | null
  ativo: boolean
}

export interface ConfiguracaoNotas {
  id: string
  escola_id: string
  ano_letivo: string
  tipo_periodo: string
  nota_maxima: number
  media_aprovacao: number
  media_recuperacao: number
  peso_avaliacao: number
  peso_recuperacao: number
  permite_recuperacao: boolean
  escola_nome?: string
}

export interface EscolaSimples {
  id: string
  nome: string
}

export type Aba = 'disciplinas' | 'periodos' | 'configuracao' | 'pesquisar-aluno'
