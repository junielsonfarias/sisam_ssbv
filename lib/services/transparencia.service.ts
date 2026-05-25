/**
 * Service de Transparência Cidadã — dados agregados públicos.
 *
 * Apenas indicadores agregados, sem dados individuais identificáveis.
 * Conforme Lei de Acesso à Informação (12.527/2011) + LGPD anonimização.
 *
 * Cobertura:
 *  - Total de alunos por escola
 *  - Médias agregadas por série
 *  - % aprovação por escola
 *  - PDDE: orçamento recebido e executado por escola
 *  - Frequência média
 *  - Atendimento PNAE
 *  - Eventos do calendário escolar
 *
 * @module services/transparencia
 */

import pool from '@/database/connection'

export interface ResumoMunicipal {
  ano_letivo: string
  total_alunos: number
  total_escolas: number
  total_professores: number
  alunos_atendidos_pnae: number
  alunos_transporte: number
  alunos_pne: number
  alunos_bolsa_familia: number
  pdde_recebido_total: number
  pdde_executado_total: number
  atualizado_em: string
}

export interface EscolaPublica {
  id: string
  nome: string
  polo_nome: string | null
  endereco: string | null
  total_alunos: number
  modalidades: string[]
  frequencia_media_pct: number | null
  pdde_recebido: number
  pdde_executado: number
}

export interface IndicadoresEscola {
  escola: EscolaPublica
  serie_resumo: Array<{
    serie: string
    total_alunos: number
    media_geral: number | null
    taxa_aprovacao_pct: number | null
  }>
}

