/**
 * Gráfico: Questões (Taxa de Acerto por Questão)
 *
 * @module services/graficos/analise/questoes
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { Usuario } from '@/lib/types'

import type {
  GraficosFiltros,
  QuestaoItem,
} from '../types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getQuestaoRangeFilter,
  isEscolaIdValida,
} from '../helpers'

const log = createLogger('Graficos')

export async function fetchQuestoes(
  whereClause: string,
  params: (string | null)[],
  filtros: GraficosFiltros,
  usuario: Usuario,
  deveRemoverLimites: boolean
): Promise<QuestaoItem[]> {
  const { disciplina, anoLetivo, poloId, escolaId, serie, tipoEnsino } = filtros

  const whereQuestoes: string[] = []
  const paramsQuestoes: (string | null)[] = []
  let paramIndexQuestoes = 1

  if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    whereQuestoes.push(`rp.escola_id = $${paramIndexQuestoes}`)
    paramsQuestoes.push(usuario.escola_id)
    paramIndexQuestoes++
  } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    whereQuestoes.push(`e2.polo_id = $${paramIndexQuestoes}`)
    paramsQuestoes.push(usuario.polo_id)
    paramIndexQuestoes++
  }

  if (anoLetivo) {
    whereQuestoes.push(`rp.ano_letivo = $${paramIndexQuestoes}`)
    paramsQuestoes.push(anoLetivo)
    paramIndexQuestoes++
  }

  if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && poloId) {
    whereQuestoes.push(`e2.polo_id = $${paramIndexQuestoes}`)
    paramsQuestoes.push(poloId)
    paramIndexQuestoes++
  }

  if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') &&
      isEscolaIdValida(escolaId)) {
    whereQuestoes.push(`rp.escola_id = $${paramIndexQuestoes}`)
    paramsQuestoes.push(escolaId)
    paramIndexQuestoes++
  }

  if (serie) {
    whereQuestoes.push(`rp.serie = $${paramIndexQuestoes}`)
    paramsQuestoes.push(serie)
    paramIndexQuestoes++
  }

  if (disciplina) {
    const disciplinaMap: Record<string, string> = {
      'LP': 'Língua Portuguesa',
      'MAT': 'Matemática',
      'CH': 'Ciências Humanas',
      'CN': 'Ciências da Natureza',
      'PT': 'Produção Textual'
    }
    const disciplinaNome = disciplinaMap[disciplina] || disciplina
    whereQuestoes.push(`rp.disciplina = $${paramIndexQuestoes}`)
    paramsQuestoes.push(disciplinaNome)
    paramIndexQuestoes++
  }

  if (tipoEnsino === 'anos_iniciais') {
    whereQuestoes.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')`)
  } else if (tipoEnsino === 'anos_finais') {
    whereQuestoes.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')`)
  }

  const questaoRangeFilter = getQuestaoRangeFilter(serie, disciplina, tipoEnsino)
  if (questaoRangeFilter) {
    whereQuestoes.push(questaoRangeFilter)
    log.debug('Filtro de range de questões aplicado', { data: { questaoRangeFilter } })
  }

  whereQuestoes.push(`(rp.presenca = 'P' OR rp.presenca = 'p')`)

  const whereClauseQuestoes = whereQuestoes.length > 0
    ? `WHERE ${whereQuestoes.join(' AND ')} AND rp.questao_codigo IS NOT NULL`
    : 'WHERE rp.questao_codigo IS NOT NULL'

  const query = `
    SELECT
      rp.questao_codigo as codigo,
      q.descricao,
      q.disciplina,
      q.area_conhecimento,
      COUNT(rp.id) as total_respostas,
      SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END) as total_acertos,
      ROUND(
        (SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END)::DECIMAL /
         NULLIF(COUNT(rp.id), 0)) * 100,
        2
      ) as taxa_acerto,
      CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) as numero_questao
    FROM resultados_provas rp
    LEFT JOIN questoes q ON rp.questao_codigo = q.codigo
    LEFT JOIN escolas e2 ON rp.escola_id = e2.id
    ${whereClauseQuestoes}
    GROUP BY rp.questao_codigo, q.descricao, q.disciplina, q.area_conhecimento
    ORDER BY CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) ASC
    ${deveRemoverLimites ? '' : 'LIMIT 50'}
  `
  const rows = await safeQuery(pool, query, paramsQuestoes, 'fetchQuestoes')
  return rows.length > 0
    ? rows.map((r) => ({
        codigo: String(r.codigo ?? ''),
        numero: parseDbInt(r.numero_questao),
        descricao: String(r.descricao ?? r.codigo ?? ''),
        disciplina: r.disciplina,
        area_conhecimento: r.area_conhecimento,
        total_respostas: parseDbInt(r.total_respostas),
        total_acertos: parseDbInt(r.total_acertos),
        taxa_acerto: parseDbNumber(r.taxa_acerto)
      }))
    : []
}
