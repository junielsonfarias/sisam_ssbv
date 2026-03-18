import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

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

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Deletar embeddings faciais
      const embeddingResult = await client.query(
        'DELETE FROM embeddings_faciais WHERE aluno_id = $1',
        [alunoId]
      )

      // 2. Revogar consentimento
      const consentimentoResult = await client.query(
        `UPDATE consentimentos_faciais
         SET consentido = false, data_revogacao = CURRENT_TIMESTAMP
         WHERE aluno_id = $1`,
        [alunoId]
      )

      // 3. Manter frequências mas remover vínculo com reconhecimento facial
      const frequenciaResult = await client.query(
        `UPDATE frequencia_diaria
         SET metodo = 'manual', dispositivo_id = NULL, confianca = NULL
         WHERE aluno_id = $1 AND metodo = 'facial'`,
        [alunoId]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: 'Dados faciais excluídos conforme LGPD',
        aluno: alunoResult.rows[0],
        removidos: {
          embeddings: embeddingResult.rowCount || 0,
          consentimentos_revogados: consentimentoResult.rowCount || 0,
          frequencias_anonimizadas: frequenciaResult.rowCount || 0,
        },
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro na exclusão LGPD:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
