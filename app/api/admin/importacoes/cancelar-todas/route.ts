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

    // Cancelar todas as importações em processamento ou pausadas
    const result = await pool.query(`
      UPDATE importacoes
      SET status = 'cancelado',
          concluido_em = CURRENT_TIMESTAMP
      WHERE status IN ('processando', 'pausado')
      RETURNING id, nome_arquivo, status
    `)

    return NextResponse.json({
      mensagem: `${result.rows.length} importação(ões) cancelada(s) com sucesso`,
      canceladas: result.rows.length,
      importacoes: result.rows,
    })
  } catch (error: any) {
    console.error('Erro ao cancelar importações:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

