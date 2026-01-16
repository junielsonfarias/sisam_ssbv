import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import {
  memoryCache,
  CACHE_TTL,
  getCacheKeyDashboard,
  getCacheKeyFiltros,
  getCacheKeyMetricas
} from '@/lib/cache-memoria'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard-rapido
 *
 * Endpoint OTIMIZADO para dashboard - Suporta 50+ usuários simultâneos
 *
 * Estratégias de otimização:
 * 1. Cache em memória com TTLs diferentes por tipo de dado
 * 2. Carregamento em camadas (dados críticos primeiro)
 * 3. Query única com CTE para métricas principais
 * 4. Cache separado para filtros (raramente mudam)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const poloId = searchParams.get('polo_id')
    const escolaId = searchParams.get('escola_id')
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const turmaId = searchParams.get('turma_id')
    const presenca = searchParams.get('presenca')
    const nivelAprendizagem = searchParams.get('nivel')
    const faixaMedia = searchParams.get('faixa_media')
    const forcarAtualizacao = searchParams.get('atualizar_cache') === 'true'
    const apenasMetricas = searchParams.get('apenas_metricas') === 'true'

    // Gerar chaves de cache
    const filtros = { poloId, escolaId, anoLetivo, serie, turmaId, presenca, nivelAprendizagem, faixaMedia }
    const cacheKeyMetricas = getCacheKeyMetricas(
      usuario.tipo_usuario,
      usuario.polo_id || poloId,
      usuario.escola_id || escolaId,
      anoLetivo,
      serie
    )
    const cacheKeyFiltros = getCacheKeyFiltros(
      usuario.tipo_usuario,
      usuario.polo_id,
      usuario.escola_id
    )
    const cacheKeyDashboard = getCacheKeyDashboard(
      usuario.tipo_usuario,
      usuario.polo_id || poloId,
      usuario.escola_id || escolaId,
      filtros
    )

    // CAMADA 1: Verificar cache de métricas (TTL longo)
    if (!forcarAtualizacao) {
      const cachedMetricas = memoryCache.get<any>(cacheKeyMetricas)
      const cachedFiltros = memoryCache.get<any>(cacheKeyFiltros)

      // Se só precisa de métricas e tem cache, retornar imediatamente
      if (apenasMetricas && cachedMetricas) {
        return NextResponse.json({
          ...cachedMetricas,
          filtros: cachedFiltros || {},
          _cache: {
            origem: 'memoria',
            ttlRestante: memoryCache.getTTL(cacheKeyMetricas),
            tempoResposta: Date.now() - startTime
          }
        })
      }

      // Verificar cache completo do dashboard
      const cachedDashboard = memoryCache.get<any>(cacheKeyDashboard)
      if (cachedDashboard) {
        return NextResponse.json({
          ...cachedDashboard,
          _cache: {
            origem: 'memoria',
            ttlRestante: memoryCache.getTTL(cacheKeyDashboard),
            tempoResposta: Date.now() - startTime
          }
        })
      }
    }

    // CAMADA 2: Construir condições de filtro
    let whereConditions: string[] = []
    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereConditions.push(`rc.escola_id = $${paramIndex}`)
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Filtros do usuário
    if (poloId) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(poloId)
      paramIndex++
    }

    if (escolaId) {
      whereConditions.push(`rc.escola_id = $${paramIndex}`)
      params.push(escolaId)
      paramIndex++
    }

    if (anoLetivo) {
      whereConditions.push(`rc.ano_letivo = $${paramIndex}`)
      params.push(anoLetivo)
      paramIndex++
    }

    if (serie) {
      whereConditions.push(`rc.serie = $${paramIndex}`)
      params.push(serie)
      paramIndex++
    }

    if (turmaId) {
      whereConditions.push(`rc.turma_id = $${paramIndex}`)
      params.push(turmaId)
      paramIndex++
    }

    // Filtro de presença
    if (presenca) {
      whereConditions.push(`(rc.presenca = $${paramIndex} OR rc.presenca = LOWER($${paramIndex}))`)
      params.push(presenca.toUpperCase())
      paramIndex++
    } else {
      whereConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
    }

    if (nivelAprendizagem) {
      if (nivelAprendizagem === 'Não classificado') {
        whereConditions.push(`(rc_table.nivel_aprendizagem IS NULL OR rc_table.nivel_aprendizagem = '')`)
      } else {
        whereConditions.push(`rc_table.nivel_aprendizagem = $${paramIndex}`)
        params.push(nivelAprendizagem)
        paramIndex++
      }
    }

    if (faixaMedia) {
      const [min, max] = faixaMedia.split('-').map(Number)
      if (!isNaN(min) && !isNaN(max)) {
        whereConditions.push(`rc.media_aluno >= $${paramIndex} AND rc.media_aluno < $${paramIndex + 1}`)
        params.push(min, max === 10 ? 10.01 : max)
        paramIndex += 2
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // CAMADA 3: Query otimizada com CTE (Common Table Expression)
    // Uma única query que retorna todos os dados principais
    const queryConsolidada = `
      WITH dados_base AS (
        SELECT
          rc.aluno_id,
          rc.escola_id,
          rc.turma_id,
          rc.serie,
          rc.presenca,
          rc.media_aluno,
          rc.nota_lp,
          rc.nota_mat,
          rc.nota_ch,
          rc.nota_cn,
          e.polo_id,
          COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado') as nivel_aprendizagem
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
        ${whereClause}
      ),
      metricas AS (
        SELECT
          COUNT(DISTINCT aluno_id) as total_alunos,
          COUNT(DISTINCT escola_id) as total_escolas,
          COUNT(DISTINCT turma_id) as total_turmas,
          COUNT(DISTINCT polo_id) as total_polos,
          COUNT(CASE WHEN (presenca = 'P' OR presenca = 'p') THEN 1 END) as total_presentes,
          COUNT(CASE WHEN (presenca = 'F' OR presenca = 'f') THEN 1 END) as total_faltantes,
          ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND media_aluno IS NOT NULL AND media_aluno > 0 THEN media_aluno ELSE NULL END), 2) as media_geral,
          ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND nota_lp IS NOT NULL AND nota_lp > 0 THEN nota_lp ELSE NULL END), 2) as media_lp,
          ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND nota_mat IS NOT NULL AND nota_mat > 0 THEN nota_mat ELSE NULL END), 2) as media_mat,
          ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND nota_ch IS NOT NULL AND nota_ch > 0 THEN nota_ch ELSE NULL END), 2) as media_ch,
          ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND nota_cn IS NOT NULL AND nota_cn > 0 THEN nota_cn ELSE NULL END), 2) as media_cn
        FROM dados_base
      ),
      niveis AS (
        SELECT nivel_aprendizagem as nivel, COUNT(*) as quantidade
        FROM dados_base
        GROUP BY nivel_aprendizagem
      ),
      faixas AS (
        SELECT
          CASE
            WHEN media_aluno >= 0 AND media_aluno < 2 THEN '0-2'
            WHEN media_aluno >= 2 AND media_aluno < 4 THEN '2-4'
            WHEN media_aluno >= 4 AND media_aluno < 6 THEN '4-6'
            WHEN media_aluno >= 6 AND media_aluno < 8 THEN '6-8'
            WHEN media_aluno >= 8 AND media_aluno <= 10 THEN '8-10'
            ELSE 'N/A'
          END as faixa,
          COUNT(*) as quantidade
        FROM dados_base
        WHERE (presenca = 'P' OR presenca = 'p') AND media_aluno IS NOT NULL AND media_aluno > 0
        GROUP BY faixa
      ),
      presenca_dist AS (
        SELECT
          CASE
            WHEN (presenca = 'P' OR presenca = 'p') THEN 'Presente'
            WHEN (presenca = 'F' OR presenca = 'f') THEN 'Faltante'
            ELSE 'Não informado'
          END as status,
          COUNT(*) as quantidade
        FROM dados_base
        GROUP BY status
      )
      SELECT
        (SELECT row_to_json(m) FROM metricas m) as metricas,
        (SELECT json_agg(n) FROM niveis n) as niveis,
        (SELECT json_agg(f) FROM faixas f) as faixas_nota,
        (SELECT json_agg(p) FROM presenca_dist p) as presenca
    `

    // CAMADA 4: Executar queries em paralelo controlado
    const [resultadoPrincipal, resultadoFiltros] = await Promise.all([
      pool.query(queryConsolidada, params),
      // Query de filtros separada (cache longo)
      !memoryCache.has(cacheKeyFiltros) ? buscarFiltros(usuario, presenca) : Promise.resolve(null)
    ])

    const dadosPrincipais = resultadoPrincipal.rows[0]

    // Processar métricas
    const metricas = dadosPrincipais.metricas || {}
    const dadosResposta = {
      metricas: {
        total_alunos: parseInt(metricas.total_alunos) || 0,
        total_escolas: parseInt(metricas.total_escolas) || 0,
        total_turmas: parseInt(metricas.total_turmas) || 0,
        total_polos: parseInt(metricas.total_polos) || 0,
        total_presentes: parseInt(metricas.total_presentes) || 0,
        total_faltantes: parseInt(metricas.total_faltantes) || 0,
        media_geral: parseFloat(metricas.media_geral) || 0,
        media_lp: parseFloat(metricas.media_lp) || 0,
        media_mat: parseFloat(metricas.media_mat) || 0,
        media_ch: parseFloat(metricas.media_ch) || 0,
        media_cn: parseFloat(metricas.media_cn) || 0,
        taxa_presenca: parseInt(metricas.total_alunos) > 0
          ? Math.round((parseInt(metricas.total_presentes) / parseInt(metricas.total_alunos)) * 100)
          : 0,
      },
      niveis: (dadosPrincipais.niveis || []).map((row: any) => ({
        nivel: row.nivel,
        quantidade: parseInt(row.quantidade)
      })),
      faixasNota: (dadosPrincipais.faixas_nota || []).map((row: any) => ({
        faixa: row.faixa,
        quantidade: parseInt(row.quantidade)
      })),
      presenca: (dadosPrincipais.presenca || []).map((row: any) => ({
        status: row.status,
        quantidade: parseInt(row.quantidade)
      })),
      filtros: resultadoFiltros || memoryCache.get(cacheKeyFiltros) || {}
    }

    // CAMADA 5: Salvar no cache
    memoryCache.set(cacheKeyMetricas, {
      metricas: dadosResposta.metricas,
      niveis: dadosResposta.niveis,
      faixasNota: dadosResposta.faixasNota,
      presenca: dadosResposta.presenca
    }, CACHE_TTL.METRICAS_GERAIS)

    memoryCache.set(cacheKeyDashboard, dadosResposta, CACHE_TTL.DASHBOARD)

    if (resultadoFiltros) {
      memoryCache.set(cacheKeyFiltros, resultadoFiltros, CACHE_TTL.FILTROS)
    }

    const tempoResposta = Date.now() - startTime
    console.log(`[Dashboard Rápido] Resposta em ${tempoResposta}ms`)

    return NextResponse.json({
      ...dadosResposta,
      _cache: {
        origem: 'banco',
        geradoEm: new Date().toISOString(),
        tempoResposta
      },
      _stats: memoryCache.getStats()
    })

  } catch (error: any) {
    console.error('Erro no dashboard rápido:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor', erro: error.message },
      { status: 500 }
    )
  }
}

