/**
 * FICAI — detecção automática de infrequência.
 *
 * Deve ser chamado por job diário/semanal.
 *
 * @module services/ficai/deteccao
 */

import pool from '@/database/connection'
import { abrirCaso } from './casos'

/**
 * Verifica casos de infrequência e abre FICAIs automaticamente.
 *
 * Critérios:
 *  - >= 5 dias consecutivos de ausência registrados
 *  - >= 50% de faltas em um mês completo
 */
export async function detectarInfrequencia(anoLetivo: string): Promise<{
  ausencias_consecutivas: number
  infrequencia_50pct: number
  total_casos_abertos: number
}> {
  let ausenciasConsecutivas = 0
  let infrequencia50 = 0

  // CRITÉRIO 1: ausência consecutiva (>= 5 dias)
  // Busca alunos cujo ÚLTIMO registro de presença foi >= 5 dias atrás
  // e que têm registros de falta nesse intervalo
  // (FIX: coluna real e `status`, nao `presenca`. Valores: 'presente' /
  //  'ausente' / 'justificado' — ver add-status-justificativa-frequencia.sql)
  // .catch silencioso removido para erros aparecerem nos logs em vez de
  // mascarar detecção quebrada como "0 casos".
  const r1 = await pool.query(
    `WITH ultima_presenca AS (
       SELECT aluno_id, MAX(data) AS data
         FROM frequencia_diaria
        WHERE status = 'presente'
          AND data >= ($1 || '-01-01')::date
          AND data <= ($1 || '-12-31')::date
        GROUP BY aluno_id
     ),
     dias_falta_recente AS (
       SELECT f.aluno_id, COUNT(*) AS faltas
         FROM frequencia_diaria f
         LEFT JOIN ultima_presenca up ON up.aluno_id = f.aluno_id
        WHERE f.status = 'ausente'
          AND f.data > COALESCE(up.data, '1900-01-01'::date)
          AND f.data >= NOW() - INTERVAL '14 days'
        GROUP BY f.aluno_id
        HAVING COUNT(*) >= 5
     )
     SELECT a.id AS aluno_id, a.escola_id, df.faltas, up.data AS ultima_presenca
       FROM dias_falta_recente df
       INNER JOIN alunos a ON a.id = df.aluno_id
       LEFT JOIN ultima_presenca up ON up.aluno_id = df.aluno_id
      WHERE a.escola_id IS NOT NULL`,
    [anoLetivo]
  )

  for (const row of r1.rows) {
    const aberto = await abrirCaso({
      aluno_id: row.aluno_id,
      escola_id: row.escola_id,
      ano_letivo: anoLetivo,
      origem: 'sistema',
      motivo: 'ausencia_consecutiva',
      faltas_consecutivas: parseInt(row.faltas, 10),
      ultima_presenca: row.ultima_presenca,
    })
    if (aberto) ausenciasConsecutivas++
  }

  // CRITÉRIO 2: >= 50% de faltas no mês corrente
  // (FIX: coluna real e `status`, nao `presenca`)
  const r2 = await pool.query(
    `WITH mes_atual AS (
       SELECT aluno_id,
              COUNT(*) AS total,
              COUNT(CASE WHEN status = 'ausente' THEN 1 END) AS faltas
         FROM frequencia_diaria
        WHERE data >= date_trunc('month', NOW())::date
          AND data <= NOW()
        GROUP BY aluno_id
        HAVING COUNT(*) >= 10
           AND COUNT(CASE WHEN status = 'ausente' THEN 1 END)::float / NULLIF(COUNT(*), 0) >= 0.5
     )
     SELECT a.id AS aluno_id, a.escola_id, m.faltas, m.total,
            (m.faltas::float / m.total * 100)::numeric(5,2) AS pct
       FROM mes_atual m
       INNER JOIN alunos a ON a.id = m.aluno_id
      WHERE a.escola_id IS NOT NULL`
  )

  for (const row of r2.rows) {
    const aberto = await abrirCaso({
      aluno_id: row.aluno_id,
      escola_id: row.escola_id,
      ano_letivo: anoLetivo,
      origem: 'sistema',
      motivo: 'infrequencia_50',
      pct_faltas_mes: parseFloat(row.pct),
    })
    if (aberto) infrequencia50++
  }

  return {
    ausencias_consecutivas: ausenciasConsecutivas,
    infrequencia_50pct: infrequencia50,
    total_casos_abertos: ausenciasConsecutivas + infrequencia50,
  }
}
