/**
 * Service — Notificação de infrequência ao responsável (Fase 4.1 — ciclo LDB).
 *
 * Detecta alunos com frequência abaixo do mínimo configurado
 * (`configuracao_notas_escola.percentual_frequencia_minimo`, fallback 75% — LDB
 * art. 24, VI) a partir do snapshot `frequencia_bimestral` e notifica os
 * responsáveis vinculados (`responsaveis_alunos`) por in-app + e-mail + push.
 *
 * **Degradação graciosa**: o envio reusa `enviarEmail` (Resend, dry-run sem
 * RESEND_API_KEY) e `enviarPushParaUsuario` (Firebase, no-op sem
 * FIREBASE_SERVICE_ACCOUNT_KEY) — a feature funciona mesmo sem credenciais,
 * apenas não entrega de fato. Há **deduplicação** por janela para não repetir o
 * mesmo alerta ao mesmo responsável.
 *
 * @module services/infrequencia-notificacao
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { dispararNotificacao, marcarEnviada } from '@/lib/services/notificacoes-disparo.service'
import { enviarEmail } from '@/lib/email/sender'
import { enviarPushParaUsuario } from '@/lib/firebase/admin'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

const log = createLogger('InfrequenciaNotif')

const LIMIAR_PADRAO = 75
const JANELA_DEDUPE_DIAS = 7
const MS_POR_DIA = 24 * 60 * 60 * 1000

/** Mensagem do alerta de infrequência. Função PURA e testável. */
export function montarMensagemInfrequencia(
  alunoNome: string,
  percentual: number,
  limiar: number
): { titulo: string; corpo: string } {
  const pct = Math.round(percentual)
  return {
    titulo: '⚠️ Alerta de frequência escolar',
    corpo: `A frequência de ${alunoNome} está em ${pct}%, abaixo do mínimo de ${Math.round(limiar)}% exigido por lei. Por favor, procure a escola para regularizar a situação.`,
  }
}

