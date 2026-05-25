/**
 * Service Patrimônio — Inventário de bens.
 *
 * @module services/patrimonio
 */

import pool from '@/database/connection'

export type CategoriaBem = 'mobiliario' | 'eletronico' | 'didatico' | 'esportivo'
  | 'veiculo' | 'imovel' | 'equipamento_cozinha' | 'eletrodomestico'
  | 'instrumento_musical' | 'biblioteca' | 'outro'

export type EstadoConservacao = 'novo' | 'bom' | 'regular' | 'ruim' | 'inservivel'

export type StatusBem = 'ativo' | 'em_manutencao' | 'extraviado' | 'baixado'

export interface Bem {
  id?: string
  tombo: string
  descricao: string
  categoria: CategoriaBem
  marca?: string
  modelo?: string
  numero_serie?: string
  valor_aquisicao?: number
  data_aquisicao?: string
  origem?: 'compra' | 'doacao' | 'transferencia' | 'cessao' | 'outro'
  documento_origem?: string
  escola_id?: string | null
  sala_localizacao?: string
  estado_conservacao?: EstadoConservacao
  observacoes?: string
  foto_url?: string
}

export interface Movimentacao {
  bem_id: string
  tipo: 'transferencia' | 'manutencao_envio' | 'manutencao_retorno'
       | 'baixa' | 'reativacao' | 'mudanca_estado_conservacao'
  escola_origem_id?: string | null
  escola_destino_id?: string | null
  sala_origem?: string
  sala_destino?: string
  estado_anterior?: EstadoConservacao
  estado_novo?: EstadoConservacao
  motivo: string
  documento_url?: string
  realizado_em?: string
  registrado_por?: string
}

export async function cadastrarBem(b: Bem): Promise<string> {
  const r = await pool.query(
    `INSERT INTO patrimonio_bens
      (tombo, descricao, categoria, marca, modelo, numero_serie,
       valor_aquisicao, data_aquisicao, origem, documento_origem,
       escola_id, sala_localizacao, estado_conservacao,
       observacoes, foto_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id`,
    [
      b.tombo, b.descricao, b.categoria,
      b.marca || null, b.modelo || null, b.numero_serie || null,
      b.valor_aquisicao || null, b.data_aquisicao || null,
      b.origem || null, b.documento_origem || null,
      b.escola_id || null, b.sala_localizacao || null,
      b.estado_conservacao || 'bom',
      b.observacoes || null, b.foto_url || null,
    ]
  )
  return r.rows[0].id
}

export async function buscarBemPorTombo(tombo: string) {
  const r = await pool.query(
    `SELECT b.*, e.nome AS escola_nome
       FROM patrimonio_bens b
       LEFT JOIN escolas e ON e.id = b.escola_id
      WHERE b.tombo = $1`,
    [tombo]
  )
  return r.rows[0] || null
}

