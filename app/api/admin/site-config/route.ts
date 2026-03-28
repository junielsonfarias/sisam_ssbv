import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { z } from 'zod'
import { validateRequest } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'

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
    console.error('Erro ao listar configuracoes do site:', (error as Error)?.message || error)
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

    const result = await pool.query(
      `UPDATE site_config
       SET conteudo = $1,
           atualizado_por = $2,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE secao = $3
       RETURNING id, secao, conteudo, atualizado_por, atualizado_em`,
      [JSON.stringify(conteudo), usuario.id, secao]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Seção não encontrada' }, { status: 404 })
    }

    // Invalidar cache do site-config publico
    await cacheDelPattern('site-config:*')

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    console.error('Erro ao atualizar configuracao do site:', (error as Error)?.message || error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
