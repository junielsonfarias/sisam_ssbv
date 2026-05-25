/**
 * Service PNATE — Transporte Escolar.
 *
 * @module services/pnate
 */

import pool from '@/database/connection'

export interface Veiculo {
  id?: string
  placa: string
  tipo: 'onibus' | 'micro_onibus' | 'van' | 'kombi' | 'lancha' | 'barco' | 'outro'
  marca?: string
  modelo?: string
  ano_fabricacao?: number
  capacidade: number
  combustivel?: string
  vinculo?: 'proprio' | 'terceirizado' | 'conveniado'
  empresa_terceirizada?: string
  vistoria_data?: string
  vistoria_validade?: string
  acessivel_pcd?: boolean
  observacoes?: string
}

export interface Motorista {
  id?: string
  nome: string
  cpf: string
  cnh_numero: string
  cnh_categoria: string
  cnh_validade: string
  curso_escolar_validade?: string
  telefone?: string
  vinculo?: 'concursado' | 'contrato' | 'terceirizado' | 'rpa'
}

export interface Rota {
  id?: string
  codigo: string
  descricao: string
  escolas_ids: string[]
  veiculo_id?: string
  motorista_id?: string
  turno?: 'matutino' | 'vespertino' | 'noturno' | 'integral'
  distancia_km?: number
  hora_inicio?: string
  hora_fim?: string
}

export interface Parada {
  ordem: number
  endereco: string
  ponto_referencia?: string
  latitude?: number
  longitude?: number
  hora_estimada?: string
}

// ============================================================================
// VEÍCULOS
// ============================================================================

export async function cadastrarVeiculo(v: Veiculo): Promise<string> {
  const r = await pool.query(
    `INSERT INTO pnate_veiculos
      (placa, tipo, marca, modelo, ano_fabricacao, capacidade, combustivel,
       vinculo, empresa_terceirizada, vistoria_data, vistoria_validade,
       acessivel_pcd, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      v.placa, v.tipo, v.marca || null, v.modelo || null,
      v.ano_fabricacao || null, v.capacidade, v.combustivel || null,
      v.vinculo || 'proprio', v.empresa_terceirizada || null,
      v.vistoria_data || null, v.vistoria_validade || null,
      v.acessivel_pcd ?? false, v.observacoes || null,
    ]
  )
  return r.rows[0].id
}

export async function listarVeiculos(filtros: { ativo?: boolean; vencidos?: boolean } = {}) {
  const conds: string[] = []
  if (filtros.ativo !== false) conds.push('ativo = TRUE')
  if (filtros.vencidos) conds.push('vistoria_validade < CURRENT_DATE')

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const r = await pool.query(
    `SELECT * FROM pnate_veiculos ${where} ORDER BY placa`
  )
  return r.rows
}

// ============================================================================
// MOTORISTAS
// ============================================================================

export async function cadastrarMotorista(m: Motorista): Promise<string> {
  const r = await pool.query(
    `INSERT INTO pnate_motoristas
      (nome, cpf, cnh_numero, cnh_categoria, cnh_validade,
       curso_escolar_validade, telefone, vinculo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      m.nome, m.cpf.replace(/\D/g, ''), m.cnh_numero, m.cnh_categoria,
      m.cnh_validade, m.curso_escolar_validade || null,
      m.telefone || null, m.vinculo || 'concursado',
    ]
  )
  return r.rows[0].id
}

export async function listarMotoristas(filtros: { ativos?: boolean; vencidos?: boolean } = {}) {
  const conds: string[] = []
  if (filtros.ativos !== false) conds.push('ativo = TRUE')
  if (filtros.vencidos) conds.push('(cnh_validade < CURRENT_DATE OR (curso_escolar_validade IS NOT NULL AND curso_escolar_validade < CURRENT_DATE))')

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const r = await pool.query(
    `SELECT * FROM pnate_motoristas ${where} ORDER BY nome`
  )
  return r.rows
}

// ============================================================================
// ROTAS E PARADAS
// ============================================================================

