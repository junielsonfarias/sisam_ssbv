import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { limparCacheConfigSeries } from '@/lib/config-series'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/configuracao-series
 * Retorna a configuração de todas as séries ou de uma série específica
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const serie = searchParams.get('serie')

    let query = `
      SELECT
        id, serie, nome_serie, tipo_ensino,
        qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
        total_questoes_objetivas,
        tem_producao_textual, qtd_itens_producao,
        avalia_lp, avalia_mat, avalia_ch, avalia_cn,
        peso_lp, peso_mat, peso_ch, peso_cn, peso_producao,
        usa_nivel_aprendizagem, ativo,
        criado_em, atualizado_em
      FROM configuracao_series
      WHERE ativo = true
    `
    const params: any[] = []

    if (serie) {
      // Extrair apenas o número da série
      const numeroSerie = serie.match(/(\d+)/)?.[1]
      if (numeroSerie) {
        query += ` AND serie = $1`
        params.push(numeroSerie)
      }
    }

    query += ` ORDER BY serie::integer`

    const result = await pool.query(query, params)

    if (serie && result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Série não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      series: result.rows,
      total: result.rows.length
    })
  } catch (error: any) {
    console.error('Erro ao buscar configuração de séries:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/configuracao-series
 * Atualiza a configuração de uma série (apenas admin)
 */
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      id,
      serie,
      nome_serie,
      tipo_ensino,
      qtd_questoes_lp,
      qtd_questoes_mat,
      qtd_questoes_ch,
      qtd_questoes_cn,
      tem_producao_textual,
      qtd_itens_producao,
      avalia_lp,
      avalia_mat,
      avalia_ch,
      avalia_cn,
      usa_nivel_aprendizagem
    } = body

    if (!serie && !id) {
      return NextResponse.json(
        { mensagem: 'Série ou ID é obrigatório' },
        { status: 400 }
      )
    }

    // Suporta atualização por ID ou por serie
    const whereClause = id ? 'id = $1' : 'serie = $1'
    const identifier = id || serie

    const result = await pool.query(
      `UPDATE configuracao_series SET
        nome_serie = COALESCE($2, nome_serie),
        tipo_ensino = COALESCE($3, tipo_ensino),
        qtd_questoes_lp = COALESCE($4, qtd_questoes_lp),
        qtd_questoes_mat = COALESCE($5, qtd_questoes_mat),
        qtd_questoes_ch = COALESCE($6, qtd_questoes_ch),
        qtd_questoes_cn = COALESCE($7, qtd_questoes_cn),
        tem_producao_textual = COALESCE($8, tem_producao_textual),
        qtd_itens_producao = COALESCE($9, qtd_itens_producao),
        avalia_lp = COALESCE($10, avalia_lp),
        avalia_mat = COALESCE($11, avalia_mat),
        avalia_ch = COALESCE($12, avalia_ch),
        avalia_cn = COALESCE($13, avalia_cn),
        usa_nivel_aprendizagem = COALESCE($14, usa_nivel_aprendizagem),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE ${whereClause}
      RETURNING *`,
      [
        identifier,
        nome_serie,
        tipo_ensino,
        qtd_questoes_lp,
        qtd_questoes_mat,
        qtd_questoes_ch,
        qtd_questoes_cn,
        tem_producao_textual,
        qtd_itens_producao,
        avalia_lp,
        avalia_mat,
        avalia_ch,
        avalia_cn,
        usa_nivel_aprendizagem
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Série não encontrada' },
        { status: 404 }
      )
    }

    // Limpar cache após atualização
    limparCacheConfigSeries()

    return NextResponse.json({
      mensagem: 'Configuração atualizada com sucesso',
      serie: result.rows[0]
    })
  } catch (error: any) {
    console.error('Erro ao atualizar configuração de série:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/configuracao-series
 * Exclui uma configuração de série (apenas admin)
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const serie = searchParams.get('serie')

    if (!id && !serie) {
      return NextResponse.json(
        { mensagem: 'ID ou série é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se há alunos vinculados à série
    const whereClause = id ? 'cs.id = $1' : 'cs.serie = $1'
    const identifier = id || serie

    const alunosResult = await pool.query(
      `SELECT COUNT(*) as total FROM alunos a
       JOIN turmas t ON a.turma_id = t.id
       JOIN configuracao_series cs ON t.serie = cs.serie
       WHERE ${whereClause} AND a.ativo = true`,
      [identifier]
    )

    const totalAlunos = parseInt(alunosResult.rows[0]?.total || '0', 10)

    if (totalAlunos > 0) {
      return NextResponse.json(
        { mensagem: `Não é possível excluir: existem ${totalAlunos} aluno(s) vinculado(s) a esta série` },
        { status: 400 }
      )
    }

    // Verificar se há resultados vinculados
    const serieResult = await pool.query(
      `SELECT serie FROM configuracao_series WHERE ${id ? 'id = $1' : 'serie = $1'}`,
      [identifier]
    )

    if (serieResult.rows.length > 0) {
      const serieNumero = serieResult.rows[0].serie
      const resultadosResult = await pool.query(
        `SELECT COUNT(*) as total FROM resultados_consolidados WHERE serie = $1`,
        [serieNumero]
      )

      const totalResultados = parseInt(resultadosResult.rows[0]?.total || '0', 10)

      if (totalResultados > 0) {
        return NextResponse.json(
          { mensagem: `Não é possível excluir: existem ${totalResultados} resultado(s) de prova vinculado(s) a esta série` },
          { status: 400 }
        )
      }
    }

    // Excluir a série (as disciplinas serão excluídas em cascata)
    const deleteWhere = id ? 'id = $1' : 'serie = $1'
    const result = await pool.query(
      `DELETE FROM configuracao_series WHERE ${deleteWhere} RETURNING *`,
      [identifier]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Série não encontrada' },
        { status: 404 }
      )
    }

    // Limpar cache após exclusão
    limparCacheConfigSeries()

    return NextResponse.json({
      mensagem: 'Série excluída com sucesso',
      serie: result.rows[0]
    })
  } catch (error: any) {
    console.error('Erro ao excluir configuração de série:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/configuracao-series
 * Cria uma nova configuração de série (apenas admin)
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      serie,
      nome_serie,
      tipo_ensino = 'anos_iniciais',
      qtd_questoes_lp = 0,
      qtd_questoes_mat = 0,
      qtd_questoes_ch = 0,
      qtd_questoes_cn = 0,
      tem_producao_textual = false,
      qtd_itens_producao = 0,
      avalia_lp = true,
      avalia_mat = true,
      avalia_ch = false,
      avalia_cn = false,
      usa_nivel_aprendizagem = false
    } = body

    if (!serie || !nome_serie) {
      return NextResponse.json(
        { mensagem: 'Série e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se série já existe
    const existente = await pool.query(
      'SELECT id FROM configuracao_series WHERE serie = $1',
      [serie]
    )

    if (existente.rows.length > 0) {
      return NextResponse.json(
        { mensagem: 'Esta série já está configurada' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO configuracao_series (
        serie, nome_serie, tipo_ensino,
        qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
        tem_producao_textual, qtd_itens_producao,
        avalia_lp, avalia_mat, avalia_ch, avalia_cn,
        usa_nivel_aprendizagem, ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      RETURNING *`,
      [
        serie,
        nome_serie,
        tipo_ensino,
        qtd_questoes_lp,
        qtd_questoes_mat,
        qtd_questoes_ch,
        qtd_questoes_cn,
        tem_producao_textual,
        qtd_itens_producao,
        avalia_lp,
        avalia_mat,
        avalia_ch,
        avalia_cn,
        usa_nivel_aprendizagem
      ]
    )

    // Limpar cache após criação
    limparCacheConfigSeries()

    return NextResponse.json({
      mensagem: 'Série criada com sucesso',
      id: result.rows[0].id,
      serie: result.rows[0]
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar configuração de série:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
