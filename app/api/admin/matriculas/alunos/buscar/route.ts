import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import {
  createWhereBuilder, addRawCondition, addSearchCondition, addCondition, buildConditionsString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const busca = request.nextUrl.searchParams.get('busca')

    if (!busca || busca.trim().length < 2) {
      return NextResponse.json([])
    }

    const where = createWhereBuilder()
    addRawCondition(where, 'a.ativo = true')
    addSearchCondition(where, ['a.nome', 'a.codigo', 'a.cpf'], busca)

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      addCondition(where, 'a.escola_id', usuario.escola_id)
    }

    const result = await pool.query(
      `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.escola_id, a.turma_id,
              a.cpf, a.data_nascimento, a.pcd,
              e.nome as escola_nome,
              t.codigo as turma_codigo, t.nome as turma_nome
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE ${buildConditionsString(where)}
       ORDER BY a.nome
       LIMIT 20`,
      where.params
    )

    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    console.error('Erro ao buscar alunos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
