/**
 * Service da Status Page Pública.
 *
 * Verifica saúde dos componentes do sistema em tempo real e
 * lista incidentes ativos/históricos.
 *
 * @module services/status-page
 */

import pool from '@/database/connection'

export type StatusServico = 'operacional' | 'degradado' | 'parcialmente_indisponivel' | 'indisponivel' | 'manutencao'

export interface ServicoSaude {
  nome: string
  status: StatusServico
  latencia_ms?: number
  mensagem?: string
}

export interface IncidenteAtivo {
  id: string
  tipo: string
  severidade: string
  titulo: string
  descricao: string
  servicos_afetados: string[]
  status: string
  inicio_em: string
  atualizacoes: Array<{
    status: string
    mensagem: string
    criado_em: string
  }>
}

export interface StatusGeral {
  status_global: StatusServico
  servicos: ServicoSaude[]
  incidentes_ativos: IncidenteAtivo[]
  incidentes_recentes: number  // resolvidos últimos 7 dias
  uptime_30d_pct: number | null
  verificado_em: string
}

// ============================================================================
// HEALTH CHECKS
// ============================================================================

async function checkBanco(): Promise<ServicoSaude> {
  const inicio = Date.now()
  try {
    await pool.query('SELECT 1')
    const latencia = Date.now() - inicio
    return {
      nome: 'Banco de Dados (PostgreSQL)',
      status: latencia < 200 ? 'operacional' : latencia < 1000 ? 'degradado' : 'parcialmente_indisponivel',
      latencia_ms: latencia,
    }
  } catch (err) {
    return {
      nome: 'Banco de Dados (PostgreSQL)',
      status: 'indisponivel',
      mensagem: (err as Error).message,
    }
  }
}

async function checkRedis(): Promise<ServicoSaude> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return { nome: 'Cache Redis', status: 'operacional', mensagem: 'Não configurado (opcional)' }
  }
  const inicio = Date.now()
  try {
    const { Redis } = await import('@upstash/redis')
    const r = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    await r.ping()
    return {
      nome: 'Cache Redis (Upstash)',
      status: 'operacional',
      latencia_ms: Date.now() - inicio,
    }
  } catch {
    return { nome: 'Cache Redis (Upstash)', status: 'degradado', mensagem: 'Sem resposta' }
  }
}

function checkEmail(): ServicoSaude {
  if (!process.env.RESEND_API_KEY) {
    return {
      nome: 'E-mail (Resend)',
      status: 'parcialmente_indisponivel',
      mensagem: 'API key não configurada — modo dry-run',
    }
  }
  return { nome: 'E-mail (Resend)', status: 'operacional' }
}

function checkSentry(): ServicoSaude {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return {
      nome: 'Observabilidade (Sentry)',
      status: 'parcialmente_indisponivel',
      mensagem: 'DSN não configurado',
    }
  }
  return { nome: 'Observabilidade (Sentry)', status: 'operacional' }
}

function checkAuth(): ServicoSaude {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return {
      nome: 'Autenticação',
      status: 'indisponivel',
      mensagem: 'JWT_SECRET não configurado adequadamente',
    }
  }
  return { nome: 'Autenticação (JWT + 2FA)', status: 'operacional' }
}

function checkApp(): ServicoSaude {
  // Sempre operacional se o endpoint responde
  return { nome: 'Aplicação (Next.js)', status: 'operacional' }
}

// ============================================================================
// AGREGADOR
// ============================================================================

function statusPior(s: StatusServico[]): StatusServico {
  const ordem: StatusServico[] = [
    'indisponivel', 'parcialmente_indisponivel',
    'manutencao', 'degradado', 'operacional',
  ]
  for (const st of ordem) {
    if (s.includes(st)) return st
  }
  return 'operacional'
}

export async function obterStatusGeral(): Promise<StatusGeral> {
  const [banco, redis, email, sentry, auth, app] = await Promise.all([
    checkBanco(),
    checkRedis(),
    Promise.resolve(checkEmail()),
    Promise.resolve(checkSentry()),
    Promise.resolve(checkAuth()),
    Promise.resolve(checkApp()),
  ])

  const servicos = [app, banco, auth, redis, email, sentry]

  // Incidentes ativos
  let incidentesAtivos: IncidenteAtivo[] = []
  let incidentesRecentes = 0
  try {
    const r = await pool.query(
      `SELECT i.*,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'status', a.status, 'mensagem', a.mensagem, 'criado_em', a.criado_em
                ) ORDER BY a.criado_em DESC)
                 FROM status_atualizacoes a WHERE a.incidente_id = i.id),
                '[]'::json
              ) AS atualizacoes
         FROM status_incidentes i
        WHERE i.status != 'resolvido'
        ORDER BY i.inicio_em DESC`
    )
    incidentesAtivos = r.rows.map((row) => ({
      id: row.id, tipo: row.tipo, severidade: row.severidade,
      titulo: row.titulo, descricao: row.descricao,
      servicos_afetados: row.servicos_afetados || [],
      status: row.status, inicio_em: row.inicio_em,
      atualizacoes: row.atualizacoes || [],
    }))

    const rec = await pool.query(
      `SELECT COUNT(*) AS total FROM status_incidentes
        WHERE status = 'resolvido' AND resolucao_em >= NOW() - INTERVAL '7 days'`
    )
    incidentesRecentes = parseInt(rec.rows[0]?.total || '0', 10)
  } catch { /* tabela pode ainda não existir */ }

  // Status global é o pior entre serviços e incidentes ativos
  const statusServicos = servicos.map((s) => s.status)
  let statusGlobal = statusPior(statusServicos)
  if (incidentesAtivos.some((i) => i.severidade === 'critica')) statusGlobal = 'indisponivel'
  else if (incidentesAtivos.some((i) => ['alta', 'media'].includes(i.severidade))) {
    statusGlobal = statusPior([statusGlobal, 'degradado'])
  }

  return {
    status_global: statusGlobal,
    servicos,
    incidentes_ativos: incidentesAtivos,
    incidentes_recentes: incidentesRecentes,
    uptime_30d_pct: null, // pode ser calculado depois com métricas persistidas
    verificado_em: new Date().toISOString(),
  }
}

// ============================================================================
// GESTÃO DE INCIDENTES (admin)
// ============================================================================

export async function criarIncidente(params: {
  tipo: string
  severidade: string
  titulo: string
  descricao: string
  servicos_afetados?: string[]
  criado_por?: string
}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO status_incidentes
      (tipo, severidade, titulo, descricao, servicos_afetados, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [
      params.tipo, params.severidade, params.titulo, params.descricao,
      params.servicos_afetados || [], params.criado_por || null,
    ]
  )
  return r.rows[0].id
}

export async function atualizarIncidente(params: {
  id: string
  status: string
  mensagem: string
  criado_por?: string
}): Promise<void> {
  await pool.query(
    `UPDATE status_incidentes
       SET status = $2, atualizado_em = NOW(),
           resolucao_em = CASE WHEN $2 = 'resolvido' THEN NOW() ELSE resolucao_em END
     WHERE id = $1`,
    [params.id, params.status]
  )
  await pool.query(
    `INSERT INTO status_atualizacoes (incidente_id, status, mensagem, criado_por)
     VALUES ($1, $2, $3, $4)`,
    [params.id, params.status, params.mensagem, params.criado_por || null]
  )
}
