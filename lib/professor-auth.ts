import pool from '@/database/connection'

/**
 * Valida formato de data ISO (YYYY-MM-DD)
 */
export function validarData(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !isNaN(Date.parse(data))
}

/**
 * Verifica se o professor tem vínculo ativo com a turma
 */
export async function verificarVinculoProfessor(
  professorId: string,
  turmaId: string,
  disciplinaId?: string
): Promise<boolean> {
  let query = `
    SELECT 1 FROM professor_turmas
    WHERE professor_id = $1 AND turma_id = $2 AND ativo = true
  `
  const params: string[] = [professorId, turmaId]

  if (disciplinaId) {
    query += ` AND disciplina_id = $3`
    params.push(disciplinaId)
  }

  const result = await pool.query(query, params)
  return result.rows.length > 0
}

/**
 * Retorna os IDs de turmas vinculadas ao professor
 */
export async function getTurmasProfessor(professorId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT turma_id FROM professor_turmas WHERE professor_id = $1 AND ativo = true`,
    [professorId]
  )
  return result.rows.map((r: { turma_id: string }) => r.turma_id)
}
