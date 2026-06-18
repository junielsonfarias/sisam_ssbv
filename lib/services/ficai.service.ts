/**
 * Service FICAI — Ficha de Comunicação do Aluno Infrequente.
 *
 * Detecta infrequência, abre casos automaticamente e gerencia o fluxo
 * conforme ECA Art. 56 (escola → responsável → Conselho Tutelar → MP).
 *
 * @module services/ficai
 */

import pool from '@/database/connection'
import { registrarAuditoria } from './auditoria.service'

export type StatusFicai =
  | 'aberto'
  | 'contato_responsavel'
  | 'aluno_retornou'
  | 'encaminhado_conselho_tutelar'
  | 'encaminhado_ministerio_publico'
  | 'concluido_aluno_transferido'
  | 'concluido_resolvido'
  | 'concluido_evasao_confirmada'
  | 'cancelado'

export type MotivoFicai =
  | 'infrequencia_50'
  | 'ausencia_consecutiva'
  | 'abandono_suspeito'
  | 'evasao_confirmada'
  | 'outro'

export const STATUS_LABEL: Record<StatusFicai, string> = {
  aberto: 'Aberto',
  contato_responsavel: 'Contato com responsável',
  aluno_retornou: 'Aluno retornou',
  encaminhado_conselho_tutelar: 'Encaminhado ao Conselho Tutelar',
  encaminhado_ministerio_publico: 'Encaminhado ao Ministério Público',
  concluido_aluno_transferido: 'Concluído — aluno transferido',
  concluido_resolvido: 'Concluído — resolvido',
  concluido_evasao_confirmada: 'Concluído — evasão confirmada',
  cancelado: 'Cancelado',
}

/**
 * Transições válidas no fluxo FICAI (ECA Art. 56).
 * Fluxo natural: aberto → contato_responsavel → aluno_retornou (resolvido)
 *           OU: aberto → contato_responsavel → encaminhado_conselho_tutelar → encaminhado_ministerio_publico
 * Conclusões podem ser alcançadas dos status em andamento (não direto de aberto).
 */
const TRANSICOES_FICAI: Record<StatusFicai, StatusFicai[]> = {
  aberto: ['contato_responsavel', 'concluido_aluno_transferido', 'cancelado'],
  contato_responsavel: [
    'aluno_retornou',
    'encaminhado_conselho_tutelar',
    'concluido_resolvido',
    'concluido_aluno_transferido',
    'concluido_evasao_confirmada',
    'cancelado',
  ],
  aluno_retornou: ['concluido_resolvido', 'contato_responsavel'],
  encaminhado_conselho_tutelar: [
    'encaminhado_ministerio_publico',
    'aluno_retornou',
    'concluido_resolvido',
    'concluido_aluno_transferido',
    'concluido_evasao_confirmada',
    'cancelado',
  ],
  encaminhado_ministerio_publico: [
    'aluno_retornou',
    'concluido_resolvido',
    'concluido_aluno_transferido',
    'concluido_evasao_confirmada',
    'cancelado',
  ],
  concluido_aluno_transferido: [],
  concluido_resolvido: [],
  concluido_evasao_confirmada: [],
  cancelado: ['aberto'], // permite reabrir caso cancelado por engano
}

export function transicaoValidaFicai(de: StatusFicai, para: StatusFicai): boolean {
  if (de === para) return true
  return TRANSICOES_FICAI[de]?.includes(para) ?? false
}

const STATUS_ABERTOS: StatusFicai[] = [
  'aberto', 'contato_responsavel', 'aluno_retornou',
  'encaminhado_conselho_tutelar', 'encaminhado_ministerio_publico',
]

// ============================================================================
// DETECÇÃO AUTOMÁTICA
// ============================================================================

/**
 * Verifica casos de infrequência e abre FICAIs automaticamente.
 * Deve ser chamado por job diário/semanal.
 *
 * Critérios:
 *  - >= 5 dias consecutivos de ausência registrados
 *  - >= 50% de faltas em um mês completo
 */
