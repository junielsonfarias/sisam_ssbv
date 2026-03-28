import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const ano = request.nextUrl.searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    const result = await pool.query(
      `SELECT t.id as turma_id, a.serie, COUNT(a.id) as quantidade
       FROM turmas t
       JOIN alunos a ON a.turma_id = t.id AND a.ano_letivo = $1 AND a.ativo = true AND a.situacao = 'cursando'
       WHERE t.ano_letivo = $1 AND (t.multiserie = true OR t.multietapa = true)
       GROUP BY t.id, a.serie
       ORDER BY t.id, a.serie`,
      [ano]
    )

    // Agrupar por turma_id
    const composicao: Record<string, { serie: string; quantidade: number }[]> = {}
    for (const row of result.rows) {
      if (!composicao[row.turma_id]) composicao[row.turma_id] = []
      composicao[row.turma_id].push({
        serie: row.serie,
        quantidade: parseInt(row.quantidade),
      })
    }

    return NextResponse.json(composicao)
  } catch (error) {
    console.error('Erro ao buscar composição de séries:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
