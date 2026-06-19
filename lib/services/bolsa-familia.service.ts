/**
 * Service Bolsa Família — Mapa de Frequência Escolar.
 *
 * Calcula frequência por aluno beneficiário em cada período bimestral
 * do Sistema Presença (MEC) e gera CSV pronto para envio.
 *
 * Condicionalidades:
 *  - 60% mínimo para faixa 4-5 anos
 *  - 75% mínimo para faixa 6-17 anos
 *
 * @module services/bolsa-familia
 */

import pool from '@/database/connection'

export type PeriodoBF = 'fev_abr' | 'mai_jun' | 'ago_set' | 'out_nov' | 'dez'

export const PERIODO_DATAS: Record<PeriodoBF, { inicio: string; fim: string }> = {
  fev_abr: { inicio: '02-01', fim: '04-30' },
  mai_jun: { inicio: '05-01', fim: '06-30' },
  ago_set: { inicio: '08-01', fim: '09-30' },
  out_nov: { inicio: '10-01', fim: '11-30' },
  dez:     { inicio: '12-01', fim: '12-31' },
}

export const PERIODO_LABEL: Record<PeriodoBF, string> = {
  fev_abr: 'Fevereiro a Abril',
  mai_jun: 'Maio a Junho',
  ago_set: 'Agosto a Setembro',
  out_nov: 'Outubro a Novembro',
  dez:     'Dezembro',
}

/**
 * Gera mapa de frequência para todos beneficiários no período.
 *
 * Presença é determinada por `status = 'presente'` em frequencia_diaria — mesma
 * convenção do resto do sistema (boletim, FICAI, dashboards). Antes usava
 * `hora_entrada IS NOT NULL`, que só é preenchido por face/QR; presença manual
 * (status='presente' sem hora) era contada como falta e gerava alerta falso de
 * condicionalidade em escolas sem terminal facial. Falta justificada NÃO conta
 * como presença (tem campo `motivo_baixa_frequencia` próprio no mapa).
 * Dias letivos aproximados por dias úteis (seg-sex) no período — para precisão
 * por escola, futuramente integrar com contar_dias_letivos() do calendario.
 */
export async function gerarMapaPeriodo(params: {
  ano_letivo: string
  periodo: PeriodoBF
  registrado_por: string
}): Promise<{ gerados: number; com_alerta: number }> {
  const datas = PERIODO_DATAS[params.periodo]
  const inicio = `${params.ano_letivo}-${datas.inicio}`
  const fim = `${params.ano_letivo}-${datas.fim}`

  const r = await pool.query(
    `WITH dias_uteis AS (
       SELECT COUNT(*)::int AS qtd
         FROM generate_series($1::date, $2::date, INTERVAL '1 day') d
        WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
     ),
     aluno_freq AS (
       SELECT a.id, a.data_nascimento, COUNT(f.id)::int AS presencas
         FROM alunos a
         LEFT JOIN frequencia_diaria f
           ON f.aluno_id = a.id
          AND f.data BETWEEN $1::date AND $2::date
          AND f.status = 'presente'
        WHERE a.beneficiario_bolsa_familia = TRUE
          AND COALESCE(a.ativo, TRUE) = TRUE
        GROUP BY a.id, a.data_nascimento
     ),
     calc AS (
       SELECT
         af.id AS aluno_id,
         du.qtd AS total_dias_letivos,
         af.presencas,
         GREATEST(du.qtd - af.presencas, 0)::int AS total_faltas,
         CASE WHEN du.qtd > 0
              THEN ROUND(af.presencas::numeric * 100.0 / du.qtd, 2)
              ELSE 0::numeric END AS pct,
         CASE
           WHEN af.data_nascimento IS NULL THEN NULL
           WHEN EXTRACT(YEAR FROM AGE(af.data_nascimento))::int BETWEEN 4 AND 5 THEN '4_5_anos'
           WHEN EXTRACT(YEAR FROM AGE(af.data_nascimento))::int BETWEEN 6 AND 17 THEN '6_17_anos'
           WHEN EXTRACT(YEAR FROM AGE(af.data_nascimento))::int < 4 THEN 'menor_4'
           ELSE 'maior_17'
         END AS faixa
       FROM aluno_freq af CROSS JOIN dias_uteis du
     )
     INSERT INTO bolsa_familia_mapas
       (aluno_id, ano_letivo, periodo, total_dias_letivos,
        total_faltas, total_presencas, frequencia_percentual,
        faixa_etaria, cumpre_condicionalidade, registrado_por)
     SELECT
       c.aluno_id, $3, $4,
       c.total_dias_letivos, c.total_faltas, c.presencas, c.pct,
       c.faixa,
       CASE
         WHEN c.total_dias_letivos = 0 THEN NULL
         WHEN c.faixa = '4_5_anos' THEN (c.pct >= 60)
         WHEN c.faixa = '6_17_anos' THEN (c.pct >= 75)
         ELSE NULL
       END,
       $5
     FROM calc c
     ON CONFLICT (aluno_id, ano_letivo, periodo) DO UPDATE
       SET total_dias_letivos = EXCLUDED.total_dias_letivos,
           total_faltas = EXCLUDED.total_faltas,
           total_presencas = EXCLUDED.total_presencas,
           frequencia_percentual = EXCLUDED.frequencia_percentual,
           faixa_etaria = EXCLUDED.faixa_etaria,
           cumpre_condicionalidade = EXCLUDED.cumpre_condicionalidade,
           atualizado_em = NOW()
     RETURNING cumpre_condicionalidade`,
    [inicio, fim, params.ano_letivo, params.periodo, params.registrado_por]
  )

  const gerados = r.rowCount ?? 0
  const comAlerta = r.rows.filter((row) => row.cumpre_condicionalidade === false).length

  return { gerados, com_alerta: comAlerta }
}