export async function detectarInfrequencia(anoLetivo: string): Promise<{
  ausencias_consecutivas: number
  infrequencia_50pct: number
  total_casos_abertos: number
}> {
  let ausenciasConsecutivas = 0
  let infrequencia50 = 0

  // CRITÉRIO 1: ausência consecutiva (>= 5 dias)
  // Busca alunos cujo ÚLTIMO registro de presença foi >= 5 dias atrás
  // e que têm registros de falta nesse intervalo
  // (FIX: coluna real e `status`, nao `presenca`. Valores: 'presente' /
  //  'ausente' / 'justificado' — ver add-status-justificativa-frequencia.sql)
  // .catch silencioso removido para erros aparecerem nos logs em vez de
  // mascarar detecção quebrada como "0 casos".
  const r1 = await pool.query(
    `WITH ultima_presenca AS (
       SELECT aluno_id, MAX(data) AS data
         FROM frequencia_diaria
        WHERE status = 'presente'
          AND data >= ($1 || '-01-01')::date
          AND data <= ($1 || '-12-31')::date
        GROUP BY aluno_id
     ),
     dias_falta_recente AS (
       SELECT f.aluno_id, COUNT(*) AS faltas
         FROM frequencia_diaria f
         LEFT JOIN ultima_presenca up ON up.aluno_id = f.aluno_id
        WHERE f.status = 'ausente'
          AND f.data > COALESCE(up.data, '1900-01-01'::date)
          AND f.data >= NOW() - INTERVAL '14 days'
        GROUP BY f.aluno_id
        HAVING COUNT(*) >= 5
     )
     SELECT a.id AS aluno_id, a.escola_id, df.faltas, up.data AS ultima_presenca
       FROM dias_falta_recente df
       INNER JOIN alunos a ON a.id = df.aluno_id
       LEFT JOIN ultima_presenca up ON up.aluno_id = df.aluno_id
      WHERE a.escola_id IS NOT NULL`,
    [anoLetivo]
  )

  for (const row of r1.rows) {
    const aberto = await abrirCaso({
      aluno_id: row.aluno_id,
      escola_id: row.escola_id,
      ano_letivo: anoLetivo,
      origem: 'sistema',
      motivo: 'ausencia_consecutiva',
      faltas_consecutivas: parseInt(row.faltas, 10),
      ultima_presenca: row.ultima_presenca,
    })
    if (aberto) ausenciasConsecutivas++
  }

  // CRITÉRIO 2: >= 50% de faltas no mês corrente
  // (FIX: coluna real e `status`, nao `presenca`)
  const r2 = await pool.query(
    `WITH mes_atual AS (
       SELECT aluno_id,
              COUNT(*) AS total,
              COUNT(CASE WHEN status = 'ausente' THEN 1 END) AS faltas
         FROM frequencia_diaria
        WHERE data >= date_trunc('month', NOW())::date
          AND data <= NOW()
        GROUP BY aluno_id
        HAVING COUNT(*) >= 10
           AND COUNT(CASE WHEN status = 'ausente' THEN 1 END)::float / NULLIF(COUNT(*), 0) >= 0.5
     )
     SELECT a.id AS aluno_id, a.escola_id, m.faltas, m.total,
            (m.faltas::float / m.total * 100)::numeric(5,2) AS pct
       FROM mes_atual m
       INNER JOIN alunos a ON a.id = m.aluno_id
      WHERE a.escola_id IS NOT NULL`
  )

  for (const row of r2.rows) {
    const aberto = await abrirCaso({
      aluno_id: row.aluno_id,
      escola_id: row.escola_id,
      ano_letivo: anoLetivo,
      origem: 'sistema',
      motivo: 'infrequencia_50',
      pct_faltas_mes: parseFloat(row.pct),
    })
    if (aberto) infrequencia50++
  }

  return {
    ausencias_consecutivas: ausenciasConsecutivas,
    infrequencia_50pct: infrequencia50,
    total_casos_abertos: ausenciasConsecutivas + infrequencia50,
  }
}

// ============================================================================
// CRUD CASOS
// ============================================================================

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
    `SELECT f.*, a.nome AS aluno_nome, a.matricula,
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
    `SELECT f.*, a.nome AS aluno_nome, a.matricula,
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

export async function obterEstatisticas(anoLetivo: string) {
  const r = await pool.query(
    `SELECT status, COUNT(*) AS total
       FROM ficai_casos
      WHERE ano_letivo = $1
      GROUP BY status`,
    [anoLetivo]
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
