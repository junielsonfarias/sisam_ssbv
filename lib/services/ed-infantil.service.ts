/**
 * Service de Educação Infantil.
 *
 * Funções para portfólio e relatórios pedagógicos.
 *
 * @module services/ed-infantil
 */

import pool from '@/database/connection'

export type TipoRegistro = 'foto' | 'video' | 'audio' | 'atividade' | 'observacao'
export type CampoExperiencia = 'EOEU' | 'CG' | 'TS' | 'EF' | 'ET'

export const CAMPO_EXPERIENCIA_LABEL: Record<CampoExperiencia, string> = {
  EOEU: 'O eu, o outro e o nós',
  CG: 'Corpo, gestos e movimentos',
  TS: 'Traços, sons, cores e formas',
  EF: 'Escuta, fala, pensamento e imaginação',
  ET: 'Espaços, tempos, quantidades, relações e transformações',
}

export interface RegistroPortfolio {
  id?: string
  aluno_id: string
  professor_id: string
  data_registro: string
  tipo: TipoRegistro
  titulo?: string | null
  descricao?: string | null
  arquivo_url?: string | null
  arquivo_tamanho_bytes?: number | null
  campo_experiencia?: CampoExperiencia | null
  habilidades_bncc?: string[]
  visivel_responsavel?: boolean
}

export interface RelatorioPedagogico {
  id?: string
  aluno_id: string
  ano_letivo: string
  periodo: 'semestre_1' | 'semestre_2' | 'final'
  eu_outro_nos?: string | null
  corpo_gestos_movimentos?: string | null
  tracos_sons_cores_formas?: string | null
  escuta_fala_pensamento?: string | null
  espacos_tempos_quantidades?: string | null
  observacoes_gerais?: string | null
  status?: 'rascunho' | 'publicado' | 'entregue'
  professor_id?: string
}

// ============================================================================
// PORTFÓLIO
// ============================================================================

export async function adicionarRegistroPortfolio(reg: RegistroPortfolio): Promise<string> {
  const r = await pool.query(
    `INSERT INTO ed_infantil_portfolio
       (aluno_id, professor_id, data_registro, tipo, titulo, descricao,
        arquivo_url, arquivo_tamanho_bytes, campo_experiencia,
        habilidades_bncc, visivel_responsavel)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      reg.aluno_id, reg.professor_id, reg.data_registro, reg.tipo,
      reg.titulo || null, reg.descricao || null,
      reg.arquivo_url || null, reg.arquivo_tamanho_bytes || null,
      reg.campo_experiencia || null,
      reg.habilidades_bncc || [],
      reg.visivel_responsavel ?? false,
    ]
  )
  return r.rows[0].id
}

export async function listarPortfolioAluno(params: {
  alunoId: string
  campoExperiencia?: CampoExperiencia
  dataInicio?: string
  dataFim?: string
  apenasVisiveisResponsavel?: boolean
}) {
  const conds: string[] = ['aluno_id = $1']
  const queryParams: unknown[] = [params.alunoId]
  let i = 2

  if (params.campoExperiencia) {
    queryParams.push(params.campoExperiencia)
    conds.push(`campo_experiencia = $${i++}`)
  }
  if (params.dataInicio) {
    queryParams.push(params.dataInicio)
    conds.push(`data_registro >= $${i++}`)
  }
  if (params.dataFim) {
    queryParams.push(params.dataFim)
    conds.push(`data_registro <= $${i++}`)
  }
  if (params.apenasVisiveisResponsavel) {
    conds.push(`visivel_responsavel = TRUE`)
  }

  const r = await pool.query(
    `SELECT p.*, u.nome AS professor_nome
       FROM ed_infantil_portfolio p
       LEFT JOIN usuarios u ON u.id = p.professor_id
      WHERE ${conds.join(' AND ')}
      ORDER BY p.data_registro DESC, p.criado_em DESC
      LIMIT 200`,
    queryParams
  )
  return r.rows
}

export async function removerRegistroPortfolio(id: string, professorId: string): Promise<boolean> {
  const r = await pool.query(
    `DELETE FROM ed_infantil_portfolio WHERE id = $1 AND professor_id = $2`,
    [id, professorId]
  )
  return (r.rowCount ?? 0) > 0
}

// ============================================================================
// RELATÓRIOS PEDAGÓGICOS
// ============================================================================

export async function salvarRelatorio(rel: RelatorioPedagogico): Promise<string> {
  const r = await pool.query(
    `INSERT INTO ed_infantil_relatorios
       (aluno_id, ano_letivo, periodo,
        eu_outro_nos, corpo_gestos_movimentos, tracos_sons_cores_formas,
        escuta_fala_pensamento, espacos_tempos_quantidades,
        observacoes_gerais, status, professor_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (aluno_id, ano_letivo, periodo) DO UPDATE
       SET eu_outro_nos = EXCLUDED.eu_outro_nos,
           corpo_gestos_movimentos = EXCLUDED.corpo_gestos_movimentos,
           tracos_sons_cores_formas = EXCLUDED.tracos_sons_cores_formas,
           escuta_fala_pensamento = EXCLUDED.escuta_fala_pensamento,
           espacos_tempos_quantidades = EXCLUDED.espacos_tempos_quantidades,
           observacoes_gerais = EXCLUDED.observacoes_gerais,
           status = EXCLUDED.status,
           professor_id = EXCLUDED.professor_id,
           atualizado_em = NOW(),
           publicado_em = CASE WHEN EXCLUDED.status = 'publicado' AND ed_infantil_relatorios.status != 'publicado' THEN NOW() ELSE ed_infantil_relatorios.publicado_em END
     RETURNING id`,
    [
      rel.aluno_id, rel.ano_letivo, rel.periodo,
      rel.eu_outro_nos || null, rel.corpo_gestos_movimentos || null,
      rel.tracos_sons_cores_formas || null, rel.escuta_fala_pensamento || null,
      rel.espacos_tempos_quantidades || null, rel.observacoes_gerais || null,
      rel.status || 'rascunho', rel.professor_id || null,
    ]
  )
  return r.rows[0].id
}

export async function buscarRelatorio(params: {
  alunoId: string
  anoLetivo: string
  periodo: string
}) {
  const r = await pool.query(
    `SELECT * FROM ed_infantil_relatorios
       WHERE aluno_id = $1 AND ano_letivo = $2 AND periodo = $3`,
    [params.alunoId, params.anoLetivo, params.periodo]
  )
  return r.rows[0] || null
}

export async function listarGruposEtarios() {
  const r = await pool.query(`SELECT * FROM ed_infantil_grupos_etarios ORDER BY ordem`)
  return r.rows
}
