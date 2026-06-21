/**
 * Gráfico: Acertos e Erros
 *
 * @module services/graficos/analise/acertos-erros
 */

import pool from '@/database/connection'
import { Usuario } from '@/lib/types'

import type {
  GraficosFiltros,
  AcertosErrosItem,
  AcertosErrosMeta,
} from '../types'

import {
  parseDbInt,
  safeQuery,
  getQuestaoRangeFilter,
  isEscolaIdValida,
} from '../helpers'

export async function fetchAcertosErros(
  whereClause: string,
  params: (string | null)[],
  filtros: GraficosFiltros,
  usuario: Usuario,
  deveRemoverLimites: boolean
): Promise<{ acertos_erros: AcertosErrosItem[]; acertos_erros_meta?: AcertosErrosMeta }> {
  const { disciplina, anoLetivo, poloId, escolaId, serie, turmaId, tipoEnsino } = filtros

  // SE DISCIPLINA ESPECÍFICA: Mostrar acertos/erros POR QUESTÃO
  if (disciplina) {
    const whereAcertosQuestao: string[] = []
    const paramsAcertosQuestao: (string | null)[] = []
    let paramIndexAcertos = 1

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereAcertosQuestao.push(`rp.escola_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(usuario.escola_id)
      paramIndexAcertos++
    } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereAcertosQuestao.push(`e.polo_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(usuario.polo_id)
      paramIndexAcertos++
    }

    if (anoLetivo) {
      whereAcertosQuestao.push(`rp.ano_letivo = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(anoLetivo)
      paramIndexAcertos++
    }

    if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && poloId) {
      whereAcertosQuestao.push(`e.polo_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(poloId)
      paramIndexAcertos++
    }

    if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') &&
        isEscolaIdValida(escolaId)) {
      whereAcertosQuestao.push(`rp.escola_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(escolaId)
      paramIndexAcertos++
    }

    if (serie) {
      whereAcertosQuestao.push(`rp.serie = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(serie)
      paramIndexAcertos++
    }

    if (turmaId) {
      whereAcertosQuestao.push(`rp.turma_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(turmaId)
      paramIndexAcertos++
    }

    const questaoRangeFilter = getQuestaoRangeFilter(serie, disciplina, tipoEnsino)
    if (questaoRangeFilter) {
      whereAcertosQuestao.push(questaoRangeFilter)
    }

    if (tipoEnsino === 'anos_iniciais') {
      whereAcertosQuestao.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')`)
    } else if (tipoEnsino === 'anos_finais') {
      whereAcertosQuestao.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')`)
    }

    const whereClauseAcertosQuestao = whereAcertosQuestao.length > 0
      ? `WHERE ${whereAcertosQuestao.join(' AND ')} AND rp.questao_codigo IS NOT NULL`
      : 'WHERE rp.questao_codigo IS NOT NULL'

    // Buscar total de alunos usando resultados_consolidados_unificada
    const queryTotaisAlunos = `
      SELECT
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) as total_presentes,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_faltantes,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${whereClause}
    `
    const resTotais = await safeQuery(pool, queryTotaisAlunos, params, 'fetchAcertosErros:totais')
    const totaisAlunos = resTotais[0] || { total_presentes: 0, total_faltantes: 0, total_alunos: 0 }

    const queryAcertosPorQuestao = `
      SELECT
        rp.questao_codigo as questao,
        COUNT(DISTINCT CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') THEN rp.aluno_id END) as total_presentes,
        SUM(CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') AND rp.acertou = true THEN 1 ELSE 0 END) as acertos,
        SUM(CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') AND (rp.acertou = false OR rp.acertou IS NULL) THEN 1 ELSE 0 END) as erros
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      ${whereClauseAcertosQuestao}
      GROUP BY rp.questao_codigo
      ORDER BY CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER)
    `
    const rowsQuestao = await safeQuery(pool, queryAcertosPorQuestao, paramsAcertosQuestao, 'fetchAcertosErros:questoes')

    if (rowsQuestao.length > 0) {
      const totalPresentes = parseDbInt(totaisAlunos.total_presentes)
      const totalFaltantes = parseDbInt(totaisAlunos.total_faltantes)
      const totalAlunos = parseDbInt(totaisAlunos.total_alunos)

      return {
        acertos_erros: rowsQuestao.map((r) => ({
          nome: `Q${String(r.questao ?? '').replace(/[^0-9]/g, '')}`,
          questao: String(r.questao ?? ''),
          acertos: parseDbInt(r.acertos),
          erros: parseDbInt(r.erros),
          total_alunos: parseDbInt(r.total_presentes),
          tipo: 'questao'
        })),
        acertos_erros_meta: {
          tipo: 'por_questao',
          disciplina,
          total_questoes: rowsQuestao.length,
          total_alunos_cadastrados: totalAlunos,
          total_presentes: totalPresentes,
          total_faltantes: totalFaltantes
        }
      }
    }

    return { acertos_erros: [] }
  }

  // SEM DISCIPLINA: Comportamento original (agrupado por escola/turma)
  const getQuestoesSQL = (disc: string | null, campoSerie: string = 'rc.serie') => {
    const numeroSerie = `REGEXP_REPLACE(${campoSerie}::text, '[^0-9]', '', 'g')`
    if (disc === 'LP') return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 14 ELSE 20 END`
    if (disc === 'CH') return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE 10 END`
    if (disc === 'MAT') return `CASE WHEN ${numeroSerie} IN ('2', '3') THEN 14 ELSE 20 END`
    if (disc === 'CN') return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE 10 END`
    return `CASE
      WHEN ${numeroSerie} IN ('2', '3') THEN 28
      WHEN ${numeroSerie} = '5' THEN 34
      ELSE 60
    END`
  }

  const getAcertosSQL = (disc: string | null) => {
    const numeroSerie = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`
    if (disc === 'LP') return `SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0))`
    if (disc === 'CH') return `SUM(CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) END)`
    if (disc === 'MAT') return `SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0))`
    if (disc === 'CN') return `SUM(CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0) END)`
    return `SUM(
      COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) +
      COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) +
      CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) END +
      CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0) END
    )`
  }

  // Se escola selecionada, agrupar por série e turma
  if (isEscolaIdValida(escolaId)) {
    const query = `
      SELECT
        COALESCE(t.codigo, CONCAT('Série ', rc.serie)) as nome,
        rc.serie,
        t.codigo as turma_codigo,
        ${getAcertosSQL(null)} as total_acertos,
        SUM(${getQuestoesSQL(null)}) - ${getAcertosSQL(null)} as total_erros,
        COUNT(*) as total_alunos,
        SUM(${getQuestoesSQL(null)}) as total_questoes
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      ${whereClause}
      GROUP BY rc.serie, t.codigo, t.id
      ORDER BY rc.serie, t.codigo
    `
    const rows = await safeQuery(pool, query, params, 'fetchAcertosErros:turma')
    return {
      acertos_erros: rows.length > 0
        ? rows.map((r) => ({
            nome: String(r.nome ?? '') || `Série ${r.serie}`,
            serie: String(r.serie ?? ''),
            turma: r.turma_codigo ? String(r.turma_codigo) : null,
            acertos: parseDbInt(r.total_acertos),
            erros: Math.max(0, parseDbInt(r.total_erros)),
            total_alunos: parseDbInt(r.total_alunos),
            total_questoes: parseDbInt(r.total_questoes)
          }))
        : []
    }
  }

  // Agrupar por escola
  const query = `
    SELECT
      e.nome as nome,
      ${getAcertosSQL(null)} as total_acertos,
      SUM(${getQuestoesSQL(null)}) - ${getAcertosSQL(null)} as total_erros,
      COUNT(*) as total_alunos,
      SUM(${getQuestoesSQL(null)}) as total_questoes
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
    GROUP BY e.id, e.nome
    ORDER BY e.nome
    ${deveRemoverLimites ? '' : 'LIMIT 30'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchAcertosErros:escola')
  return {
    acertos_erros: rows.length > 0
      ? rows.map((r) => ({
          nome: String(r.nome ?? ''),
          ...(!(isEscolaIdValida(escolaId)) && { escola: String(r.nome ?? '') }),
          acertos: parseDbInt(r.total_acertos),
          erros: Math.max(0, parseDbInt(r.total_erros)),
          total_alunos: parseDbInt(r.total_alunos),
          total_questoes: parseDbInt(r.total_questoes)
        }))
      : []
  }
}
