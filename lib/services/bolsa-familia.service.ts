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

function calcularFaixaEtaria(dataNascimento: Date | null): string | null {
  if (!dataNascimento) return null
  const idade = Math.floor((Date.now() - dataNascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (idade >= 4 && idade <= 5) return '4_5_anos'
  if (idade >= 6 && idade <= 17) return '6_17_anos'
  return idade < 4 ? 'menor_4' : 'maior_17'
}

function minimoCondicionalidade(faixa: string | null): number {
  if (faixa === '4_5_anos') return 60
  if (faixa === '6_17_anos') return 75
  return 0  // Fora da faixa - sem condicionalidade
}

/**
 * Gera mapa de frequência para todos beneficiários no período.
 */
export async function gerarMapaPeriodo(params: {
  ano_letivo: string
  periodo: PeriodoBF
  registrado_por: string
}): Promise<{ gerados: number; com_alerta: number }> {
  const datas = PERIODO_DATAS[params.periodo]
  const inicio = `${params.ano_letivo}-${datas.inicio}`
  const fim = `${params.ano_letivo}-${datas.fim}`

  // Busca beneficiários
  const benefR = await pool.query(
    `SELECT id, data_nascimento
       FROM alunos
      WHERE beneficiario_bolsa_familia = TRUE
        AND (ativo IS NOT FALSE)`
  )

  let gerados = 0
  let comAlerta = 0

  for (const aluno of benefR.rows) {
    // Calcula frequência do aluno no período
    const freqR = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(CASE WHEN presenca IN ('P','p') THEN 1 END) AS presencas,
         COUNT(CASE WHEN presenca IN ('F','f') THEN 1 END) AS faltas
       FROM frequencia_diaria
       WHERE aluno_id = $1
         AND data BETWEEN $2::date AND $3::date`,
      [aluno.id, inicio, fim]
    ).catch(() => ({ rows: [{ total: 0, presencas: 0, faltas: 0 }] }))

    const total = parseInt(freqR.rows[0].total, 10)
    const presencas = parseInt(freqR.rows[0].presencas, 10)
    const faltas = parseInt(freqR.rows[0].faltas, 10)
    const pct = total > 0 ? Math.round((presencas / total) * 10000) / 100 : 0

    const faixa = calcularFaixaEtaria(aluno.data_nascimento ? new Date(aluno.data_nascimento) : null)
    const minimo = minimoCondicionalidade(faixa)
    const cumpre = total > 0 ? pct >= minimo : null

    await pool.query(
      `INSERT INTO bolsa_familia_mapas
        (aluno_id, ano_letivo, periodo, total_dias_letivos,
         total_faltas, total_presencas, frequencia_percentual,
         faixa_etaria, cumpre_condicionalidade, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (aluno_id, ano_letivo, periodo) DO UPDATE
         SET total_dias_letivos = EXCLUDED.total_dias_letivos,
             total_faltas = EXCLUDED.total_faltas,
             total_presencas = EXCLUDED.total_presencas,
             frequencia_percentual = EXCLUDED.frequencia_percentual,
             faixa_etaria = EXCLUDED.faixa_etaria,
             cumpre_condicionalidade = EXCLUDED.cumpre_condicionalidade,
             atualizado_em = NOW()`,
      [
        aluno.id, params.ano_letivo, params.periodo,
        total, faltas, presencas, pct,
        faixa, cumpre, params.registrado_por,
      ]
    )

    gerados++
    if (cumpre === false) comAlerta++
  }

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

  return lines.join('\n')
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
