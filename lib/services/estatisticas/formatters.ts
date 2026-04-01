/**
 * Formatadores e funções auxiliares do serviço de estatísticas
 *
 * @module services/estatisticas/formatters
 */

import { createLogger } from '@/lib/logger'
import { PRESENCA } from '@/lib/constants'
import type { Usuario } from '@/lib/types'
import type { EscopoEstatisticas, EstatisticasGerais, QueryResult } from './types'

// Logger específico para este módulo
const log = createLogger('EstatisticasService')

// ============================================================================
// CONSTANTES LOCAIS (derivadas de lib/constants)
// ============================================================================

/** Valores de presença considerados como "presente" (case insensitive) */
const PRESENCA_PRESENTE = [PRESENCA.PRESENTE, PRESENCA.PRESENTE.toLowerCase()]

/** Valores de presença considerados como "faltante" (case insensitive) */
const PRESENCA_FALTANTE = [PRESENCA.FALTOU, PRESENCA.FALTOU.toLowerCase()]

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Executa uma query com tratamento de erro isolado
 * Evita que uma falha em uma query quebre todas as outras
 *
 * @param queryFn - Função que executa a query
 * @param descricao - Descrição da query para log de erro
 * @returns Resultado da query ou valor padrão em caso de erro
 */
export async function executarQuerySegura<T>(
  queryFn: () => Promise<T>,
  descricao: string
): Promise<QueryResult<T>> {
  try {
    const dados = await queryFn()
    return { sucesso: true, dados }
  } catch (error) {
    const mensagem = error instanceof Error ? (error as Error).message : 'Erro desconhecido'
    log.error(`Erro ao ${descricao}`, error, { data: { descricao } })
    return { sucesso: false, erro: mensagem }
  }
}

/**
 * Determina o escopo de estatísticas baseado no tipo de usuário
 */
export function determinarEscopo(usuario: Usuario): EscopoEstatisticas {
  const tipo = usuario.tipo_usuario as string // Cast para string permite comparação com legacy 'admin'

  if (tipo === 'administrador' || tipo === 'admin' || tipo === 'tecnico') {
    return 'global'
  }

  if (tipo === 'polo') {
    return 'polo'
  }

  return 'escola'
}

/**
 * Monta a cláusula WHERE baseada no escopo
 */
export function montarFiltroEscopo(
  escopo: EscopoEstatisticas,
  filtros: { poloId?: string | null; escolaId?: string | null },
  aliasEscola: string = 'e',
  aliasResultado: string = 'rc'
): { where: string; params: (string | null)[] } {
  const params: (string | null)[] = []
  let where = ''

  if (escopo === 'polo' && filtros.poloId) {
    where = `${aliasEscola}.polo_id = $1`
    params.push(filtros.poloId)
  } else if (escopo === 'escola' && filtros.escolaId) {
    where = `${aliasResultado}.escola_id = $1`
    params.push(filtros.escolaId)
  }

  return { where, params }
}

/**
 * Retorna estatísticas com valores padrão em caso de erro
 * Útil para não quebrar o frontend quando há falhas no banco
 */
export function getEstatisticasPadrao(): EstatisticasGerais {
  return {
    totalEscolas: 0,
    totalResultados: 0,
    totalAlunos: 0,
    totalAlunosAvaliados: 0,
    totalTurmas: 0,
    totalAlunosPresentes: 0,
    totalAlunosFaltantes: 0,
    mediaGeral: 0,
    taxaAprovacao: 0,
    mediaAnosIniciais: 0,
    mediaAnosFinais: 0,
    totalAnosIniciais: 0,
    totalAnosFinais: 0,
    mediaLp: 0,
    mediaMat: 0,
    mediaProd: 0,
    mediaCh: 0,
    mediaCn: 0
  }
}
