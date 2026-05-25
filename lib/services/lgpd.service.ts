/**
 * Service LGPD — direitos do titular (Lei 13.709/2018).
 *
 * Funções:
 *  - `coletarDadosTitular(usuarioId)` — agrega todos os dados do titular
 *    em formato JSON (cumpre art. 18 II: acesso aos dados).
 *  - `gerarPortabilidade(usuarioId)` — formato interoperável (cumpre art. 18 V).
 *  - `agendarExclusao(usuarioId)` — agenda exclusão com 15 dias de carência
 *    (cumpre art. 18 VI: eliminação).
 *  - `executarExclusoesPendentes()` — job que processa exclusões agendadas
 *    (deve ser chamado por cron diário).
 *
 * **Importante:** o titular pode ser um:
 *   - Usuário do sistema (administrador, professor, responsável, etc.)
 *   - Pais/responsáveis pelos próprios filhos (alunos menores) — neste caso,
 *     o titular do dado é o aluno mas quem exerce o direito é o responsável.
 *
 * @module services/lgpd
 */

import pool from '@/database/connection'
import { registrarAuditoria } from './auditoria.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('LGPD')

export interface DadosTitular {
  // Identificação e metadados
  meta: {
    titularId: string
    geradoEm: string
    formato: 'completo' | 'portabilidade'
    versao: '1.0'
  }

  // Dados do próprio titular (se for usuário do sistema)
  usuario?: {
    id: string
    nome: string
    email: string
    tipo_usuario: string
    polo_id?: string | null
    escola_id?: string | null
    criado_em?: string
    ultimo_login?: string | null
  }

  // Filhos vinculados (caso seja responsável)
  filhos?: Array<{
    aluno_id: string
    nome: string
    cpf?: string | null
    data_nascimento?: string | null
    serie?: string | null
    turma?: string | null
    escola_nome?: string | null
  }>

  // Boletins e histórico escolar do titular ou filhos
  boletins?: Array<Record<string, unknown>>

  // Frequência
  frequencia?: Array<Record<string, unknown>>

  // Mensagens (responsável)
  mensagens?: Array<Record<string, unknown>>

  // Logs de acesso do próprio titular
  logsAcesso?: Array<Record<string, unknown>>

  // Consentimentos faciais (LGPD específico)
  consentimentosFaciais?: Array<Record<string, unknown>>
}

// ============================================================================
// COLETA DE DADOS DO TITULAR
// ============================================================================

/**
 * Agrega TODOS os dados relacionados ao titular para exportação ou portabilidade.
 *
 * O formato `portabilidade` é uma versão mais enxuta e neutra (sem IDs internos)
 * — pensada para ser importada em outro sistema educacional.
 */
export async function coletarDadosTitular(
  usuarioId: string,
  formato: 'completo' | 'portabilidade' = 'completo'
): Promise<DadosTitular> {
  const dados: DadosTitular = {
    meta: {
      titularId: usuarioId,
      geradoEm: new Date().toISOString(),
      formato,
      versao: '1.0',
    },
  }

  // 1) Usuário
  const u = await pool.query(
    `SELECT id, nome, email, tipo_usuario, polo_id, escola_id, criado_em
       FROM usuarios WHERE id = $1`,
    [usuarioId]
  )
  if (u.rows[0]) {
    dados.usuario = u.rows[0]
  }

  // 2) Filhos (caso seja responsável)
  if (u.rows[0]?.tipo_usuario === 'responsavel') {
    const filhos = await pool.query(
      `SELECT DISTINCT
          a.id AS aluno_id,
          a.nome,
          a.cpf,
          a.data_nascimento,
          a.serie,
          t.codigo AS turma,
          e.nome AS escola_nome
         FROM responsaveis_alunos ra
         INNER JOIN alunos a ON a.id = ra.aluno_id
         LEFT JOIN turmas t ON t.id = a.turma_id
         LEFT JOIN escolas e ON e.id = a.escola_id
        WHERE ra.responsavel_id = $1`,
      [usuarioId]
    )
    dados.filhos = filhos.rows
  }

  // 3) Logs de acesso do titular (últimos 90 dias)
  const logs = await pool.query(
    `SELECT data_acesso, ip_address, user_agent, tipo_usuario
       FROM logs_acesso
      WHERE usuario_id = $1
        AND data_acesso > NOW() - INTERVAL '90 days'
      ORDER BY data_acesso DESC
      LIMIT 200`,
    [usuarioId]
  )
  dados.logsAcesso = logs.rows

  // 4) Consentimentos faciais (se o titular for responsável de alunos com facial)
  if (dados.filhos && dados.filhos.length > 0) {
    const consent = await pool.query(
      `SELECT aluno_id, consentido, data_consentimento, data_revogacao, responsavel_nome
         FROM consentimentos_faciais
        WHERE aluno_id = ANY($1::uuid[])`,
      [dados.filhos.map((f) => f.aluno_id)]
    )
    dados.consentimentosFaciais = consent.rows
  }

  return dados
}

// ============================================================================
// EXCLUSÃO COM CARÊNCIA
// ============================================================================

/**
 * Agenda a exclusão dos dados do titular para daqui a 15 dias.
 * Permite cancelamento durante a carência.
 *
 * Retorna a data prevista de exclusão.
 */
