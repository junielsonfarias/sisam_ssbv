import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/comunicados?turma_id=X
 * Endpoint público (sem auth) — para pais visualizarem via boletim
 * Retorna apenas comunicados ativos, ordenados por data, limitado a 10
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
  }

  // Validar formato UUID básico
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(turmaId)) {
    return NextResponse.json({ mensagem: 'turma_id inválido' }, { status: 400 })
  }

  try {
    const result = await pool.query(`
      SELECT c.id, c.titulo, c.mensagem, c.tipo, c.data_publicacao,
             u.nome AS professor_nome, t.nome AS turma_nome
      FROM comunicados_turma c
      JOIN usuarios u ON u.id = c.professor_id
      JOIN turmas t ON t.id = c.turma_id
      WHERE c.turma_id = $1 AND c.ativo = true
      ORDER BY c.data_publicacao DESC
      LIMIT 10
    `, [turmaId])

    return NextResponse.json({ comunicados: result.rows })
  } catch {
    return NextResponse.json({ mensagem: 'Erro ao buscar comunicados' }, { status: 500 })
  }
}
