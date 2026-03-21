import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/frequencia-diaria/lancar-faltas
 * Lança falta para todos os alunos da turma que não registraram presença no dia
 * Body: { turma_id, data }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { turma_id, data } = await request.json()
    if (!turma_id || !data) {
      return NextResponse.json({ mensagem: 'turma_id e data são obrigatórios' }, { status: 400 })
    }

    // Buscar turma para pegar escola_id
    const turmaResult = await pool.query(
      'SELECT id, escola_id FROM turmas WHERE id = $1',
      [turma_id]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const turma = turmaResult.rows[0]

    // Verificar permissão de escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && usuario.escola_id !== turma.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    // Inserir falta para alunos ativos da turma que NÃO têm registro no dia
    const result = await pool.query(`
      INSERT INTO frequencia_diaria (aluno_id, turma_id, escola_id, data, metodo, status, registrado_por)
      SELECT a.id, $1, $2, $3, 'manual', 'ausente', $4
      FROM alunos a
      WHERE a.turma_id = $1
        AND a.ativo = true
        AND a.situacao = 'cursando'
        AND a.id NOT IN (
          SELECT fd.aluno_id FROM frequencia_diaria fd
          WHERE fd.turma_id = $1 AND fd.data = $3
        )
      RETURNING id
    `, [turma_id, turma.escola_id, data, usuario.id])

    return NextResponse.json({
      mensagem: `${result.rows.length} falta(s) lançada(s) com sucesso`,
      total_faltas: result.rows.length,
    })
  } catch (error: any) {
    console.error('Erro ao lançar faltas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
