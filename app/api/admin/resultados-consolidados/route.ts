import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache-dashboard'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Limpar caches expirados
    try {
      limparCachesExpirados()
    } catch (error) {
      // Não crítico
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const poloId = searchParams.get('polo_id')
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const presenca = searchParams.get('presenca')
    const turmaId = searchParams.get('turma_id')

    // Verificar cache
    const cacheOptions = {
      filtros: {
        escolaId,
        poloId,
        anoLetivo,
        serie,
        presenca,
        turmaId
      },
      tipoUsuario: usuario.tipo_usuario,
      usuarioId: usuario.id,
      poloId: usuario.polo_id || null,
      escolaId: usuario.escola_id || null
    }

    const forcarAtualizacao = searchParams.get('atualizar_cache') === 'true'

    if (!forcarAtualizacao && verificarCache(cacheOptions)) {
      const dadosCache = carregarCache<any>(cacheOptions)
      if (dadosCache) {
        console.log('Retornando resultados consolidados do cache')
        return NextResponse.json(dadosCache)
      }
    }

    // Otimizar query: usar JOIN ao invés de subconsultas
    let query = `
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
        rc.media_aluno,
        rc.nota_producao,
        rc.nivel_aprendizagem,
        rc.nivel_aprendizagem_id,
        rc.tipo_avaliacao,
        rc.total_questoes_esperadas,
        rc.item_producao_1,
        rc.item_producao_2,
        rc.item_producao_3,
        rc.item_producao_4,
        rc.item_producao_5,
        rc.item_producao_6,
        rc.item_producao_7,
        rc.item_producao_8,
        a.nome as aluno_nome,
        e.nome as escola_nome,
        e.polo_id,
        t.codigo as turma_codigo
      FROM resultados_consolidados rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      WHERE 1=1
      -- IMPORTANTE: Filtrar apenas alunos com presença 'P' ou 'F' (excluir '-' sem dados)
      AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    `

    const params: any[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso usando JOIN ao invés de subconsulta
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND rc.escola_id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (escolaId) {
      query += ` AND rc.escola_id = $${paramIndex}`
      params.push(escolaId)
      paramIndex++
    }

    if (poloId) {
      // Otimizar: usar JOIN ao invés de subconsulta
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(poloId)
      paramIndex++
    }

    if (anoLetivo) {
      query += ` AND rc.ano_letivo = $${paramIndex}`
      params.push(anoLetivo)
      paramIndex++
    }

    if (serie) {
      query += ` AND rc.serie = $${paramIndex}`
      params.push(serie)
      paramIndex++
    }

    if (presenca) {
      query += ` AND UPPER(rc.presenca) = UPPER($${paramIndex})`
      params.push(presenca)
      paramIndex++
    }

    if (turmaId) {
      query += ` AND rc.turma_id = $${paramIndex}`
      params.push(turmaId)
      paramIndex++
    }

    query += ' ORDER BY rc.media_aluno DESC NULLS LAST, a.nome'

    const result = await pool.query(query, params)

    // Salvar no cache (expira em 1 hora)
    try {
      salvarCache(cacheOptions, result.rows, 'resultados-consolidados')
    } catch (cacheError) {
      console.error('Erro ao salvar cache (nao critico):', cacheError)
    }

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar resultados consolidados:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

