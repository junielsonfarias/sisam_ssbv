import pool from '@/database/connection'

// ============================================================================
// Service de Notificações para Professores
// ============================================================================

/**
 * Notifica todos os professores vinculados a uma escola.
 * Busca professor_turmas ativos e cria uma notificação para cada professor distinto.
 *
 * Usado por: APIs de admin ao abrir períodos, publicar resultados, avisos gerais.
 *
 * @param escolaId - ID da escola
 * @param tipo - Tipo da notificação (periodo_aberto, resultados_publicados, aviso_admin, prazo_notas)
 * @param titulo - Título da notificação
 * @param mensagem - Mensagem detalhada
 * @param extras - Campos opcionais: prioridade, turma_id, aluno_id, expira_em
 */
export async function notificarProfessoresEscola(
  escolaId: string,
  tipo: string,
  titulo: string,
  mensagem: string,
  extras?: {
    prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
    turma_id?: string | null
    aluno_id?: string | null
    expira_em?: string | null
  }
): Promise<{ notificados: number }> {
  // Buscar professores distintos vinculados à escola
  const professoresResult = await pool.query(
    `SELECT DISTINCT pt.professor_id
     FROM professor_turmas pt
     INNER JOIN turmas t ON t.id = pt.turma_id
     WHERE t.escola_id = $1 AND pt.ativo = true`,
    [escolaId]
  )

  const professores = professoresResult.rows
  if (professores.length === 0) {
    return { notificados: 0 }
  }

  const prioridade = extras?.prioridade || 'media'
  const turmaId = extras?.turma_id || null
  const alunoId = extras?.aluno_id || null
  const expiraEm = extras?.expira_em || null

  // Bulk insert com parametrização
  const values: string[] = []
  const params: (string | null)[] = []
  let idx = 1

  for (const prof of professores) {
    values.push(
      `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, 'professor', $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8})`
    )
    params.push(
      tipo, titulo, mensagem, prioridade,
      prof.professor_id, escolaId,
      turmaId, alunoId, expiraEm
    )
    idx += 9
  }

  await pool.query(
    `INSERT INTO notificacoes
       (tipo, titulo, mensagem, prioridade, destinatario_tipo, destinatario_id, escola_id, turma_id, aluno_id, expira_em)
     VALUES ${values.join(', ')}`,
    params
  )

  return { notificados: professores.length }
}

/**
 * Notifica um professor específico.
 *
 * Usado por: Situações pontuais (transferência de aluno, aviso individual).
 */
export async function notificarProfessor(
  professorId: string,
  tipo: string,
  titulo: string,
  mensagem: string,
  extras?: {
    prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
    escola_id?: string | null
    turma_id?: string | null
    aluno_id?: string | null
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO notificacoes
       (tipo, titulo, mensagem, prioridade, destinatario_tipo, destinatario_id, escola_id, turma_id, aluno_id)
     VALUES ($1, $2, $3, $4, 'professor', $5, $6, $7, $8)`,
    [
      tipo, titulo, mensagem, extras?.prioridade || 'media',
      professorId, extras?.escola_id || null,
      extras?.turma_id || null, extras?.aluno_id || null,
    ]
  )
}
