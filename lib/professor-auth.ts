import pool from '@/database/connection'

/**
 * Valida formato de data ISO (YYYY-MM-DD)
 */
export function validarData(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !isNaN(Date.parse(data))
}

/**
 * Verifica se o professor tem vínculo ativo com a turma NO ANO LETIVO informado.
 *
 * Antes (até 2026-05-26): a função verificava só professor_id + turma_id + ativo,
 * ignorando ano_letivo. Professor com vínculo ativo de 2025 ficava autorizado
 * a operar turma "homônima" de 2026 (bug crítico #6 da auditoria Pt.5).
 *
 * O parâmetro `anoLetivo` é opcional para retrocompatibilidade. Quando omitido,
 * a função assume o ano letivo da turma (JOIN com `turmas.ano_letivo`) — assim
 * callers antigos continuam funcionando, mas a comparação fica correta.
 */
export async function verificarVinculoProfessor(
  professorId: string,
  turmaId: string,
  disciplinaId?: string,
  anoLetivo?: string,
): Promise<boolean> {
  // Sempre cruza com turmas.ano_letivo: o vinculo so e valido quando o
  // ano_letivo do vinculo bate com o da turma (corrige o bug ano_letivo).
  // Se anoLetivo for passado, ainda exige que case com ambos.
  let query = `
    SELECT 1
      FROM professor_turmas pt
      JOIN turmas t ON t.id = pt.turma_id
     WHERE pt.professor_id = $1
       AND pt.turma_id = $2
       AND pt.ativo = true
       AND pt.ano_letivo = t.ano_letivo
  `
  const params: string[] = [professorId, turmaId]
  if (disciplinaId) {
    query += ` AND pt.disciplina_id = $${params.length + 1}`
    params.push(disciplinaId)
  }
  if (anoLetivo) {
    query += ` AND pt.ano_letivo = $${params.length + 1}`
    params.push(anoLetivo)
  }
  const result = await pool.query(query, params)
  return result.rows.length > 0
}

/**
 * Retorna os IDs de turmas vinculadas ao professor.
 * Se `anoLetivo` for informado, filtra apenas turmas daquele ano.
 * Caso contrario, cruza com `turmas.ano_letivo` para evitar listar vinculos
 * antigos que apontam para turmas reaproveitadas em outro ano.
 */
export async function getTurmasProfessor(
  professorId: string,
  anoLetivo?: string,
): Promise<string[]> {
  if (anoLetivo) {
    const result = await pool.query(
      `SELECT DISTINCT turma_id FROM professor_turmas
        WHERE professor_id = $1 AND ativo = true AND ano_letivo = $2`,
      [professorId, anoLetivo]
    )
    return result.rows.map((r: { turma_id: string }) => r.turma_id)
  }
  const result = await pool.query(
    `SELECT DISTINCT pt.turma_id
       FROM professor_turmas pt
       JOIN turmas t ON t.id = pt.turma_id
      WHERE pt.professor_id = $1
        AND pt.ativo = true
        AND pt.ano_letivo = t.ano_letivo`,
    [professorId]
  )
  return result.rows.map((r: { turma_id: string }) => r.turma_id)
}
