/**
 * Tipos compartilhados do módulo de Comparativos.
 *
 * @module services/comparativos/types
 */

export interface FiltrosComparativos {
  anoLetivo?: string | null
  serie?: string | null
  escolaId?: string | null
  turmaId?: string | null
  avaliacaoId?: string | null
  tipoEnsino?: string | null
}

export interface UsuarioAcesso {
  tipo_usuario: string
  polo_id?: string | null
  escola_id?: string | null
}

export interface FiltrosComparativoEscolas extends FiltrosComparativos {
  escolasIds: string[]
  poloId?: string | null
  usuario: UsuarioAcesso
}

export interface FiltrosComparativoPolos extends FiltrosComparativos {
  polosIds: [string, string]
}

export interface ResultadoComparativoEscolas {
  dados: any[]
  dadosPorSerie: Record<string, any[]>
  dadosPorSerieAgregado: Record<string, any[]>
  melhoresAlunos: Record<string, Record<string, any>>
  totalEscolas: number
  totalSeries: number
}

export interface ResultadoComparativoPolos {
  dadosPorSerie: Record<string, any[]>
  dadosPorSerieAgregado: Record<string, any[]>
  dadosPorSerieEscola: Record<string, Record<string, any[]>>
  polos: string[]
}
