/**
 * Service de Disparo de Notificações — eventos do sistema.
 *
 * Helpers que registram notificações pendentes na tabela
 * `notificacoes_disparos`. Um worker (ou cron) processa as pendentes
 * e envia via canais configurados (Firebase FCM já configurado no projeto).
 *
 * **Nota:** este service complementa `notificacoes.service.ts` (gestão de
 * notificações in-app na tabela `notificacoes` legada). Aqui foco em
 * disparos automáticos de eventos do sistema (Fase 4 SEMED).
 *
 * @module services/notificacoes-disparo
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('NotifDisparo')

export type EventoTipo = 'nota_lancada' | 'falta_consecutiva' | 'comunicado_novo'
  | 'ficai_aberto' | 'ordem_servico_criada' | 'ordem_servico_concluida'
  | 'cardapio_publicado' | 'reuniao_marcada' | 'declaracao_emitida'
  | 'matricula_aprovada' | 'sistema'

export type CanalNotif = 'push' | 'email' | 'in_app' | 'sms' | 'whatsapp'

export interface NovaNotificacao {
  destinatario_id: string
  evento_tipo: EventoTipo
  canal?: CanalNotif
  titulo: string
  corpo: string
  dados?: Record<string, unknown>
}

/**
 * Registra notificação pendente respeitando preferências do usuário.
 * Retorna ID da notificação ou null se foi silenciada.
 */
export async function dispararNotificacao(n: NovaNotificacao): Promise<string | null> {
  try {
    const prefR = await pool.query(
      `SELECT push_enabled, email_enabled, in_app_enabled, eventos_silenciados
         FROM notificacoes_preferencias WHERE usuario_id = $1`,
      [n.destinatario_id]
    )
    const pref = prefR.rows[0] || {
      push_enabled: true, email_enabled: true, in_app_enabled: true,
      eventos_silenciados: [],
    }

    if (Array.isArray(pref.eventos_silenciados) && pref.eventos_silenciados.includes(n.evento_tipo)) {
      return null
    }

    const canal = n.canal || (pref.push_enabled ? 'push' : pref.in_app_enabled ? 'in_app' : 'email')

    const canalHabilitado =
      (canal === 'push' && pref.push_enabled) ||
      (canal === 'in_app' && pref.in_app_enabled) ||
      (canal === 'email' && pref.email_enabled) ||
      canal === 'sms' || canal === 'whatsapp'

    if (!canalHabilitado) return null

    const r = await pool.query(
      `INSERT INTO notificacoes_disparos
        (destinatario_id, evento_tipo, canal, titulo, corpo, dados, status)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,'pendente')
       RETURNING id`,
      [
        n.destinatario_id, n.evento_tipo, canal,
        n.titulo, n.corpo,
        JSON.stringify(n.dados || {}),
      ]
    )
    return r.rows[0].id
  } catch (err) {
    log.error('Falha ao disparar notificacao', err)
    return null
  }
}

export async function marcarEnviada(id: string, providerId?: string): Promise<void> {
  await pool.query(
    `UPDATE notificacoes_disparos
       SET status = 'enviada', enviada_em = NOW(), provider_id = $2
     WHERE id = $1`,
    [id, providerId || null]
  )
}

export async function marcarLida(id: string, destinatarioId: string): Promise<boolean> {
  const r = await pool.query(
    `UPDATE notificacoes_disparos
       SET status = 'lida', lida_em = NOW()
     WHERE id = $1 AND destinatario_id = $2`,
    [id, destinatarioId]
  )
  return (r.rowCount ?? 0) > 0
}

export async function listarNotificacoesUsuario(usuarioId: string, opcoes: {
  apenas_nao_lidas?: boolean
  limite?: number
} = {}) {
  const conds: string[] = ['destinatario_id = $1', `canal = 'in_app'`]
  const params: unknown[] = [usuarioId]
  if (opcoes.apenas_nao_lidas) conds.push(`status != 'lida'`)
  params.push(opcoes.limite ?? 50)

  const r = await pool.query(
    `SELECT id, evento_tipo, titulo, corpo, dados, status, criada_em, lida_em
       FROM notificacoes_disparos
      WHERE ${conds.join(' AND ')}
      ORDER BY criada_em DESC
      LIMIT $${params.length}`,
    params
  )
  return r.rows
}

// ============================================================================
// HELPERS DE EVENTOS DO SISTEMA
// ============================================================================

export async function notificarNotaLancada(params: {
  aluno_id: string
  disciplina_nome: string
  nota: number
  bimestre: number
}) {
  try {
    const resps = await pool.query(
      `SELECT responsavel_id FROM responsaveis_alunos WHERE aluno_id = $1`,
      [params.aluno_id]
    )
    const titulo = `Nova nota lançada: ${params.disciplina_nome}`
    const corpo = `${params.bimestre}º bimestre — nota: ${params.nota.toFixed(1)}`
    for (const row of resps.rows) {
      await dispararNotificacao({
        destinatario_id: row.responsavel_id,
        evento_tipo: 'nota_lancada',
        titulo, corpo,
        dados: { aluno_id: params.aluno_id, disciplina: params.disciplina_nome, nota: params.nota },
      })
    }
  } catch (err) {
    log.error('Falha ao notificar nota lancada', err)
  }
}

