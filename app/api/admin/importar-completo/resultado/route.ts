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

    // Buscar dados da importação
    const importacaoResult = await pool.query(
      `SELECT id, nome_arquivo, total_linhas, linhas_processadas, linhas_com_erro, 
              status, criado_em, concluido_em, erros
       FROM importacoes 
       WHERE id = $1`,
      [importacaoId]
    )

    if (importacaoResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Importação não encontrada' },
        { status: 404 }
      )
    }

    const importacao = importacaoResult.rows[0]

    // Buscar estatísticas resumidas (seria melhor ter uma tabela de resumo, mas por enquanto vamos retornar básico)
    return NextResponse.json({
      mensagem: importacao.status === 'concluido' 
        ? 'Importação completa realizada com sucesso' 
        : 'Importação finalizada',
      importacao_id: importacao.id,
      status: importacao.status,
      total_linhas: importacao.total_linhas,
      linhas_processadas: importacao.linhas_processadas,
      linhas_com_erro: importacao.linhas_com_erro,
      erros: importacao.erros ? importacao.erros.split('\n').slice(0, 20) : [],
      criado_em: importacao.criado_em,
      concluido_em: importacao.concluido_em,
    })
  } catch (error: any) {
    console.error('Erro ao buscar resultado:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

