/**
 * FICAI — CRUD de casos, ações, transição de status e estatísticas.
 *
 * @module services/ficai/casos
 */

import pool from '@/database/connection'
import { registrarAuditoria } from '../auditoria.service'
import {
  type StatusFicai,
  type MotivoFicai,
  STATUS_LABEL,
  STATUS_ABERTOS,
  transicaoValidaFicai,
} from './constants'

export async function abrirCaso(params: {
  aluno_id: string
  escola_id: string
  ano_letivo: string
  origem: 'sistema' | 'manual_escola' | 'manual_polo' | 'manual_admin'
  motivo: MotivoFicai
  detalhes_motivo?: string
  faltas_consecutivas?: number
  pct_faltas_mes?: number
  ultima_presenca?: string
  responsavel_caso_id?: string
}): Promise<boolean> {
  // Verifica se já existe caso aberto para este aluno no ano
  const ja = await pool.query(
    `SELECT 1 FROM ficai_casos
      WHERE aluno_id = $1 AND ano_letivo = $2
        AND status = ANY($3)
      LIMIT 1`,
    [params.aluno_id, params.ano_letivo, STATUS_ABERTOS]
  )
  if ((ja.rowCount ?? 0) > 0) return false

  await pool.query(
    `INSERT INTO ficai_casos
       (aluno_id, escola_id, ano_letivo, origem, motivo,
        detalhes_motivo, faltas_consecutivas, pct_faltas_mes,
        ultima_presenca, responsavel_caso_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      params.aluno_id, params.escola_id, params.ano_letivo,
      params.origem, params.motivo, params.detalhes_motivo || null,
      params.faltas_consecutivas || null, params.pct_faltas_mes || null,
      params.ultima_presenca || null,
      params.responsavel_caso_id || null,
    ]
  )

  return true
}

export async function atualizarStatus(params: {
  casoId: string
  novoStatus: StatusFicai
  usuarioId: string
  observacao?: string
}): Promise<boolean> {
  // Valida transição contra a máquina de estados (impede pulos ilegais)
  const atualR = await pool.query(
    `SELECT status FROM ficai_casos WHERE id = $1`,
    [params.casoId]
  )
  if (!atualR.rows[0]) return false
  const statusAnterior = atualR.rows[0].status as StatusFicai
  if (!transicaoValidaFicai(statusAnterior, params.novoStatus)) {
    throw new Error(`Transição inválida: ${STATUS_LABEL[statusAnterior]} → ${STATUS_LABEL[params.novoStatus]}`)
  }

  const campos: string[] = [`status = $1`, `atualizado_em = NOW()`]
  const queryParams: unknown[] = [params.novoStatus]
  let i = 2

  if (params.novoStatus === 'contato_responsavel') {
    campos.push(`contato_responsavel_em = NOW()`)
  }
  if (params.novoStatus.startsWith('encaminhado')) {
    campos.push(`encaminhado_em = NOW()`)
  }
  if (params.novoStatus.startsWith('concluido') || params.novoStatus === 'cancelado') {
    campos.push(`concluido_em = NOW()`)
  }

  queryParams.push(params.casoId)
  const r = await pool.query(
    `UPDATE ficai_casos SET ${campos.join(', ')}
       WHERE id = $${i}
     RETURNING aluno_id`,
    queryParams
  )

  if ((r.rowCount ?? 0) > 0) {
    // Registra ação na timeline
    await pool.query(
      `INSERT INTO ficai_acoes (caso_id, tipo, descricao, realizado_por)
         VALUES ($1, 'mudanca_status', $2, $3)`,
      [
        params.casoId,
        `Status atualizado para: ${STATUS_LABEL[params.novoStatus]}${params.observacao ? ` — ${params.observacao}` : ''}`,
        params.usuarioId,
      ]
    )
    await registrarAuditoria({
      usuarioId: params.usuarioId,
      acao: 'FICAI_MUDAR_STATUS',
      entidade: 'ficai_casos',
      entidadeId: params.casoId,
      detalhes: { status: params.novoStatus },
    })
    return true
  }
  return false
}

export async function registrarAcao(params: {
  caso_id: string
  tipo: string
  descricao: string
  anexo_url?: string
  realizado_por: string
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO ficai_acoes (caso_id, tipo, descricao, anexo_url, realizado_por)
       VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [params.caso_id, params.tipo, params.descricao, params.anexo_url || null, params.realizado_por]
  )
  return r.rows[0].id
}

export async function listarCasos(filtros: {
  escolaId?: string
  escolaIds?: string[]
  status?: StatusFicai
  anoLetivo?: string
  apenasAbertos?: boolean
  limite?: number
  offset?: number
}) {
  const conds: string[] = []
  const params: unknown[] = []
  let i = 1

  if (filtros.escolaId) { params.push(filtros.escolaId); conds.push(`f.escola_id = $${i++}`) }
  // Escopo por conjunto de escolas (ex.: todas as escolas de um polo)
  if (filtros.escolaIds && filtros.escolaIds.length) { params.push(filtros.escolaIds); conds.push(`f.escola_id = ANY($${i++}::uuid[])`) }
  if (filtros.status) { params.push(filtros.status); conds.push(`f.status = $${i++}`) }
  if (filtros.anoLetivo) { params.push(filtros.anoLetivo); conds.push(`f.ano_letivo = $${i++}`) }
  if (filtros.apenasAbertos) {
    params.push(STATUS_ABERTOS)
    conds.push(`f.status = ANY($${i++})`)
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(filtros.limite ?? 50, 500)
  const offset = filtros.offset ?? 0
  params.push(limite, offset)

  const r = await pool.query(
    `SELECT f.*, a.nome AS aluno_nome, a.codigo AS matricula,
            e.nome AS escola_nome
       FROM ficai_casos f
       INNER JOIN alunos a ON a.id = f.aluno_id
       INNER JOIN escolas e ON e.id = f.escola_id
       ${where}
      ORDER BY f.aberto_em DESC
      LIMIT $${i++} OFFSET $${i}`,
    params
  )
  return r.rows
}

export async function buscarCaso(id: string) {
  const r = await pool.query(
    `SELECT f.*, a.nome AS aluno_nome, a.codigo AS matricula,
            e.nome AS escola_nome,
            u.nome AS responsavel_caso_nome
       FROM ficai_casos f
       INNER JOIN alunos a ON a.id = f.aluno_id
       INNER JOIN escolas e ON e.id = f.escola_id
       LEFT JOIN usuarios u ON u.id = f.responsavel_caso_id
      WHERE f.id = $1`,
    [id]
  )
  const caso = r.rows[0]
  if (!caso) return null

  const acoes = await pool.query(
    `SELECT a.*, u.nome AS realizado_por_nome
       FROM ficai_acoes a
       LEFT JOIN usuarios u ON u.id = a.realizado_por
      WHERE a.caso_id = $1
      ORDER BY a.realizado_em DESC`,
    [id]
  )

  return { ...caso, acoes: acoes.rows }
}

export async function obterEstatisticas(
  anoLetivo: string,
  scope?: { escolaId?: string; escolaIds?: string[] }
) {
  const conds = ['ano_letivo = $1']
  const params: unknown[] = [anoLetivo]
  if (scope?.escolaId) {
    params.push(scope.escolaId)
    conds.push(`escola_id = $${params.length}`)
  } else if (scope?.escolaIds && scope.escolaIds.length > 0) {
    params.push(scope.escolaIds)
    conds.push(`escola_id = ANY($${params.length}::uuid[])`)
  }

  const r = await pool.query(
    `SELECT status, COUNT(*) AS total
       FROM ficai_casos
      WHERE ${conds.join(' AND ')}
      GROUP BY status`,
    params
  )
  const porStatus: Record<string, number> = {}
  for (const row of r.rows) porStatus[row.status] = parseInt(row.total, 10)

  const totalAbertos = STATUS_ABERTOS.reduce((s, st) => s + (porStatus[st] || 0), 0)
  const totalConcluidos = (porStatus['concluido_resolvido'] || 0) + (porStatus['aluno_retornou'] || 0)
  const totalEvasao = porStatus['concluido_evasao_confirmada'] || 0

  return {
    total: Object.values(porStatus).reduce((s, n) => s + n, 0),
    abertos: totalAbertos,
    resolvidos: totalConcluidos,
    evasao_confirmada: totalEvasao,
    por_status: porStatus,
  }
}
