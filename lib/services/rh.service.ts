/**
 * Service RH Escolar — Servidores + Lotação + Formação Continuada.
 *
 * @module services/rh
 */

import pool from '@/database/connection'

export type TipoVinculo = 'concursado_efetivo' | 'concursado_estavel'
  | 'contrato_temporario' | 'comissionado' | 'cedido'
  | 'terceirizado' | 'estagiario' | 'rpa'

export type FormacaoMaxima = 'fundamental_incompleto' | 'fundamental_completo'
  | 'medio_incompleto' | 'medio_completo' | 'medio_normal_magisterio'
  | 'superior_incompleto' | 'superior_completo_licenciatura'
  | 'superior_completo_bacharelado' | 'especializacao' | 'mestrado' | 'doutorado'

export interface Servidor {
  id?: string
  matricula_funcional?: string
  cpf: string
  nome: string
  data_nascimento?: string
  sexo?: 'M' | 'F'
  rg?: string
  pis?: string
  email?: string
  telefone?: string
  endereco?: string
  tipo_vinculo: TipoVinculo
  data_admissao: string
  data_demissao?: string
  cargo?: string
  formacao_maxima?: FormacaoMaxima
  area_formacao?: string
  usuario_id?: string
}

export interface Lotacao {
  id?: string
  servidor_id: string
  escola_id?: string | null
  funcao: string
  carga_horaria_semanal: number
  turno?: 'matutino' | 'vespertino' | 'noturno' | 'integral'
  vigencia_inicio: string
  vigencia_fim?: string
  e_principal?: boolean
  observacoes?: string
}

export interface Formacao {
  id?: string
  servidor_id: string
  nome_curso: string
  instituicao?: string
  modalidade?: 'presencial' | 'ead' | 'hibrida'
  carga_horaria: number
  data_inicio?: string
  data_conclusao?: string
  status?: 'inscrito' | 'em_andamento' | 'concluido' | 'desistente' | 'reprovado'
  certificado_url?: string
  categoria?: string
  observacoes?: string
  registrado_por?: string
}

// ============================================================================
// SERVIDORES
// ============================================================================

export async function cadastrarServidor(s: Servidor): Promise<string> {
  const r = await pool.query(
    `INSERT INTO servidores
      (matricula_funcional, cpf, nome, data_nascimento, sexo,
       rg, pis, email, telefone, endereco,
       tipo_vinculo, data_admissao, data_demissao, cargo,
       formacao_maxima, area_formacao, usuario_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [
      s.matricula_funcional || null, s.cpf.replace(/\D/g, ''),
      s.nome, s.data_nascimento || null, s.sexo || null,
      s.rg || null, s.pis ? s.pis.replace(/\D/g, '') : null,
      s.email || null, s.telefone || null, s.endereco || null,
      s.tipo_vinculo, s.data_admissao, s.data_demissao || null,
      s.cargo || null, s.formacao_maxima || null, s.area_formacao || null,
      s.usuario_id || null,
    ]
  )
  return r.rows[0].id
}

export async function listarServidores(filtros: {
  ativo?: boolean
  tipoVinculo?: TipoVinculo
  escolaId?: string
  busca?: string
  limite?: number
} = {}) {
  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  if (filtros.ativo !== false) conds.push('s.ativo = TRUE')
  if (filtros.tipoVinculo) { params.push(filtros.tipoVinculo); conds.push(`s.tipo_vinculo = $${i++}`) }
  if (filtros.busca && filtros.busca.length > 2) {
    params.push(filtros.busca)
    conds.push(`(s.nome ILIKE '%' || $${i} || '%' OR s.cpf = $${i} OR s.matricula_funcional = $${i})`)
    i++
  }

  let escolaJoin = ''
  if (filtros.escolaId) {
    params.push(filtros.escolaId)
    escolaJoin = `INNER JOIN servidor_lotacoes l ON l.servidor_id = s.id AND l.escola_id = $${i++}
                  AND (l.vigencia_fim IS NULL OR l.vigencia_fim >= CURRENT_DATE)`
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(filtros.limite ?? 100, 500)
  params.push(limite)

  const r = await pool.query(
    `SELECT DISTINCT s.id, s.matricula_funcional, s.nome, s.cpf,
            s.tipo_vinculo, s.cargo, s.formacao_maxima, s.email, s.ativo
       FROM servidores s
       ${escolaJoin}
       ${where}
      ORDER BY s.nome
      LIMIT $${i}`,
    params
  )
  return r.rows
}

export async function buscarServidor(id: string) {
  const r = await pool.query(
    `SELECT s.*,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', l.id, 'escola_id', l.escola_id,
                'escola_nome', e.nome, 'funcao', l.funcao,
                'carga_horaria_semanal', l.carga_horaria_semanal,
                'turno', l.turno, 'vigencia_inicio', l.vigencia_inicio,
                'vigencia_fim', l.vigencia_fim, 'e_principal', l.e_principal
              ) ORDER BY l.vigencia_inicio DESC)
               FROM servidor_lotacoes l
               LEFT JOIN escolas e ON e.id = l.escola_id
              WHERE l.servidor_id = s.id),
              '[]'::json
            ) AS lotacoes,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', f.id, 'nome_curso', f.nome_curso,
                'carga_horaria', f.carga_horaria, 'status', f.status,
                'data_conclusao', f.data_conclusao, 'categoria', f.categoria
              ) ORDER BY f.data_conclusao DESC NULLS LAST)
               FROM servidor_formacoes f WHERE f.servidor_id = s.id),
              '[]'::json
            ) AS formacoes
       FROM servidores s
      WHERE s.id = $1`,
    [id]
  )
  return r.rows[0] || null
}

// ============================================================================
// LOTAÇÕES
// ============================================================================

export async function registrarLotacao(l: Lotacao): Promise<string> {
  // Se a lotação é principal, desmarca outras principais ainda vigentes
  if (l.e_principal !== false) {
    await pool.query(
      `UPDATE servidor_lotacoes
          SET e_principal = FALSE
        WHERE servidor_id = $1 AND e_principal = TRUE
          AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)`,
      [l.servidor_id]
    )
  }

  const r = await pool.query(
    `INSERT INTO servidor_lotacoes
      (servidor_id, escola_id, funcao, carga_horaria_semanal,
       turno, vigencia_inicio, vigencia_fim, e_principal, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      l.servidor_id, l.escola_id || null, l.funcao,
      l.carga_horaria_semanal, l.turno || null,
      l.vigencia_inicio, l.vigencia_fim || null,
      l.e_principal ?? true, l.observacoes || null,
    ]
  )
  return r.rows[0].id
}

