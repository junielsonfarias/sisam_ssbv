import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// Configurações de paginação
const DEFAULT_LIMIT = 10000
const MAX_LIMIT = 50000

// GET - Obter resultados para sincronização offline (com paginação)
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Parâmetros de paginação
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10), MAX_LIMIT)
    const offset = (page - 1) * limit
    const syncAll = searchParams.get('sync_all') === 'true'

    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Construir cláusula WHERE
    let whereClause = `WHERE 1=1`

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereClause += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereClause += ` AND rc.escola_id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Query de contagem simplificada - usando view unificada que tem nota_producao
    const countQuery = `
      SELECT COUNT(*) as total
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${whereClause}
    `

    let totalRecords = 0
    try {
      const countResult = await pool.query(countQuery, params)
      totalRecords = parseInt(countResult.rows[0]?.total || '0', 10)
    } catch (countError: any) {
      console.error('Erro na contagem:', countError?.message)
      // Continuar mesmo com erro na contagem
    }

    // Query principal usando view unificada (inclui nota_producao corretamente)
    // Nota: a view não tem 'id' nem 'nivel_aprendizagem', então geramos id e buscamos nivel da tabela original
    let dataQuery = `
      SELECT
        CONCAT(rc.aluno_id, '-', rc.ano_letivo) as id,
        rc.aluno_id,
        rc.escola_id,
        rc.turma_id,
        rc.ano_letivo,
        rc.serie,
        COALESCE(rc.presenca, 'P') as presenca,
        COALESCE(rc.total_acertos_lp, 0) as total_acertos_lp,
        COALESCE(rc.total_acertos_ch, 0) as total_acertos_ch,
        COALESCE(rc.total_acertos_mat, 0) as total_acertos_mat,
        COALESCE(rc.total_acertos_cn, 0) as total_acertos_cn,
        rc.nota_lp,
        rc.nota_ch,
        rc.nota_mat,
        rc.nota_cn,
        rc.nota_producao,
        orig.nivel_aprendizagem,
        orig.nivel_lp,
        orig.nivel_mat,
        orig.nivel_prod,
        orig.nivel_aluno,
        rc.media_aluno,
        COALESCE(a.nome, 'Aluno') as aluno_nome,
        COALESCE(e.nome, 'Escola') as escola_nome,
        e.polo_id,
        t.codigo as turma_codigo
      FROM resultados_consolidados_unificada rc
      LEFT JOIN resultados_consolidados orig ON rc.aluno_id = orig.aluno_id AND rc.ano_letivo = orig.ano_letivo
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      ${whereClause}
      ORDER BY a.nome NULLS LAST
    `

    // Aplicar paginação
    if (!syncAll) {
      dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(limit, offset)
    } else {
      dataQuery += ` LIMIT ${MAX_LIMIT}`
    }

    const result = await pool.query(dataQuery, params)

    // Calcular informações de paginação
    const totalPages = Math.ceil(totalRecords / limit) || 1
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      paginacao: {
        pagina_atual: page,
        total_paginas: totalPages,
        total_registros: totalRecords,
        limite_por_pagina: limit,
        tem_proxima_pagina: hasNextPage,
        tem_pagina_anterior: hasPrevPage
      },
      sincronizado_em: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[OfflineResultados] Erro:', error?.message)
    console.error('[OfflineResultados] Stack:', error?.stack)
    console.error('[OfflineResultados] Código:', error?.code)

    return NextResponse.json(
      {
        mensagem: 'Erro ao buscar resultados',
        erro: error?.message,
        codigo: error?.code
      },
      { status: 500 }
    )
  }
}
