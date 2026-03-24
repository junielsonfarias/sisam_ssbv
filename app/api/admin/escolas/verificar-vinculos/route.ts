import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { verificarVinculosEscola } from '@/lib/services/escolas.service'

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

    const vinculos = await verificarVinculosEscola(escolaId)

    return NextResponse.json({
      totalAlunos: vinculos.totalAlunos,
      totalTurmas: vinculos.totalTurmas,
      totalResultados: vinculos.totalResultados,
      totalConsolidados: vinculos.totalConsolidados,
      totalUsuarios: vinculos.totalUsuarios,
    })
  } catch (error: unknown) {
    console.error('Erro ao verificar vínculos:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

