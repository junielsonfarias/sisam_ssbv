/**
 * Tipos e interfaces do serviço de estatísticas
 *
 * @module services/estatisticas/types
 */

import type { Usuario } from '@/lib/types'

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Tipo de escopo para filtrar estatísticas
 */
export type EscopoEstatisticas = 'global' | 'polo' | 'escola'

/**
 * Filtros para busca de estatísticas
 */
export interface FiltrosEstatisticas {
  /** ID do polo para filtrar (usado quando escopo é 'polo') */
  poloId?: string | null
  /** ID da escola para filtrar (usado quando escopo é 'escola') */
  escolaId?: string | null
  /** Ano letivo para filtrar */
  anoLetivo?: string | null
  /** Série para filtrar (ex: '2º Ano', '8º Ano') */
  serie?: string | null
  /** ID da avaliação para filtrar */
  avaliacaoId?: string | null
}

/**
 * Resultado das estatísticas gerais
 */
export interface EstatisticasGerais {
  // Identificação (preenchido conforme o escopo)
  nomeEscola?: string
  nomePolo?: string

  // Contadores globais (apenas para admin/tecnico)
  totalUsuarios?: number
  totalPolos?: number
  totalQuestoes?: number

  // Contadores comuns
  totalEscolas: number
  totalResultados: number
  totalAlunos: number          // Total de alunos cadastrados (tabela alunos)
  totalAlunosAvaliados: number // Total de alunos com resultados (P ou F na presença)
  totalTurmas: number
  totalAlunosPresentes: number
  totalAlunosFaltantes: number

  // Métricas de desempenho
  mediaGeral: number
  taxaAprovacao: number
  taxaAcertos?: number

  // Métricas por tipo de ensino
  mediaAnosIniciais: number
  mediaAnosFinais: number
  totalAnosIniciais: number
  totalAnosFinais: number

  // Médias por disciplina
  mediaLp: number
  mediaMat: number
  mediaProd: number
  mediaCh: number
  mediaCn: number

  // Séries disponíveis (com dados)
  seriesDisponiveis?: string[]
}

/**
 * Resultado de uma query individual com tratamento de erro
 */
export interface QueryResult<T> {
  sucesso: boolean
  dados?: T
  erro?: string
}
