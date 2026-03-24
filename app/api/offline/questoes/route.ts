import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { createWhereBuilder, addRawCondition, addAccessControl, buildConditionsString } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// GET - Obter questoes/respostas para sincronizacao offline
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const where = createWhereBuilder()
    addRawCondition(where, 'rp.aluno_id IS NOT NULL')
    addAccessControl(where, usuario, { escolaIdField: 'a.escola_id', poloIdField: 'e.polo_id' })

    const result = await pool.query(
      `SELECT rp.id, rp.aluno_id, rp.aluno_nome, rp.aluno_codigo,
              rp.questao_id, rp.questao_codigo, rp.acertou, rp.resposta_aluno,
              rp.area_conhecimento, rp.disciplina, rp.ano_letivo, rp.escola_id,
              q.descricao as questao_descricao, q.gabarito
       FROM resultados_provas rp
       LEFT JOIN questoes q ON (rp.questao_id = q.id OR rp.questao_codigo = q.codigo)
       INNER JOIN alunos a ON rp.aluno_id = a.id
       INNER JOIN escolas e ON a.escola_id = e.id
       WHERE ${buildConditionsString(where)}
       ORDER BY rp.aluno_id, rp.questao_codigo LIMIT 10000`,
      where.params
    )

    console.log(`[API Offline Questoes] Total de questoes sincronizadas: ${result.rows.length}`)

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar questoes para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
