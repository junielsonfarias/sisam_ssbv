/**
 * Service de KPIs estratégicos da Secretaria Municipal de Educação.
 *
 * Agrega indicadores municipais para o painel executivo da SEMED:
 *  - Total alunos/escolas/professores
 *  - Frequência média
 *  - Aprovação e reprovação por escola/polo
 *  - Distorção idade-série
 *  - Inclusão (AEE)
 *  - Atendimento PNAE/PNATE
 *  - Casos FICAI abertos
 *  - Execução PDDE
 *  - IDEB projetado (estimativa baseada em médias internas)
 *
 * Fachada (barrel) que reexporta os submódulos para preservar o import
 * histórico `@/lib/services/kpis-semed.service`.
 *
 * @module services/kpis-semed
 */

import { obterKpisGerais } from './gerais'
import { obterKpisFrequencia } from './frequencia'
import { obterKpisDesempenho } from './desempenho'
import { obterKpisProgramas } from './programas'
import { obterComparativoEscolas } from './comparativo'
import type { KpisCompletos, UsuarioEscopo } from './types'

// Re-exports públicos (tipos + funções de cada submódulo)
export type {
  UsuarioEscopo,
  KpisGerais,
  KpisFrequencia,
  KpisDesempenho,
  KpisProgramas,
  KpisCompletos,
  ComparativoEscola,
} from './types'
export { poloDoUsuario } from './types'
export { obterKpisGerais } from './gerais'
export { obterKpisFrequencia } from './frequencia'
export { obterKpisDesempenho } from './desempenho'
export { obterKpisProgramas } from './programas'
export { obterComparativoEscolas } from './comparativo'

// ============================================================================
// AGREGADOR COMPLETO
// ============================================================================

export async function obterKpisCompletos(
  usuario: UsuarioEscopo,
  anoLetivo: string,
  incluirComparativo = false
): Promise<KpisCompletos> {
  const [gerais, frequencia, desempenho, programas] = await Promise.all([
    obterKpisGerais(anoLetivo, usuario),
    obterKpisFrequencia(anoLetivo, usuario),
    obterKpisDesempenho(anoLetivo, usuario),
    obterKpisProgramas(anoLetivo, usuario),
  ])

  const result: KpisCompletos = {
    gerais, frequencia, desempenho, programas,
    gerado_em: new Date().toISOString(),
  }

  if (incluirComparativo) {
    result.comparativo_escolas = await obterComparativoEscolas(anoLetivo, usuario)
  }

  return result
}
