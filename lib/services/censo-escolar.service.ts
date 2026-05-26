/**
 * Service Censo Escolar (Educacenso INEP) — exportação CSV simplificada.
 *
 * Gera 3 CSVs principais para conferência manual antes de migrar
 * para o portal Educacenso oficial:
 *  - alunos.csv: matrículas + dados do aluno
 *  - docentes.csv: vinculações de professores
 *  - turmas.csv: composição das turmas
 *
 * **Limitação reconhecida:** este export NÃO cumpre 100% do layout XML
 * oficial INEP. É uma exportação simplificada para validação manual e
 * importação ajustada no Educacenso. Implementação 100% INEP fica para
 * fase futura.
 *
 * @module services/censo-escolar
 */

import pool from '@/database/connection'

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',')
}

// ============================================================================
// ALUNOS (Layout Educacenso simplificado)
// ============================================================================

export async function exportarAlunosCsv(params: {
  anoLetivo: string
  escolaId?: string
}): Promise<string> {
  const conds: string[] = [`a.ano_letivo = $1`]
  const queryParams: unknown[] = [params.anoLetivo]
  let i = 2
  if (params.escolaId) {
    queryParams.push(params.escolaId)
    conds.push(`a.escola_id = $${i++}`)
  }

  const r = await pool.query(
    `SELECT
        a.id AS aluno_id,
        a.matricula,
        a.nome,
        a.cpf,
        a.data_nascimento,
        a.sexo,
        a.nome_mae,
        a.nome_pai,
        a.naturalidade,
        a.nis,
        a.beneficiario_bolsa_familia,
        a.modalidade,
        a.serie,
        t.codigo AS turma_codigo,
        e.codigo_inep AS escola_inep,
        e.nome AS escola_nome,
        ae.tipos_deficiencia,
        ae.laudo_medico
      FROM alunos a
      LEFT JOIN turmas t ON t.id = a.turma_id
      LEFT JOIN escolas e ON e.id = a.escola_id
      LEFT JOIN alunos_aee ae ON ae.aluno_id = a.id
      WHERE ${conds.join(' AND ')}
      ORDER BY e.nome, t.codigo, a.nome`,
    queryParams
  )

  const header = csvRow([
    'ALUNO_ID',
    'CODIGO_INEP_ESCOLA',
    'ESCOLA',
    'NOME_ALUNO',
    'NOME_MAE',
    'NOME_PAI',
    'DATA_NASCIMENTO',
    'SEXO',
    'CPF',
    'NIS',
    'BOLSA_FAMILIA',
    'NATURALIDADE',
    'MATRICULA',
    'MODALIDADE',
    'SERIE',
    'TURMA',
    'AEE_DEFICIENCIAS',
    'LAUDO_MEDICO',
  ])

  const linhas = r.rows.map((row) => csvRow([
    row.aluno_id,
    row.escola_inep,
    row.escola_nome,
    row.nome,
    row.nome_mae,
    row.nome_pai,
    row.data_nascimento,
    row.sexo,
    row.cpf,
    row.nis,
    row.beneficiario_bolsa_familia ? 'SIM' : 'NAO',
    row.naturalidade,
    row.matricula,
    row.modalidade,
    row.serie,
    row.turma_codigo,
    Array.isArray(row.tipos_deficiencia) ? row.tipos_deficiencia.join(';') : '',
    row.laudo_medico ? 'SIM' : 'NAO',
  ]))

  return [header, ...linhas].join('\n')
}

// ============================================================================
// DOCENTES
// ============================================================================