export async function resumoMunicipal(anoLetivo: string): Promise<ResumoMunicipal> {
  const geral = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM alunos WHERE ativo IS NOT FALSE) AS alunos,
       (SELECT COUNT(*) FROM escolas WHERE ativa IS NOT FALSE) AS escolas,
       (SELECT COUNT(*) FROM usuarios WHERE tipo_usuario='professor' AND ativo IS NOT FALSE) AS professores,
       (SELECT COUNT(DISTINCT aluno_id) FROM alunos_aee) AS pne,
       (SELECT COUNT(*) FROM alunos WHERE beneficiario_bolsa_familia=TRUE) AS bf,
       (SELECT COUNT(DISTINCT aluno_id) FROM pnate_alunos_rotas WHERE ativo=TRUE) AS transporte`
  ).catch(() => ({ rows: [{}] }))

  const pnae = await pool.query(
    `SELECT COALESCE(SUM(qtd_alunos), 0) AS total
       FROM pnae_atendimentos_diarios
      WHERE EXTRACT(YEAR FROM data_atendimento) = $1`,
    [anoLetivo]
  ).catch(() => ({ rows: [{ total: 0 }] }))

  const pdde = await pool.query(
    `SELECT
       COALESCE(SUM(valor_recebido), 0) AS recebido,
       COALESCE(SUM(valor_executado), 0) AS executado
       FROM pdde_saldos WHERE ano_letivo = $1`,
    [anoLetivo]
  ).catch(() => ({ rows: [{}] }))

  return {
    ano_letivo: anoLetivo,
    total_alunos: parseInt(geral.rows[0]?.alunos || '0', 10),
    total_escolas: parseInt(geral.rows[0]?.escolas || '0', 10),
    total_professores: parseInt(geral.rows[0]?.professores || '0', 10),
    alunos_atendidos_pnae: parseInt(pnae.rows[0]?.total || '0', 10),
    alunos_transporte: parseInt(geral.rows[0]?.transporte || '0', 10),
    alunos_pne: parseInt(geral.rows[0]?.pne || '0', 10),
    alunos_bolsa_familia: parseInt(geral.rows[0]?.bf || '0', 10),
    pdde_recebido_total: parseFloat(pdde.rows[0]?.recebido || '0'),
    pdde_executado_total: parseFloat(pdde.rows[0]?.executado || '0'),
    atualizado_em: new Date().toISOString(),
  }
}

export async function listarEscolasPublicas(anoLetivo: string): Promise<EscolaPublica[]> {
  const r = await pool.query(
    `SELECT e.id, e.nome, e.endereco, p.nome AS polo_nome,
            (SELECT COUNT(*) FROM alunos a WHERE a.escola_id = e.id AND a.ativo IS NOT FALSE) AS total_alunos,
            (SELECT ARRAY_AGG(DISTINCT modalidade) FROM turmas WHERE escola_id = e.id) AS modalidades
       FROM escolas e
       LEFT JOIN polos p ON p.id = e.polo_id
      WHERE e.ativa IS NOT FALSE
      ORDER BY e.nome`
  ).catch(() => ({ rows: [] }))

  const escolas: EscolaPublica[] = []
  for (const row of r.rows) {
    // Frequência média
    let freq: number | null = null
    try {
      const f = await pool.query(
        `SELECT AVG(CASE WHEN presenca IN ('P','p') THEN 100.0 ELSE 0 END) AS pct
           FROM frequencia_diaria f
           INNER JOIN alunos a ON a.id = f.aluno_id
          WHERE a.escola_id = $1
            AND f.data BETWEEN ($2 || '-01-01')::date AND ($2 || '-12-31')::date`,
        [row.id, anoLetivo]
      )
      freq = f.rows[0]?.pct ? Math.round(parseFloat(f.rows[0].pct) * 10) / 10 : null
    } catch { /* ignora */ }

    // PDDE
    let pddeRec = 0, pddeExec = 0
    try {
      const p = await pool.query(
        `SELECT COALESCE(SUM(valor_recebido), 0) AS rec,
                COALESCE(SUM(valor_executado), 0) AS exe
           FROM pdde_saldos WHERE escola_id = $1 AND ano_letivo = $2`,
        [row.id, anoLetivo]
      )
      pddeRec = parseFloat(p.rows[0]?.rec || '0')
      pddeExec = parseFloat(p.rows[0]?.exe || '0')
    } catch { /* ignora */ }

    escolas.push({
      id: row.id,
      nome: row.nome,
      polo_nome: row.polo_nome,
      endereco: row.endereco,
      total_alunos: parseInt(row.total_alunos || '0', 10),
      modalidades: Array.isArray(row.modalidades) ? row.modalidades.filter(Boolean) : [],
      frequencia_media_pct: freq,
      pdde_recebido: pddeRec,
      pdde_executado: pddeExec,
    })
  }
  return escolas
}

export async function indicadoresEscola(escolaId: string, anoLetivo: string): Promise<IndicadoresEscola | null> {
  const escolas = await listarEscolasPublicas(anoLetivo)
  const escola = escolas.find((e) => e.id === escolaId)
  if (!escola) return null

  const serieR = await pool.query(
    `SELECT a.serie,
            COUNT(*) AS total_alunos
       FROM alunos a
      WHERE a.escola_id = $1 AND a.ativo IS NOT FALSE
      GROUP BY a.serie
      ORDER BY a.serie`,
    [escolaId]
  )

  const serieResumo = []
  for (const row of serieR.rows) {
    let media: number | null = null
    let aprovados: number | null = null
    try {
      const m = await pool.query(
        `SELECT AVG(CAST(ne.nota AS NUMERIC)) AS media
           FROM notas_escolares ne
           INNER JOIN alunos a ON a.id = ne.aluno_id
          WHERE a.escola_id = $1 AND a.serie = $2 AND ne.ano_letivo = $3 AND ne.nota IS NOT NULL`,
        [escolaId, row.serie, anoLetivo]
      )
      media = m.rows[0]?.media ? Math.round(parseFloat(m.rows[0].media) * 10) / 10 : null

      const sit = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE situacao = 'aprovado') AS aprovados,
           COUNT(*) AS total
         FROM historico_situacao hs
         INNER JOIN alunos a ON a.id = hs.aluno_id
         WHERE a.escola_id = $1 AND hs.serie = $2 AND hs.ano_letivo = $3`,
        [escolaId, row.serie, anoLetivo]
      )
      const total = parseInt(sit.rows[0]?.total || '0', 10)
      aprovados = total > 0 ? Math.round((parseInt(sit.rows[0]?.aprovados || '0', 10) / total) * 1000) / 10 : null
    } catch { /* ignora */ }

    serieResumo.push({
      serie: row.serie,
      total_alunos: parseInt(row.total_alunos, 10),
      media_geral: media,
      taxa_aprovacao_pct: aprovados,
    })
  }

  return { escola, serie_resumo: serieResumo }
}
