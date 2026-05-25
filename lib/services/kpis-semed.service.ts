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
 * @module services/kpis-semed
 */

import pool from '@/database/connection'

export interface KpisGerais {
  total_alunos: number
  total_escolas: number
  total_professores: number
  total_servidores: number
  alunos_pne: number
  alunos_bf: number
  ano_letivo: string
}

export interface KpisFrequencia {
  frequencia_media_pct: number
  alunos_infrequentes: number  // < 75%
  alunos_evasao_risco: number  // FICAI abertos
}

export interface KpisDesempenho {
  media_geral: number | null
  taxa_aprovacao_pct: number | null
  taxa_reprovacao_pct: number | null
  taxa_abandono_pct: number | null
  distorcao_idade_serie_pct: number | null
  ideb_projetado: number | null
}

export interface KpisProgramas {
  pnae_refeicoes_mes: number
  pnate_alunos_atendidos: number
  pdde_executado_pct: number | null
  ordens_servico_abertas: number
  ordens_servico_urgentes: number
}

export interface KpisCompletos {
  gerais: KpisGerais
  frequencia: KpisFrequencia
  desempenho: KpisDesempenho
  programas: KpisProgramas
  comparativo_escolas?: ComparativoEscola[]
  gerado_em: string
}

export interface ComparativoEscola {
  escola_id: string
  escola_nome: string
  polo_nome: string | null
  total_alunos: number
  frequencia_pct: number | null
  media_geral: number | null
  alunos_pne: number
  alertas_ficai: number
}

// ============================================================================
// KPIs GERAIS
// ============================================================================

