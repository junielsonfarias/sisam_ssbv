import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'

// ============================================================================
// Service de Frequência — lógica compartilhada entre admin e professor
// ============================================================================

/**
 * Busca frequência diária de uma turma + data com resumo
 */
export async function buscarFrequenciaDiaria(turmaId: string, data: string) {
  const result = await pool.query(
    `SELECT a.id as aluno_id, a.nome as aluno_nome, a.codigo as aluno_codigo,
            fd.id as frequencia_id, fd.status, fd.justificativa,
            fd.hora_entrada, fd.hora_saida, fd.metodo
     FROM alunos a
     LEFT JOIN frequencia_diaria fd ON fd.aluno_id = a.id AND fd.data = $2
     WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
     ORDER BY a.nome`,
    [turmaId, data]
  )

  const alunos = result.rows
  const total = alunos.length
  const presentes = alunos.filter((r: Record<string, unknown>) => r.status === 'presente').length
  const ausentes = alunos.filter((r: Record<string, unknown>) => r.status === 'ausente' || r.status === 'justificado').length
  const semRegistro = alunos.filter((r: Record<string, unknown>) => !r.status).length

  return {
    alunos,
    resumo: {
      total,
      presentes,
      ausentes,
      sem_registro: semRegistro,
      percentual: total > 0 ? Math.round((presentes / total) * 100) : 0,
    },
  }
}

/**
 * Valida que a data não é futura
 */
function validarDataNaoFutura(data: string): void {
  const dataObj = new Date(data + 'T23:59:59')
  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999)
  if (dataObj > hoje) {
    throw new Error('Não é permitido lançar frequência para data futura')
  }
}

/**
 * Registra frequência diária em lote (presente/ausente) para uma turma.
 * Usa batch multi-row INSERT (1 query em vez de N).
 */
export async function registrarFrequenciaDiaria(
  turmaId: string,
  data: string,
  registros: Array<{ aluno_id: string; status: string }>,
  registradoPor: string
): Promise<number> {
  validarDataNaoFutura(data)

  const turmaResult = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turmaId])
  if (turmaResult.rows.length === 0) throw new Error('Turma não encontrada')
  const escolaId = turmaResult.rows[0].escola_id

  // Filtrar registros válidos
  const validos = registros.filter(r => r.aluno_id && r.status)
  if (validos.length === 0) return 0

  return withTransaction(async (client) => {
    // Batch multi-row INSERT (1 query para todos os alunos)
    const COLS = 6
    const placeholders: string[] = []
    const values: (string | null)[] = []

    for (let i = 0; i < validos.length; i++) {
      const o = i * COLS
      placeholders.push(`($${o+1},$${o+2},$${o+3},$${o+4},'manual',$${o+5},$${o+6})`)
      values.push(validos[i].aluno_id, turmaId, escolaId, data, validos[i].status, registradoPor)
    }

    const result = await client.query(
      `INSERT INTO frequencia_diaria (aluno_id, turma_id, escola_id, data, metodo, status, registrado_por)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (aluno_id, data) DO UPDATE SET
         status = EXCLUDED.status,
         metodo = 'manual',
         registrado_por = EXCLUDED.registrado_por,
         atualizado_em = CURRENT_TIMESTAMP`,
      values
    )

    return result.rowCount || 0
  })
}

/**
 * Lança falta para alunos da turma que não têm registro no dia
 */
export async function lancarFaltas(
  turmaId: string,
  data: string,
  registradoPor: string
): Promise<number> {
  validarDataNaoFutura(data)

  const turmaResult = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turmaId])
  if (turmaResult.rows.length === 0) throw new Error('Turma não encontrada')

  const result = await pool.query(`
    INSERT INTO frequencia_diaria (aluno_id, turma_id, escola_id, data, metodo, status, registrado_por)
    SELECT a.id, $1, $2, $3, 'manual', 'ausente', $4
    FROM alunos a
    WHERE a.turma_id = $1
      AND a.ativo = true
      AND a.situacao = 'cursando'
      AND a.id NOT IN (
        SELECT fd.aluno_id FROM frequencia_diaria fd
        WHERE fd.turma_id = $1 AND fd.data = $3
      )
    RETURNING id
  `, [turmaId, turmaResult.rows[0].escola_id, data, registradoPor])

  return result.rows.length
}

