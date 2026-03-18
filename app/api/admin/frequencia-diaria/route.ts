import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frequencia-diaria
 * Lista frequência diária com filtros
 * Params: escola_id, turma_id, data, data_inicio, data_fim, metodo, pagina, limite
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const turmaId = searchParams.get('turma_id')
    const data = searchParams.get('data')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const metodo = searchParams.get('metodo')
    const anoLetivo = searchParams.get('ano_letivo')
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10))
    const limite = Math.min(200, Math.max(1, parseInt(searchParams.get('limite') || '50', 10)))

    let query = `
      SELECT fd.id, fd.aluno_id, fd.data, fd.hora_entrada, fd.hora_saida,
             fd.metodo, fd.confianca, fd.criado_em,
             a.nome AS aluno_nome, a.codigo AS aluno_codigo,
             t.nome AS turma_nome, t.codigo AS turma_codigo,
             d.nome AS dispositivo_nome
      FROM frequencia_diaria fd
      INNER JOIN alunos a ON a.id = fd.aluno_id
      LEFT JOIN turmas t ON t.id = fd.turma_id
      LEFT JOIN dispositivos_faciais d ON d.id = fd.dispositivo_id
      WHERE 1=1
    `
    let countQuery = `
      SELECT COUNT(*) as total
      FROM frequencia_diaria fd
      WHERE 1=1
    `
    const params: (string | number)[] = []
    const countParams: (string | number)[] = []
    let paramIndex = 1

    // Controle de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      const filter = ` AND fd.escola_id = $${paramIndex}`
      query += filter
      countQuery += filter
      params.push(usuario.escola_id)
      countParams.push(usuario.escola_id)
      paramIndex++
    } else if (escolaId) {
      const filter = ` AND fd.escola_id = $${paramIndex}`
      query += filter
      countQuery += filter
      params.push(escolaId)
      countParams.push(escolaId)
      paramIndex++
    }

    if (turmaId) {
      const filter = ` AND fd.turma_id = $${paramIndex}`
      query += filter
      countQuery += filter
      params.push(turmaId)
      countParams.push(turmaId)
      paramIndex++
    }

    if (data) {
      const filter = ` AND fd.data = $${paramIndex}`
      query += filter
      countQuery += filter
      params.push(data)
      countParams.push(data)
      paramIndex++
    } else {
      if (dataInicio) {
        const filter = ` AND fd.data >= $${paramIndex}`
        query += filter
        countQuery += filter
        params.push(dataInicio)
        countParams.push(dataInicio)
        paramIndex++
      }
      if (dataFim) {
        const filter = ` AND fd.data <= $${paramIndex}`
        query += filter
        countQuery += filter
        params.push(dataFim)
        countParams.push(dataFim)
        paramIndex++
      }
    }

    if (metodo) {
      const filter = ` AND fd.metodo = $${paramIndex}`
      query += filter
      countQuery += filter
      params.push(metodo)
      countParams.push(metodo)
      paramIndex++
    }

    if (anoLetivo) {
      const filter = ` AND EXTRACT(YEAR FROM fd.data) = $${paramIndex}`
      query += filter
      countQuery += filter
      params.push(parseInt(anoLetivo, 10))
      countParams.push(parseInt(anoLetivo, 10))
      paramIndex++
    }

    // Paginação
    const offset = (pagina - 1) * limite
    query += ` ORDER BY fd.data DESC, a.nome ASC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limite, offset)

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ])

    const total = parseInt(countResult.rows[0]?.total || '0', 10)
    const totalPaginas = Math.ceil(total / limite)

    return NextResponse.json({
      frequencias: result.rows,
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas,
        temProxima: pagina < totalPaginas,
        temAnterior: pagina > 1,
      },
    })
  } catch (error: any) {
    console.error('Erro ao listar frequência diária:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
