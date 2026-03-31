/**
 * Tipos e interfaces do servico de importacao
 *
 * @module services/importacao/types
 */

import { ConfiguracaoSerie } from '@/lib/types'

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface ImportacaoConfig {
  importacaoId: string
  anoLetivo: string
  usuarioId: string
  avaliacaoId: string
}

export interface ImportacaoProgresso {
  processadas: number
  erros: number
  total: number
}

export interface ImportacaoResultado {
  polos: { criados: number; existentes: number }
  escolas: { criados: number; existentes: number }
  turmas: { criados: number; existentes: number }
  alunos: { criados: number; existentes: number }
  questoes: { criadas: number; existentes: number }
  resultados: { processados: number; erros: number; duplicados: number; novos: number }
}

export interface DadosExtraidos {
  polosUnicos: Set<string>
  escolasUnicas: Map<string, string>
  turmasUnicas: Map<string, { escola: string; serie: string }>
  alunosUnicos: Map<string, { escola: string; turma: string; serie: string }>
}

export interface DadosExistentes {
  polosMap: Map<string, string>
  escolasMap: Map<string, string>
  turmasMap: Map<string, string>
  alunosMap: Map<string, string>
  questoesMap: Map<string, string>
}

export interface DadosQuestoes {
  configSeries: Map<string, ConfiguracaoSerie>
  itensProducaoMap: Map<string, string>
}

export interface TurmaParaInserir {
  tempId: string
  codigo: string
  nome: string
  escola_id: string
  serie: string | null
  ano_letivo: string
}

export interface AlunoParaInserir {
  tempId: string
  codigo: string
  nome: string
  escola_id: string
  turma_id: string | null
  serie: string | null
  ano_letivo: string
}

export interface ConsolidadoParaInserir {
  aluno_id: string
  escola_id: string
  turma_id: string | null
  ano_letivo: string
  avaliacao_id: string
  serie: string | null
  presenca: string
  total_acertos_lp: number
  total_acertos_ch: number
  total_acertos_mat: number
  total_acertos_cn: number
  nota_lp: number | null
  nota_ch: number | null
  nota_mat: number | null
  nota_cn: number | null
  media_aluno: number | null
  nota_producao: number | null
  nivel_aprendizagem: string | null
  nivel_aprendizagem_id: string | null
  tipo_avaliacao: string
  total_questoes_esperadas: number
  item_producao_1: number | null
  item_producao_2: number | null
  item_producao_3: number | null
  item_producao_4: number | null
  item_producao_5: number | null
  item_producao_6: number | null
  item_producao_7: number | null
  item_producao_8: number | null
  nivel_lp: string | null
  nivel_mat: string | null
  nivel_prod: string | null
  nivel_aluno: string | null
}

export interface ResultadoParaInserir {
  escola_id: string
  aluno_id: string
  aluno_codigo: string | null
  aluno_nome: string
  turma_id: string | null
  questao_id: string | null
  questao_codigo: string
  resposta_aluno: string | null
  acertou: boolean
  nota: number
  ano_letivo: string
  avaliacao_id: string
  serie: string | null
  turma: string | null
  disciplina: string
  area_conhecimento: string
  presenca: string
}

export interface ProducaoParaInserir {
  aluno_id: string
  escola_id: string
  turma_id: string | null
  item_producao_id: string
  ano_letivo: string
  avaliacao_id: string
  serie: string | null
  nota: number
}

export interface DadosProcessados {
  turmasParaInserir: TurmaParaInserir[]
  alunosParaInserir: AlunoParaInserir[]
  consolidadosParaInserir: ConsolidadoParaInserir[]
  resultadosParaInserir: ResultadoParaInserir[]
  producaoParaInserir: ProducaoParaInserir[]
}
