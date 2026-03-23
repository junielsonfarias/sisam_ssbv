import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

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
    if ((error as any)?.code === '42P01') {
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
    const body = await request.json()
    const { secao, conteudo } = body

    if (!secao || typeof secao !== 'string') {
      return NextResponse.json({ mensagem: 'Campo "secao" e obrigatorio' }, { status: 400 })
    }

    if (!conteudo || typeof conteudo !== 'object') {
      return NextResponse.json({ mensagem: 'Campo "conteudo" e obrigatorio e deve ser um objeto' }, { status: 400 })
    }

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
      return NextResponse.json({ mensagem: 'Secao nao encontrada' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    console.error('Erro ao atualizar configuracao do site:', (error as Error)?.message || error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
