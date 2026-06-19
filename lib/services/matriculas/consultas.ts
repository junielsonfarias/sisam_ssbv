import pool from '@/database/connection'
import { ResumoMatriculas, CapacidadeTurma } from './types'

// ============================================================================
// Consultas de leitura do domínio de Matrículas (resumo, capacidade, ano)
// ============================================================================

/**
 * Busca resumo de matriculas (turmas + alunos) de uma escola.
 * Executa 2 queries em paralelo: COUNT turmas + COUNT alunos.
 */
export async function buscarResumoMatriculas(
  escolaId: string,
  anoLetivo: string
): Promise<ResumoMatriculas> {
  const [turmasResult, alunosResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) as total FROM turmas WHERE escola_id = $1 AND ano_letivo = $2 AND ativo = true`,
      [escolaId, anoLetivo]
    ),
    pool.query(
      `SELECT COUNT(*) as total FROM alunos WHERE escola_id = $1 AND ano_letivo = $2 AND ativo = true`,
      [escolaId, anoLetivo]
    ),
  ])

  return {
    total_turmas: parseInt(turmasResult.rows[0]?.total) || 0,
    total_alunos: parseInt(alunosResult.rows[0]?.total) || 0,
  }
}

/**
 * Verifica capacidade disponivel de uma turma.
 * Retorna capacidade maxima, total matriculados cursando e vagas disponiveis.
 */
export async function verificarCapacidadeTurma(
  turmaId: string
): Promise<CapacidadeTurma> {
  const result = await pool.query(
    `SELECT t.capacidade_maxima,
            COUNT(a.id) FILTER (WHERE a.situacao = 'cursando') as total_cursando
     FROM turmas t
     LEFT JOIN alunos a ON a.turma_id = t.id AND a.situacao = 'cursando'
     WHERE t.id = $1
     GROUP BY t.id, t.capacidade_maxima`,
    [turmaId]
  )

  if (result.rows.length === 0) {
    return { capacidade: 0, matriculados: 0, disponivel: 0 }
  }

  const { capacidade_maxima, total_cursando } = result.rows[0]
  const capacidade = capacidade_maxima ?? 0
  const matriculados = parseInt(total_cursando) || 0
  const disponivel = capacidade > 0 ? Math.max(0, capacidade - matriculados) : 0

  return { capacidade, matriculados, disponivel }
}

/**
 * Verifica se o ano letivo esta ativo. Retorna null se ok, ou mensagem de erro.
 */
export async function verificarAnoLetivoAtivo(
  anoLetivo: string
): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT status FROM anos_letivos WHERE ano = $1`,
      [anoLetivo]
    )
    if (result.rows.length > 0 && result.rows[0].status !== 'ativo') {
      return `Ano letivo ${anoLetivo} não está ativo. Apenas anos letivos ativos permitem novas matrículas.`
    }
    return null
  } catch {
    // Tabela pode nao existir ainda — seguir sem validacao
    return null
  }
}
