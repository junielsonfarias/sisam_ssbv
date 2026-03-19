import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('busca')

    if (!busca || busca.trim().length < 2) {
      return NextResponse.json([])
    }

    const searchTerm = `%${busca.trim()}%`

    // Escola só pode buscar alunos da própria escola
    const escolaFilter = (usuario.tipo_usuario === 'escola' && usuario.escola_id)
      ? 'AND a.escola_id = $4'
      : ''
    const params: any[] = [searchTerm, searchTerm, searchTerm]
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      params.push(usuario.escola_id)
    }

    const result = await pool.query(
      `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.escola_id, a.turma_id,
              a.cpf, a.data_nascimento, a.pcd,
              e.nome as escola_nome,
              t.codigo as turma_codigo, t.nome as turma_nome
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.ativo = true
         AND (a.nome ILIKE $1 OR a.codigo ILIKE $2 OR a.cpf ILIKE $3)
         ${escolaFilter}
       ORDER BY a.nome
       LIMIT 20`,
      params
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar alunos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
