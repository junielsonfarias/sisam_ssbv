// Tipos compartilhados do módulo Notas Escolares

export interface EscolaSimples { id: string; nome: string }
export interface TurmaSimples { id: string; codigo: string; nome: string | null; serie: string; ano_letivo: string; total_alunos?: number }
export interface Disciplina { id: string; nome: string; codigo: string | null; abreviacao: string | null }
export interface SerieEscolarSimples { id: string; codigo: string; nome: string; etapa: string; ordem: number }
export interface Periodo { id: string; nome: string; tipo: string; numero: number; ano_letivo: string }
export interface AlunoTurma {
  id: string; nome: string; codigo: string | null; situacao: string | null; pcd: boolean
}
export interface NotaAluno {
  aluno_id: string
  nota: number | null
  nota_recuperacao: number | null
  nota_final: number | null
  faltas: number
  observacao: string
  conceito: string | null
  parecer_descritivo: string | null
}
export interface ConfigNotas {
  nota_maxima: number; media_aprovacao: number; media_recuperacao: number
  peso_avaliacao: number; peso_recuperacao: number; permite_recuperacao: boolean
  formula_media?: string
  pesos_periodos?: { periodo: number; peso: number }[]
  arredondamento?: string
  casas_decimais?: number
  aprovacao_automatica?: boolean
}

export interface ConceitoEscala {
  codigo: string; nome: string; valor_numerico: number
}

export interface TipoAvaliacao {
  id: string | null
  codigo: string
  nome: string
  tipo_resultado: 'parecer' | 'conceito' | 'numerico' | 'misto'
  escala_conceitos: ConceitoEscala[] | null
  nota_minima: number
  nota_maxima: number
  permite_decimal: boolean
}

export interface RegraAvaliacao {
  id: string
  nome: string
  tipo_periodo: string
  qtd_periodos: number
  media_aprovacao: number
  media_recuperacao: number
  nota_maxima: number
  permite_recuperacao: boolean
  aprovacao_automatica: boolean
  casas_decimais: number
  arredondamento: string
}

export interface AvaliacaoTurma {
  tipo_avaliacao: TipoAvaliacao
  regra_avaliacao: RegraAvaliacao | null
  serie_codigo: string | null
  etapa: string | null
}

export interface BoletimDisciplina {
  disciplina_id: string; disciplina_nome: string; disciplina_codigo: string | null
  periodos: { periodo_id: string; periodo_nome: string; periodo_numero: number; nota: number | null; nota_recuperacao: number | null; nota_final: number | null; faltas: number }[]
  media_anual: number | null; total_faltas: number; situacao: string | null
}

export type Modo = 'selecao' | 'lancamento' | 'boletim'

export interface FreqUnificadaAluno {
  presencas: number
  faltas: number
  faltas_justificadas: number
}

// Helper: verifica se a serie tem frequencia unificada (pre-escola + 1o ao 5o)
export function isFrequenciaUnificada(serie: string | null | undefined): boolean {
  if (!serie) return true
  const num = serie.match(/(\d+)/)?.[1]
  return !num || !['6', '7', '8', '9'].includes(num)
}