/** HTML do e-mail (texto fallback é derivado pelo sender). */
function montarHtmlInfrequencia(alunoNome: string, escolaNome: string, percentual: number, limiar: number): string {
  const pct = Math.round(percentual)
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
      <h2 style="color:#b91c1c">Alerta de frequência escolar</h2>
      <p>Prezado(a) responsável,</p>
      <p>A frequência do(a) aluno(a) <strong>${alunoNome}</strong> (${escolaNome}) está em
         <strong>${pct}%</strong>, abaixo do mínimo de <strong>${Math.round(limiar)}%</strong>
         exigido pela LDB (art. 24, VI).</p>
      <p>A frequência regular é essencial para a aprendizagem e a aprovação. Pedimos que
         procure a escola para regularizar a situação e, se necessário, justificar as faltas.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">SEMED — São Sebastião da Boa Vista · SISAM/Educatec</p>
    </div>`
}

/**
 * Decide se deve (re)notificar com base na última notificação. Função PURA.
 * Sem notificação anterior → sim. Caso contrário, só se a janela já expirou.
 */
export function deveRenotificar(ultimaEm: Date | null, agora: Date, janelaDias: number): boolean {
  if (!ultimaEm) return true
  return agora.getTime() - ultimaEm.getTime() >= janelaDias * MS_POR_DIA
}

export interface OpcoesNotificarInfrequencia {
  anoLetivo: string
  periodoId: string
  escolaId?: string
  /** Limiar fallback quando a escola não tem `percentual_frequencia_minimo` (default 75). */
  limiarPadrao?: number
  janelaDedupeDias?: number
  /** Só simula (não envia nem persiste) — para preview no gestor. */
  dryRun?: boolean
  /** Para auditoria do disparo manual. */
  usuarioId?: string
  usuarioEmail?: string
}

export interface ResultadoNotificarInfrequencia {
  alunos_detectados: number
  responsaveis_notificados: number
  pulados_dedupe: number
  alunos_sem_responsavel: number
  emails_enviados: number
  push_enviados: number
  dry_run: boolean
  limiar_padrao: number
}

interface AlunoInfreqRow {
  aluno_id: string
  aluno_nome: string
  escola_nome: string
  percentual: number
  limiar: number
}

/**
 * Detecta e notifica responsáveis de alunos infrequentes.
 *
 * Usado por: GET /api/cron/notificar-infrequencia e POST /api/admin/infrequencia/notificar.
 */
export async function notificarInfrequencia(
  opts: OpcoesNotificarInfrequencia
): Promise<ResultadoNotificarInfrequencia> {
  const limiarPadrao = opts.limiarPadrao ?? LIMIAR_PADRAO
  const janela = opts.janelaDedupeDias ?? JANELA_DEDUPE_DIAS
  const agora = new Date()

  const params: unknown[] = [opts.periodoId, opts.anoLetivo, limiarPadrao]
  let escolaFiltro = ''
  if (opts.escolaId) {
    params.push(opts.escolaId)
    escolaFiltro = ` AND a.escola_id = $${params.length}`
  }

  // Alunos com percentual abaixo do limiar (config da escola vence; senão fallback).
  const alunosRes = await pool.query(
    `SELECT a.id AS aluno_id, a.nome AS aluno_nome, e.nome AS escola_nome,
            fb.percentual_frequencia::float AS percentual,
            COALESCE(cne.percentual_frequencia_minimo, $3)::float AS limiar
       FROM frequencia_bimestral fb
       JOIN alunos a ON a.id = fb.aluno_id
       JOIN escolas e ON e.id = a.escola_id
       LEFT JOIN configuracao_notas_escola cne
         ON cne.escola_id = a.escola_id AND cne.ano_letivo = a.ano_letivo
      WHERE fb.periodo_id = $1
        AND a.ano_letivo = $2
        AND (a.situacao = 'cursando' OR a.situacao IS NULL)
        AND fb.percentual_frequencia IS NOT NULL
        AND fb.percentual_frequencia < COALESCE(cne.percentual_frequencia_minimo, $3)${escolaFiltro}
      ORDER BY fb.percentual_frequencia ASC`,
    params
  )

  const resultado: ResultadoNotificarInfrequencia = {
    alunos_detectados: alunosRes.rows.length,
    responsaveis_notificados: 0,
    pulados_dedupe: 0,
    alunos_sem_responsavel: 0,
    emails_enviados: 0,
    push_enviados: 0,
    dry_run: !!opts.dryRun,
    limiar_padrao: limiarPadrao,
  }

  for (const aluno of alunosRes.rows as AlunoInfreqRow[]) {
    const respsRes = await pool.query(
      `SELECT ra.usuario_id, u.email
         FROM responsaveis_alunos ra
         JOIN usuarios u ON u.id = ra.usuario_id
        WHERE ra.aluno_id = $1 AND ra.ativo = true AND u.ativo IS NOT FALSE`,
      [aluno.aluno_id]
    )

    if (respsRes.rows.length === 0) {
      resultado.alunos_sem_responsavel++
      continue
    }

    const { titulo, corpo } = montarMensagemInfrequencia(aluno.aluno_nome, aluno.percentual, aluno.limiar)

    for (const resp of respsRes.rows as { usuario_id: string; email: string | null }[]) {
      // Deduplicação: última notificação de infrequência deste aluno a este responsável.
      const dedupeRes = await pool.query(
        `SELECT MAX(criada_em) AS ultima
           FROM notificacoes_disparos
          WHERE destinatario_id = $1 AND evento_tipo = 'infrequencia'
            AND dados->>'aluno_id' = $2`,
        [resp.usuario_id, aluno.aluno_id]
      )
      const ultima = dedupeRes.rows[0]?.ultima ? new Date(dedupeRes.rows[0].ultima) : null
      if (!deveRenotificar(ultima, agora, janela)) {
        resultado.pulados_dedupe++
        continue
      }

      if (opts.dryRun) {
        resultado.responsaveis_notificados++
        continue
      }

      const dados = { aluno_id: aluno.aluno_id, percentual: Math.round(aluno.percentual), periodo_id: opts.periodoId }

      // Registro in-app (respeita preferências; marca o dedupe).
      const notifId = await dispararNotificacao({
        destinatario_id: resp.usuario_id,
        evento_tipo: 'infrequencia',
        canal: 'in_app',
        titulo, corpo, dados,
      })

      // Entrega best-effort por e-mail e push (degradam sem credencial).
      let entregou = false
      if (resp.email) {
        const r = await enviarEmail({
          to: resp.email,
          subject: titulo,
          html: montarHtmlInfrequencia(aluno.aluno_nome, aluno.escola_nome, aluno.percentual, aluno.limiar),
        })
        if (r.enviado) { resultado.emails_enviados++; entregou = true }
      }
      const push = await enviarPushParaUsuario(resp.usuario_id, titulo, corpo, { aluno_id: aluno.aluno_id, tipo: 'infrequencia' })
      if (push.sucesso > 0) { resultado.push_enviados += push.sucesso; entregou = true }

      if (notifId && entregou) await marcarEnviada(notifId)
      resultado.responsaveis_notificados++
    }
  }

  if (!opts.dryRun) {
    await registrarAuditoria({
      usuarioId: opts.usuarioId ?? null,
      usuarioEmail: opts.usuarioEmail ?? null,
      acao: 'FREQ_NOTIFICAR_INFREQUENCIA',
      entidade: 'frequencia_bimestral',
      entidadeId: opts.periodoId,
      detalhes: {
        ano_letivo: opts.anoLetivo,
        escola_id: opts.escolaId ?? null,
        alunos_detectados: resultado.alunos_detectados,
        responsaveis_notificados: resultado.responsaveis_notificados,
        pulados_dedupe: resultado.pulados_dedupe,
        emails_enviados: resultado.emails_enviados,
        push_enviados: resultado.push_enviados,
      },
    })
    log.info('Notificação de infrequência concluída', { data: resultado })
  }

  return resultado
}
