import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import {
  createWhereBuilder,
  addAccessControl,
  addRawCondition,
  buildConditionsString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const ano = request.nextUrl.searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    // WHERE com escopo: polo/escola só enxergam suas próprias turmas (evita IDOR).
    // Mesmo padrão do turmas GET mode=listagem: JOIN escolas para expor e.polo_id.
    const where = createWhereBuilder(1)
    addRawCondition(where, `t.ano_letivo = $${where.paramIndex}`, [ano])
    addRawCondition(where, `a.ano_letivo = $${where.paramIndex}`, [ano])
    addRawCondition(where, 'a.ativo = true')
    addRawCondition(where, "a.situacao = 'cursando'")
    addRawCondition(where, '(t.multiserie = true OR t.multietapa = true)')
    addAccessControl(where, usuario, { escolaIdField: 't.escola_id', poloIdField: 'e.polo_id' })

    const result = await pool.query(
      `SELECT t.id as turma_id, a.serie, COUNT(a.id) as quantidade
       FROM turmas t
       JOIN escolas e ON e.id = t.escola_id
       JOIN alunos a ON a.turma_id = t.id
       WHERE ${buildConditionsString(where)}
       GROUP BY t.id, a.serie
       ORDER BY t.id, a.serie`,
      where.params
    )

    // Agrupar por turma_id
    const composicao: Record<string, { serie: string; quantidade: number }[]> = {}
    for (const row of result.rows) {
      if (!composicao[row.turma_id]) composicao[row.turma_id] = []
      composicao[row.turma_id].push({
        serie: row.serie,
        quantidade: parseInt(row.quantidade),
      })
    }

    return NextResponse.json(composicao)
  } catch (error) {
    console.error('Erro ao buscar composição de séries:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
