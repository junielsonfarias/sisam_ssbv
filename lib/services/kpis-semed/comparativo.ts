/**
 * Comparativo de indicadores por escola (frequência, média, PNE, alertas FICAI).
 *
 * @module services/kpis-semed/comparativo
 */

import pool from '@/database/connection'
import { reportarErroSilencioso } from '@/lib/observabilidade/capturar-erro-silencioso'
import { poloDoUsuario, type ComparativoEscola, type UsuarioEscopo } from './types'

export async function obterComparativoEscolas(anoLetivo: string, usuario?: UsuarioEscopo): Promise<ComparativoEscola[]> {
  // Usuário 'polo' só enxerga as escolas do próprio polo (anti-vazamento).
  const polo = poloDoUsuario(usuario)
  const compParams: unknown[] = [anoLetivo]
  let poloFiltro = ''
  if (polo) {
    compParams.push(polo)
    poloFiltro = ` AND e.polo_id = $${compParams.length}`
  }
  const r = await pool.query(
    `SELECT
       e.id AS escola_id, e.nome AS escola_nome,
       p.nome AS polo_nome,
       (SELECT COUNT(*) FROM alunos a
          WHERE a.escola_id = e.id AND a.ativo IS NOT FALSE
            AND a.ano_letivo = $1) AS total_alunos,
       (SELECT COUNT(DISTINCT ae.aluno_id) FROM alunos_aee ae
          INNER JOIN alunos a ON a.id = ae.aluno_id
          WHERE a.escola_id = e.id AND a.ano_letivo = $1 AND a.ativo IS NOT FALSE) AS alunos_pne,
       (SELECT COUNT(*) FROM ficai_casos f WHERE f.escola_id = e.id AND f.ano_letivo = $1 AND f.status NOT IN ('concluido_aluno_transferido', 'concluido_resolvido', 'concluido_evasao_confirmada', 'cancelado')) AS alertas_ficai
       FROM escolas e
       LEFT JOIN polos p ON p.id = e.polo_id
      WHERE e.ativo IS NOT FALSE${poloFiltro}
      ORDER BY e.nome`,
    compParams
  ).catch((error) => {
    reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterComparativoEscolas' })
    return { rows: [] as any[] }
  })

  // Adiciona frequência e média (queries separadas para não bloquear o resto)
  for (const escola of r.rows) {
    try {
      const freq = await pool.query(
        `SELECT AVG(CASE WHEN f.status IN ('presente','justificado') THEN 100.0 ELSE 0 END) AS pct
           FROM frequencia_diaria f
           INNER JOIN alunos a ON a.id = f.aluno_id
          WHERE a.escola_id = $1
            AND f.data BETWEEN ($2 || '-01-01')::date AND ($2 || '-12-31')::date`,
        [escola.escola_id, anoLetivo]
      )
      escola.frequencia_pct = freq.rows[0]?.pct ? Math.round(parseFloat(freq.rows[0].pct) * 10) / 10 : null
    } catch (error) {
      reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterComparativoEscolas/frequencia' })
      escola.frequencia_pct = null
    }

    try {
      const nota = await pool.query(
        `SELECT AVG(CAST(ne.nota AS NUMERIC)) AS media
           FROM notas_escolares ne
           INNER JOIN alunos a ON a.id = ne.aluno_id
          WHERE a.escola_id = $1 AND ne.ano_letivo = $2 AND ne.nota IS NOT NULL`,
        [escola.escola_id, anoLetivo]
      )
      escola.media_geral = nota.rows[0]?.media ? Math.round(parseFloat(nota.rows[0].media) * 10) / 10 : null
    } catch (error) {
      reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterComparativoEscolas/media' })
      escola.media_geral = null
    }
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
