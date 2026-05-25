/**
 * Service Ordens de Serviço — Manutenção SEMED.
 *
 * @module services/ordens-servico
 */

import pool from '@/database/connection'

export type TipoOS = 'predial' | 'eletrica' | 'hidraulica' | 'mobiliario'
  | 'ti' | 'rede_internet' | 'limpeza' | 'jardinagem'
  | 'pintura' | 'estrutural' | 'merenda_equip' | 'outros'

export type StatusOS = 'aberta' | 'em_analise' | 'aprovada' | 'em_atendimento'
  | 'aguardando_material' | 'aguardando_terceiros'
  | 'concluida' | 'cancelada' | 'reaberta'

export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente'

/**
 * Transições válidas de status para evitar inconsistências.
 * Fluxo: aberta → em_analise → aprovada → em_atendimento → concluida.
 * Ramos paralelos: aguardando_material / aguardando_terceiros podem ser
 * alcançados a partir de em_atendimento. Cancelada de qualquer não-terminal.
 * Reaberta apenas de concluida ou cancelada.
 */
const TRANSICOES_VALIDAS: Record<StatusOS, StatusOS[]> = {
  aberta: ['em_analise', 'aprovada', 'cancelada'],
  em_analise: ['aprovada', 'cancelada', 'aberta'],
  aprovada: ['em_atendimento', 'cancelada'],
  em_atendimento: ['aguardando_material', 'aguardando_terceiros', 'concluida', 'cancelada'],
  aguardando_material: ['em_atendimento', 'cancelada'],
  aguardando_terceiros: ['em_atendimento', 'cancelada'],
  concluida: ['reaberta'],
  cancelada: ['reaberta'],
  reaberta: ['em_analise', 'em_atendimento', 'cancelada'],
}

export function transicaoValida(de: StatusOS, para: StatusOS): boolean {
  if (de === para) return true  // mesmo status (só comentário)
  return TRANSICOES_VALIDAS[de]?.includes(para) ?? false
}

export interface NovaOS {
  escola_id: string
  tipo: TipoOS
  prioridade?: Prioridade
  titulo: string
  descricao: string
  local_escola?: string
  fotos_urls?: string[]
  aberta_por: string
}

export async function abrirOrdem(os: NovaOS): Promise<{ id: string; numero: string }> {
  const r = await pool.query(
    `INSERT INTO ordens_servico
      (escola_id, tipo, prioridade, titulo, descricao,
       local_escola, fotos_urls, aberta_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, numero`,
    [
      os.escola_id, os.tipo, os.prioridade || 'media',
      os.titulo, os.descricao, os.local_escola || null,
      os.fotos_urls || [], os.aberta_por,
    ]
  )
  return r.rows[0]
}

