import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { cacheDelPattern } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const upsertSchema = z.object({
  serie_escolar_id: z.string().uuid(),
  tipo_avaliacao_id: z.string().uuid().nullable().optional(),
  regra_avaliacao_id: z.string().uuid().nullable().optional(),
  media_aprovacao: z.number().min(0).max(100).nullable().optional(),
  media_recuperacao: z.number().min(0).max(100).nullable().optional(),
  nota_maxima: z.number().min(0).max(100).nullable().optional(),
  permite_recuperacao: z.boolean().nullable().optional(),
  observacao: z.string().max(500).nullable().optional(),
})

/**
 * GET /api/admin/escolas/[id]/regras-avaliacao
 * Retorna overrides de regras de avaliação da escola, com dados da série e regra padrão
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const escolaId = params.id

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escolaId) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    // Buscar todas as séries com suas regras padrão e eventual override da escola
    const result = await pool.query(
      `SELECT
          se.id as serie_id, se.codigo, se.nome as serie_nome, se.etapa, se.ordem,
          -- Regra padrão da série
          ta_padrao.id as padrao_tipo_id, ta_padrao.codigo as padrao_tipo_codigo,
          ta_padrao.nome as padrao_tipo_nome, ta_padrao.tipo_resultado as padrao_tipo_resultado,
          ra_padrao.id as padrao_regra_id, ra_padrao.nome as padrao_regra_nome,
          ra_padrao.media_aprovacao as padrao_media_aprovacao,
          ra_padrao.nota_maxima as padrao_nota_maxima,
          ra_padrao.permite_recuperacao as padrao_permite_recuperacao,
          -- Override da escola (pode ser NULL)
          era.id as override_id,
          era.tipo_avaliacao_id as override_tipo_id,
          era.regra_avaliacao_id as override_regra_id,
          era.media_aprovacao as override_media_aprovacao,
          era.media_recuperacao as override_media_recuperacao,
          era.nota_maxima as override_nota_maxima,
          era.permite_recuperacao as override_permite_recuperacao,
          era.observacao as override_observacao,
          ta_over.codigo as override_tipo_codigo,
          ta_over.nome as override_tipo_nome,
          ta_over.tipo_resultado as override_tipo_resultado,
          ra_over.nome as override_regra_nome
       FROM series_escolares se
       LEFT JOIN tipos_avaliacao ta_padrao ON ta_padrao.id = se.tipo_avaliacao_id
       LEFT JOIN regras_avaliacao ra_padrao ON ra_padrao.id = se.regra_avaliacao_id
       LEFT JOIN escola_regras_avaliacao era ON era.escola_id = $1 AND era.serie_escolar_id = se.id AND era.ativo = true
       LEFT JOIN tipos_avaliacao ta_over ON ta_over.id = era.tipo_avaliacao_id
       LEFT JOIN regras_avaliacao ra_over ON ra_over.id = era.regra_avaliacao_id
       WHERE se.ativo = true
       ORDER BY se.ordem`,
      [escolaId]
    )

    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    console.error('Erro ao buscar regras da escola:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/escolas/[id]/regras-avaliacao
 * Cria ou atualiza override de regra de avaliação para uma série
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const escolaId = params.id

    // Verificar que escola existe
    const escolaCheck = await pool.query('SELECT id FROM escolas WHERE id = $1', [escolaId])
    if (escolaCheck.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Escola não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const validacao = upsertSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json({
        mensagem: 'Dados inválidos',
        erros: validacao.error.errors,
      }, { status: 400 })
    }

    const { serie_escolar_id, tipo_avaliacao_id, regra_avaliacao_id,
            media_aprovacao, media_recuperacao, nota_maxima,
            permite_recuperacao, observacao } = validacao.data

    const result = await pool.query(
      `INSERT INTO escola_regras_avaliacao
        (escola_id, serie_escolar_id, tipo_avaliacao_id, regra_avaliacao_id,
         media_aprovacao, media_recuperacao, nota_maxima, permite_recuperacao, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (escola_id, serie_escolar_id) DO UPDATE SET
         tipo_avaliacao_id = COALESCE($3, escola_regras_avaliacao.tipo_avaliacao_id),
         regra_avaliacao_id = COALESCE($4, escola_regras_avaliacao.regra_avaliacao_id),
         media_aprovacao = COALESCE($5, escola_regras_avaliacao.media_aprovacao),
         media_recuperacao = COALESCE($6, escola_regras_avaliacao.media_recuperacao),
         nota_maxima = COALESCE($7, escola_regras_avaliacao.nota_maxima),
         permite_recuperacao = COALESCE($8, escola_regras_avaliacao.permite_recuperacao),
         observacao = $9,
         ativo = true
       RETURNING *`,
      [escolaId, serie_escolar_id, tipo_avaliacao_id || null, regra_avaliacao_id || null,
       media_aprovacao ?? null, media_recuperacao ?? null, nota_maxima ?? null,
       permite_recuperacao ?? null, observacao || null]
    )

    try { await cacheDelPattern('escolas:*') } catch {}
    try { await cacheDelPattern('regras-avaliacao:*') } catch {}

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    console.error('Erro ao salvar regra da escola:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/escolas/[id]/regras-avaliacao?serie_id=X
 * Remove override (volta para regra padrão)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const escolaId = params.id
    const { searchParams } = new URL(request.url)
    const serieId = searchParams.get('serie_id')

    if (!serieId) {
      return NextResponse.json({ mensagem: 'Informe serie_id' }, { status: 400 })
    }

    const result = await pool.query(
      'DELETE FROM escola_regras_avaliacao WHERE escola_id = $1 AND serie_escolar_id = $2',
      [escolaId, serieId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ mensagem: 'Override não encontrado' }, { status: 404 })
    }

    try { await cacheDelPattern('escolas:*') } catch {}
    try { await cacheDelPattern('regras-avaliacao:*') } catch {}

    return NextResponse.json({ mensagem: 'Override removido, usando regra padrão' })
  } catch (error: unknown) {
    console.error('Erro ao remover regra da escola:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