export async function notificarFaltaConsecutiva(params: {
  aluno_id: string
  dias_consecutivos: number
}) {
  try {
    const resps = await pool.query(
      `SELECT responsavel_id FROM responsaveis_alunos WHERE aluno_id = $1`,
      [params.aluno_id]
    )
    const titulo = '⚠️ Faltas consecutivas detectadas'
    const corpo = `Seu(sua) filho(a) tem ${params.dias_consecutivos} dias consecutivos de falta. Por favor, entre em contato com a escola.`
    for (const row of resps.rows) {
      await dispararNotificacao({
        destinatario_id: row.responsavel_id,
        evento_tipo: 'falta_consecutiva',
        titulo, corpo,
        dados: { aluno_id: params.aluno_id, dias: params.dias_consecutivos },
      })
    }
  } catch (err) {
    log.error('Falha ao notificar falta consecutiva', err)
  }
}

export async function notificarComunicadoTurma(params: {
  turma_id: string
  titulo_comunicado: string
  corpo_comunicado: string
  comunicado_id: string
}) {
  try {
    const resps = await pool.query(
      `SELECT DISTINCT ra.responsavel_id
         FROM alunos a
         INNER JOIN responsaveis_alunos ra ON ra.aluno_id = a.id
        WHERE a.turma_id = $1`,
      [params.turma_id]
    )
    for (const row of resps.rows) {
      await dispararNotificacao({
        destinatario_id: row.responsavel_id,
        evento_tipo: 'comunicado_novo',
        titulo: `📢 ${params.titulo_comunicado}`,
        corpo: params.corpo_comunicado.slice(0, 200) + (params.corpo_comunicado.length > 200 ? '…' : ''),
        dados: { comunicado_id: params.comunicado_id, turma_id: params.turma_id },
      })
    }
  } catch (err) {
    log.error('Falha ao notificar comunicado', err)
  }
}

export async function notificarFicaiAberto(params: {
  caso_id: string
  aluno_id: string
  motivo: string
}) {
  try {
    const resps = await pool.query(
      `SELECT responsavel_id FROM responsaveis_alunos WHERE aluno_id = $1`,
      [params.aluno_id]
    )
    const titulo = '⚠️ Acompanhamento escolar necessário'
    const corpo = 'A escola precisa entrar em contato sobre a frequência do(a) seu(sua) filho(a). Aguarde nossa ligação ou compareça à escola.'

    for (const row of resps.rows) {
      await dispararNotificacao({
        destinatario_id: row.responsavel_id,
        evento_tipo: 'ficai_aberto',
        titulo, corpo,
        dados: { caso_id: params.caso_id, aluno_id: params.aluno_id },
      })
    }
  } catch (err) {
    log.error('Falha ao notificar FICAI aberto', err)
  }
}

export async function notificarOrdemServicoConcluida(params: {
  ordem_id: string
  numero: string
  escola_id: string
  titulo: string
}) {
  try {
    const users = await pool.query(
      `SELECT id FROM usuarios
        WHERE escola_id = $1 AND tipo_usuario IN ('escola', 'administrador')
          AND ativo IS NOT FALSE`,
      [params.escola_id]
    )
    for (const row of users.rows) {
      await dispararNotificacao({
        destinatario_id: row.id,
        evento_tipo: 'ordem_servico_concluida',
        titulo: `✅ OS ${params.numero} concluída`,
        corpo: `${params.titulo} — pronta para sua avaliação.`,
        dados: { ordem_id: params.ordem_id, numero: params.numero },
      })
    }
  } catch (err) {
    log.error('Falha ao notificar OS concluida', err)
  }
}

export async function salvarPreferencias(params: {
  usuario_id: string
  push_enabled?: boolean
  email_enabled?: boolean
  in_app_enabled?: boolean
  eventos_silenciados?: string[]
  silencio_inicio?: string
  silencio_fim?: string
}): Promise<void> {
  await pool.query(
    `INSERT INTO notificacoes_preferencias
      (usuario_id, push_enabled, email_enabled, in_app_enabled,
       eventos_silenciados, silencio_inicio, silencio_fim)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (usuario_id) DO UPDATE SET
       push_enabled = EXCLUDED.push_enabled,
       email_enabled = EXCLUDED.email_enabled,
       in_app_enabled = EXCLUDED.in_app_enabled,
       eventos_silenciados = EXCLUDED.eventos_silenciados,
       silencio_inicio = EXCLUDED.silencio_inicio,
       silencio_fim = EXCLUDED.silencio_fim,
       atualizado_em = NOW()`,
    [
      params.usuario_id,
      params.push_enabled ?? true,
      params.email_enabled ?? true,
      params.in_app_enabled ?? true,
      params.eventos_silenciados || [],
      params.silencio_inicio || null,
      params.silencio_fim || null,
    ]
  )
}
