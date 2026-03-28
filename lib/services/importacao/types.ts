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

export interface DadosProcessados {
  turmasParaInserir: any[]
  alunosParaInserir: any[]
  consolidadosParaInserir: any[]
  resultadosParaInserir: any[]
  producaoParaInserir: any[]
}