export async function listarMapas(params: {
  ano_letivo: string
  periodo?: PeriodoBF
  apenas_alertas?: boolean
  escola_id?: string
}) {
  const conds: string[] = ['m.ano_letivo = $1']
  const queryParams: unknown[] = [params.ano_letivo]
  let i = 2

  if (params.periodo) {
    queryParams.push(params.periodo)
    conds.push(`m.periodo = $${i++}`)
  }
  if (params.apenas_alertas) {
    conds.push(`m.cumpre_condicionalidade = FALSE`)
  }
  if (params.escola_id) {
    queryParams.push(params.escola_id)
    conds.push(`a.escola_id = $${i++}`)
  }

  const r = await pool.query(
    `SELECT m.*, a.nome AS aluno_nome, a.nis, a.codigo_familiar,
            a.data_nascimento, t.codigo AS turma_codigo,
            e.nome AS escola_nome
       FROM bolsa_familia_mapas m
       INNER JOIN alunos a ON a.id = m.aluno_id
       LEFT JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN escolas e ON e.id = a.escola_id
      WHERE ${conds.join(' AND ')}
      ORDER BY e.nome, t.codigo, a.nome`,
    queryParams
  )
  return r.rows
}

/**
 * Gera CSV no formato simplificado do Sistema Presença MEC.
 */
export async function exportarCsvSistemaPresenca(params: {
  ano_letivo: string
  periodo: PeriodoBF
  escola_id?: string
}): Promise<string> {
  const mapas = await listarMapas({
    ano_letivo: params.ano_letivo,
    periodo: params.periodo,
    escola_id: params.escola_id,
  })

  // Cabeçalho compatível com Sistema Presença (simplificado)
  const lines: string[] = [
    'NIS,CODIGO_FAMILIAR,NOME_ALUNO,DATA_NASCIMENTO,FAIXA,TOTAL_DIAS,TOTAL_PRESENCAS,TOTAL_FALTAS,FREQUENCIA_PCT,CUMPRE_CONDICIONALIDADE,MOTIVO_BAIXA',
  ]

  for (const m of mapas) {
    const motivo = m.motivo_baixa_frequencia ? `"${String(m.motivo_baixa_frequencia).replace(/"/g, '""')}"` : ''
    lines.push([
      m.nis || '',
      m.codigo_familiar || '',
      `"${String(m.aluno_nome).replace(/"/g, '""')}"`,
      m.data_nascimento || '',
      m.faixa_etaria || '',
      m.total_dias_letivos,
      m.total_presencas,
      m.total_faltas,
      m.frequencia_percentual,
      m.cumpre_condicionalidade === null ? '' : (m.cumpre_condicionalidade ? 'SIM' : 'NAO'),
      motivo,
    ].join(','))
  }

  // ﻿ = BOM UTF-8 para o Excel abrir com acentos corretos
  return '﻿' + lines.join('\n')
}

export async function registrarJustificativa(params: {
  mapa_id: string
  motivo: string
}): Promise<boolean> {
  const r = await pool.query(
    `UPDATE bolsa_familia_mapas
       SET motivo_baixa_frequencia = $2, atualizado_em = NOW()
     WHERE id = $1`,
    [params.mapa_id, params.motivo]
  )
  return (r.rowCount ?? 0) > 0
}