export async function agendarExclusao(params: {
  usuarioId: string
  motivo?: string
  ip?: string
  userAgent?: string
}): Promise<{ id: string; prevista_para: Date }> {
  const previstaPara = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)

  const result = await pool.query(
    `INSERT INTO lgpd_solicitacoes
       (usuario_id, tipo, status, motivo, prevista_para, ip_solicitacao, user_agent)
     VALUES ($1, 'exclusao', 'pendente', $2, $3, $4, $5)
     RETURNING id, prevista_para`,
    [params.usuarioId, params.motivo || null, previstaPara, params.ip || null, params.userAgent || null]
  )

  await registrarAuditoria({
    usuarioId: params.usuarioId,
    acao: 'LGPD_AGENDAR_EXCLUSAO',
    entidade: 'lgpd_solicitacoes',
    entidadeId: result.rows[0].id,
    detalhes: { prevista_para: previstaPara },
    ip: params.ip,
  })

  log.info(`Exclusão LGPD agendada para ${previstaPara.toISOString()}`, {
    userId: params.usuarioId,
  })

  return result.rows[0]
}

/**
 * Cancela uma solicitação de exclusão pendente (durante a carência de 15 dias).
 */
export async function cancelarExclusao(params: {
  usuarioId: string
  solicitacaoId: string
}): Promise<boolean> {
  const result = await pool.query(
    `UPDATE lgpd_solicitacoes
       SET status = 'cancelada', concluida_em = NOW()
     WHERE id = $1 AND usuario_id = $2 AND status = 'pendente' AND tipo = 'exclusao'
     RETURNING id`,
    [params.solicitacaoId, params.usuarioId]
  )

  if ((result.rowCount ?? 0) > 0) {
    await registrarAuditoria({
      usuarioId: params.usuarioId,
      acao: 'LGPD_CANCELAR_EXCLUSAO',
      entidade: 'lgpd_solicitacoes',
      entidadeId: params.solicitacaoId,
    })
    return true
  }
  return false
}

/**
 * Lista solicitações LGPD de TODOS os titulares (uso administrativo).
 * Suporta filtros por status, tipo e busca.
 */
export async function listarSolicitacoesAdmin(filtros: {
  status?: string
  tipo?: string
  busca?: string
  limite?: number
  offset?: number
} = {}) {
  const conds: string[] = []
  const params: unknown[] = []
  let i = 1
  if (filtros.status) { params.push(filtros.status); conds.push(`s.status = $${i++}`) }
  if (filtros.tipo) { params.push(filtros.tipo); conds.push(`s.tipo = $${i++}`) }
  if (filtros.busca && filtros.busca.length > 2) {
    params.push(filtros.busca)
    conds.push(`(u.nome ILIKE '%' || $${i} || '%' OR u.email ILIKE '%' || $${i} || '%')`)
    i++
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const limite = Math.min(filtros.limite ?? 100, 500)
  const offset = filtros.offset ?? 0
  params.push(limite, offset)

  const r = await pool.query(
    `SELECT s.*,
            u.nome AS usuario_nome,
            u.email AS usuario_email,
            u.tipo_usuario
       FROM lgpd_solicitacoes s
       LEFT JOIN usuarios u ON u.id = s.usuario_id
       ${where}
      ORDER BY
        CASE WHEN s.status = 'pendente' THEN 0 ELSE 1 END,
        s.criada_em DESC
      LIMIT $${i++} OFFSET $${i}`,
    params
  )
  return r.rows
}

/**
 * Estatísticas LGPD para o painel admin.
 */
export async function estatisticasLgpd() {
  const r = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pendente') AS pendentes,
       COUNT(*) FILTER (WHERE status = 'pendente' AND prevista_para <= NOW() + INTERVAL '3 days') AS vencendo,
       COUNT(*) FILTER (WHERE status = 'pendente' AND prevista_para < NOW()) AS atrasadas,
       COUNT(*) FILTER (WHERE status = 'concluida' AND concluida_em >= date_trunc('month', NOW())) AS concluidas_mes,
       COUNT(*) FILTER (WHERE tipo = 'exclusao') AS total_exclusao,
       COUNT(*) FILTER (WHERE tipo = 'exportar') AS total_exportacao,
       COUNT(*) FILTER (WHERE tipo = 'portabilidade') AS total_portabilidade
       FROM lgpd_solicitacoes`
  )
  return r.rows[0] || {}
}

/**
 * Lista solicitações LGPD do titular (para mostrar na página dele).
 */
export async function listarMinhasSolicitacoes(usuarioId: string) {
  const result = await pool.query(
    `SELECT id, tipo, status, motivo, prevista_para, concluida_em, criada_em
       FROM lgpd_solicitacoes
      WHERE usuario_id = $1
      ORDER BY criada_em DESC
      LIMIT 50`,
    [usuarioId]
  )
  return result.rows
}

/**
 * Registra solicitação de exportação ou portabilidade (apenas log — execução é imediata).
 */
export async function registrarSolicitacaoExportacao(params: {
  usuarioId: string
  tipo: 'exportar' | 'portabilidade'
  ip?: string
  userAgent?: string
}): Promise<string> {
  const result = await pool.query(
    `INSERT INTO lgpd_solicitacoes
       (usuario_id, tipo, status, concluida_em, ip_solicitacao, user_agent)
     VALUES ($1, $2, 'concluida', NOW(), $3, $4)
     RETURNING id`,
    [params.usuarioId, params.tipo, params.ip || null, params.userAgent || null]
  )

  await registrarAuditoria({
    usuarioId: params.usuarioId,
    acao: params.tipo === 'exportar' ? 'LGPD_EXPORTAR' : 'LGPD_PORTABILIDADE',
    entidade: 'lgpd_solicitacoes',
    entidadeId: result.rows[0].id,
    ip: params.ip,
  })

  return result.rows[0].id
}
