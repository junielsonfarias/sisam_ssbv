/**
 * Service PNAE — Programa Nacional de Alimentação Escolar.
 *
 * Base legal: Lei 11.947/2009 + Resoluções FNDE.
 *
 * @module services/pnae
 */

import pool from '@/database/connection'

export type FaixaEtaria = 'creche' | 'pre_escola' | 'fundamental' | 'eja' | 'integral'

export type TipoRefeicao = 'cafe_manha' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar'

export const FAIXA_LABEL: Record<FaixaEtaria, string> = {
  creche: 'Creche (0-3 anos)',
  pre_escola: 'Pré-escola (4-5 anos)',
  fundamental: 'Ensino Fundamental',
  eja: 'EJA',
  integral: 'Tempo Integral',
}

export const TIPO_REFEICAO_LABEL: Record<TipoRefeicao, string> = {
  cafe_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
}

export interface Refeicao {
  dia_semana: number
  tipo: TipoRefeicao
  descricao: string
  detalhes?: Record<string, unknown>
  kcal?: number
  proteinas_g?: number
  carboidratos_g?: number
  gorduras_g?: number
  contem_alergenicos?: string[]
}

// ============================================================================
// CARDÁPIOS
// ============================================================================

export async function criarCardapio(params: {
  escola_id: string | null
  semana_inicio: string
  semana_fim: string
  faixa_etaria: FaixaEtaria
  nutricionista_id?: string
  observacoes?: string
  refeicoes: Refeicao[]
}): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const r = await client.query(
      `INSERT INTO pnae_cardapios
        (escola_id, semana_inicio, semana_fim, faixa_etaria, nutricionista_id, observacoes, status)
       VALUES ($1,$2,$3,$4,$5,$6,'rascunho')
       RETURNING id`,
      [
        params.escola_id, params.semana_inicio, params.semana_fim,
        params.faixa_etaria, params.nutricionista_id || null,
        params.observacoes || null,
      ]
    )
    const cardapioId = r.rows[0].id

    for (const ref of params.refeicoes) {
      await client.query(
        `INSERT INTO pnae_refeicoes
          (cardapio_id, dia_semana, tipo, descricao, detalhes,
           kcal, proteinas_g, carboidratos_g, gorduras_g, contem_alergenicos)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10)`,
        [
          cardapioId, ref.dia_semana, ref.tipo, ref.descricao,
          JSON.stringify(ref.detalhes || {}),
          ref.kcal || null, ref.proteinas_g || null,
          ref.carboidratos_g || null, ref.gorduras_g || null,
          ref.contem_alergenicos || [],
        ]
      )
    }

    await client.query('COMMIT')
    return cardapioId
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function publicarCardapio(id: string): Promise<boolean> {
  const r = await pool.query(
    `UPDATE pnae_cardapios SET status = 'publicado', atualizado_em = NOW()
      WHERE id = $1 AND status = 'rascunho'`,
    [id]
  )
  return (r.rowCount ?? 0) > 0
}

export async function buscarCardapioSemana(params: {
  escola_id: string
  data_referencia: string  // qualquer data da semana
  faixa_etaria: FaixaEtaria
}) {
  // Busca cardápio específico da escola; fallback para cardápio municipal (escola_id NULL)
  const r = await pool.query(
    `SELECT c.*,
            n.nome AS nutricionista_nome, n.crn AS nutricionista_crn,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'dia_semana', dia_semana, 'tipo', tipo,
                'descricao', descricao, 'kcal', kcal,
                'contem_alergenicos', contem_alergenicos
              ) ORDER BY dia_semana, tipo)
                FROM pnae_refeicoes WHERE cardapio_id = c.id),
              '[]'::json
            ) AS refeicoes
       FROM pnae_cardapios c
       LEFT JOIN pnae_nutricionistas n ON n.id = c.nutricionista_id
      WHERE (c.escola_id = $1 OR c.escola_id IS NULL)
        AND c.faixa_etaria = $2
        AND $3::date BETWEEN c.semana_inicio AND c.semana_fim
        AND c.status = 'publicado'
      ORDER BY c.escola_id NULLS LAST
      LIMIT 1`,
    [params.escola_id, params.faixa_etaria, params.data_referencia]
  )
  return r.rows[0] || null
}

// ============================================================================
// ATENDIMENTOS DIÁRIOS (prestação FNDE)
// ============================================================================