/**
 * Busca dados de filtros (executado separadamente com cache longo)
 */
async function buscarFiltros(usuario: any, presenca: string | null) {
  const filtrosConditions: string[] = []
  const filtrosParams: any[] = []
  let paramIndex = 1

  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    filtrosConditions.push(`e.polo_id = $${paramIndex}`)
    filtrosParams.push(usuario.polo_id)
    paramIndex++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    filtrosConditions.push(`rc.escola_id = $${paramIndex}`)
    filtrosParams.push(usuario.escola_id)
    paramIndex++
  }

  // Adicionar filtro de presença padrão
  if (presenca) {
    filtrosConditions.push(`(rc.presenca = $${paramIndex} OR rc.presenca = LOWER($${paramIndex}))`)
    filtrosParams.push(presenca.toUpperCase())
  } else {
    filtrosConditions.push(`(rc.presenca IN ('P', 'p', 'F', 'f'))`)
  }

  const whereClause = filtrosConditions.length > 0 ? `WHERE ${filtrosConditions.join(' AND ')}` : ''

  const queryFiltros = `
    SELECT
      (SELECT json_agg(DISTINCT jsonb_build_object('id', p.id, 'nome', p.nome))
       FROM polos p
       INNER JOIN escolas e ON e.polo_id = p.id
       INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
       ${whereClause}
      ) as polos,
      (SELECT json_agg(DISTINCT jsonb_build_object('id', e.id, 'nome', e.nome, 'polo_id', e.polo_id))
       FROM escolas e
       INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
       ${whereClause}
      ) as escolas,
      (SELECT json_agg(DISTINCT rc.serie ORDER BY rc.serie)
       FROM resultados_consolidados_unificada rc
       INNER JOIN escolas e ON rc.escola_id = e.id
       ${whereClause} AND rc.serie IS NOT NULL AND rc.serie != ''
      ) as series,
      (SELECT json_agg(DISTINCT rc.ano_letivo ORDER BY rc.ano_letivo DESC)
       FROM resultados_consolidados_unificada rc
       INNER JOIN escolas e ON rc.escola_id = e.id
       ${whereClause} AND rc.ano_letivo IS NOT NULL
      ) as anos_letivos,
      (SELECT json_agg(DISTINCT nivel ORDER BY nivel)
       FROM (
         SELECT COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado') as nivel
         FROM resultados_consolidados_unificada rc
         INNER JOIN escolas e ON rc.escola_id = e.id
         LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
         ${whereClause}
       ) sub
       WHERE nivel IS NOT NULL
      ) as niveis
  `

  const result = await pool.query(queryFiltros, filtrosParams)
  const row = result.rows[0]

  return {
    polos: row.polos || [],
    escolas: row.escolas || [],
    series: row.series || [],
    anosLetivos: row.anos_letivos || [],
    niveis: row.niveis || [],
    faixasMedia: ['0-2', '2-4', '4-6', '6-8', '8-10']
  }
}
