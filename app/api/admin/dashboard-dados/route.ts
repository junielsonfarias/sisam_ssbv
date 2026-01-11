import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache } from '@/lib/cache-dashboard'
import {
  memoryCache,
  CACHE_TTL,
  getCacheKeyDashboard,
  getCacheKeyFiltros
} from '@/lib/cache-memoria'
import { NOTAS, LIMITES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// Flag para usar cache em memória (mais rápido) ou arquivo (persistente)
const USE_MEMORY_CACHE = true

/**
 * GET /api/admin/dashboard-dados
 * Retorna dados consolidados para o dashboard estilo Power BI
 */
export async function GET(request: NextRequest) {
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
    const tipoEnsino = searchParams.get('tipo_ensino')
    const nivelAprendizagem = searchParams.get('nivel')
    const faixaMedia = searchParams.get('faixa_media')
    const disciplina = searchParams.get('disciplina')
    
    // Novos filtros de acertos/erros
    const taxaAcertoMin = searchParams.get('taxa_acerto_min')
    const taxaAcertoMax = searchParams.get('taxa_acerto_max')
    const questaoCodigo = searchParams.get('questao_codigo')
    const areaConhecimento = searchParams.get('area_conhecimento')
    const tipoAnalise = searchParams.get('tipo_analise') // 'acertos' | 'erros' | 'ambos'

    // Parâmetros de paginação para alunos detalhados
    const paginaAlunos = parseInt(searchParams.get('pagina_alunos') || '1')
    const limiteAlunos = Math.min(parseInt(searchParams.get('limite_alunos') || '50'), 10000) // Padrão 50, máximo 10000 para cache local
    const offsetAlunos = (paginaAlunos - 1) * limiteAlunos

    // Parametro para forcar atualizacao do cache
    const forcarAtualizacao = searchParams.get('atualizar_cache') === 'true'

    // Configurar opcoes de cache
    const cacheOptions = {
      filtros: {
        poloId,
        escolaId,
        anoLetivo,
        serie,
        turmaId,
        presenca,
        tipoEnsino,
        nivelAprendizagem,
        faixaMedia,
        disciplina,
        taxaAcertoMin,
        taxaAcertoMax,
        questaoCodigo,
        areaConhecimento,
        tipoAnalise,
        paginaAlunos,
        limiteAlunos
      },
      tipoUsuario: usuario.tipo_usuario,
      usuarioId: usuario.id,
      poloId: usuario.polo_id || null,
      escolaId: usuario.escola_id || null
    }

    // Gerar chave de cache em memória (sem paginação para aumentar hit rate)
    const memoryCacheKey = getCacheKeyDashboard(
      usuario.tipo_usuario,
      usuario.polo_id || poloId,
      usuario.escola_id || escolaId,
      { poloId, escolaId, anoLetivo, serie, turmaId, presenca, tipoEnsino, nivelAprendizagem, faixaMedia, disciplina }
    )

    // VERIFICAR CACHE EM MEMÓRIA PRIMEIRO (mais rápido)
    if (USE_MEMORY_CACHE && !forcarAtualizacao) {
      const cachedData = memoryCache.get<any>(memoryCacheKey)
      if (cachedData) {
        console.log('[Dashboard] Cache em memória encontrado')
        // Aplicar paginação nos dados em cache
        const alunosDetalhados = cachedData.alunosDetalhados || []
        const totalItens = alunosDetalhados.length
        const alunosPaginados = alunosDetalhados.slice(offsetAlunos, offsetAlunos + limiteAlunos)

        return NextResponse.json({
          ...cachedData,
          alunosDetalhados: alunosPaginados,
          paginacaoAlunos: {
            paginaAtual: paginaAlunos,
            itensPorPagina: limiteAlunos,
            totalItens,
            totalPaginas: Math.ceil(totalItens / limiteAlunos)
          },
          _cache: {
            origem: 'memoria',
            carregadoEm: new Date().toISOString(),
            ttlRestante: memoryCache.getTTL(memoryCacheKey)
          }
        })
      }
    }

    // Verificar cache em arquivo (fallback) - com tratamento de erro para ambientes serverless
    try {
      if (!forcarAtualizacao && verificarCache(cacheOptions)) {
        const dadosCache = carregarCache<any>(cacheOptions)
        if (dadosCache) {
          console.log('[Dashboard] Cache em arquivo encontrado')
          // Salvar no cache em memória para próximas requisições
          if (USE_MEMORY_CACHE) {
            memoryCache.set(memoryCacheKey, dadosCache, CACHE_TTL.DASHBOARD)
          }
          return NextResponse.json({
            ...dadosCache,
            _cache: {
              origem: 'arquivo',
              carregadoEm: new Date().toISOString()
            }
          })
        }
      }
    } catch {
      // Ignorar erros de cache em ambientes serverless (sistema de arquivos efêmero)
      console.log('[Dashboard] Cache de arquivo não disponível, buscando do banco')
    }

    // Construir condições de filtro
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
      // Extrair apenas o número da série para comparação flexível
      const numeroSerie = serie.match(/\d+/)?.[0]
      if (numeroSerie) {
        whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = $${paramIndex}`)
        params.push(numeroSerie)
        paramIndex++
      } else {
        whereConditions.push(`rc.serie ILIKE $${paramIndex}`)
        params.push(serie)
        paramIndex++
      }
    }

    // Filtro por tipo de ensino (anos_iniciais ou anos_finais)
    if (tipoEnsino) {
      if (tipoEnsino === 'anos_iniciais') {
        whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`)
      } else if (tipoEnsino === 'anos_finais') {
        whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`)
      }
    }

    if (turmaId) {
      whereConditions.push(`rc.turma_id = $${paramIndex}`)
      params.push(turmaId)
      paramIndex++
    }

    // IMPORTANTE: Filtro de presença - respeitar seleção do usuário ou aplicar padrão
    if (presenca) {
      // Se o usuário selecionou presença, usar apenas o filtro do usuário
      whereConditions.push(`(rc.presenca = $${paramIndex} OR rc.presenca = LOWER($${paramIndex}))`)
      params.push(presenca.toUpperCase())
      paramIndex++
    } else {
      // Se não houver filtro de presença do usuário, aplicar filtro padrão para excluir '-' (sem dados)
      whereConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
    }

    if (nivelAprendizagem) {
      // Usar JOIN com resultados_consolidados para filtrar por nivel_aprendizagem
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
        // CORREÇÃO: Usar a mesma fórmula de cálculo de média que é usada na query de alunos detalhados
        // A média é calculada dinamicamente baseada na série do aluno
        // IMPORTANTE: Para Anos Iniciais, usar rc_table que tem valores corretos
        const mediaCalculada = `
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              ROUND(
                (COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)) /
                NULLIF(
                  CASE WHEN rc_table.nota_lp IS NOT NULL AND CAST(rc_table.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc_table.nota_mat IS NOT NULL AND CAST(rc_table.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc_table.nota_producao IS NOT NULL AND CAST(rc_table.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
            ELSE
              ROUND(
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) /
                NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
          END
        `
        whereConditions.push(`(${mediaCalculada}) >= $${paramIndex} AND (${mediaCalculada}) < $${paramIndex + 1}`)
        params.push(min, max === 10 ? 10.01 : max)
        paramIndex += 2
      }
    }

    // IMPORTANTE: O filtro de disciplina NÃO deve afetar a contagem de alunos/presentes/faltantes
    // Ele só deve afetar as análises de acertos/erros
    // Por isso, criamos um whereClause separado para métricas gerais (sem filtro de disciplina)

    // Guardar as condições base (sem disciplina) para métricas gerais
    const whereConditionsBase = [...whereConditions]
    const paramsBase = [...params]
    const paramIndexBase = paramIndex

    if (disciplina) {
      // Filtrar por disciplina específica - apenas para análises de notas/acertos
      // NÃO adiciona ao whereConditions para não afetar contagem de alunos
      const disciplinaMap: Record<string, { campo: string; usarTabela: boolean }> = {
        'LP': { campo: 'nota_lp', usarTabela: false },
        'MAT': { campo: 'nota_mat', usarTabela: false },
        'CH': { campo: 'nota_ch', usarTabela: false },
        'CN': { campo: 'nota_cn', usarTabela: false },
        'PT': { campo: 'nota_producao', usarTabela: true }
      }
      const infoDisciplina = disciplinaMap[disciplina.toUpperCase()]
      if (infoDisciplina) {
        // Usar parâmetros para evitar SQL injection
        const prefixo = infoDisciplina.usarTabela ? 'rc_table' : 'rc'
        whereConditions.push(`${prefixo}.${infoDisciplina.campo} IS NOT NULL AND CAST(${prefixo}.${infoDisciplina.campo} AS DECIMAL) > 0`)
      }
    }

    // whereClauseBase: para métricas gerais (total_alunos, presentes, faltantes) - SEM filtro de disciplina
    const whereClauseBase = whereConditionsBase.length > 0 ? `WHERE ${whereConditionsBase.join(' AND ')}` : ''

    // Filtro de taxa de acerto mínima/máxima
    if (taxaAcertoMin || taxaAcertoMax) {
      // CORREÇÃO: Usar a mesma fórmula de cálculo de média que é usada na query de alunos detalhados
      // IMPORTANTE: Para Anos Iniciais, usar rc_table que tem valores corretos
      const mediaCalculadaTaxa = `
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            ROUND(
              (COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)) /
              NULLIF(
                CASE WHEN rc_table.nota_lp IS NOT NULL AND CAST(rc_table.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc_table.nota_mat IS NOT NULL AND CAST(rc_table.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc_table.nota_producao IS NOT NULL AND CAST(rc_table.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
          ELSE
            ROUND(
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) /
              NULLIF(
                CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
        END
      `
      // Taxa = (total_acertos / total_questoes) * 100
      // Aproximação: taxa de acerto = média * 10 (ex: média 7 = 70% de acerto)
      if (taxaAcertoMin) {
        const taxaMin = parseFloat(taxaAcertoMin)
        if (!isNaN(taxaMin)) {
          const mediaMin = (taxaMin / 100) * 10
          whereConditions.push(`(${mediaCalculadaTaxa}) >= $${paramIndex}`)
          params.push(mediaMin)
          paramIndex++
        }
      }
      if (taxaAcertoMax) {
        const taxaMax = parseFloat(taxaAcertoMax)
        if (!isNaN(taxaMax)) {
          const mediaMax = (taxaMax / 100) * 10
          whereConditions.push(`(${mediaCalculadaTaxa}) <= $${paramIndex}`)
          params.push(mediaMax)
          paramIndex++
        }
      }
    }

    // Filtro por área de conhecimento
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // ========== MÉTRICAS GERAIS ==========
    // Adicionar JOIN com resultados_consolidados se filtro de nivel_aprendizagem ou nota_producao for usado
    // Sempre adicionar o JOIN porque sempre precisamos de nota_producao e nivel_aprendizagem nas queries
    const joinNivelAprendizagem = 'LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo'

    // CORREÇÃO: Usar whereClauseBase para métricas gerais (sem filtro de disciplina)
    // Isso garante que total_alunos, presentes e faltantes não sejam afetados pelo filtro de disciplina
    // CORREÇÃO 2: Para anos iniciais, a média deve incluir nota_producao
    const metricasQuery = `
      SELECT
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(DISTINCT rc.escola_id) as total_escolas,
        COUNT(DISTINCT rc.turma_id) as total_turmas,
        COUNT(DISTINCT e.polo_id) as total_polos,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as total_faltantes,
        -- Média CORRIGIDA: anos iniciais inclui PROD, anos finais usa LP+CH+MAT+CN
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              -- Anos iniciais (2, 3, 5): média de LP, MAT e PROD
              WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
                ) / NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                )
              -- Anos finais (6, 7, 8, 9): média de LP, CH, MAT, CN
              ELSE
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
                ) / NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                )
            END
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_producao,
        MIN(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as menor_media,
        MAX(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as maior_media
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${whereClauseBase}
    `

    // ========== DISTRIBUIÇÃO POR NÍVEL DE APRENDIZAGEM ==========
    // Filtrar apenas anos iniciais (2º, 3º, 5º) com presença ou falta registrada
    // Estes são os únicos anos que têm avaliação de nível de aprendizagem
    // CORREÇÃO: Usar whereConditionsBase (sem filtro de disciplina) pois a query usa paramsBase
    const niveisConditions = [...whereConditionsBase]
    // Filtrar apenas anos iniciais (2º, 3º, 5º ano)
    niveisConditions.push(`(REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5'))`)
    // Filtrar apenas alunos com presença ou falta registrada
    niveisConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
    const niveisWhere = niveisConditions.length > 0 ? `WHERE ${niveisConditions.join(' AND ')}` : ''

    const niveisQuery = `
      SELECT
        COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado') as nivel,
        COUNT(*) as quantidade
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
      ${niveisWhere}
      GROUP BY COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado')
      ORDER BY
        CASE COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado')
          WHEN 'Insuficiente' THEN 1
          WHEN 'N1' THEN 1
          WHEN 'Básico' THEN 2
          WHEN 'N2' THEN 2
          WHEN 'Adequado' THEN 3
          WHEN 'N3' THEN 3
          WHEN 'Avançado' THEN 4
          WHEN 'N4' THEN 4
          ELSE 5
        END
    `

    // ========== MÉDIAS POR SÉRIE ==========
    // CORREÇÃO: Usar whereClauseBase para que contagens não sejam afetadas pelo filtro de disciplina
    const mediasPorSerieQuery = `
      SELECT
        rc.serie,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${whereClauseBase}
      GROUP BY rc.serie
      HAVING rc.serie IS NOT NULL
      ORDER BY REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')::integer NULLS LAST
    `

    // ========== MÉDIAS POR POLO ==========
    // CORREÇÃO: Usar whereClauseBase para que contagens não sejam afetadas pelo filtro de disciplina
    const mediasPorPoloQuery = `
      SELECT
        p.id as polo_id,
        p.nome as polo,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      INNER JOIN polos p ON e.polo_id = p.id
      ${joinNivelAprendizagem}
      ${whereClauseBase}
      GROUP BY p.id, p.nome
      ORDER BY media_geral DESC NULLS LAST
    `

    // ========== MÉDIAS POR ESCOLA ==========
    // CORREÇÃO: Usar whereClauseBase para que contagens não sejam afetadas pelo filtro de disciplina
    // CORREÇÃO 2: Para anos iniciais, a média deve incluir nota_producao
    const mediasPorEscolaQuery = `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        -- Média CORRIGIDA: considera nota_producao para anos iniciais
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              -- Anos iniciais (2, 3, 5): média de LP, MAT e PROD
              WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
                ) / NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                )
              -- Anos finais (6, 7, 8, 9): média de LP, CH, MAT, CN
              ELSE
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
                ) / NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                )
            END
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${joinNivelAprendizagem}
      ${whereClauseBase}
      GROUP BY e.id, e.nome, p.nome
      ORDER BY media_geral DESC NULLS LAST
    `

    // ========== MÉDIAS POR TURMA ==========
    // CORREÇÃO: Usar whereClauseBase para que contagens não sejam afetadas pelo filtro de disciplina
    // CORREÇÃO 2: Para anos iniciais (2,3,5), a média deve incluir nota_producao: (LP + MAT + PROD) / 3
    const mediasPorTurmaQuery = `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rc.serie,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        -- Média CORRIGIDA: anos iniciais inclui PROD, anos finais usa LP+CH+MAT+CN
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              -- Anos iniciais (2, 3, 5): média de LP, MAT e PROD
              WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
                ) / NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                )
              -- Anos finais (6, 7, 8, 9): média de LP, CH, MAT, CN
              ELSE
                (
                  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
                ) / NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                )
            END
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      ${joinNivelAprendizagem}
      ${whereClauseBase}
      GROUP BY t.id, t.codigo, e.nome, rc.serie
      HAVING t.id IS NOT NULL
      ORDER BY media_geral DESC NULLS LAST
    `

    // ========== DISTRIBUIÇÃO POR FAIXA DE NOTA ==========
    const faixasNotaConditions = [...whereConditions]
    // CORREÇÃO: Só adicionar filtro de presença = 'P' se o usuário NÃO estiver filtrando por presença específica
    if (!presenca) {
      faixasNotaConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p')`)
    }
    faixasNotaConditions.push(`(rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)`)
    const faixasNotaWhere = faixasNotaConditions.length > 0 ? `WHERE ${faixasNotaConditions.join(' AND ')}` : ''
    
    const faixasNotaQuery = `
      SELECT faixa, quantidade FROM (
        SELECT
          CASE
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 0 AND CAST(rc.media_aluno AS DECIMAL) < 2 THEN '0 a 2'
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 2 AND CAST(rc.media_aluno AS DECIMAL) < 4 THEN '2 a 4'
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 4 AND CAST(rc.media_aluno AS DECIMAL) < 6 THEN '4 a 6'
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 AND CAST(rc.media_aluno AS DECIMAL) < 8 THEN '6 a 8'
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 AND CAST(rc.media_aluno AS DECIMAL) <= 10 THEN '8 a 10'
            ELSE 'N/A'
          END as faixa,
          CASE
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 0 AND CAST(rc.media_aluno AS DECIMAL) < 2 THEN 1
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 2 AND CAST(rc.media_aluno AS DECIMAL) < 4 THEN 2
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 4 AND CAST(rc.media_aluno AS DECIMAL) < 6 THEN 3
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 AND CAST(rc.media_aluno AS DECIMAL) < 8 THEN 4
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 AND CAST(rc.media_aluno AS DECIMAL) <= 10 THEN 5
            ELSE 6
          END as ordem,
          COUNT(*) as quantidade
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${joinNivelAprendizagem}
        ${faixasNotaWhere}
        GROUP BY faixa, ordem
      ) sub
      ORDER BY ordem
    `

    // ========== DISTRIBUIÇÃO POR PRESENÇA ==========
    // CORREÇÃO: Usar whereClauseBase para não ser afetado pelo filtro de disciplina
    const presencaQuery = `
      SELECT
        CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 'Presente'
          WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 'Faltante'
          ELSE 'Não informado'
        END as status,
        COUNT(*) as quantidade
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${whereClauseBase}
      GROUP BY
        CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 'Presente'
          WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 'Faltante'
          ELSE 'Não informado'
        END
      ORDER BY quantidade DESC
    `

    // ========== TOP 10 ALUNOS ==========
    const topAlunosConditions = [...whereConditions]
    // CORREÇÃO: Só adicionar filtro de presença = 'P' se o usuário NÃO estiver filtrando por presença específica
    if (!presenca) {
      topAlunosConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p')`)
    }
    // CORREÇÃO: Só exigir média > 0 se não estiver filtrando por faltantes
    if (presenca !== 'F') {
      topAlunosConditions.push(`(rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)`)
    }
    const topAlunosWhere = topAlunosConditions.length > 0 ? `WHERE ${topAlunosConditions.join(' AND ')}` : ''
    
    // CORREÇÃO: Ordenação dinâmica - por média CALCULADA para presentes, por nome para faltantes
    // IMPORTANTE: Para Anos Iniciais, usar rc_table que tem valores corretos
    const topAlunosOrderBy = presenca === 'F'
      ? 'ORDER BY a.nome ASC'
      : `ORDER BY
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              ROUND(
                (COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)) /
                NULLIF(
                  CASE WHEN rc_table.nota_lp IS NOT NULL AND CAST(rc_table.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc_table.nota_mat IS NOT NULL AND CAST(rc_table.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc_table.nota_producao IS NOT NULL AND CAST(rc_table.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
            ELSE
              ROUND(
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) /
                NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
          END DESC`

    const topAlunosQuery = `
      SELECT
        a.nome as aluno,
        e.nome as escola,
        rc.serie,
        t.codigo as turma,
        -- Media calculada dinamicamente baseada na serie
        -- IMPORTANTE: Para Anos Iniciais, usar rc_table que tem valores corretos
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            ROUND(
              (
                COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)
              ) /
              NULLIF(
                CASE WHEN rc_table.nota_lp IS NOT NULL AND CAST(rc_table.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc_table.nota_mat IS NOT NULL AND CAST(rc_table.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc_table.nota_producao IS NOT NULL AND CAST(rc_table.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                0
              ),
              1
            )
          ELSE
            ROUND(
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
              ) /
              NULLIF(
                CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                0
              ),
              1
            )
        END as media_aluno,
        -- Notas: Para Anos Iniciais usar rc_table, para Anos Finais usar rc
        CASE WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.nota_lp ELSE rc.nota_lp END as nota_lp,
        CASE WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.nota_mat ELSE rc.nota_mat END as nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        rc.presenca,
        COALESCE(rc_table.nivel_aprendizagem, NULL) as nivel_aprendizagem
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
      ${topAlunosWhere}
      ${topAlunosOrderBy}
      LIMIT 10
    `

    // ========== CONTAGEM TOTAL DE ALUNOS (para paginação) ==========
    const totalAlunosQuery = `
      SELECT COUNT(DISTINCT rc.aluno_id) as total
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${whereClause}
    `

    // ========== ALUNOS DETALHADOS (para tabela com paginação) ==========
    // CORREÇÃO: Ordenação dinâmica - por média CALCULADA para presentes/todos, por nome para faltantes
    // Usa a mesma fórmula do SELECT para ordenar corretamente
    // IMPORTANTE: Para Anos Iniciais, usar rc_table que tem valores corretos
    const alunosDetalhadosOrderBy = presenca === 'F'
      ? 'ORDER BY a.nome ASC'
      : `ORDER BY
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              ROUND(
                (COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)) /
                NULLIF(
                  CASE WHEN rc_table.nota_lp IS NOT NULL AND CAST(rc_table.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc_table.nota_mat IS NOT NULL AND CAST(rc_table.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc_table.nota_producao IS NOT NULL AND CAST(rc_table.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
            ELSE
              ROUND(
                (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) /
                NULLIF(
                  CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END, 0), 1)
          END DESC NULLS LAST`

    const alunosDetalhadosQuery = `
      SELECT
        a.id,
        a.nome as aluno,
        a.codigo,
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        rc.serie,
        t.codigo as turma,
        rc.presenca,
        -- Media calculada dinamicamente baseada na serie
        -- IMPORTANTE: Para Anos Iniciais, usar dados da tabela rc_table (valores corretos)
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            -- Anos iniciais: media de LP, MAT e PROD (usar rc_table que tem valores corretos)
            ROUND(
              (
                COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)
              ) /
              NULLIF(
                CASE WHEN rc_table.nota_lp IS NOT NULL AND CAST(rc_table.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc_table.nota_mat IS NOT NULL AND CAST(rc_table.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc_table.nota_producao IS NOT NULL AND CAST(rc_table.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                0
              ),
              1
            )
          ELSE
            -- Anos finais: media de LP, CH, MAT, CN
            ROUND(
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
              ) /
              NULLIF(
                CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                0
              ),
              1
            )
        END as media_aluno,
        -- Notas: Para Anos Iniciais usar rc_table, para Anos Finais usar rc
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.nota_lp
          ELSE rc.nota_lp
        END as nota_lp,
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.nota_mat
          ELSE rc.nota_mat
        END as nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        COALESCE(rc_table.nota_producao, NULL) as nota_producao,
        COALESCE(rc_table.nivel_aprendizagem, NULL) as nivel_aprendizagem,
        -- Acertos: Para Anos Iniciais usar rc_table, para Anos Finais usar rc
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.total_acertos_lp
          ELSE rc.total_acertos_lp
        END as total_acertos_lp,
        rc.total_acertos_ch,
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.total_acertos_mat
          ELSE rc.total_acertos_mat
        END as total_acertos_mat,
        rc.total_acertos_cn,
        cs.qtd_questoes_lp,
        cs.qtd_questoes_mat,
        cs.qtd_questoes_ch,
        cs.qtd_questoes_cn
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
      LEFT JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = cs.serie::text
      ${whereClause}
      ${alunosDetalhadosOrderBy}
      LIMIT ${limiteAlunos} OFFSET ${offsetAlunos}
    `

    // ========== DADOS PARA FILTROS ==========
    // Construir condições de acesso para filtros
    const filtrosWhereConditions: string[] = []
    const filtrosParams: any[] = []
    let filtrosParamIndex = 1

    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      filtrosWhereConditions.push(`e.polo_id = $${filtrosParamIndex}`)
      filtrosParams.push(usuario.polo_id)
      filtrosParamIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      filtrosWhereConditions.push(`rc.escola_id = $${filtrosParamIndex}`)
      filtrosParams.push(usuario.escola_id)
      filtrosParamIndex++
    }

    const filtrosWhereClause = filtrosWhereConditions.length > 0 
      ? `WHERE ${filtrosWhereConditions.join(' AND ')}` 
      : ''

    // IMPORTANTE: Aplicar filtro de presença nos filtros de dropdown
    // Se o usuário selecionou presença, usar apenas o filtro do usuário; senão, excluir '-' (sem dados)
    const filtrosComPresenca = [...filtrosWhereConditions]
    if (presenca) {
      // Se o usuário selecionou presença, usar apenas o filtro do usuário
      filtrosComPresenca.push(`(rc.presenca = $${filtrosParamIndex} OR rc.presenca = LOWER($${filtrosParamIndex}))`)
      filtrosParams.push(presenca.toUpperCase())
      filtrosParamIndex++
    } else {
      // Se não houver filtro de presença do usuário, aplicar filtro padrão para excluir '-' (sem dados)
      filtrosComPresenca.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
    }
    const filtrosWhereClauseComPresenca = filtrosComPresenca.length > 0 
      ? `WHERE ${filtrosComPresenca.join(' AND ')}` 
      : ''

    const polosQuery = `
      SELECT DISTINCT p.id, p.nome
      FROM polos p
      INNER JOIN escolas e ON e.polo_id = p.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      ${filtrosWhereClauseComPresenca}
      ORDER BY p.nome
    `

    const escolasQuery = `
      SELECT DISTINCT e.id, e.nome, e.polo_id
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      ${filtrosWhereClauseComPresenca}
      ORDER BY e.nome
    `

    const seriesConditions = [...filtrosWhereConditions]
    seriesConditions.push(`rc.serie IS NOT NULL AND rc.serie != ''`)
    // IMPORTANTE: Aplicar filtro de presença - respeitar seleção do usuário ou aplicar padrão
    if (presenca) {
      seriesConditions.push(`(rc.presenca = $${filtrosParamIndex} OR rc.presenca = LOWER($${filtrosParamIndex}))`)
      filtrosParams.push(presenca.toUpperCase())
      filtrosParamIndex++
    } else {
      seriesConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
    }
    const seriesWhereClause = seriesConditions.length > 0 ? `WHERE ${seriesConditions.join(' AND ')}` : ''
    
    const seriesQuery = `
      SELECT DISTINCT rc.serie, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')::integer as serie_numero
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${seriesWhereClause}
      ORDER BY serie_numero
    `

    // IMPORTANTE: Aplicar filtro de presença - respeitar seleção do usuário ou aplicar padrão
    const turmasConditions = [...filtrosWhereConditions]
    if (presenca) {
      turmasConditions.push(`(rc.presenca = $${filtrosParamIndex} OR rc.presenca = LOWER($${filtrosParamIndex}))`)
      filtrosParams.push(presenca.toUpperCase())
      filtrosParamIndex++
    } else {
      turmasConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
    }
    const turmasWhereClause = turmasConditions.length > 0 ? `WHERE ${turmasConditions.join(' AND ')}` : ''

    const turmasQuery = `
      SELECT DISTINCT t.id, t.codigo, t.escola_id
      FROM turmas t
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${turmasWhereClause}
      ORDER BY t.codigo
    `

    const anosLetivosConditions = [...filtrosWhereConditions]
    anosLetivosConditions.push(`rc.ano_letivo IS NOT NULL AND rc.ano_letivo != ''`)
    // IMPORTANTE: Aplicar filtro de presença - respeitar seleção do usuário ou aplicar padrão
    if (presenca) {
      anosLetivosConditions.push(`(rc.presenca = $${filtrosParamIndex} OR rc.presenca = LOWER($${filtrosParamIndex}))`)
      filtrosParams.push(presenca.toUpperCase())
      filtrosParamIndex++
    } else {
      anosLetivosConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
    }
    const anosLetivosWhereClause = anosLetivosConditions.length > 0 ? `WHERE ${anosLetivosConditions.join(' AND ')}` : ''
    
    const anosLetivosQuery = `
      SELECT DISTINCT rc.ano_letivo
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${anosLetivosWhereClause}
      ORDER BY rc.ano_letivo DESC
    `

    const niveisDispQuery = `
      SELECT DISTINCT
        COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado') as nivel
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
      ${filtrosWhereClauseComPresenca}
      ORDER BY nivel
    `

    // ========== ANÁLISES DE ACERTOS/ERROS ==========
    
    // Construir condições para queries de resultados_provas
    const rpWhereConditions: string[] = []
    const rpParams: any[] = []
    let rpParamIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      rpWhereConditions.push(`rp.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rpParamIndex})`)
      rpParams.push(usuario.polo_id)
      rpParamIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      rpWhereConditions.push(`rp.escola_id = $${rpParamIndex}`)
      rpParams.push(usuario.escola_id)
      rpParamIndex++
    }

    // Aplicar filtros comuns
    if (poloId) {
      rpWhereConditions.push(`rp.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rpParamIndex})`)
      rpParams.push(poloId)
      rpParamIndex++
    }

    if (escolaId) {
      rpWhereConditions.push(`rp.escola_id = $${rpParamIndex}`)
      rpParams.push(escolaId)
      rpParamIndex++
    }

    if (anoLetivo) {
      rpWhereConditions.push(`rp.ano_letivo = $${rpParamIndex}`)
      rpParams.push(anoLetivo)
      rpParamIndex++
    }

    if (serie) {
      // Extrair apenas o número da série para comparação flexível
      // Ex: "3º Ano" -> "3", "5º" -> "5"
      const numeroSerie = serie.match(/\d+/)?.[0]
      if (numeroSerie) {
        // Buscar séries que contenham o mesmo número (ex: "3º", "3º Ano", "3")
        rpWhereConditions.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') = $${rpParamIndex}`)
        rpParams.push(numeroSerie)
        rpParamIndex++
      } else {
        // Se não for numérico, comparar diretamente
        rpWhereConditions.push(`rp.serie ILIKE $${rpParamIndex}`)
        rpParams.push(serie)
        rpParamIndex++
      }
    }

    if (turmaId) {
      rpWhereConditions.push(`rp.turma_id = $${rpParamIndex}`)
      rpParams.push(turmaId)
      rpParamIndex++
    }

    if (presenca) {
      rpWhereConditions.push(`(rp.presenca = $${rpParamIndex} OR rp.presenca = LOWER($${rpParamIndex}))`)
      rpParams.push(presenca.toUpperCase())
      rpParamIndex++
    }

    if (disciplina) {
      // Buscar em disciplina e area_conhecimento para garantir compatibilidade
      // Mapear valores do frontend para padrões de busca no banco
      const disciplinaUpper = disciplina.toUpperCase().trim()

      // Criar lista de padrões de busca para cada disciplina
      let searchPatterns: string[] = []

      if (disciplinaUpper === 'LP' || disciplinaUpper === 'LÍNGUA PORTUGUESA' || disciplinaUpper === 'LINGUA PORTUGUESA') {
        searchPatterns = ['LP', 'Língua Portuguesa', 'Lingua Portuguesa', 'LÍNGUA PORTUGUESA', 'LINGUA PORTUGUESA', 'português', 'Português', 'PORTUGUÊS']
      } else if (disciplinaUpper === 'MAT' || disciplinaUpper === 'MATEMÁTICA' || disciplinaUpper === 'MATEMATICA') {
        searchPatterns = ['MAT', 'Matemática', 'Matematica', 'MATEMÁTICA', 'MATEMATICA']
      } else if (disciplinaUpper === 'CH' || disciplinaUpper === 'CIÊNCIAS HUMANAS' || disciplinaUpper === 'CIENCIAS HUMANAS') {
        searchPatterns = ['CH', 'Ciências Humanas', 'Ciencias Humanas', 'CIÊNCIAS HUMANAS', 'CIENCIAS HUMANAS', 'humanas', 'Humanas', 'HUMANAS']
      } else if (disciplinaUpper === 'CN' || disciplinaUpper === 'CIÊNCIAS DA NATUREZA' || disciplinaUpper === 'CIENCIAS DA NATUREZA') {
        searchPatterns = ['CN', 'Ciências da Natureza', 'Ciencias da Natureza', 'CIÊNCIAS DA NATUREZA', 'CIENCIAS DA NATUREZA', 'natureza', 'Natureza', 'NATUREZA']
      } else if (disciplinaUpper === 'PT' || disciplinaUpper === 'PRODUÇÃO TEXTUAL' || disciplinaUpper === 'PRODUCAO TEXTUAL') {
        searchPatterns = ['PT', 'Produção Textual', 'Producao Textual', 'PRODUÇÃO TEXTUAL', 'PRODUCAO TEXTUAL', 'Redação', 'Redacao', 'REDAÇÃO', 'REDACAO']
      } else {
        // Para outras disciplinas, usar o valor como está
        searchPatterns = [disciplina, disciplinaUpper, disciplina.toLowerCase()]
      }

      // Construir condição OR para todos os padrões
      const conditions: string[] = []
      searchPatterns.forEach((pattern) => {
        conditions.push(`rp.disciplina = $${rpParamIndex}`)
        conditions.push(`rp.area_conhecimento = $${rpParamIndex}`)
        rpParams.push(pattern)
        rpParamIndex++
      })

      rpWhereConditions.push(`(${conditions.join(' OR ')})`)
    }

    if (questaoCodigo) {
      rpWhereConditions.push(`rp.questao_codigo = $${rpParamIndex}`)
      rpParams.push(questaoCodigo)
      rpParamIndex++
    }

    // Adicionar filtro de presença se necessário para análises
    const rpWhereConditionsComPresenca = [...rpWhereConditions]
    if (presenca) {
      // Se o usuário selecionou presença, usar apenas o filtro do usuário
      // (já foi adicionado em rpWhereConditions acima)
    } else {
      // Se não há filtro de presença, excluir '-' (sem dados) e filtrar apenas presentes por padrão para análises
      rpWhereConditionsComPresenca.push(`(rp.presenca = 'P' OR rp.presenca = 'p')`)
    }
    const rpWhereClauseComPresenca = rpWhereConditionsComPresenca.length > 0 
      ? `WHERE ${rpWhereConditionsComPresenca.join(' AND ')}` 
      : ''
    
    const rpWhereClause = rpWhereConditions.length > 0 ? `WHERE ${rpWhereConditions.join(' AND ')}` : ''

    // ========== RESUMOS POR SÉRIE PARA CACHE LOCAL ==========
    // Criar condições SEM filtro de série para trazer dados de todas as séries
    const rpWhereConditionsSemSerie: string[] = []
    const rpParamsSemSerie: any[] = []
    let rpParamIndexSemSerie = 1

    // Aplicar restrições de acesso (sem série)
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      rpWhereConditionsSemSerie.push(`rp.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rpParamIndexSemSerie})`)
      rpParamsSemSerie.push(usuario.polo_id)
      rpParamIndexSemSerie++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      rpWhereConditionsSemSerie.push(`rp.escola_id = $${rpParamIndexSemSerie}`)
      rpParamsSemSerie.push(usuario.escola_id)
      rpParamIndexSemSerie++
    }

    // Aplicar filtros comuns (exceto série)
    if (poloId) {
      rpWhereConditionsSemSerie.push(`rp.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rpParamIndexSemSerie})`)
      rpParamsSemSerie.push(poloId)
      rpParamIndexSemSerie++
    }
    if (escolaId) {
      rpWhereConditionsSemSerie.push(`rp.escola_id = $${rpParamIndexSemSerie}`)
      rpParamsSemSerie.push(escolaId)
      rpParamIndexSemSerie++
    }
    if (anoLetivo) {
      rpWhereConditionsSemSerie.push(`rp.ano_letivo = $${rpParamIndexSemSerie}`)
      rpParamsSemSerie.push(anoLetivo)
      rpParamIndexSemSerie++
    }
    if (turmaId) {
      rpWhereConditionsSemSerie.push(`rp.turma_id = $${rpParamIndexSemSerie}`)
      rpParamsSemSerie.push(turmaId)
      rpParamIndexSemSerie++
    }
    // Adicionar filtro de presença
    if (presenca) {
      rpWhereConditionsSemSerie.push(`(rp.presenca = $${rpParamIndexSemSerie} OR rp.presenca = LOWER($${rpParamIndexSemSerie}))`)
      rpParamsSemSerie.push(presenca.toUpperCase())
      rpParamIndexSemSerie++
    } else {
      rpWhereConditionsSemSerie.push(`(rp.presenca = 'P' OR rp.presenca = 'p')`)
    }

    const rpWhereClauseSemSerie = rpWhereConditionsSemSerie.length > 0
      ? `WHERE ${rpWhereConditionsSemSerie.join(' AND ')}`
      : ''

    // Query de resumo de questões por série (para cálculo dinâmico no frontend)
    const resumoQuestoesPorSerieQuery = `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseSemSerie}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado'), rp.serie
      HAVING COUNT(*) >= 1
    `

    // Query de resumo de escolas por série E disciplina (para filtro preciso)
    const resumoEscolasPorSerieQuery = `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        rp.serie,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseSemSerie}
      GROUP BY e.id, e.nome, p.nome, rp.serie, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
    `

    // Query de resumo de turmas por série E disciplina (para filtro preciso)
    const resumoTurmasPorSerieQuery = `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseSemSerie}
      GROUP BY t.id, t.codigo, e.nome, rp.serie, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
    `

    // Query de resumo de disciplinas por série
    const resumoDisciplinasPorSerieQuery = `
      SELECT
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros
      FROM resultados_provas rp
      ${rpWhereClauseSemSerie}
      GROUP BY COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado'), rp.serie
    `

    // Taxa de acerto por disciplina
    const taxaAcertoPorDisciplinaQuery = `
      SELECT
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      ${rpWhereClauseComPresenca}
      GROUP BY COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      ORDER BY taxa_erro DESC, total_erros DESC
    `

    // Questões com mais erros
    const questoesComMaisErrosQuery = `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseComPresenca}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `

    // Escolas com mais erros
    const escolasComMaisErrosQuery = `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseComPresenca}
      GROUP BY e.id, e.nome, p.nome
      HAVING COUNT(*) >= 1
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `

    // Turmas com mais erros
    const turmasComMaisErrosQuery = `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseComPresenca}
      GROUP BY t.id, t.codigo, e.nome, rp.serie
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `

    // Questões com mais acertos
    const questoesComMaisAcertosQuery = `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseComPresenca}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `

    // Escolas com mais acertos
    const escolasComMaisAcertosQuery = `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseComPresenca}
      GROUP BY e.id, e.nome, p.nome
      HAVING COUNT(*) >= 1
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `

    // Turmas com mais acertos
    const turmasComMaisAcertosQuery = `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseComPresenca}
      GROUP BY t.id, t.codigo, e.nome, rp.serie
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `

    // Taxa de acerto geral
    const taxaAcertoGeralQuery = `
      SELECT
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto_geral,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro_geral
      FROM resultados_provas rp
      ${rpWhereClauseComPresenca}
    `

    // Executar queries em lotes para evitar MaxClientsInSessionMode
    // CORREÇÃO: Queries que usam whereClauseBase devem usar paramsBase
    // Isso garante que contagens de alunos/presentes/faltantes não sejam afetadas pelo filtro de disciplina
    // Lote 1: Métricas principais e dados básicos
    // ========== EXECUÇÃO OTIMIZADA: TODAS AS QUERIES EM PARALELO ==========
    // Consolidamos de 6 lotes sequenciais para 2 lotes paralelos (redução de ~60% no tempo)

    // Lote Principal: Todas as queries de dados
    const [
      // Métricas e estatísticas básicas
      metricasResult,
      niveisResult,
      mediasPorSerieResult,
      mediasPorPoloResult,
      faixasNotaResult,
      // Escolas, turmas e presença
      mediasPorEscolaResult,
      mediasPorTurmaResult,
      presencaResult,
      topAlunosResult,
      totalAlunosResult,
      // Alunos detalhados e filtros
      alunosDetalhadosResult,
      polosResult,
      escolasResult,
      seriesResult,
      turmasResult,
      // Anos letivos, níveis e taxa de acerto
      anosLetivosResult,
      niveisDispResult,
      taxaAcertoPorDisciplinaResult,
      taxaAcertoGeralResult,
      // Análises de acertos/erros
      questoesComMaisErrosResult,
      escolasComMaisErrosResult,
      turmasComMaisErrosResult,
      questoesComMaisAcertosResult,
      escolasComMaisAcertosResult,
      turmasComMaisAcertosResult
    ] = await Promise.all([
      // Métricas e estatísticas básicas
      pool.query(metricasQuery, paramsBase),
      pool.query(niveisQuery, paramsBase),
      pool.query(mediasPorSerieQuery, paramsBase),
      pool.query(mediasPorPoloQuery, paramsBase),
      pool.query(faixasNotaQuery, params),
      // Escolas, turmas e presença
      pool.query(mediasPorEscolaQuery, paramsBase),
      pool.query(mediasPorTurmaQuery, paramsBase),
      pool.query(presencaQuery, paramsBase),
      pool.query(topAlunosQuery, params),
      pool.query(totalAlunosQuery, params),
      // Alunos detalhados e filtros
      pool.query(alunosDetalhadosQuery, params),
      pool.query(polosQuery, filtrosParams),
      pool.query(escolasQuery, filtrosParams),
      pool.query(seriesQuery, filtrosParams),
      pool.query(turmasQuery, filtrosParams),
      // Anos letivos, níveis e taxa de acerto
      pool.query(anosLetivosQuery, filtrosParams),
      pool.query(niveisDispQuery, filtrosParams),
      pool.query(taxaAcertoPorDisciplinaQuery, rpParams),
      pool.query(taxaAcertoGeralQuery, rpParams),
      // Análises de acertos/erros
      pool.query(questoesComMaisErrosQuery, rpParams),
      pool.query(escolasComMaisErrosQuery, rpParams),
      pool.query(turmasComMaisErrosQuery, rpParams),
      pool.query(questoesComMaisAcertosQuery, rpParams),
      pool.query(escolasComMaisAcertosQuery, rpParams),
      pool.query(turmasComMaisAcertosQuery, rpParams)
    ])

    // Lote de Resumos: Para cache local (somente se não tem filtro de série)
    let resumoQuestoesPorSerieResult: { rows: any[] } = { rows: [] }
    let resumoEscolasPorSerieResult: { rows: any[] } = { rows: [] }
    let resumoTurmasPorSerieResult: { rows: any[] } = { rows: [] }
    let resumoDisciplinasPorSerieResult: { rows: any[] } = { rows: [] }

    if (!serie) {
      const [questoesResumo, escolasResumo, turmasResumo, disciplinasResumo] = await Promise.all([
        pool.query(resumoQuestoesPorSerieQuery, rpParamsSemSerie),
        pool.query(resumoEscolasPorSerieQuery, rpParamsSemSerie),
        pool.query(resumoTurmasPorSerieQuery, rpParamsSemSerie),
        pool.query(resumoDisciplinasPorSerieQuery, rpParamsSemSerie)
      ])
      resumoQuestoesPorSerieResult = questoesResumo
      resumoEscolasPorSerieResult = escolasResumo
      resumoTurmasPorSerieResult = turmasResumo
      resumoDisciplinasPorSerieResult = disciplinasResumo
    }

    const metricas = metricasResult.rows[0] || {}
    const taxaAcertoGeral = taxaAcertoGeralResult.rows[0] || {}

    // Construir objeto de resposta
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
        media_producao: parseFloat(metricas.media_producao) || 0,
        menor_media: parseFloat(metricas.menor_media) || 0,
        maior_media: parseFloat(metricas.maior_media) || 0,
        taxa_presenca: parseInt(metricas.total_alunos) > 0
          ? Math.round((parseInt(metricas.total_presentes) / parseInt(metricas.total_alunos)) * 100)
          : 0,
        // Novas métricas de acertos/erros
        total_respostas: parseInt(taxaAcertoGeral.total_respostas) || 0,
        total_acertos: parseInt(taxaAcertoGeral.total_acertos) || 0,
        total_erros: parseInt(taxaAcertoGeral.total_erros) || 0,
        taxa_acerto_geral: parseFloat(taxaAcertoGeral.taxa_acerto_geral) || 0,
        taxa_erro_geral: parseFloat(taxaAcertoGeral.taxa_erro_geral) || 0
      },
      niveis: niveisResult.rows.map(row => ({
        nivel: row.nivel,
        quantidade: parseInt(row.quantidade)
      })),
      mediasPorSerie: mediasPorSerieResult.rows.map(row => {
        // Verificar se é anos iniciais (2º, 3º, 5º) ou anos finais (6º-9º)
        const numeroSerie = row.serie?.match(/(\d+)/)?.[1]
        const isAnosIniciais = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'
        const isAnosFinais = numeroSerie === '6' || numeroSerie === '7' || numeroSerie === '8' || numeroSerie === '9'

        return {
          serie: row.serie,
          total_alunos: parseInt(row.total_alunos),
          presentes: parseInt(row.presentes),
          media_geral: parseFloat(row.media_geral) || 0,
          media_lp: parseFloat(row.media_lp) || 0,
          media_mat: parseFloat(row.media_mat) || 0,
          // CH e CN apenas para anos finais
          media_ch: isAnosFinais ? (parseFloat(row.media_ch) || 0) : null,
          media_cn: isAnosFinais ? (parseFloat(row.media_cn) || 0) : null,
          // PROD apenas para anos iniciais
          media_prod: isAnosIniciais ? (parseFloat(row.media_prod) || 0) : null
        }
      }),
      mediasPorPolo: mediasPorPoloResult.rows.map(row => ({
        polo_id: row.polo_id,
        polo: row.polo,
        total_alunos: parseInt(row.total_alunos),
        media_geral: parseFloat(row.media_geral) || 0,
        media_lp: parseFloat(row.media_lp) || 0,
        media_mat: parseFloat(row.media_mat) || 0,
        presentes: parseInt(row.presentes),
        faltantes: parseInt(row.faltantes)
      })),
      mediasPorEscola: mediasPorEscolaResult.rows.map(row => ({
        escola_id: row.escola_id,
        escola: row.escola,
        polo: row.polo,
        total_alunos: parseInt(row.total_alunos),
        media_geral: parseFloat(row.media_geral) || 0,
        media_lp: parseFloat(row.media_lp) || 0,
        media_mat: parseFloat(row.media_mat) || 0,
        media_ch: parseFloat(row.media_ch) || 0,
        media_cn: parseFloat(row.media_cn) || 0,
        presentes: parseInt(row.presentes),
        faltantes: parseInt(row.faltantes)
      })),
      mediasPorTurma: mediasPorTurmaResult.rows.map(row => ({
        turma_id: row.turma_id,
        turma: row.turma,
        escola: row.escola,
        serie: row.serie,
        total_alunos: parseInt(row.total_alunos),
        media_geral: parseFloat(row.media_geral) || 0,
        media_lp: parseFloat(row.media_lp) || 0,
        media_mat: parseFloat(row.media_mat) || 0,
        presentes: parseInt(row.presentes),
        faltantes: parseInt(row.faltantes)
      })),
      faixasNota: faixasNotaResult.rows.map(row => ({
        faixa: row.faixa,
        quantidade: parseInt(row.quantidade)
      })),
      presenca: presencaResult.rows.map(row => ({
        status: row.status,
        quantidade: parseInt(row.quantidade)
      })),
      topAlunos: topAlunosResult.rows,
      alunosDetalhados: alunosDetalhadosResult.rows,
      paginacaoAlunos: {
        paginaAtual: paginaAlunos,
        itensPorPagina: limiteAlunos,
        totalItens: parseInt(totalAlunosResult.rows[0]?.total || '0'),
        totalPaginas: Math.ceil(parseInt(totalAlunosResult.rows[0]?.total || '0') / limiteAlunos)
      },
      filtros: {
        polos: polosResult.rows,
        escolas: escolasResult.rows,
        series: seriesResult.rows.map(r => r.serie),
        turmas: turmasResult.rows,
        anosLetivos: anosLetivosResult.rows.map(r => r.ano_letivo),
        niveis: niveisDispResult.rows.map(r => r.nivel),
        faixasMedia: ['0-2', '2-4', '4-6', '6-8', '8-10']
      },
      // Novas análises de acertos/erros
      analiseAcertosErros: {
        taxaAcertoGeral: taxaAcertoGeralResult.rows[0] ? {
          total_respostas: parseInt(taxaAcertoGeralResult.rows[0].total_respostas) || 0,
          total_acertos: parseInt(taxaAcertoGeralResult.rows[0].total_acertos) || 0,
          total_erros: parseInt(taxaAcertoGeralResult.rows[0].total_erros) || 0,
          taxa_acerto_geral: parseFloat(taxaAcertoGeralResult.rows[0].taxa_acerto_geral) || 0,
          taxa_erro_geral: parseFloat(taxaAcertoGeralResult.rows[0].taxa_erro_geral) || 0
        } : null,
        taxaAcertoPorDisciplina: taxaAcertoPorDisciplinaResult.rows.map(row => ({
          disciplina: row.disciplina,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          taxa_acerto: parseFloat(row.taxa_acerto) || 0,
          taxa_erro: parseFloat(row.taxa_erro) || 0
        })),
        questoesComMaisErros: questoesComMaisErrosResult.rows.map(row => ({
          questao_codigo: row.questao_codigo,
          questao_descricao: row.questao_descricao || 'Descrição não disponível',
          disciplina: row.disciplina,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          taxa_acerto: parseFloat(row.taxa_acerto) || 0,
          taxa_erro: parseFloat(row.taxa_erro) || 0
        })),
        escolasComMaisErros: escolasComMaisErrosResult.rows.map(row => ({
          escola_id: row.escola_id,
          escola: row.escola,
          polo: row.polo,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          taxa_acerto: parseFloat(row.taxa_acerto) || 0,
          taxa_erro: parseFloat(row.taxa_erro) || 0,
          total_alunos: parseInt(row.total_alunos) || 0
        })),
        turmasComMaisErros: turmasComMaisErrosResult.rows.map(row => ({
          turma_id: row.turma_id,
          turma: row.turma,
          escola: row.escola,
          serie: row.serie,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          taxa_acerto: parseFloat(row.taxa_acerto) || 0,
          taxa_erro: parseFloat(row.taxa_erro) || 0,
          total_alunos: parseInt(row.total_alunos) || 0
        })),
        questoesComMaisAcertos: questoesComMaisAcertosResult.rows.map(row => ({
          questao_codigo: row.questao_codigo,
          questao_descricao: row.questao_descricao || 'Descrição não disponível',
          disciplina: row.disciplina,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          taxa_acerto: parseFloat(row.taxa_acerto) || 0,
          taxa_erro: parseFloat(row.taxa_erro) || 0
        })),
        escolasComMaisAcertos: escolasComMaisAcertosResult.rows.map(row => ({
          escola_id: row.escola_id,
          escola: row.escola,
          polo: row.polo,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          taxa_acerto: parseFloat(row.taxa_acerto) || 0,
          taxa_erro: parseFloat(row.taxa_erro) || 0,
          total_alunos: parseInt(row.total_alunos) || 0
        })),
        turmasComMaisAcertos: turmasComMaisAcertosResult.rows.map(row => ({
          turma_id: row.turma_id,
          turma: row.turma,
          escola: row.escola,
          serie: row.serie,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          taxa_acerto: parseFloat(row.taxa_acerto) || 0,
          taxa_erro: parseFloat(row.taxa_erro) || 0,
          total_alunos: parseInt(row.total_alunos) || 0
        }))
      },
      // Resumos por série para cálculo dinâmico no frontend (cache local)
      resumosPorSerie: {
        questoes: resumoQuestoesPorSerieResult.rows.map(row => ({
          questao_codigo: row.questao_codigo,
          questao_descricao: row.questao_descricao || 'Descrição não disponível',
          disciplina: row.disciplina,
          serie: row.serie,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0
        })),
        escolas: resumoEscolasPorSerieResult.rows.map(row => ({
          escola_id: row.escola_id,
          escola: row.escola,
          polo: row.polo,
          serie: row.serie,
          disciplina: row.disciplina,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          total_alunos: parseInt(row.total_alunos) || 0
        })),
        turmas: resumoTurmasPorSerieResult.rows.map(row => ({
          turma_id: row.turma_id,
          turma: row.turma,
          escola: row.escola,
          serie: row.serie,
          disciplina: row.disciplina,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0,
          total_alunos: parseInt(row.total_alunos) || 0
        })),
        disciplinas: resumoDisciplinasPorSerieResult.rows.map(row => ({
          disciplina: row.disciplina,
          serie: row.serie,
          total_respostas: parseInt(row.total_respostas) || 0,
          total_acertos: parseInt(row.total_acertos) || 0,
          total_erros: parseInt(row.total_erros) || 0
        }))
      }
    }

    // SALVAR NO CACHE EM MEMÓRIA (prioridade)
    if (USE_MEMORY_CACHE) {
      try {
        memoryCache.set(memoryCacheKey, dadosResposta, CACHE_TTL.DASHBOARD)
        console.log('[Dashboard] Cache em memória salvo')
      } catch (cacheError) {
        console.error('[Dashboard] Erro ao salvar cache em memória:', cacheError)
      }
    }

    // Salvar também no cache em arquivo (backup/persistência)
    try {
      const { limparCachesExpirados } = await import('@/lib/cache-dashboard')
      limparCachesExpirados()
      salvarCache(cacheOptions, dadosResposta, 'dashboard')
    } catch (cacheError) {
      // Não crítico, continuar
    }

    return NextResponse.json({
      ...dadosResposta,
      _cache: {
        origem: 'banco',
        geradoEm: new Date().toISOString()
      },
      _stats: memoryCache.getStats()
    })
  } catch (error: any) {
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor', erro: error.message },
      { status: 500 }
    )
  }
}