export async function exportarDocentesCsv(params: {
  anoLetivo: string
  escolaId?: string
}): Promise<string> {
  // Verifica existência de tabelas relacionadas
  const profTurmas = await pool.query(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.tables WHERE table_name='professor_turmas'
     ) AS existe`
  )
  const temProfTurmas = profTurmas.rows[0]?.existe === true

  // Quando há professor_turmas: $1=anoLetivo, $2=escolaId (Censo INEP exige vínculo no ano).
  // Sem professor_turmas: degrada para lista de professores ativos por escola.
  const queryParams: unknown[] = temProfTurmas ? [params.anoLetivo] : []
  const escolaWhere = params.escolaId
    ? `AND u.escola_id = $${queryParams.length + 1}`
    : ''
  if (params.escolaId) queryParams.push(params.escolaId)

  const sqlJoin = temProfTurmas ? `
    INNER JOIN professor_turmas pt ON pt.professor_id = u.id
    INNER JOIN turmas t ON t.id = pt.turma_id AND t.ano_letivo = $1
    LEFT JOIN disciplinas_escolares d ON d.id = pt.disciplina_id
  ` : ''

  const r = await pool.query(
    `SELECT DISTINCT
        u.id AS professor_id,
        u.nome,
        u.email,
        u.cpf,
        e.codigo_inep AS escola_inep,
        e.nome AS escola_nome
        ${temProfTurmas ? ', array_agg(DISTINCT t.codigo) AS turmas, array_agg(DISTINCT d.nome) AS disciplinas' : ''}
      FROM usuarios u
      LEFT JOIN escolas e ON e.id = u.escola_id
      ${sqlJoin}
      WHERE u.tipo_usuario = 'professor' AND u.ativo IS NOT FALSE
        ${escolaWhere}
      ${temProfTurmas ? 'GROUP BY u.id, u.nome, u.email, u.cpf, e.codigo_inep, e.nome' : ''}
      ORDER BY u.nome`,
    queryParams
  )

  const header = csvRow([
    'PROFESSOR_ID',
    'CODIGO_INEP_ESCOLA',
    'ESCOLA',
    'NOME_DOCENTE',
    'CPF',
    'EMAIL',
    'TURMAS',
    'DISCIPLINAS',
  ])

  const linhas = r.rows.map((row) => csvRow([
    row.professor_id,
    row.escola_inep,
    row.escola_nome,
    row.nome,
    row.cpf,
    row.email,
    Array.isArray(row.turmas) ? row.turmas.filter(Boolean).join(';') : '',
    Array.isArray(row.disciplinas) ? row.disciplinas.filter(Boolean).join(';') : '',
  ]))

  return [header, ...linhas].join('\n')
}

// ============================================================================
// TURMAS
// ============================================================================

export async function exportarTurmasCsv(params: {
  anoLetivo: string
  escolaId?: string
}): Promise<string> {
  const conds: string[] = [`t.ano_letivo = $1`]
  const queryParams: unknown[] = [params.anoLetivo]
  let i = 2
  if (params.escolaId) {
    queryParams.push(params.escolaId)
    conds.push(`t.escola_id = $${i++}`)
  }

  const r = await pool.query(
    `SELECT
        t.id AS turma_id,
        t.codigo,
        t.nome,
        t.serie,
        t.modalidade,
        t.grupo_etario_id,
        e.codigo_inep AS escola_inep,
        e.nome AS escola_nome,
        COUNT(DISTINCT a.id) FILTER (WHERE a.ano_letivo = t.ano_letivo) AS qtd_alunos
      FROM turmas t
      LEFT JOIN escolas e ON e.id = t.escola_id
      LEFT JOIN alunos a ON a.turma_id = t.id
      WHERE ${conds.join(' AND ')}
      GROUP BY t.id, t.codigo, t.nome, t.serie, t.modalidade, t.grupo_etario_id, e.codigo_inep, e.nome
      ORDER BY e.nome, t.codigo`,
    queryParams
  )

  const header = csvRow([
    'TURMA_ID',
    'CODIGO_INEP_ESCOLA',
    'ESCOLA',
    'CODIGO_TURMA',
    'NOME_TURMA',
    'SERIE',
    'MODALIDADE',
    'GRUPO_ETARIO',
    'QTD_ALUNOS',
  ])

  const linhas = r.rows.map((row) => csvRow([
    row.turma_id,
    row.escola_inep,
    row.escola_nome,
    row.codigo,
    row.nome,
    row.serie,
    row.modalidade,
    row.grupo_etario_id,
    row.qtd_alunos,
  ]))

  return [header, ...linhas].join('\n')
}
