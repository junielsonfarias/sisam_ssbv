/**
 * Service AEE — Atendimento Educacional Especializado.
 *
 * Inclusão escolar conforme Lei 13.146/2015 (LBI) e Decreto 7.611/2011.
 *
 * @module services/aee
 */

import pool from '@/database/connection'

export const TIPOS_DEFICIENCIA = [
  { value: 'fisica', label: 'Deficiência Física' },
  { value: 'auditiva', label: 'Deficiência Auditiva / Surdez' },
  { value: 'visual', label: 'Deficiência Visual / Cegueira' },
  { value: 'intelectual', label: 'Deficiência Intelectual' },
  { value: 'multipla', label: 'Deficiência Múltipla' },
  { value: 'tea', label: 'Transtorno do Espectro Autista (TEA)' },
  { value: 'altas_habilidades', label: 'Altas Habilidades / Superdotação' },
  { value: 'surdocegueira', label: 'Surdocegueira' },
  { value: 'transtorno_global_desenvolvimento', label: 'Transtornos Globais do Desenvolvimento' },
] as const

export type TipoDeficiencia = typeof TIPOS_DEFICIENCIA[number]['value']

export interface AlunoAee {
  aluno_id: string
  tipos_deficiencia: TipoDeficiencia[]
  cid_codigos?: string[]
  laudo_medico?: boolean
  laudo_data?: string | null
  laudo_arquivo_url?: string | null
  laudo_emitido_por?: string | null
  observacoes?: string | null
  necessita_cuidador?: boolean
  necessita_interprete?: boolean
  recursos_especiais?: string[]
  sala_recursos_id?: string | null
  frequencia_aee?: string | null
}

export interface PlanoAee {
  id?: string
  aluno_id: string
  ano_letivo: string
  objetivos: string
  estrategias: string
  recursos_necessarios?: string | null
  areas_foco?: string[]
  periodicidade_horas_semanais?: number | null
  avaliacao_progresso?: string | null
  status?: 'rascunho' | 'ativo' | 'concluido' | 'cancelado'
  professor_aee_id?: string | null
  data_inicio: string
  data_revisao?: string | null
  data_fim?: string | null
}

// ============================================================================
// CADASTRO ALUNO AEE
// ============================================================================

export async function cadastrarOuAtualizarAlunoAee(dados: AlunoAee): Promise<string> {
  const r = await pool.query(
    `INSERT INTO alunos_aee
      (aluno_id, tipos_deficiencia, cid_codigos, laudo_medico, laudo_data,
       laudo_arquivo_url, laudo_emitido_por, observacoes,
       necessita_cuidador, necessita_interprete, recursos_especiais,
       sala_recursos_id, frequencia_aee, atualizado_em)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW())
     ON CONFLICT (aluno_id) DO UPDATE SET
       tipos_deficiencia = EXCLUDED.tipos_deficiencia,
       cid_codigos = EXCLUDED.cid_codigos,
       laudo_medico = EXCLUDED.laudo_medico,
       laudo_data = EXCLUDED.laudo_data,
       laudo_arquivo_url = EXCLUDED.laudo_arquivo_url,
       laudo_emitido_por = EXCLUDED.laudo_emitido_por,
       observacoes = EXCLUDED.observacoes,
       necessita_cuidador = EXCLUDED.necessita_cuidador,
       necessita_interprete = EXCLUDED.necessita_interprete,
       recursos_especiais = EXCLUDED.recursos_especiais,
       sala_recursos_id = EXCLUDED.sala_recursos_id,
       frequencia_aee = EXCLUDED.frequencia_aee,
       atualizado_em = NOW()
     RETURNING id`,
    [
      dados.aluno_id, dados.tipos_deficiencia,
      dados.cid_codigos || [], dados.laudo_medico ?? false,
      dados.laudo_data || null, dados.laudo_arquivo_url || null,
      dados.laudo_emitido_por || null, dados.observacoes || null,
      dados.necessita_cuidador ?? false, dados.necessita_interprete ?? false,
      dados.recursos_especiais || [], dados.sala_recursos_id || null,
      dados.frequencia_aee || null,
    ]
  )
  return r.rows[0].id
}

export async function buscarAlunoAee(alunoId: string) {
  const r = await pool.query(
    `SELECT ae.*, sr.nome AS sala_recursos_nome, e.nome AS escola_nome
       FROM alunos_aee ae
       LEFT JOIN aee_salas_recursos sr ON sr.id = ae.sala_recursos_id
       LEFT JOIN escolas e ON e.id = sr.escola_id
      WHERE ae.aluno_id = $1`,
    [alunoId]
  )
  return r.rows[0] || null
}

