import pool from '@/database/connection'

// ============================================================================
// Service de Turmas — lógica compartilhada entre admin e professor
// ============================================================================

export interface AlunoTurma {
  id: string
  codigo: string
  nome: string
  serie: string
  ano_letivo: string
  ativo: boolean
  data_nascimento: string | null
  pcd: boolean
  situacao: string
  data_matricula: string | null
  data_transferencia: string | null
}

export interface TurmaComEscola {
  id: string
  codigo: string
  nome: string
  serie: string
  ano_letivo: string
  escola_id: string
  escola_nome: string
  polo_id: string | null
  polo_nome: string | null
}

export interface TurmaProfessor {
  vinculo_id: string
  tipo_vinculo: string
  ano_letivo: string
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  turma_codigo: string
  escola_id: string
  escola_nome: string
  disciplina_id: string | null
  disciplina_nome: string | null
  disciplina_abreviacao: string | null
  etapa: string | null
  total_alunos: number
}

/**
 * Busca alunos de uma turma (incluindo transferidos/inativos)
 * Usado por: admin/turmas/[id]/alunos, professor/alunos
 */
export async function buscarAlunosDaTurma(turmaId: string): Promise<AlunoTurma[]> {
  const result = await pool.query(
    `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.ativo,
            a.data_nascimento, a.pcd, a.situacao, a.data_matricula,
            (SELECT hs.data FROM historico_situacao hs
             WHERE hs.aluno_id = a.id AND hs.situacao = 'transferido'
             ORDER BY hs.data DESC, hs.criado_em DESC LIMIT 1
            ) as data_transferencia
     FROM alunos a
     WHERE a.turma_id = $1
     ORDER BY
       CASE WHEN a.situacao IN ('transferido', 'abandono') THEN 1 ELSE 0 END,
       a.nome`,
    [turmaId]
  )

  return result.rows
}

/**
 * Busca turmas vinculadas a um professor
 * Usado por: professor/turmas
 */
export async function buscarTurmasDoProfessor(professorId: string): Promise<TurmaProfessor[]> {
  const result = await pool.query(
    `SELECT pt.id as vinculo_id, pt.tipo_vinculo, pt.ano_letivo,
            t.id as turma_id, t.nome as turma_nome, t.serie, t.turno, t.codigo as turma_codigo,
            e.id as escola_id, e.nome as escola_nome,
            de.id as disciplina_id, de.nome as disciplina_nome, de.abreviacao as disciplina_abreviacao,
            se.etapa,
            (SELECT COUNT(*) FROM alunos a WHERE a.turma_id = t.id AND a.ativo = true AND a.situacao = 'cursando') as total_alunos
     FROM professor_turmas pt
     INNER JOIN turmas t ON t.id = pt.turma_id
     INNER JOIN escolas e ON e.id = t.escola_id
     LEFT JOIN disciplinas_escolares de ON de.id = pt.disciplina_id
     LEFT JOIN series_escolares se ON se.numero::text = t.serie OR se.nome = t.serie
     WHERE pt.professor_id = $1 AND pt.ativo = true
     ORDER BY e.nome, t.turno, t.serie, t.nome, de.nome`,
    [professorId]
  )

  return result.rows
}

/**
 * Busca turma com dados da escola e polo
 * Usado por: turmas/[id]/alunos (verificação de acesso)
 */
export async function buscarTurmaComEscola(turmaId: string): Promise<TurmaComEscola | null> {
  const result = await pool.query(
    `SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
            e.nome as escola_nome, e.polo_id, p.nome as polo_nome
     FROM turmas t
     INNER JOIN escolas e ON t.escola_id = e.id
     LEFT JOIN polos p ON e.polo_id = p.id
     WHERE t.id = $1`,
    [turmaId]
  )

  return result.rows[0] || null
}

/**
 * Verifica se turma tem alunos ativos (antes de deletar)
 */
export async function verificarAlunosAtivos(turmaId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as total FROM alunos WHERE turma_id = $1 AND ativo = true',
    [turmaId]
  )

  return parseInt(result.rows[0].total)
}