export async function registrarAtendimentoDiario(params: {
  escola_id: string
  data_atendimento: string
  faixa_etaria: FaixaEtaria
  tipo_refeicao: TipoRefeicao
  qtd_alunos: number
  qtd_extra?: number
  observacoes?: string
  registrado_por: string
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO pnae_atendimentos_diarios
      (escola_id, data_atendimento, faixa_etaria, tipo_refeicao,
       qtd_alunos, qtd_extra, observacoes, registrado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (escola_id, data_atendimento, faixa_etaria, tipo_refeicao) DO UPDATE
       SET qtd_alunos = EXCLUDED.qtd_alunos,
           qtd_extra = EXCLUDED.qtd_extra,
           observacoes = EXCLUDED.observacoes,
           registrado_por = EXCLUDED.registrado_por
     RETURNING id`,
    [
      params.escola_id, params.data_atendimento, params.faixa_etaria,
      params.tipo_refeicao, params.qtd_alunos, params.qtd_extra ?? 0,
      params.observacoes || null, params.registrado_por,
    ]
  )
  return r.rows[0].id
}

export async function resumoMensalAtendimentos(params: {
  escola_id?: string
  ano: number
  mes: number
}) {
  const where = params.escola_id
    ? `escola_id = $3 AND `
    : ``
  const queryParams: unknown[] = [params.ano, params.mes]
  if (params.escola_id) queryParams.push(params.escola_id)

  const r = await pool.query(
    `SELECT faixa_etaria, tipo_refeicao,
            SUM(qtd_alunos) AS total_alunos,
            SUM(qtd_extra) AS total_extra,
            COUNT(DISTINCT data_atendimento) AS dias_servidos
       FROM pnae_atendimentos_diarios
      WHERE ${where}
            EXTRACT(YEAR FROM data_atendimento) = $1
        AND EXTRACT(MONTH FROM data_atendimento) = $2
      GROUP BY faixa_etaria, tipo_refeicao
      ORDER BY faixa_etaria, tipo_refeicao`,
    queryParams
  )
  return r.rows
}

// ============================================================================
// RESTRIÇÕES ALIMENTARES
// ============================================================================

export async function registrarRestricao(params: {
  aluno_id: string
  tipo_restricao: string
  descricao: string
  laudo_url?: string
  registrada_por: string
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO pnae_restricoes_alunos
       (aluno_id, tipo_restricao, descricao, laudo_url, registrada_por)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [
      params.aluno_id, params.tipo_restricao, params.descricao,
      params.laudo_url || null, params.registrada_por,
    ]
  )
  return r.rows[0].id
}

export async function listarRestricoesAluno(alunoId: string) {
  const r = await pool.query(
    `SELECT * FROM pnae_restricoes_alunos
      WHERE aluno_id = $1 AND ativa = TRUE
      ORDER BY registrada_em DESC`,
    [alunoId]
  )
  return r.rows
}

export async function listarAlunosComRestricoes(escolaId: string) {
  const r = await pool.query(
    `SELECT a.id AS aluno_id, a.nome, t.codigo AS turma,
            json_agg(json_build_object(
              'tipo', r.tipo_restricao,
              'descricao', r.descricao
            )) AS restricoes
       FROM alunos a
       INNER JOIN pnae_restricoes_alunos r ON r.aluno_id = a.id AND r.ativa = TRUE
       LEFT JOIN turmas t ON t.id = a.turma_id
      WHERE a.escola_id = $1
      GROUP BY a.id, a.nome, t.codigo
      ORDER BY a.nome`,
    [escolaId]
  )
  return r.rows
}

// ============================================================================
// NUTRICIONISTAS
// ============================================================================

export async function listarNutricionistas(incluirInativas = false) {
  const where = incluirInativas ? '' : 'WHERE ativa = TRUE'
  const r = await pool.query(
    `SELECT * FROM pnae_nutricionistas ${where} ORDER BY responsavel_tecnico DESC, nome`
  )
  return r.rows
}

export async function cadastrarNutricionista(n: {
  nome: string
  crn: string
  telefone?: string
  email?: string
  responsavel_tecnico?: boolean
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO pnae_nutricionistas (nome, crn, telefone, email, responsavel_tecnico)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [n.nome, n.crn, n.telefone || null, n.email || null, n.responsavel_tecnico ?? false]
  )
  return r.rows[0].id
}

export async function atualizarNutricionista(id: string, n: {
  nome?: string
  telefone?: string | null
  email?: string | null
  responsavel_tecnico?: boolean
  ativa?: boolean
}): Promise<boolean> {
  const campos: string[] = []
  const params: unknown[] = []
  let i = 1
  if (n.nome !== undefined) { params.push(n.nome); campos.push(`nome = $${i++}`) }
  if (n.telefone !== undefined) { params.push(n.telefone); campos.push(`telefone = $${i++}`) }
  if (n.email !== undefined) { params.push(n.email); campos.push(`email = $${i++}`) }
  if (n.responsavel_tecnico !== undefined) { params.push(n.responsavel_tecnico); campos.push(`responsavel_tecnico = $${i++}`) }
  if (n.ativa !== undefined) { params.push(n.ativa); campos.push(`ativa = $${i++}`) }
  if (campos.length === 0) return false
  params.push(id)
  const r = await pool.query(
    `UPDATE pnae_nutricionistas SET ${campos.join(', ')} WHERE id = $${i}`,
    params
  )
  return (r.rowCount ?? 0) > 0
}
