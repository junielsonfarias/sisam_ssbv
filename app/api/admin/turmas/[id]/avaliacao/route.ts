import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/turmas/[id]/avaliacao
 *
 * Retorna o tipo e regra de avaliação da turma baseado na série.
 * Prioridade: override da escola > padrão da série > fallback numérico
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

    const turmaId = params.id

    const result = await pool.query(
      `SELECT t.id as turma_id, t.serie, t.escola_id,
              se.id as serie_id, se.codigo as serie_codigo, se.nome as serie_nome, se.etapa,
              -- Padrão da série
              ta.id as tipo_avaliacao_id, ta.codigo as tipo_codigo, ta.nome as tipo_nome,
              ta.tipo_resultado, ta.escala_conceitos, ta.nota_minima, ta.nota_maxima, ta.permite_decimal,
              ra.id as regra_avaliacao_id, ra.nome as regra_nome,
              ra.tipo_periodo, ra.qtd_periodos,
              ra.media_aprovacao, ra.media_recuperacao, ra.nota_maxima as regra_nota_maxima,
              ra.permite_recuperacao, ra.recuperacao_por_periodo,
              ra.max_dependencias, ra.formula_media, ra.pesos_periodos,
              ra.arredondamento, ra.casas_decimais, ra.aprovacao_automatica,
              -- Override da escola
              era.id as override_id,
              ta_over.id as over_tipo_id, ta_over.codigo as over_tipo_codigo, ta_over.nome as over_tipo_nome,
              ta_over.tipo_resultado as over_tipo_resultado, ta_over.escala_conceitos as over_escala_conceitos,
              ta_over.nota_minima as over_nota_minima, ta_over.nota_maxima as over_nota_maxima,
              ta_over.permite_decimal as over_permite_decimal,
              ra_over.id as over_regra_id, ra_over.nome as over_regra_nome,
              ra_over.tipo_periodo as over_tipo_periodo, ra_over.qtd_periodos as over_qtd_periodos,
              ra_over.media_aprovacao as over_media_aprovacao, ra_over.media_recuperacao as over_media_recuperacao,
              ra_over.nota_maxima as over_regra_nota_maxima,
              ra_over.permite_recuperacao as over_permite_recuperacao,
              ra_over.recuperacao_por_periodo as over_recuperacao_por_periodo,
              ra_over.max_dependencias as over_max_dependencias,
              ra_over.formula_media as over_formula_media, ra_over.pesos_periodos as over_pesos_periodos,
              ra_over.arredondamento as over_arredondamento, ra_over.casas_decimais as over_casas_decimais,
              ra_over.aprovacao_automatica as over_aprovacao_automatica,
              -- Overrides de valores específicos da escola
              era.media_aprovacao as escola_media_aprovacao,
              era.media_recuperacao as escola_media_recuperacao,
              era.nota_maxima as escola_nota_maxima,
              era.permite_recuperacao as escola_permite_recuperacao
       FROM turmas t
       LEFT JOIN series_escolares se ON
         REGEXP_REPLACE(t.serie, '[^0-9]', '', 'g') = se.codigo
         OR se.codigo = CASE
           WHEN t.serie ILIKE '%creche%' THEN 'CRE'
           WHEN t.serie ILIKE '%pré i%' OR t.serie ILIKE '%pre i%' OR t.serie ILIKE '%pré 1%' THEN 'PRE1'
           WHEN t.serie ILIKE '%pré ii%' OR t.serie ILIKE '%pre ii%' OR t.serie ILIKE '%pré 2%' THEN 'PRE2'
           WHEN t.serie ILIKE '%eja%1%' THEN 'EJA1'
           WHEN t.serie ILIKE '%eja%2%' THEN 'EJA2'
           WHEN t.serie ILIKE '%eja%3%' THEN 'EJA3'
           WHEN t.serie ILIKE '%eja%4%' THEN 'EJA4'
           ELSE REGEXP_REPLACE(t.serie, '[^0-9]', '', 'g')
         END
       LEFT JOIN tipos_avaliacao ta ON ta.id = se.tipo_avaliacao_id
       LEFT JOIN regras_avaliacao ra ON ra.id = se.regra_avaliacao_id
       LEFT JOIN escola_regras_avaliacao era ON era.escola_id = t.escola_id AND era.serie_escolar_id = se.id AND era.ativo = true
       LEFT JOIN tipos_avaliacao ta_over ON ta_over.id = era.tipo_avaliacao_id
       LEFT JOIN regras_avaliacao ra_over ON ra_over.id = era.regra_avaliacao_id
       WHERE t.id = $1
       LIMIT 1`,
      [turmaId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const row = result.rows[0]
    const temOverride = !!row.override_id

    // Resolver tipo de avaliação: override > padrão > fallback
    const tipoFinal = temOverride && row.over_tipo_id ? {
      id: row.over_tipo_id,
      codigo: row.over_tipo_codigo,
      nome: row.over_tipo_nome,
      tipo_resultado: row.over_tipo_resultado,
      escala_conceitos: row.over_escala_conceitos,
      nota_minima: parseFloat(row.over_nota_minima) || 0,
      nota_maxima: parseFloat(row.over_nota_maxima) || 10,
      permite_decimal: row.over_permite_decimal,
    } : row.tipo_avaliacao_id ? {
      id: row.tipo_avaliacao_id,
      codigo: row.tipo_codigo,
      nome: row.tipo_nome,
      tipo_resultado: row.tipo_resultado,
      escala_conceitos: row.escala_conceitos,
      nota_minima: parseFloat(row.nota_minima) || 0,
      nota_maxima: parseFloat(row.nota_maxima) || 10,
      permite_decimal: row.permite_decimal,
    } : {
      id: null,
      codigo: 'NUMERICO_10',
      nome: 'Nota Numérica (0-10)',
      tipo_resultado: 'numerico',
      escala_conceitos: null,
      nota_minima: 0,
      nota_maxima: 10,
      permite_decimal: true,
    }

    // Resolver regra: override > padrão
    const regraBase = temOverride && row.over_regra_id ? {
      id: row.over_regra_id,
      nome: row.over_regra_nome,
      tipo_periodo: row.over_tipo_periodo,
      qtd_periodos: row.over_qtd_periodos,
      media_aprovacao: parseFloat(row.over_media_aprovacao),
      media_recuperacao: parseFloat(row.over_media_recuperacao),
      nota_maxima: parseFloat(row.over_regra_nota_maxima) || 10,
      permite_recuperacao: row.over_permite_recuperacao,
      recuperacao_por_periodo: row.over_recuperacao_por_periodo,
      max_dependencias: row.over_max_dependencias,
      formula_media: row.over_formula_media,
      pesos_periodos: row.over_pesos_periodos,
      arredondamento: row.over_arredondamento,
      casas_decimais: row.over_casas_decimais,
      aprovacao_automatica: row.over_aprovacao_automatica,
    } : row.regra_avaliacao_id ? {
      id: row.regra_avaliacao_id,
      nome: row.regra_nome,
      tipo_periodo: row.tipo_periodo,
      qtd_periodos: row.qtd_periodos,
      media_aprovacao: parseFloat(row.media_aprovacao),
      media_recuperacao: parseFloat(row.media_recuperacao),
      nota_maxima: parseFloat(row.regra_nota_maxima) || 10,
      permite_recuperacao: row.permite_recuperacao,
      recuperacao_por_periodo: row.recuperacao_por_periodo,
      max_dependencias: row.max_dependencias,
      formula_media: row.formula_media,
      pesos_periodos: row.pesos_periodos,
      arredondamento: row.arredondamento,
      casas_decimais: row.casas_decimais,
      aprovacao_automatica: row.aprovacao_automatica,
    } : null

    // Aplicar overrides de valores específicos da escola sobre a regra
    const regraFinal = regraBase ? {
      ...regraBase,
      media_aprovacao: row.escola_media_aprovacao != null ? parseFloat(row.escola_media_aprovacao) : regraBase.media_aprovacao,
      media_recuperacao: row.escola_media_recuperacao != null ? parseFloat(row.escola_media_recuperacao) : regraBase.media_recuperacao,
      nota_maxima: row.escola_nota_maxima != null ? parseFloat(row.escola_nota_maxima) : regraBase.nota_maxima,
      permite_recuperacao: row.escola_permite_recuperacao != null ? row.escola_permite_recuperacao : regraBase.permite_recuperacao,
    } : null

    const avaliacao = {
      turma_id: row.turma_id,
      serie: row.serie,
      serie_codigo: row.serie_codigo,
      serie_nome: row.serie_nome,
      etapa: row.etapa,
      tipo_avaliacao: tipoFinal,
      regra_avaliacao: regraFinal,
      tem_override: temOverride,
    }

    return NextResponse.json(avaliacao)
  } catch (error: any) {
    console.error('Erro ao buscar avaliação da turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
