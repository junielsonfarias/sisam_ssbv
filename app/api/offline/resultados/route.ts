import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// Configurações de paginação
const DEFAULT_LIMIT = 10000  // Limite padrão por página (aumentado de 5000)
const MAX_LIMIT = 50000     // Limite máximo para sincronização completa

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
    const syncAll = searchParams.get('sync_all') === 'true' // Flag para sincronizar tudo

    // Query base - usa media_aluno já calculada corretamente na importação
    let baseQuery = `
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      LEFT JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = cs.serie::text
      WHERE (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    `

    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      baseQuery += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      baseQuery += ` AND rc.escola_id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Contar total de registros (para paginação)
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`
    const countResult = await pool.query(countQuery, params)
    const totalRecords = parseInt(countResult.rows[0]?.total || '0', 10)

    // Query principal - usa media_aluno já calculada (com fórmula 70%/30% para anos iniciais)
    let dataQuery = `
      SELECT
        rc.id,
        rc.aluno_id,
        rc.escola_id,
        rc.turma_id,
        rc.ano_letivo,
        rc.serie,
        rc.presenca,
        rc.total_acertos_lp,
        rc.total_acertos_ch,
        rc.total_acertos_mat,
        rc.total_acertos_cn,
        rc.nota_lp,
        rc.nota_ch,
        rc.nota_mat,
        rc.nota_cn,
        rc.nota_producao,
        rc.nivel_aprendizagem,
        rc.media_aluno,
        a.nome as aluno_nome,
        e.nome as escola_nome,
        e.polo_id,
        t.codigo as turma_codigo,
        COALESCE(cs.qtd_questoes_lp,
          CASE WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN 14 ELSE 20 END
        ) as total_questoes_lp,
        COALESCE(cs.qtd_questoes_ch,
          CASE WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN 0 ELSE 10 END
        ) as total_questoes_ch,
        COALESCE(cs.qtd_questoes_mat,
          CASE WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN 14 ELSE 20 END
        ) as total_questoes_mat,
        COALESCE(cs.qtd_questoes_cn,
          CASE WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN 0 ELSE 10 END
        ) as total_questoes_cn
      ${baseQuery}
      ORDER BY a.nome
    `

    // Aplicar paginação (se não for sync_all)
    if (!syncAll) {
      dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(limit, offset)
    } else {
      // Mesmo sync_all tem um limite máximo de segurança
      dataQuery += ` LIMIT ${MAX_LIMIT}`
    }

    const result = await pool.query(dataQuery, params)

    // Calcular informações de paginação
    const totalPages = Math.ceil(totalRecords / limit)
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
    console.error('Erro ao buscar resultados para offline:', error)
    console.error('Stack:', error?.stack)
    console.error('Código:', error?.code)

    // Retornar mensagem mais informativa
    return NextResponse.json(
      {
        mensagem: 'Erro interno do servidor',
        erro: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        codigo: error?.code
      },
      { status: 500 }
    )
  }
}
