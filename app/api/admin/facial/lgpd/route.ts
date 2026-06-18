import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { purgarDadosFaciaisLGPD } from '@/lib/services/facial.service'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/facial/lgpd
 * Exclusão completa de dados faciais de um aluno (LGPD - direito ao esquecimento)
 * Apenas administrador pode executar
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({ mensagem: 'Apenas administradores podem executar exclusão LGPD' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id é obrigatório' }, { status: 400 })
    }

    // Verificar se aluno existe
    const alunoResult = await pool.query(
      'SELECT id, nome FROM alunos WHERE id = $1',
      [alunoId]
    )
    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    // Exclusão LGPD atômica (embeddings + consentimento + frequência facial),
    // reusando o service compartilhado com a exclusão automática ao transferir/evadir.
    const removidos = await purgarDadosFaciaisLGPD(alunoId)

    return NextResponse.json({
      mensagem: 'Dados faciais excluídos conforme LGPD',
      aluno: alunoResult.rows[0],
      removidos,
    })
  } catch (error: unknown) {
    console.error('Erro na exclusão LGPD:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