export async function listarBens(filtros: {
  escolaId?: string
  categoria?: CategoriaBem
  status?: StatusBem
  busca?: string
  limite?: number
} = {}) {
  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  if (filtros.escolaId) { params.push(filtros.escolaId); conds.push(`b.escola_id = $${i++}`) }
  if (filtros.categoria) { params.push(filtros.categoria); conds.push(`b.categoria = $${i++}`) }
  if (filtros.status) { params.push(filtros.status); conds.push(`b.status = $${i++}`) }
  if (filtros.busca && filtros.busca.length > 2) {
    params.push(filtros.busca)
    conds.push(`(b.descricao ILIKE '%' || $${i} || '%' OR b.tombo = $${i} OR b.numero_serie = $${i})`)
    i++
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(filtros.limite ?? 100, 1000)
  params.push(limite)

  const r = await pool.query(
    `SELECT b.id, b.tombo, b.descricao, b.categoria, b.marca, b.modelo,
            b.sala_localizacao, b.estado_conservacao, b.status,
            b.valor_aquisicao, b.escola_id, e.nome AS escola_nome
       FROM patrimonio_bens b
       LEFT JOIN escolas e ON e.id = b.escola_id
       ${where}
      ORDER BY b.tombo
      LIMIT $${i}`,
    params
  )
  return r.rows
}

export async function registrarMovimentacao(m: Movimentacao): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Busca estado atual do bem para snapshot
    const bemR = await client.query(
      `SELECT escola_id, sala_localizacao, estado_conservacao, status
         FROM patrimonio_bens WHERE id = $1 FOR UPDATE`,
      [m.bem_id]
    )
    const bem = bemR.rows[0]
    if (!bem) throw new Error('Bem não encontrado')

    // Insere movimentação
    const movR = await client.query(
      `INSERT INTO patrimonio_movimentacoes
        (bem_id, tipo, escola_origem_id, escola_destino_id,
         sala_origem, sala_destino, estado_anterior, estado_novo,
         motivo, documento_url, realizado_em, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, COALESCE($11::date, CURRENT_DATE), $12)
       RETURNING id`,
      [
        m.bem_id, m.tipo,
        m.escola_origem_id || bem.escola_id,
        m.escola_destino_id || null,
        m.sala_origem || bem.sala_localizacao,
        m.sala_destino || null,
        m.estado_anterior || bem.estado_conservacao,
        m.estado_novo || null,
        m.motivo, m.documento_url || null,
        m.realizado_em || null, m.registrado_por || null,
      ]
    )

    // Atualiza estado do bem conforme tipo de movimentação
    if (m.tipo === 'transferencia' && m.escola_destino_id) {
      await client.query(
        `UPDATE patrimonio_bens
            SET escola_id = $2, sala_localizacao = $3, atualizado_em = NOW()
          WHERE id = $1`,
        [m.bem_id, m.escola_destino_id, m.sala_destino || null]
      )
    } else if (m.tipo === 'manutencao_envio') {
      await client.query(
        `UPDATE patrimonio_bens SET status = 'em_manutencao', atualizado_em = NOW() WHERE id = $1`,
        [m.bem_id]
      )
    } else if (m.tipo === 'manutencao_retorno') {
      await client.query(
        `UPDATE patrimonio_bens SET status = 'ativo', atualizado_em = NOW() WHERE id = $1`,
        [m.bem_id]
      )
    } else if (m.tipo === 'baixa') {
      await client.query(
        `UPDATE patrimonio_bens SET status = 'baixado', atualizado_em = NOW() WHERE id = $1`,
        [m.bem_id]
      )
    } else if (m.tipo === 'reativacao') {
      await client.query(
        `UPDATE patrimonio_bens SET status = 'ativo', atualizado_em = NOW() WHERE id = $1`,
        [m.bem_id]
      )
    } else if (m.tipo === 'mudanca_estado_conservacao' && m.estado_novo) {
      await client.query(
        `UPDATE patrimonio_bens SET estado_conservacao = $2, atualizado_em = NOW() WHERE id = $1`,
        [m.bem_id, m.estado_novo]
      )
    }

    await client.query('COMMIT')
    return movR.rows[0].id
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function historicoBem(bemId: string) {
  const r = await pool.query(
    `SELECT m.*, eo.nome AS escola_origem_nome, ed.nome AS escola_destino_nome,
            u.nome AS registrado_por_nome
       FROM patrimonio_movimentacoes m
       LEFT JOIN escolas eo ON eo.id = m.escola_origem_id
       LEFT JOIN escolas ed ON ed.id = m.escola_destino_id
       LEFT JOIN usuarios u ON u.id = m.registrado_por
      WHERE m.bem_id = $1
      ORDER BY m.realizado_em DESC, m.criado_em DESC`,
    [bemId]
  )
  return r.rows
}

export async function inventarioEscola(escolaId: string) {
  const r = await pool.query(
    `SELECT categoria, estado_conservacao, status,
            COUNT(*) AS quantidade,
            COALESCE(SUM(valor_aquisicao), 0) AS valor_total
       FROM patrimonio_bens
      WHERE escola_id = $1
      GROUP BY categoria, estado_conservacao, status
      ORDER BY categoria`,
    [escolaId]
  )
  return r.rows
}
