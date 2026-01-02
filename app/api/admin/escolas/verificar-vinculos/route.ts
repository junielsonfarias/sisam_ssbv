import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('id')

    if (!escolaId) {
      return NextResponse.json(
        { mensagem: 'ID da escola é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar vínculos
    const vinculosResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM alunos WHERE escola_id = $1) as total_alunos,
        (SELECT COUNT(*) FROM turmas WHERE escola_id = $1) as total_turmas,
        (SELECT COUNT(*) FROM resultados_provas WHERE escola_id = $1) as total_resultados,
        (SELECT COUNT(*) FROM resultados_consolidados_unificada WHERE escola_id = $1) as total_consolidados,
        (SELECT COUNT(*) FROM usuarios WHERE escola_id = $1) as total_usuarios
    `, [escolaId])

    const vinculos = vinculosResult.rows[0]

    return NextResponse.json({
      totalAlunos: parseInt(vinculos.total_alunos) || 0,
      totalTurmas: parseInt(vinculos.total_turmas) || 0,
      totalResultados: parseInt(vinculos.total_resultados) || 0,
      totalConsolidados: parseInt(vinculos.total_consolidados) || 0,
      totalUsuarios: parseInt(vinculos.total_usuarios) || 0,
    })
  } catch (error: any) {
    console.error('Erro ao verificar vínculos:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