export async function obterKpisGerais(anoLetivo: string): Promise<KpisGerais> {
  const r = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM alunos WHERE ativo IS NOT FALSE) AS total_alunos,
       (SELECT COUNT(*) FROM escolas WHERE ativa IS NOT FALSE) AS total_escolas,
       (SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = 'professor' AND ativo IS NOT FALSE) AS total_professores,
       (SELECT COUNT(*) FROM servidores WHERE ativo = TRUE) AS total_servidores,
       (SELECT COUNT(DISTINCT aluno_id) FROM alunos_aee) AS alunos_pne,
       (SELECT COUNT(*) FROM alunos WHERE beneficiario_bolsa_familia = TRUE) AS alunos_bf`
  ).catch(() => ({ rows: [{}] }))

  const row = r.rows[0]
  return {
    total_alunos: parseInt(row.total_alunos || '0', 10),
    total_escolas: parseInt(row.total_escolas || '0', 10),
    total_professores: parseInt(row.total_professores || '0', 10),
    total_servidores: parseInt(row.total_servidores || '0', 10),
    alunos_pne: parseInt(row.alunos_pne || '0', 10),
    alunos_bf: parseInt(row.alunos_bf || '0', 10),
    ano_letivo: anoLetivo,
  }
}

// ============================================================================
// FREQUÊNCIA
// ============================================================================

export async function obterKpisFrequencia(anoLetivo: string): Promise<KpisFrequencia> {
  try {
    const r = await pool.query(
      `WITH freq_aluno AS (
         SELECT
           aluno_id,
           COUNT(*) AS total,
           COUNT(CASE WHEN presenca IN ('P','p') THEN 1 END) AS presencas
           FROM frequencia_diaria
          WHERE data BETWEEN ($1 || '-01-01')::date AND ($1 || '-12-31')::date
          GROUP BY aluno_id
       )
       SELECT
         ROUND(AVG(presencas::float / NULLIF(total, 0) * 100)::numeric, 1) AS freq_media,
         COUNT(*) FILTER (WHERE presencas::float / NULLIF(total, 0) < 0.75) AS infrequentes
         FROM freq_aluno`,
      [anoLetivo]
    )
    const ficaiR = await pool.query(
      `SELECT COUNT(*) AS total FROM ficai_casos
        WHERE ano_letivo = $1
          AND status IN ('aberto', 'contato_responsavel', 'aluno_retornou',
                         'encaminhado_conselho_tutelar', 'encaminhado_ministerio_publico')`,
      [anoLetivo]
    )

    return {
      frequencia_media_pct: parseFloat(r.rows[0]?.freq_media || '0'),
      alunos_infrequentes: parseInt(r.rows[0]?.infrequentes || '0', 10),
      alunos_evasao_risco: parseInt(ficaiR.rows[0]?.total || '0', 10),
    }
  } catch {
    return { frequencia_media_pct: 0, alunos_infrequentes: 0, alunos_evasao_risco: 0 }
  }
}

// ============================================================================
// DESEMPENHO PEDAGÓGICO
// ============================================================================

export async function obterKpisDesempenho(anoLetivo: string): Promise<KpisDesempenho> {
  try {
    // Média geral das notas finais
    const notasR = await pool.query(
      `SELECT ROUND(AVG(CAST(nota AS NUMERIC))::numeric, 2) AS media
         FROM notas_escolares
        WHERE ano_letivo = $1 AND nota IS NOT NULL`,
      [anoLetivo]
    ).catch(() => ({ rows: [{}] }))

    // Taxa aprovação/reprovação
    const situacaoR = await pool.query(
      `SELECT situacao, COUNT(*) AS total
         FROM historico_situacao
        WHERE ano_letivo = $1
        GROUP BY situacao`,
      [anoLetivo]
    ).catch(() => ({ rows: [] }))

    const totalSituacoes = situacaoR.rows.reduce((s: number, r: any) => s + parseInt(r.total, 10), 0)
    const aprovados = situacaoR.rows.find((r: any) => r.situacao === 'aprovado')
    const reprovados = situacaoR.rows.find((r: any) => r.situacao === 'reprovado')
    const abandono = situacaoR.rows.find((r: any) => ['abandono', 'evadido'].includes(r.situacao))

    const pctAprov = totalSituacoes > 0 ? Math.round((parseInt(aprovados?.total || '0', 10) / totalSituacoes) * 1000) / 10 : null
    const pctRepr = totalSituacoes > 0 ? Math.round((parseInt(reprovados?.total || '0', 10) / totalSituacoes) * 1000) / 10 : null
    const pctAband = totalSituacoes > 0 ? Math.round((parseInt(abandono?.total || '0', 10) / totalSituacoes) * 1000) / 10 : null

    // Distorção idade-série (alunos com >=2 anos a mais que o esperado)
    const distorcaoR = await pool.query(
      `WITH expectativa AS (
         SELECT a.id,
                EXTRACT(YEAR FROM AGE(a.data_nascimento))::int AS idade,
                CASE
                  WHEN REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g') ~ '^\\d+$'
                  THEN REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g')::int + 5
                  ELSE NULL END AS idade_esperada
           FROM alunos a
          WHERE a.ativo IS NOT FALSE AND a.data_nascimento IS NOT NULL
       )
       SELECT
         COUNT(*) FILTER (WHERE idade >= idade_esperada + 2)::float /
         NULLIF(COUNT(*), 0) * 100 AS pct
         FROM expectativa
        WHERE idade_esperada IS NOT NULL`
    ).catch(() => ({ rows: [{}] }))

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
  } catch {
    return {
      media_geral: null, taxa_aprovacao_pct: null, taxa_reprovacao_pct: null,
      taxa_abandono_pct: null, distorcao_idade_serie_pct: null, ideb_projetado: null,
    }
  }
}

// ============================================================================
// PROGRAMAS FEDERAIS
// ============================================================================

export async function obterKpisProgramas(anoLetivo: string): Promise<KpisProgramas> {
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const pnae = await pool.query(
    `SELECT COALESCE(SUM(qtd_alunos), 0) AS total
       FROM pnae_atendimentos_diarios
      WHERE EXTRACT(YEAR FROM data_atendimento) = $1
        AND EXTRACT(MONTH FROM data_atendimento) = $2`,
    [anoAtual, mesAtual]
  ).catch(() => ({ rows: [{ total: 0 }] }))

  const pnate = await pool.query(
    `SELECT COUNT(DISTINCT aluno_id) AS total
       FROM pnate_alunos_rotas WHERE ativo = TRUE`
  ).catch(() => ({ rows: [{ total: 0 }] }))

  const pdde = await pool.query(
    `SELECT
       SUM(valor_recebido) AS recebido,
       SUM(valor_executado) AS executado
       FROM pdde_saldos WHERE ano_letivo = $1`,
    [anoLetivo]
  ).catch(() => ({ rows: [{}] }))

  const pddeRow = pdde.rows[0] || {}
  const pddePct = pddeRow.recebido && parseFloat(pddeRow.recebido) > 0
    ? Math.round((parseFloat(pddeRow.executado || '0') / parseFloat(pddeRow.recebido)) * 1000) / 10
    : null

  const os = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('concluida','cancelada')) AS abertas,
       COUNT(*) FILTER (WHERE status NOT IN ('concluida','cancelada') AND prioridade = 'urgente') AS urgentes
       FROM ordens_servico`
  ).catch(() => ({ rows: [{ abertas: 0, urgentes: 0 }] }))

  return {
    pnae_refeicoes_mes: parseInt(pnae.rows[0]?.total || '0', 10),
    pnate_alunos_atendidos: parseInt(pnate.rows[0]?.total || '0', 10),
    pdde_executado_pct: pddePct,
    ordens_servico_abertas: parseInt(os.rows[0]?.abertas || '0', 10),
    ordens_servico_urgentes: parseInt(os.rows[0]?.urgentes || '0', 10),
  }
}

