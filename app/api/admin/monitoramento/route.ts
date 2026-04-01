import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { cacheDelPattern } from '@/lib/cache'
import { createLogger } from '@/lib/logger'
import { verificarSaude, buscarConfigMonitoramento } from '@/lib/services/monitoramento.service'

const log = createLogger('AdminMonitoramento')

export const dynamic = 'force-dynamic'

// ============================================================================
// SCHEMAS
// ============================================================================

const configMonitoramentoSchema = z.object({
  emails_alerta: z.array(z.string().email('Email inválido')).default([]),
  webhook_url: z.string().url('URL inválida').or(z.literal('')).default(''),
  intervalo_min: z.number().int().min(1).max(60).default(5),
  alertar_banco: z.boolean().default(true),
  alertar_redis: z.boolean().default(true),
  alertar_erro: z.boolean().default(true),
})

// ============================================================================
// GET — Buscar config + status de saúde
// ============================================================================

/**
 * GET /api/admin/monitoramento
 *
 * Retorna configuração de monitoramento e status atual do sistema.
 * Acessível por administrador.
 */
export const GET = withAuth(['administrador'], async () => {
  try {
    const [config, saude] = await Promise.all([
      buscarConfigMonitoramento(),
      verificarSaude(),
    ])

    return NextResponse.json({ config, saude })
  } catch (error) {
    log.error('Erro ao buscar monitoramento', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

// ============================================================================
// PUT — Atualizar config
// ============================================================================

/**
 * PUT /api/admin/monitoramento
 *
 * Atualiza configuração de monitoramento.
 * Body: { emails_alerta, webhook_url, intervalo_min, alertar_banco, alertar_redis, alertar_erro }
 * Acessível por administrador.
 */
export const PUT = withAuth(['administrador'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = configMonitoramentoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { mensagem: 'Dados inválidos', erros: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO site_config (secao, conteudo, atualizado_por, atualizado_em)
       VALUES ('monitoramento', $1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (secao) DO UPDATE
       SET conteudo = EXCLUDED.conteudo,
           atualizado_por = EXCLUDED.atualizado_por,
           atualizado_em = CURRENT_TIMESTAMP
       RETURNING id, secao, conteudo, atualizado_em`,
      [JSON.stringify(parsed.data), usuario.id]
    )

    await cacheDelPattern('site-config:*')

    log.info('Config monitoramento atualizada', { usuario: usuario.email })

    return NextResponse.json(result.rows[0])
  } catch (error) {
    log.error('Erro ao atualizar monitoramento', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
