export type Tipo = 'todos' | 'frequencia' | 'notas' | 'conteudo'

export interface Periodo {
  id: string
  nome: string
  tipo: string
  numero: number
  ano_letivo: string
  data_inicio: string | null
  data_fim: string | null
  ativo?: boolean
}

export interface TurmaInfo {
  id: string
  codigo: string
  nome: string | null
  serie: string
  turno: string
  ano_letivo: string
  escola_id: string
  escola_nome: string
  sensivel: boolean
}

export interface ProfessorInfo {
  vinculo_id: string
  tipo_vinculo: 'polivalente' | 'disciplina'
  professor_id: string
  professor_nome: string
  professor_email: string
  disciplina_id: string | null
  disciplina_nome: string | null
}

export interface FrequenciaLinha {
  aluno_id: string
  aluno_nome: string
  freq_id: string | null
  dias_letivos: number | null
  presencas: number | null
  faltas: number | null
  faltas_justificadas: number | null
  percentual_frequencia: string | number | null
  observacao: string | null
  metodo: string | null
  registrado_por_nome: string | null
  periodo_nome: string | null
  periodo_numero: number | null
}

export interface NotaLinha {
  aluno_id: string
  aluno_nome: string
  nota_id: string | null
  disciplina_id: string | null
  disciplina_nome: string | null
  periodo_id: string | null
  periodo_nome: string | null
  periodo_numero: number | null
  nota: string | number | null
  nota_recuperacao: string | number | null
  nota_final: string | number | null
  faltas: number | null
  observacao: string | null
  parecer_descritivo: string | null
  registrado_por_nome: string | null
}

export interface ConteudoLinha {
  id: string
  data_aula: string
  conteudo: string | null
  metodologia: string | null
  observacoes: string | null
  criado_em: string
  professor_id: string
  professor_nome: string
  disciplina_id: string | null
  disciplina_nome: string | null
}

export interface DiarioPayload {
  turma: TurmaInfo
  periodo: Periodo | null
  professores: ProfessorInfo[]
  frequencia: FrequenciaLinha[] | null
  notas: NotaLinha[] | null
  conteudo: ConteudoLinha[] | null
}

// ============================================================================
// Lacunas do diário (endpoint /diario-lacunas)
// ============================================================================
export interface LacunasMes {
  ano: number
  mes: number
  mes_nome: string
  dias_letivos: number
  dias_com_lancamento: number
  lacunas: number
  lacunas_datas: string[]
}

export interface LacunasPayload {
  escopo: {
    data_inicio: string
    data_fim: string
    periodo: { id: string; nome: string; numero: number } | null
    ano_letivo: string
  }
  resumo: {
    dias_letivos_total: number
    dias_com_lancamento: number
    lacunas_total: number
    percentual_cobertura: string
  }
  lacunas_por_mes: LacunasMes[]
}
