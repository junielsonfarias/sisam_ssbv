import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { z } from 'zod'
import { validateRequest } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminSiteConfig')

const siteConfigPutSchema = z.object({
  secao: z.string().min(1, 'Campo "seção" é obrigatório').max(100),
  conteudo: z.record(z.unknown()).refine(val => typeof val === 'object' && val !== null, {
    message: 'Campo "conteúdo" é obrigatório e deve ser um objeto',
  }),
})

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/site-config
 *
 * Lista todas as secoes de configuracao do site (requer autenticacao).
 * Acessivel por administrador e tecnico.
 */
export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const result = await pool.query(
      `SELECT sc.id, sc.secao, sc.conteudo, sc.atualizado_por, sc.atualizado_em, sc.criado_em,
              u.nome AS atualizado_por_nome
       FROM site_config sc
       LEFT JOIN usuarios u ON u.id = sc.atualizado_por
       ORDER BY sc.criado_em`
    )

    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    // Se a tabela nao existe ainda (migracao nao executada), retornar array vazio
    if ((error as DatabaseError)?.code === PG_ERRORS.UNDEFINED_TABLE) {
      return NextResponse.json([])
    }
    log.error('Erro ao listar configuracoes do site', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * PUT /api/admin/site-config
 *
 * Atualiza o conteudo de uma secao do site.
 * Body: { secao: string, conteudo: object }
 * Acessivel por administrador e tecnico.
 */
export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validationResult = await validateRequest(request, siteConfigPutSchema)
    if (!validationResult.success) return validationResult.response
    const { secao, conteudo } = validationResult.data

    // UPSERT: insere se não existe, atualiza se já existe
    const result = await pool.query(
      `INSERT INTO site_config (secao, conteudo, atualizado_por, atualizado_em)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (secao) DO UPDATE
       SET conteudo = EXCLUDED.conteudo,
           atualizado_por = EXCLUDED.atualizado_por,
           atualizado_em = CURRENT_TIMESTAMP
       RETURNING id, secao, conteudo, atualizado_por, atualizado_em`,
      [secao, JSON.stringify(conteudo), usuario.id]
    )

    // Invalidar cache do site-config publico
    await cacheDelPattern('site-config:*')

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    log.error('Erro ao atualizar configuracao do site', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
