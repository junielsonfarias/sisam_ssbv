import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'

// ============================================================================
// Service de Notas — lógica compartilhada entre admin e professor
// ============================================================================

interface NotaInput {
  aluno_id: string
  nota?: number | null
  nota_recuperacao?: number | null
  faltas?: number
  observacao?: string | null
  conceito?: string | null
  parecer_descritivo?: string | null
}

interface ConfigNotas {
  nota_maxima: number
  media_aprovacao: number
  permite_recuperacao: boolean
}

/**
 * Calcula nota_final com base em nota, recuperação e config.
 * Lógica centralizada — usada por admin e professor.
 */
export function calcularNotaFinal(
  nota: number | null | undefined,
  notaRecuperacao: number | null | undefined,
  config: ConfigNotas
): number | null {
  if (nota === null || nota === undefined) return null

  const notaNum = typeof nota === 'number' ? nota : parseFloat(String(nota))
  if (isNaN(notaNum)) return null

  let notaFinal = Math.max(0, notaNum)

  if (notaRecuperacao !== null && notaRecuperacao !== undefined && config.permite_recuperacao) {
    const recNum = typeof notaRecuperacao === 'number' ? notaRecuperacao : parseFloat(String(notaRecuperacao))
    if (!isNaN(recNum) && recNum > notaFinal) {
      notaFinal = recNum
    }
  }

  notaFinal = Math.max(0, Math.min(notaFinal, config.nota_maxima))
  notaFinal = Math.round(notaFinal * 100) / 100

  return isNaN(notaFinal) ? null : notaFinal
}

/**
 * Busca config de notas de uma escola/ano
 */
export async function buscarConfigNotas(escolaId: string, anoLetivo: string): Promise<ConfigNotas> {
  const result = await pool.query(
    'SELECT nota_maxima, media_aprovacao, permite_recuperacao FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2',
    [escolaId, anoLetivo]
  )
  if (result.rows.length > 0) {
    return {
      nota_maxima: parseFloat(result.rows[0].nota_maxima) || 10,
      media_aprovacao: parseFloat(result.rows[0].media_aprovacao) || 6,
      permite_recuperacao: result.rows[0].permite_recuperacao ?? true,
    }
  }
  return { nota_maxima: 10, media_aprovacao: 6, permite_recuperacao: true }
}

/**
 * Busca notas de alunos para uma turma/disciplina/período
 */
export async function buscarNotas(turmaId: string, disciplinaId: string, periodoId: string) {
  const result = await pool.query(
    `SELECT a.id as aluno_id, a.nome as aluno_nome, a.codigo as aluno_codigo,
            n.id as nota_id, n.nota, n.nota_recuperacao, n.nota_final,
            n.faltas, n.observacao, n.conceito, n.parecer_descritivo,
            n.registrado_por
     FROM alunos a
     LEFT JOIN notas_escolares n ON n.aluno_id = a.id AND n.disciplina_id = $2 AND n.periodo_id = $3
     WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
     ORDER BY a.nome`,
    [turmaId, disciplinaId, periodoId]
  )
  return result.rows
}

/**
 * Busca turma com escola_id e ano_letivo
 */
export async function buscarTurma(turmaId: string) {
  const result = await pool.query(
    'SELECT id, escola_id, ano_letivo, serie FROM turmas WHERE id = $1',
    [turmaId]
  )
  return result.rows[0] || null
}

/**
 * Lança notas em lote (UPSERT) para uma turma/disciplina/período.
 * Suporta nota numérica, conceito e parecer descritivo.
 */
export async function lancarNotas(params: {
  turmaId: string
  disciplinaId: string
  periodoId: string
  escolaId: string
  anoLetivo: string
  notas: NotaInput[]
  config: ConfigNotas
  registradoPor: string
  tipoAvaliacaoId?: string | null
}): Promise<{ processados: number; erros: Array<{ aluno_id: string; mensagem: string }> }> {
  const { turmaId, disciplinaId, periodoId, escolaId, anoLetivo, notas, config, registradoPor, tipoAvaliacaoId } = params

  return withTransaction(async (client) => {
    let processados = 0
    const erros: Array<{ aluno_id: string; mensagem: string }> = []

    for (const item of notas) {
      try {
        const notaFinal = calcularNotaFinal(item.nota, item.nota_recuperacao, config)

        await client.query(
          `INSERT INTO notas_escolares
             (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, turma_id,
              nota, nota_recuperacao, nota_final, faltas, observacao,
              conceito, parecer_descritivo, tipo_avaliacao_id, registrado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (aluno_id, disciplina_id, periodo_id)
           DO UPDATE SET
             nota = EXCLUDED.nota,
             nota_recuperacao = EXCLUDED.nota_recuperacao,
             nota_final = EXCLUDED.nota_final,
             faltas = EXCLUDED.faltas,
             observacao = EXCLUDED.observacao,
             conceito = EXCLUDED.conceito,
             parecer_descritivo = EXCLUDED.parecer_descritivo,
             tipo_avaliacao_id = EXCLUDED.tipo_avaliacao_id,
             registrado_por = EXCLUDED.registrado_por,
             turma_id = EXCLUDED.turma_id`,
          [
            item.aluno_id, disciplinaId, periodoId, escolaId, anoLetivo, turmaId,
            item.nota ?? null, item.nota_recuperacao ?? null, notaFinal,
            item.faltas ?? 0, item.observacao ?? null,
            item.conceito ?? null, item.parecer_descritivo ?? null,
            tipoAvaliacaoId || null, registradoPor,
          ]
        )
        processados++
      } catch (err: any) {
        erros.push({ aluno_id: item.aluno_id, mensagem: err?.message || 'Erro desconhecido' })
      }
    }

    return { processados, erros }
  })
}
