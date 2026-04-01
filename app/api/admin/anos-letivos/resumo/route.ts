import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// Resumo de situacoes dos alunos de um ano letivo
export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const ano = request.nextUrl.searchParams.get('ano')
    if (!ano) {
      return NextResponse.json({ mensagem: 'Parâmetro ano é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE ativo = true) as total,
         COUNT(*) FILTER (WHERE ativo = true AND (situacao IS NULL OR situacao = 'cursando')) as cursando,
         COUNT(*) FILTER (WHERE ativo = true AND situacao = 'aprovado') as aprovados,
         COUNT(*) FILTER (WHERE ativo = true AND situacao = 'reprovado') as reprovados,
         COUNT(*) FILTER (WHERE ativo = true AND situacao = 'transferido') as transferidos,
         COUNT(*) FILTER (WHERE ativo = true AND situacao = 'abandono') as abandonos,
         COUNT(*) FILTER (WHERE ativo = true AND situacao = 'remanejado') as remanejados
       FROM alunos
       WHERE ano_letivo = $1`,
      [ano]
    )

    const row = result.rows[0]
    return NextResponse.json({
      total: parseInt(row.total) || 0,
      cursando: parseInt(row.cursando) || 0,
      aprovados: parseInt(row.aprovados) || 0,
      reprovados: parseInt(row.reprovados) || 0,
      transferidos: parseInt(row.transferidos) || 0,
      abandonos: parseInt(row.abandonos) || 0,
      remanejados: parseInt(row.remanejados) || 0,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar resumo do ano letivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
