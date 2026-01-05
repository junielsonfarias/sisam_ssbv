import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// GET - Obter questoes/respostas para sincronizacao offline
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Nao autorizado' },
        { status: 403 }
      )
    }

    let query = `
      SELECT
        rp.id,
        rp.aluno_id,
        rp.aluno_nome,
        rp.aluno_codigo,
        rp.questao_id,
        rp.questao_codigo,
        rp.acertou,
        rp.resposta_aluno,
        rp.area_conhecimento,
        rp.disciplina,
        rp.ano_letivo,
        rp.escola_id,
        q.descricao as questao_descricao,
        q.gabarito
      FROM resultados_provas rp
      LEFT JOIN questoes q ON (rp.questao_id = q.id OR rp.questao_codigo = q.codigo)
      INNER JOIN alunos a ON rp.aluno_id = a.id
      INNER JOIN escolas e ON a.escola_id = e.id
      WHERE rp.aluno_id IS NOT NULL
    `

    const params: any[] = []
    let paramIndex = 1

    // Aplicar restricoes de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND a.escola_id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    query += ' ORDER BY rp.aluno_id, rp.questao_codigo LIMIT 50000' // Limitar para nao sobrecarregar

    const result = await pool.query(query, params)

    console.log(`[API Offline Questoes] Total de questoes sincronizadas: ${result.rows.length}`)

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao buscar questoes para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