export async function atualizarStatus(params: {
  ordem_id: string
  novo_status: StatusOS
  comentario: string
  autor_id: string
  responsavel_id?: string
  prevista_para?: string
  custo_estimado?: number
  custo_real?: number
}): Promise<{ statusAnterior: StatusOS; numero: string }> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const atualR = await client.query(
      `SELECT status, numero FROM ordens_servico WHERE id = $1 FOR UPDATE`,
      [params.ordem_id]
    )
    if (!atualR.rows[0]) throw new Error('Ordem não encontrada')
    const statusAnterior = atualR.rows[0].status as StatusOS
    const numero = atualR.rows[0].numero as string

    if (!transicaoValida(statusAnterior, params.novo_status)) {
      throw new Error(`Transição inválida: ${statusAnterior} → ${params.novo_status}`)
    }

    const campos: string[] = [`status = $1`, `atualizado_em = NOW()`]
    const queryParams: unknown[] = [params.novo_status]
    let i = 2

    if (params.responsavel_id !== undefined) {
      queryParams.push(params.responsavel_id)
      campos.push(`responsavel_id = $${i++}`)
    }
    if (params.prevista_para !== undefined) {
      queryParams.push(params.prevista_para)
      campos.push(`prevista_para = $${i++}`)
    }
    if (params.custo_estimado !== undefined) {
      queryParams.push(params.custo_estimado)
      campos.push(`custo_estimado = $${i++}`)
    }
    if (params.custo_real !== undefined) {
      queryParams.push(params.custo_real)
      campos.push(`custo_real = $${i++}`)
    }
    if (params.novo_status === 'concluida') campos.push(`concluida_em = NOW()`)
    if (params.novo_status === 'cancelada') campos.push(`cancelada_em = NOW()`)

    queryParams.push(params.ordem_id)
    await client.query(
      `UPDATE ordens_servico SET ${campos.join(', ')} WHERE id = $${i}`,
      queryParams
    )

    // Adiciona comentário na timeline
    await client.query(
      `INSERT INTO ordens_servico_comentarios
        (ordem_id, autor_id, texto, status_anterior, status_novo)
       VALUES ($1,$2,$3,$4,$5)`,
      [params.ordem_id, params.autor_id, params.comentario, statusAnterior, params.novo_status]
    )

    await client.query('COMMIT')
    return { statusAnterior, numero }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function adicionarComentario(params: {
  ordem_id: string
  autor_id: string
  texto: string
  anexos_urls?: string[]
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO ordens_servico_comentarios
      (ordem_id, autor_id, texto, anexos_urls)
     VALUES ($1,$2,$3,$4)
     RETURNING id`,
    [params.ordem_id, params.autor_id, params.texto, params.anexos_urls || []]
  )
  return r.rows[0].id
}

export async function avaliarServico(params: {
  ordem_id: string
  estrelas: number
  comentario?: string
}): Promise<boolean> {
  if (params.estrelas < 1 || params.estrelas > 5) {
    throw new Error('Avaliação deve ser entre 1 e 5 estrelas')
  }
  const r = await pool.query(
    `UPDATE ordens_servico
       SET avaliacao_estrelas = $2, avaliacao_comentario = $3
     WHERE id = $1 AND status = 'concluida'`,
    [params.ordem_id, params.estrelas, params.comentario || null]
  )
  return (r.rowCount ?? 0) > 0
}

export async function listarOrdens(filtros: {
  escolaId?: string
  status?: StatusOS
  tipo?: TipoOS
  prioridade?: Prioridade
  apenasAbertas?: boolean
  responsavelId?: string
  limite?: number
}) {
  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  if (filtros.escolaId) { params.push(filtros.escolaId); conds.push(`o.escola_id = $${i++}`) }
  if (filtros.status) { params.push(filtros.status); conds.push(`o.status = $${i++}`) }
  if (filtros.tipo) { params.push(filtros.tipo); conds.push(`o.tipo = $${i++}`) }
  if (filtros.prioridade) { params.push(filtros.prioridade); conds.push(`o.prioridade = $${i++}`) }
  if (filtros.responsavelId) { params.push(filtros.responsavelId); conds.push(`o.responsavel_id = $${i++}`) }
  if (filtros.apenasAbertas) conds.push(`o.status NOT IN ('concluida', 'cancelada')`)

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(filtros.limite ?? 50, 200)
  params.push(limite)

  const r = await pool.query(
    `SELECT o.id, o.numero, o.tipo, o.prioridade, o.titulo, o.status,
            o.aberta_em, o.prevista_para, o.concluida_em,
            o.avaliacao_estrelas,
            e.nome AS escola_nome,
            u.nome AS responsavel_nome
       FROM ordens_servico o
       INNER JOIN escolas e ON e.id = o.escola_id
       LEFT JOIN usuarios u ON u.id = o.responsavel_id
       ${where}
      ORDER BY
        CASE o.prioridade
          WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2
          WHEN 'media' THEN 3 ELSE 4 END,
        o.aberta_em DESC
      LIMIT $${i}`,
    params
  )
  return r.rows
}

export async function buscarOrdem(id: string) {
  const r = await pool.query(
    `SELECT o.*, e.nome AS escola_nome,
            ab.nome AS aberta_por_nome,
            resp.nome AS responsavel_nome,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', c.id, 'autor_nome', u.nome,
                'texto', c.texto, 'status_anterior', c.status_anterior,
                'status_novo', c.status_novo, 'criado_em', c.criado_em,
                'anexos_urls', c.anexos_urls
              ) ORDER BY c.criado_em DESC)
               FROM ordens_servico_comentarios c
               LEFT JOIN usuarios u ON u.id = c.autor_id
              WHERE c.ordem_id = o.id),
              '[]'::json
            ) AS comentarios
       FROM ordens_servico o
       INNER JOIN escolas e ON e.id = o.escola_id
       LEFT JOIN usuarios ab ON ab.id = o.aberta_por
       LEFT JOIN usuarios resp ON resp.id = o.responsavel_id
      WHERE o.id = $1`,
    [id]
  )
  return r.rows[0] || null
}

export async function estatisticas(escolaId?: string) {
  const params: unknown[] = []
  let where = ''
  if (escolaId) { params.push(escolaId); where = `WHERE escola_id = $1` }

  const r = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status NOT IN ('concluida', 'cancelada')) AS abertas,
       COUNT(*) FILTER (WHERE status = 'concluida') AS concluidas,
       COUNT(*) FILTER (WHERE prioridade = 'urgente' AND status NOT IN ('concluida', 'cancelada')) AS urgentes_abertas,
       AVG(EXTRACT(EPOCH FROM (concluida_em - aberta_em)) / 86400.0)
         FILTER (WHERE concluida_em IS NOT NULL) AS dias_medio_atendimento,
       AVG(avaliacao_estrelas) FILTER (WHERE avaliacao_estrelas IS NOT NULL) AS avaliacao_media
     FROM ordens_servico ${where}`,
    params
  )
  return r.rows[0]
}