// ============================================================================
// COMPARATIVO POR ESCOLA
// ============================================================================

export async function obterComparativoEscolas(anoLetivo: string): Promise<ComparativoEscola[]> {
  const r = await pool.query(
    `SELECT
       e.id AS escola_id, e.nome AS escola_nome,
       p.nome AS polo_nome,
       (SELECT COUNT(*) FROM alunos a WHERE a.escola_id = e.id AND a.ativo IS NOT FALSE) AS total_alunos,
       (SELECT COUNT(*) FROM alunos a INNER JOIN alunos_aee ae ON ae.aluno_id = a.id WHERE a.escola_id = e.id) AS alunos_pne,
       (SELECT COUNT(*) FROM ficai_casos f WHERE f.escola_id = e.id AND f.ano_letivo = $1 AND f.status NOT IN ('concluido_aluno_transferido', 'concluido_resolvido', 'concluido_evasao_confirmada', 'cancelado')) AS alertas_ficai
       FROM escolas e
       LEFT JOIN polos p ON p.id = e.polo_id
      WHERE e.ativa IS NOT FALSE
      ORDER BY e.nome`,
    [anoLetivo]
  ).catch(() => ({ rows: [] }))

  // Adiciona frequência e média (queries separadas para não bloquear o resto)
  for (const escola of r.rows) {
    try {
      const freq = await pool.query(
        `SELECT AVG(CASE WHEN presenca IN ('P','p') THEN 100.0 ELSE 0 END) AS pct
           FROM frequencia_diaria f
           INNER JOIN alunos a ON a.id = f.aluno_id
          WHERE a.escola_id = $1
            AND f.data BETWEEN ($2 || '-01-01')::date AND ($2 || '-12-31')::date`,
        [escola.escola_id, anoLetivo]
      )
      escola.frequencia_pct = freq.rows[0]?.pct ? Math.round(parseFloat(freq.rows[0].pct) * 10) / 10 : null
    } catch { escola.frequencia_pct = null }

    try {
      const nota = await pool.query(
        `SELECT AVG(CAST(ne.nota AS NUMERIC)) AS media
           FROM notas_escolares ne
           INNER JOIN alunos a ON a.id = ne.aluno_id
          WHERE a.escola_id = $1 AND ne.ano_letivo = $2 AND ne.nota IS NOT NULL`,
        [escola.escola_id, anoLetivo]
      )
      escola.media_geral = nota.rows[0]?.media ? Math.round(parseFloat(nota.rows[0].media) * 10) / 10 : null
    } catch { escola.media_geral = null }
  }

  return r.rows.map((row: any) => ({
    escola_id: row.escola_id,
    escola_nome: row.escola_nome,
    polo_nome: row.polo_nome,
    total_alunos: parseInt(row.total_alunos || '0', 10),
    frequencia_pct: row.frequencia_pct,
    media_geral: row.media_geral,
    alunos_pne: parseInt(row.alunos_pne || '0', 10),
    alertas_ficai: parseInt(row.alertas_ficai || '0', 10),
  }))
}

// ============================================================================
// AGREGADOR COMPLETO
// ============================================================================

export async function obterKpisCompletos(
  anoLetivo: string,
  incluirComparativo = false
): Promise<KpisCompletos> {
  const [gerais, frequencia, desempenho, programas] = await Promise.all([
    obterKpisGerais(anoLetivo),
    obterKpisFrequencia(anoLetivo),
    obterKpisDesempenho(anoLetivo),
    obterKpisProgramas(anoLetivo),
  ])

  const result: KpisCompletos = {
    gerais, frequencia, desempenho, programas,
    gerado_em: new Date().toISOString(),
  }

  if (incluirComparativo) {
    result.comparativo_escolas = await obterComparativoEscolas(anoLetivo)
  }

  return result
}
