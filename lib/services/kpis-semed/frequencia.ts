/**
 * KPIs de frequência: frequência média, alunos infrequentes e risco de evasão (FICAI).
 *
 * @module services/kpis-semed/frequencia
 */

import pool from '@/database/connection'
import { poloDoUsuario, type KpisFrequencia, type UsuarioEscopo } from './types'

export async function obterKpisFrequencia(anoLetivo: string, usuario?: UsuarioEscopo): Promise<KpisFrequencia> {
  try {
    const polo = poloDoUsuario(usuario)
    const freqParams: unknown[] = [anoLetivo]
    let freqEscolaFiltro = ''
    if (polo) {
      freqParams.push(polo)
      // Restringe a frequência aos alunos das escolas do polo.
      freqEscolaFiltro = ` AND aluno_id IN (SELECT id FROM alunos WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${freqParams.length}))`
    }

    const r = await pool.query(
      `WITH freq_aluno AS (
         SELECT
           aluno_id,
           COUNT(*) AS total,
           COUNT(CASE WHEN status IN ('presente','justificado') THEN 1 END) AS presencas
           FROM frequencia_diaria
          WHERE data BETWEEN ($1 || '-01-01')::date AND ($1 || '-12-31')::date${freqEscolaFiltro}
          GROUP BY aluno_id
       )
       SELECT
         ROUND(AVG(presencas::float / NULLIF(total, 0) * 100)::numeric, 1) AS freq_media,
         COUNT(*) FILTER (WHERE presencas::float / NULLIF(total, 0) < 0.75) AS infrequentes
         FROM freq_aluno`,
      freqParams
    )
    const ficaiParams: unknown[] = [anoLetivo]
    let ficaiEscolaFiltro = ''
    if (polo) {
      ficaiParams.push(polo)
      ficaiEscolaFiltro = ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${ficaiParams.length})`
    }
    const ficaiR = await pool.query(
      `SELECT COUNT(*) AS total FROM ficai_casos
        WHERE ano_letivo = $1${ficaiEscolaFiltro}
          AND status IN ('aberto', 'contato_responsavel', 'aluno_retornou',
                         'encaminhado_conselho_tutelar', 'encaminhado_ministerio_publico')`,
      ficaiParams
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