export async function listarLotacoesEscola(escolaId: string) {
  const r = await pool.query(
    `SELECT l.*, s.nome AS servidor_nome, s.matricula_funcional, s.tipo_vinculo
       FROM servidor_lotacoes l
       INNER JOIN servidores s ON s.id = l.servidor_id
      WHERE l.escola_id = $1
        AND (l.vigencia_fim IS NULL OR l.vigencia_fim >= CURRENT_DATE)
        AND s.ativo = TRUE
      ORDER BY l.funcao, s.nome`,
    [escolaId]
  )
  return r.rows
}

// ============================================================================
// FORMAÇÃO CONTINUADA
// ============================================================================

export async function registrarFormacao(f: Formacao): Promise<string> {
  const r = await pool.query(
    `INSERT INTO servidor_formacoes
      (servidor_id, nome_curso, instituicao, modalidade, carga_horaria,
       data_inicio, data_conclusao, status, certificado_url,
       categoria, observacoes, registrado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      f.servidor_id, f.nome_curso, f.instituicao || null,
      f.modalidade || null, f.carga_horaria,
      f.data_inicio || null, f.data_conclusao || null,
      f.status || 'concluido', f.certificado_url || null,
      f.categoria || null, f.observacoes || null,
      f.registrado_por || null,
    ]
  )
  return r.rows[0].id
}

export async function listarFormacoesServidor(servidorId: string) {
  const r = await pool.query(
    `SELECT * FROM servidor_formacoes
      WHERE servidor_id = $1
      ORDER BY data_conclusao DESC NULLS LAST, registrado_em DESC`,
    [servidorId]
  )
  return r.rows
}

export async function relatorioFormacoes(params: {
  ano?: string
  categoria?: string
}) {
  const conds: string[] = []
  const queryParams: unknown[] = []
  let i = 1

  if (params.ano) {
    queryParams.push(`${params.ano}-01-01`, `${params.ano}-12-31`)
    conds.push(`f.data_conclusao BETWEEN $${i++} AND $${i++}`)
  }
  if (params.categoria) {
    queryParams.push(params.categoria)
    conds.push(`f.categoria = $${i++}`)
  }
  conds.push(`f.status = 'concluido'`)

  const r = await pool.query(
    `SELECT f.categoria, COUNT(*) AS total_cursos,
            SUM(f.carga_horaria) AS total_horas,
            COUNT(DISTINCT f.servidor_id) AS servidores_participantes
       FROM servidor_formacoes f
      WHERE ${conds.join(' AND ')}
      GROUP BY f.categoria
      ORDER BY total_horas DESC`,
    queryParams
  )
  return r.rows
}