export async function listarAlunosAee(filtros: { escolaId?: string; turmaId?: string } = {}) {
  const conds: string[] = []
  const params: unknown[] = []
  let i = 1
  if (filtros.escolaId) { params.push(filtros.escolaId); conds.push(`a.escola_id = $${i++}`) }
  if (filtros.turmaId) { params.push(filtros.turmaId); conds.push(`a.turma_id = $${i++}`) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

  const r = await pool.query(
    `SELECT a.id AS aluno_id, a.nome AS aluno_nome, a.serie,
            ae.tipos_deficiencia, ae.laudo_medico, ae.necessita_cuidador,
            t.codigo AS turma_codigo, e.nome AS escola_nome
       FROM alunos_aee ae
       INNER JOIN alunos a ON a.id = ae.aluno_id
       LEFT JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN escolas e ON e.id = a.escola_id
       ${where}
      ORDER BY e.nome, a.nome`,
    params
  )
  return r.rows
}

// ============================================================================
// PLANOS AEE
// ============================================================================

export async function salvarPlano(plano: PlanoAee): Promise<string> {
  const r = await pool.query(
    `INSERT INTO aee_planos_individuais
       (aluno_id, ano_letivo, objetivos, estrategias, recursos_necessarios,
        areas_foco, periodicidade_horas_semanais, avaliacao_progresso,
        status, professor_aee_id, data_inicio, data_revisao, data_fim)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (aluno_id, ano_letivo) DO UPDATE SET
       objetivos = EXCLUDED.objetivos,
       estrategias = EXCLUDED.estrategias,
       recursos_necessarios = EXCLUDED.recursos_necessarios,
       areas_foco = EXCLUDED.areas_foco,
       periodicidade_horas_semanais = EXCLUDED.periodicidade_horas_semanais,
       avaliacao_progresso = EXCLUDED.avaliacao_progresso,
       status = EXCLUDED.status,
       professor_aee_id = EXCLUDED.professor_aee_id,
       data_revisao = EXCLUDED.data_revisao,
       data_fim = EXCLUDED.data_fim,
       atualizado_em = NOW()
     RETURNING id`,
    [
      plano.aluno_id, plano.ano_letivo, plano.objetivos, plano.estrategias,
      plano.recursos_necessarios || null, plano.areas_foco || [],
      plano.periodicidade_horas_semanais || null, plano.avaliacao_progresso || null,
      plano.status || 'ativo', plano.professor_aee_id || null,
      plano.data_inicio, plano.data_revisao || null, plano.data_fim || null,
    ]
  )
  return r.rows[0].id
}

export async function buscarPlano(alunoId: string, anoLetivo: string) {
  const r = await pool.query(
    `SELECT * FROM aee_planos_individuais
      WHERE aluno_id = $1 AND ano_letivo = $2`,
    [alunoId, anoLetivo]
  )
  return r.rows[0] || null
}

// ============================================================================
// ATENDIMENTOS
// ============================================================================

export async function registrarAtendimento(params: {
  plano_id: string
  aluno_id: string
  professor_id: string
  data_atendimento: string
  duracao_minutos?: number
  presente?: boolean
  atividades_realizadas?: string
  observacoes?: string
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO aee_atendimentos
       (plano_id, aluno_id, professor_id, data_atendimento,
        duracao_minutos, presente, atividades_realizadas, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      params.plano_id, params.aluno_id, params.professor_id,
      params.data_atendimento, params.duracao_minutos ?? 50,
      params.presente ?? true,
      params.atividades_realizadas || null, params.observacoes || null,
    ]
  )
  return r.rows[0].id
}

export async function listarAtendimentos(alunoId: string, anoLetivo?: string) {
  const params: unknown[] = [alunoId]
  let extra = ''
  if (anoLetivo) {
    params.push(`${anoLetivo}-01-01`, `${anoLetivo}-12-31`)
    extra = ` AND data_atendimento BETWEEN $2 AND $3`
  }
  const r = await pool.query(
    `SELECT * FROM aee_atendimentos
      WHERE aluno_id = $1 ${extra}
      ORDER BY data_atendimento DESC`,
    params
  )
  return r.rows
}

// ============================================================================
// SALAS DE RECURSOS
// ============================================================================

export async function listarSalasRecursos(escolaId?: string) {
  const params: unknown[] = []
  let where = 'ativa = TRUE'
  if (escolaId) {
    params.push(escolaId)
    where += ` AND escola_id = $${params.length}`
  }
  const r = await pool.query(
    `SELECT sr.*, u.nome AS professor_nome, e.nome AS escola_nome
       FROM aee_salas_recursos sr
       LEFT JOIN usuarios u ON u.id = sr.professor_responsavel_id
       LEFT JOIN escolas e ON e.id = sr.escola_id
      WHERE ${where}
      ORDER BY e.nome, sr.nome`,
    params
  )
  return r.rows
}
