/**
 * KPIs de desempenho pedagógico: média geral, aprovação/reprovação/abandono,
 * distorção idade-série e IDEB projetado (estimativa interna).
 *
 * @module services/kpis-semed/desempenho
 */

import pool from '@/database/connection'
import { reportarErroSilencioso } from '@/lib/observabilidade/capturar-erro-silencioso'
import { poloDoUsuario, type KpisDesempenho, type UsuarioEscopo } from './types'

export async function obterKpisDesempenho(anoLetivo: string, usuario?: UsuarioEscopo): Promise<KpisDesempenho> {
  try {
    const polo = poloDoUsuario(usuario)

    // Média geral das notas finais
    const notasParams: unknown[] = [anoLetivo]
    let notasEscolaFiltro = ''
    if (polo) {
      notasParams.push(polo)
      notasEscolaFiltro = ` AND aluno_id IN (SELECT id FROM alunos WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${notasParams.length}))`
    }
    const notasR = await pool.query(
      `SELECT ROUND(AVG(CAST(nota AS NUMERIC))::numeric, 2) AS media
         FROM notas_escolares
        WHERE ano_letivo = $1 AND nota IS NOT NULL${notasEscolaFiltro}`,
      notasParams
    ).catch((error) => {
      reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisDesempenho/notas' })
      return { rows: [{}] }
    })

    // Taxa aprovação/reprovação
    const situacaoParams: unknown[] = [anoLetivo]
    let situacaoEscolaFiltro = ''
    if (polo) {
      situacaoParams.push(polo)
      situacaoEscolaFiltro = ` AND aluno_id IN (SELECT id FROM alunos WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${situacaoParams.length}))`
    }
    const situacaoR = await pool.query(
      `SELECT situacao, COUNT(*) AS total
         FROM historico_situacao
        WHERE EXTRACT(YEAR FROM data)::text = $1${situacaoEscolaFiltro}
        GROUP BY situacao`,
      situacaoParams
    ).catch((error) => {
      reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisDesempenho/situacao' })
      return { rows: [] as any[] }
    })

    const totalSituacoes = situacaoR.rows.reduce((s: number, r: any) => s + parseInt(r.total, 10), 0)
    const aprovados = situacaoR.rows.find((r: any) => r.situacao === 'aprovado')
    const reprovados = situacaoR.rows.find((r: any) => r.situacao === 'reprovado')
    // 'abandono' e 'evadido' coexistem como situações distintas em historico_situacao;
    // somar a contagem de TODAS as linhas correspondentes (find() descartaria a 2ª).
    const totalAbandono = situacaoR.rows
      .filter((r: any) => ['abandono', 'evadido'].includes(r.situacao))
      .reduce((s: number, r: any) => s + parseInt(r.total || '0', 10), 0)

    const pctAprov = totalSituacoes > 0 ? Math.round((parseInt(aprovados?.total || '0', 10) / totalSituacoes) * 1000) / 10 : null
    const pctRepr = totalSituacoes > 0 ? Math.round((parseInt(reprovados?.total || '0', 10) / totalSituacoes) * 1000) / 10 : null
    const pctAband = totalSituacoes > 0 ? Math.round((totalAbandono / totalSituacoes) * 1000) / 10 : null

    // Distorção idade-série (alunos com >=2 anos a mais que o esperado),
    // filtrada pelo ano letivo selecionado
    const distorcaoParams: unknown[] = [anoLetivo]
    let distorcaoEscolaFiltro = ''
    if (polo) {
      distorcaoParams.push(polo)
      distorcaoEscolaFiltro = ` AND a.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${distorcaoParams.length})`
    }
    const distorcaoR = await pool.query(
      `WITH expectativa AS (
         SELECT a.id,
                EXTRACT(YEAR FROM AGE(a.data_nascimento))::int AS idade,
                CASE
                  WHEN REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g') ~ '^\\d+$'
                  THEN REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g')::int + 5
                  ELSE NULL END AS idade_esperada
           FROM alunos a
          WHERE a.ativo IS NOT FALSE
            AND a.data_nascimento IS NOT NULL
            AND a.ano_letivo = $1${distorcaoEscolaFiltro}
       )
       SELECT
         COUNT(*) FILTER (WHERE idade >= idade_esperada + 2)::float /
         NULLIF(COUNT(*), 0) * 100 AS pct
         FROM expectativa
        WHERE idade_esperada IS NOT NULL`,
      distorcaoParams
    ).catch((error) => {
      reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisDesempenho/distorcao' })
      return { rows: [{}] }
    })

    const distorcao = distorcaoR.rows[0]?.pct
      ? Math.round(parseFloat(distorcaoR.rows[0].pct) * 10) / 10
      : null

    // IDEB projetado: aproximação simples = (média_nota * 0.6) + (taxa_aprovacao_pct/100 * 4)
    // É uma estimativa interna — IDEB real depende de SAEB nacional
    const media = notasR.rows[0]?.media ? parseFloat(notasR.rows[0].media) : null
    const idebProjetado = (media != null && pctAprov != null)
      ? Math.round(((media * 0.6) + (pctAprov / 100) * 4) * 10) / 10
      : null

    return {
      media_geral: media,
      taxa_aprovacao_pct: pctAprov,
      taxa_reprovacao_pct: pctRepr,
      taxa_abandono_pct: pctAband,
      distorcao_idade_serie_pct: distorcao,
      ideb_projetado: idebProjetado,
    }
  } catch (error) {
    reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisDesempenho' })
    return {
      media_geral: null, taxa_aprovacao_pct: null, taxa_reprovacao_pct: null,
      taxa_abandono_pct: null, distorcao_idade_serie_pct: null, ideb_projetado: null,
    }
  }
}
