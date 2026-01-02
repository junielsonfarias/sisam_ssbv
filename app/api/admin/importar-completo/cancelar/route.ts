import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const importacaoId = searchParams.get('id')

    if (!importacaoId) {
      return NextResponse.json(
        { mensagem: 'ID da importação não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se a importação pertence ao usuário ou se é admin
    const importacao = await pool.query(
      `SELECT id, status, usuario_id FROM importacoes WHERE id = $1`,
      [importacaoId]
    )

    if (importacao.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Importação não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem permissão (é o dono ou é admin)
    if (usuario.tipo_usuario !== 'administrador' && importacao.rows[0].usuario_id !== usuario.id) {
      return NextResponse.json(
        { mensagem: 'Não autorizado para cancelar esta importação' },
        { status: 403 }
      )
    }

    // Verificar se pode cancelar (não pode estar concluído)
    if (importacao.rows[0].status === 'concluido') {
      return NextResponse.json(
        { mensagem: 'Não é possível cancelar uma importação já concluída' },
        { status: 400 }
      )
    }

    // Atualizar status para cancelado
    await pool.query(
      `UPDATE importacoes 
       SET status = 'cancelado', 
           concluido_em = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [importacaoId]
    )

    return NextResponse.json({
      mensagem: 'Importação cancelada com sucesso',
      status: 'cancelado'
    })
  } catch (error: any) {
    console.error('Erro ao cancelar importação:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

