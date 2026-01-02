import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';

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
    const importacaoId = searchParams.get('id')

    if (!importacaoId) {
      return NextResponse.json(
        { mensagem: 'ID da importação não fornecido' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `SELECT id, nome_arquivo, total_linhas, linhas_processadas, linhas_com_erro, 
              status, criado_em, concluido_em
       FROM importacoes 
       WHERE id = $1`,
      [importacaoId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Importação não encontrada' },
        { status: 404 }
      )
    }

    const importacao = result.rows[0]
    const porcentagem = importacao.total_linhas > 0
      ? Math.round((importacao.linhas_processadas / importacao.total_linhas) * 100)
      : 0

    return NextResponse.json({
      id: importacao.id,
      nome_arquivo: importacao.nome_arquivo,
      total_linhas: importacao.total_linhas,
      linhas_processadas: importacao.linhas_processadas,
      linhas_com_erro: importacao.linhas_com_erro,
      status: importacao.status,
      porcentagem,
      criado_em: importacao.criado_em,
      concluido_em: importacao.concluido_em,
    })
  } catch (error: any) {
    console.error('Erro ao buscar progresso:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

