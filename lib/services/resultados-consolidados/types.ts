/**
 * Tipos do módulo de resultados consolidados.
 *
 * @module services/resultados-consolidados/types
 */

import type { Paginacao, PaginacaoResponse } from '@/lib/api-helpers'

export interface UsuarioAcessoResultados {
  tipo_usuario: string
  polo_id?: string | null
  escola_id?: string | null
}

export interface FiltrosResultados {
  escolaId: string | null
  poloId: string | null
  anoLetivo: string | null
  avaliacaoId: string | null
  serie: string | null
  /** Já normalizado: vazio/"todas" => null */
  presenca: string | null
  turmaId: string | null
  tipoEnsino: string | null
  busca: string | null
}

export interface EstatisticasResultados {
  totalAlunos: number
  totalPresentes: number
  totalFaltas: number
  mediaGeral: number
  mediaLP: number
  mediaCH: number
  mediaMAT: number
  mediaCN: number
  mediaProducao: number
  mediaAnosIniciais: number
  totalAnosIniciais: number
  mediaAnosFinais: number
  totalAnosFinais: number
}

export interface ResultadoConsolidadoResponse {
  resultados: any[]
  estatisticas: EstatisticasResultados
  paginacao: PaginacaoResponse
}

export type { Paginacao }
