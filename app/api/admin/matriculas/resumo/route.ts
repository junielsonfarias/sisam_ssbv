import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!escolaId) {
      return NextResponse.json({ mensagem: 'escola_id é obrigatório' }, { status: 400 })
    }

    const [turmasResult, alunosResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM turmas WHERE escola_id = $1 AND ano_letivo = $2 AND ativo = true`,
        [escolaId, anoLetivo]
      ),
      pool.query(
        `SELECT COUNT(*) as total FROM alunos WHERE escola_id = $1 AND ano_letivo = $2 AND ativo = true`,
        [escolaId, anoLetivo]
      ),
    ])

    return NextResponse.json({
      total_turmas: parseInt(turmasResult.rows[0]?.total) || 0,
      total_alunos: parseInt(alunosResult.rows[0]?.total) || 0,
    })
  } catch (error: any) {
    console.error('Erro ao buscar resumo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