export async function criarRota(params: Rota & { paradas: Parada[] }): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const r = await client.query(
      `INSERT INTO pnate_rotas
        (codigo, descricao, escolas_ids, veiculo_id, motorista_id,
         turno, distancia_km, hora_inicio, hora_fim)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        params.codigo, params.descricao, params.escolas_ids,
        params.veiculo_id || null, params.motorista_id || null,
        params.turno || null, params.distancia_km || null,
        params.hora_inicio || null, params.hora_fim || null,
      ]
    )
    const rotaId = r.rows[0].id

    for (const p of params.paradas) {
      await client.query(
        `INSERT INTO pnate_paradas
          (rota_id, ordem, endereco, ponto_referencia, latitude, longitude, hora_estimada)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          rotaId, p.ordem, p.endereco, p.ponto_referencia || null,
          p.latitude || null, p.longitude || null, p.hora_estimada || null,
        ]
      )
    }

    await client.query('COMMIT')
    return rotaId
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function buscarRotaCompleta(id: string) {
  const r = await pool.query(
    `SELECT r.*,
            v.placa AS veiculo_placa, v.capacidade,
            m.nome AS motorista_nome, m.cnh_numero,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'ordem', ordem, 'endereco', endereco,
                'ponto_referencia', ponto_referencia,
                'hora_estimada', hora_estimada
              ) ORDER BY ordem)
               FROM pnate_paradas WHERE rota_id = r.id),
              '[]'::json
            ) AS paradas,
            (SELECT COUNT(*) FROM pnate_alunos_rotas
              WHERE rota_id = r.id AND ativo = TRUE) AS qtd_alunos
       FROM pnate_rotas r
       LEFT JOIN pnate_veiculos v ON v.id = r.veiculo_id
       LEFT JOIN pnate_motoristas m ON m.id = r.motorista_id
      WHERE r.id = $1`,
    [id]
  )
  return r.rows[0] || null
}

export async function vincularAlunoRota(params: {
  aluno_id: string
  rota_id: string
  parada_id?: string
  tipo_uso?: 'ida' | 'volta' | 'ida_volta'
  vigencia_inicio?: string
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO pnate_alunos_rotas
      (aluno_id, rota_id, parada_id, tipo_uso, vigencia_inicio)
     VALUES ($1,$2,$3,$4, COALESCE($5::date, CURRENT_DATE))
     ON CONFLICT (aluno_id, rota_id, vigencia_inicio) DO UPDATE
       SET parada_id = EXCLUDED.parada_id,
           tipo_uso = EXCLUDED.tipo_uso,
           ativo = TRUE
     RETURNING id`,
    [
      params.aluno_id, params.rota_id,
      params.parada_id || null,
      params.tipo_uso || 'ida_volta',
      params.vigencia_inicio || null,
    ]
  )
  return r.rows[0].id
}

export async function listarRotas(filtros: { ativa?: boolean; escolaId?: string } = {}) {
  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  if (filtros.ativa !== false) conds.push('ativa = TRUE')
  if (filtros.escolaId) {
    params.push(filtros.escolaId)
    conds.push(`$${i++}::uuid = ANY(escolas_ids)`)
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

  const r = await pool.query(
    `SELECT r.id, r.codigo, r.descricao, r.escolas_ids, r.turno,
            r.distancia_km, r.hora_inicio, r.hora_fim,
            v.placa AS veiculo_placa,
            m.nome AS motorista_nome,
            (SELECT COUNT(*) FROM pnate_alunos_rotas
              WHERE rota_id = r.id AND ativo = TRUE) AS qtd_alunos
       FROM pnate_rotas r
       LEFT JOIN pnate_veiculos v ON v.id = r.veiculo_id
       LEFT JOIN pnate_motoristas m ON m.id = r.motorista_id
       ${where}
      ORDER BY r.codigo`,
    params
  )
  return r.rows
}

// ============================================================================
// ALERTAS DE VENCIMENTO
// ============================================================================

export async function alertasVencimento() {
  const veiculos = await pool.query(
    `SELECT id, placa, tipo, vistoria_validade,
            CASE
              WHEN vistoria_validade < CURRENT_DATE THEN 'vencida'
              WHEN vistoria_validade < CURRENT_DATE + 30 THEN 'vencendo_30d'
              WHEN vistoria_validade < CURRENT_DATE + 60 THEN 'vencendo_60d'
            END AS status_vistoria
       FROM pnate_veiculos
      WHERE ativo = TRUE
        AND vistoria_validade IS NOT NULL
        AND vistoria_validade < CURRENT_DATE + 60
      ORDER BY vistoria_validade`
  )

  const motoristas = await pool.query(
    `SELECT id, nome, cnh_numero, cnh_validade, curso_escolar_validade,
            CASE
              WHEN cnh_validade < CURRENT_DATE THEN 'cnh_vencida'
              WHEN curso_escolar_validade IS NOT NULL AND curso_escolar_validade < CURRENT_DATE THEN 'curso_vencido'
              WHEN cnh_validade < CURRENT_DATE + 30 THEN 'cnh_vencendo'
              ELSE NULL
            END AS alerta
       FROM pnate_motoristas
      WHERE ativo = TRUE
        AND (cnh_validade < CURRENT_DATE + 30
          OR (curso_escolar_validade IS NOT NULL AND curso_escolar_validade < CURRENT_DATE + 30))
      ORDER BY cnh_validade`
  )

  return { veiculos: veiculos.rows, motoristas: motoristas.rows }
}