/**
 * Exclui um registro de frequência diária
 */
export async function excluirFrequenciaDiaria(frequenciaId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM frequencia_diaria WHERE id = $1 RETURNING id',
    [frequenciaId]
  )
  return result.rows.length > 0
}

/**
 * Justifica uma falta
 */
export async function justificarFalta(frequenciaId: string, justificativa: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE frequencia_diaria SET justificativa = $1, status = 'justificado' WHERE id = $2 RETURNING id`,
    [justificativa.trim(), frequenciaId]
  )
  return result.rows.length > 0
}

/**
 * Busca frequência por hora-aula de uma turma + data (6º-9º)
 */
export async function buscarFrequenciaHoraAula(turmaId: string, data: string) {
  const dataObj = new Date(data + 'T12:00:00')
  let diaSemana = dataObj.getDay()
  if (diaSemana === 0) diaSemana = 7

  const [horariosResult, frequenciasResult, alunosResult] = await Promise.all([
    pool.query(
      `SELECT ha.numero_aula, ha.disciplina_id, de.nome as disciplina_nome, de.abreviacao
       FROM horarios_aula ha
       INNER JOIN disciplinas_escolares de ON de.id = ha.disciplina_id
       WHERE ha.turma_id = $1 AND ha.dia_semana = $2
       ORDER BY ha.numero_aula`,
      [turmaId, diaSemana]
    ),
    pool.query(
      `SELECT fha.id, fha.aluno_id, fha.numero_aula, fha.disciplina_id,
              fha.presente, fha.metodo,
              a.nome AS aluno_nome, a.codigo AS aluno_codigo,
              de.nome AS disciplina_nome
       FROM frequencia_hora_aula fha
       INNER JOIN alunos a ON a.id = fha.aluno_id
       INNER JOIN disciplinas_escolares de ON de.id = fha.disciplina_id
       WHERE fha.turma_id = $1 AND fha.data = $2
       ORDER BY fha.numero_aula, a.nome`,
      [turmaId, data]
    ),
    pool.query(
      `SELECT id, nome, codigo FROM alunos
       WHERE turma_id = $1 AND ativo = true AND situacao = 'cursando'
       ORDER BY nome`,
      [turmaId]
    ),
  ])

  return {
    horarios: horariosResult.rows,
    frequencias: frequenciasResult.rows,
    alunos: alunosResult.rows,
  }
}

/**
 * Registra frequência por hora-aula em lote.
 * Usa batch multi-row INSERT (1 query em vez de N).
 */
export async function registrarFrequenciaHoraAula(
  turmaId: string,
  data: string,
  numeroAula: number,
  disciplinaId: string,
  registros: Array<{ aluno_id: string; presente: boolean }>,
  registradoPor: string
): Promise<number> {
  validarDataNaoFutura(data)

  const turmaResult = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turmaId])
  if (turmaResult.rows.length === 0) throw new Error('Turma não encontrada')
  const escolaId = turmaResult.rows[0].escola_id

  const validos = registros.filter(r => r.aluno_id && r.presente !== undefined)
  if (validos.length === 0) return 0

  return withTransaction(async (client) => {
    const COLS = 8
    const placeholders: string[] = []
    const values: (string | number | boolean | null)[] = []

    for (let i = 0; i < validos.length; i++) {
      const o = i * COLS
      placeholders.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},'manual',$${o+8})`)
      values.push(validos[i].aluno_id, turmaId, escolaId, data, numeroAula, disciplinaId, validos[i].presente, registradoPor)
    }

    const result = await client.query(
      `INSERT INTO frequencia_hora_aula
        (aluno_id, turma_id, escola_id, data, numero_aula, disciplina_id, presente, metodo, registrado_por)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (aluno_id, data, numero_aula) DO UPDATE SET
        presente = EXCLUDED.presente,
        disciplina_id = EXCLUDED.disciplina_id,
        metodo = 'manual',
        registrado_por = EXCLUDED.registrado_por,
        atualizado_em = CURRENT_TIMESTAMP`,
      values
    )

    return result.rowCount || 0
  })
}
