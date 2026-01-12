import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache-dashboard'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Limpar caches expirados
    try {
      limparCachesExpirados()
    } catch (error: any) {
      // Não crítico
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const poloId = searchParams.get('polo_id')
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const presencaParam = searchParams.get('presenca')
    // Filtrar valores vazios, "Todas", "todas" - considerar como sem filtro
    const presenca = presencaParam && presencaParam.trim() !== '' && presencaParam.toLowerCase() !== 'todas' ? presencaParam : null
    const turmaId = searchParams.get('turma_id')
    const tipoEnsino = searchParams.get('tipo_ensino') // anos_iniciais ou anos_finais
    
    // Parâmetros de paginação
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1'))
    const limite = Math.min(200, Math.max(1, parseInt(searchParams.get('limite') || '50')))
    const offset = (pagina - 1) * limite

    // Verificar cache (incluir paginação nos filtros para cachear por página)
    const cacheOptions = {
      filtros: {
        escolaId,
        poloId,
        anoLetivo,
        serie,
        presenca,
        turmaId,
        tipoEnsino,
        pagina,
        limite
      },
      tipoUsuario: usuario.tipo_usuario,
      usuarioId: usuario.id,
      poloId: usuario.polo_id || null,
      escolaId: usuario.escola_id || null
    }

    const forcarAtualizacao = searchParams.get('atualizar_cache') === 'true'

    // Verificar cache com tratamento de erro para ambientes serverless
    try {
      if (!forcarAtualizacao && verificarCache(cacheOptions)) {
        const dadosCache = carregarCache<any>(cacheOptions)
        if (dadosCache) {
          console.log('Retornando resultados consolidados do cache')
          return NextResponse.json(dadosCache)
        }
      }
    } catch {
      // Ignorar erros de cache em ambientes serverless
      console.log('[Resultados Consolidados] Cache não disponível, buscando do banco')
    }

    // Otimizar query: usar JOIN ao invés de subconsultas
    // IMPORTANTE: media_aluno é calculada dinamicamente baseada na série:
    // - Anos iniciais (2,3,5): media de LP, MAT e PROD (se disponível)
    // - Anos finais (6-9): media de LP, CH, MAT, CN
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
        p.nome as polo_nome,
        t.codigo as turma_codigo,
        cs.tipo_ensino,
        cs.qtd_questoes_lp,
        cs.qtd_questoes_mat,
        cs.qtd_questoes_ch,
        cs.qtd_questoes_cn,
        -- DEBUG: tipo de calculo usado (para verificar se a logica esta correta)
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN 'anos_iniciais'
          ELSE 'anos_finais'
        END as _debug_tipo_calculo,
        rc.media_aluno as _debug_media_banco,
        -- Media calculada dinamicamente baseada na serie
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            -- Anos iniciais: media de LP, MAT e PROD (se disponivel)
            ROUND(
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
              ) /
              NULLIF(
                CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                0
              ),
              2
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
              2
            )
        END as media_aluno
      FROM resultados_consolidados rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      LEFT JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = cs.serie::text
      WHERE 1=1
    `

    // IMPORTANTE: Filtrar alunos baseado na presença
    // Valores de presença possíveis: P, p, F, f, FALTA, falta, FALTOU, AUSENTE, -
    if (!presenca) {
      // Sem filtro de presença: mostrar TODOS (presentes com média > 0 OU faltantes)
      query += ` AND (
        ((UPPER(rc.presenca) = 'P') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)
        OR (UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE'))
      )`
    } else if (presenca.toUpperCase() === 'P') {
      // Filtro por presentes: exigir média > 0
      query += ` AND UPPER(rc.presenca) = 'P'`
      query += ` AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0`
    } else if (presenca.toUpperCase() === 'F' || presenca.toLowerCase() === 'falta') {
      // Filtro por faltantes: NÃO exigir média > 0
      query += ` AND UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE')`
    }

    const params: (string | number | boolean | null | undefined)[] = []
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
      // Extrair apenas o número da série para comparação flexível
      // Ex: "3º Ano" -> "3", "5º" -> "5"
      const numeroSerie = serie.match(/\d+/)?.[0]
      if (numeroSerie) {
        // Buscar séries que contenham o mesmo número (ex: "3º", "3º Ano", "3")
        query += ` AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = $${paramIndex}`
        params.push(numeroSerie)
        paramIndex++
      } else {
        // Se não for numérico, comparar diretamente
        query += ` AND rc.serie ILIKE $${paramIndex}`
        params.push(serie)
        paramIndex++
      }
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

    if (tipoEnsino) {
      query += ` AND cs.tipo_ensino = $${paramIndex}`
      params.push(tipoEnsino)
      paramIndex++
    }

    query += ' ORDER BY rc.media_aluno DESC NULLS LAST, a.nome'
    
    // Query para contar total (sem ORDER BY, LIMIT, OFFSET)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM resultados_consolidados rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      LEFT JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = cs.serie::text
      WHERE 1=1
    `

    // Aplicar filtro de presença (mesma lógica da query principal)
    if (!presenca) {
      countQuery += ` AND (
        ((UPPER(rc.presenca) = 'P') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)
        OR (UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE'))
      )`
    } else if (presenca.toUpperCase() === 'P') {
      countQuery += ` AND UPPER(rc.presenca) = 'P'`
      countQuery += ` AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0`
    } else if (presenca.toUpperCase() === 'F' || presenca.toLowerCase() === 'falta') {
      countQuery += ` AND UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE')`
    }

    const countParams: any[] = []
    let countParamIndex = 1

    // Aplicar mesmas restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      countQuery += ` AND e.polo_id = $${countParamIndex}`
      countParams.push(usuario.polo_id)
      countParamIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      countQuery += ` AND rc.escola_id = $${countParamIndex}`
      countParams.push(usuario.escola_id)
      countParamIndex++
    }

    // Aplicar mesmos filtros
    if (escolaId) {
      countQuery += ` AND rc.escola_id = $${countParamIndex}`
      countParams.push(escolaId)
      countParamIndex++
    }

    if (poloId) {
      countQuery += ` AND e.polo_id = $${countParamIndex}`
      countParams.push(poloId)
      countParamIndex++
    }

    if (anoLetivo) {
      countQuery += ` AND rc.ano_letivo = $${countParamIndex}`
      countParams.push(anoLetivo)
      countParamIndex++
    }

    if (serie) {
      const numeroSerie = serie.match(/\d+/)?.[0]
      if (numeroSerie) {
        countQuery += ` AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = $${countParamIndex}`
        countParams.push(numeroSerie)
        countParamIndex++
      } else {
        countQuery += ` AND rc.serie ILIKE $${countParamIndex}`
        countParams.push(serie)
        countParamIndex++
      }
    }

    if (presenca) {
      countQuery += ` AND UPPER(rc.presenca) = UPPER($${countParamIndex})`
      countParams.push(presenca)
      countParamIndex++
    }

    if (turmaId) {
      countQuery += ` AND rc.turma_id = $${countParamIndex}`
      countParams.push(turmaId)
      countParamIndex++
    }

    if (tipoEnsino) {
      countQuery += ` AND cs.tipo_ensino = $${countParamIndex}`
      countParams.push(tipoEnsino)
      countParamIndex++
    }

    // Adicionar LIMIT e OFFSET à query principal
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limite, offset)

    // Query para estatísticas gerais (SEM paginação - calcula sobre TODOS os alunos)
    let estatisticasQuery = `
      SELECT
        COUNT(*) as total_alunos,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' THEN 1 END) as total_presentes,
        COUNT(CASE WHEN UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE') THEN 1 END) as total_faltas,
        AVG(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.media_aluno IS NOT NULL
          AND CAST(rc.media_aluno AS DECIMAL) > 0
          THEN CAST(rc.media_aluno AS DECIMAL)
          ELSE NULL
        END) as media_geral,
        AVG(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.nota_lp IS NOT NULL
          AND CAST(rc.nota_lp AS DECIMAL) > 0
          THEN CAST(rc.nota_lp AS DECIMAL)
          ELSE NULL
        END) as media_lp,
        AVG(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.nota_ch IS NOT NULL
          AND CAST(rc.nota_ch AS DECIMAL) > 0
          THEN CAST(rc.nota_ch AS DECIMAL)
          ELSE NULL
        END) as media_ch,
        AVG(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.nota_mat IS NOT NULL
          AND CAST(rc.nota_mat AS DECIMAL) > 0
          THEN CAST(rc.nota_mat AS DECIMAL)
          ELSE NULL
        END) as media_mat,
        AVG(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.nota_cn IS NOT NULL
          AND CAST(rc.nota_cn AS DECIMAL) > 0
          THEN CAST(rc.nota_cn AS DECIMAL)
          ELSE NULL
        END) as media_cn,
        AVG(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.nota_producao IS NOT NULL
          AND CAST(rc.nota_producao AS DECIMAL) > 0
          THEN CAST(rc.nota_producao AS DECIMAL)
          ELSE NULL
        END) as media_producao,
        -- Estatísticas por tipo de ensino
        AVG(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.media_aluno IS NOT NULL
          AND CAST(rc.media_aluno AS DECIMAL) > 0
          AND cs.tipo_ensino = 'anos_iniciais'
          THEN CAST(rc.media_aluno AS DECIMAL)
          ELSE NULL
        END) as media_anos_iniciais,
        COUNT(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.media_aluno IS NOT NULL
          AND CAST(rc.media_aluno AS DECIMAL) > 0
          AND cs.tipo_ensino = 'anos_iniciais'
          THEN 1
          ELSE NULL
        END) as total_anos_iniciais,
        AVG(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.media_aluno IS NOT NULL
          AND CAST(rc.media_aluno AS DECIMAL) > 0
          AND cs.tipo_ensino = 'anos_finais'
          THEN CAST(rc.media_aluno AS DECIMAL)
          ELSE NULL
        END) as media_anos_finais,
        COUNT(CASE
          WHEN UPPER(rc.presenca) = 'P'
          AND rc.media_aluno IS NOT NULL
          AND CAST(rc.media_aluno AS DECIMAL) > 0
          AND cs.tipo_ensino = 'anos_finais'
          THEN 1
          ELSE NULL
        END) as total_anos_finais
      FROM resultados_consolidados rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      LEFT JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = cs.serie::text
      WHERE 1=1
    `

    // Aplicar filtro de presença (mesma lógica da query principal)
    if (!presenca) {
      estatisticasQuery += ` AND (
        ((UPPER(rc.presenca) = 'P') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)
        OR (UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE'))
      )`
    } else if (presenca.toUpperCase() === 'P') {
      estatisticasQuery += ` AND UPPER(rc.presenca) = 'P'`
      estatisticasQuery += ` AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0`
    } else if (presenca.toUpperCase() === 'F' || presenca.toLowerCase() === 'falta') {
      estatisticasQuery += ` AND UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE')`
    }

    const estatisticasParams: any[] = []
    let estatisticasParamIndex = 1

    // Aplicar mesmas restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      estatisticasQuery += ` AND e.polo_id = $${estatisticasParamIndex}`
      estatisticasParams.push(usuario.polo_id)
      estatisticasParamIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      estatisticasQuery += ` AND rc.escola_id = $${estatisticasParamIndex}`
      estatisticasParams.push(usuario.escola_id)
      estatisticasParamIndex++
    }
    
    // Aplicar mesmos filtros (mas SEM paginação)
    if (escolaId) {
      estatisticasQuery += ` AND rc.escola_id = $${estatisticasParamIndex}`
      estatisticasParams.push(escolaId)
      estatisticasParamIndex++
    }
    
    if (poloId) {
      estatisticasQuery += ` AND e.polo_id = $${estatisticasParamIndex}`
      estatisticasParams.push(poloId)
      estatisticasParamIndex++
    }
    
    if (anoLetivo) {
      estatisticasQuery += ` AND rc.ano_letivo = $${estatisticasParamIndex}`
      estatisticasParams.push(anoLetivo)
      estatisticasParamIndex++
    }
    
    if (serie) {
      const numeroSerie = serie.match(/\d+/)?.[0]
      if (numeroSerie) {
        estatisticasQuery += ` AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = $${estatisticasParamIndex}`
        estatisticasParams.push(numeroSerie)
        estatisticasParamIndex++
      } else {
        estatisticasQuery += ` AND rc.serie ILIKE $${estatisticasParamIndex}`
        estatisticasParams.push(serie)
        estatisticasParamIndex++
      }
    }
    
    if (presenca) {
      estatisticasQuery += ` AND UPPER(rc.presenca) = UPPER($${estatisticasParamIndex})`
      estatisticasParams.push(presenca)
      estatisticasParamIndex++
    }
    
    if (turmaId) {
      estatisticasQuery += ` AND rc.turma_id = $${estatisticasParamIndex}`
      estatisticasParams.push(turmaId)
      estatisticasParamIndex++
    }

    if (tipoEnsino) {
      estatisticasQuery += ` AND cs.tipo_ensino = $${estatisticasParamIndex}`
      estatisticasParams.push(tipoEnsino)
      estatisticasParamIndex++
    }

    // Adicionar logs para debug
    console.log('Query principal:', query.substring(0, 200))
    console.log('Query count:', countQuery.substring(0, 200))
    console.log('Query estatísticas:', estatisticasQuery.substring(0, 200))
    console.log('Filtro presenca:', presenca)
    console.log('Params:', params.length)
    
    // Executar queries em paralelo
    const [countResult, dataResult, estatisticasResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(query, params),
      pool.query(estatisticasQuery, estatisticasParams)
    ])
    
    console.log('Count result:', countResult.rows[0])
    console.log('Data result rows:', dataResult.rows.length)
    console.log('Estatísticas result:', estatisticasResult.rows[0])

    const total = parseInt(countResult.rows[0]?.total || '0')
    const totalPaginas = Math.ceil(total / limite)
    
    const stats = estatisticasResult.rows[0] || {}
    const estatisticas = {
      totalAlunos: parseInt(stats.total_alunos || '0'),
      totalPresentes: parseInt(stats.total_presentes || '0'),
      totalFaltas: parseInt(stats.total_faltas || '0'),
      mediaGeral: parseFloat(stats.media_geral || '0') || 0,
      mediaLP: parseFloat(stats.media_lp || '0') || 0,
      mediaCH: parseFloat(stats.media_ch || '0') || 0,
      mediaMAT: parseFloat(stats.media_mat || '0') || 0,
      mediaCN: parseFloat(stats.media_cn || '0') || 0,
      mediaProducao: parseFloat(stats.media_producao || '0') || 0,
      mediaAnosIniciais: parseFloat(stats.media_anos_iniciais || '0') || 0,
      totalAnosIniciais: parseInt(stats.total_anos_iniciais || '0'),
      mediaAnosFinais: parseFloat(stats.media_anos_finais || '0') || 0,
      totalAnosFinais: parseInt(stats.total_anos_finais || '0')
    }

    const resultado = {
      resultados: dataResult.rows,
      estatisticas,
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas,
        temProxima: pagina < totalPaginas,
        temAnterior: pagina > 1
      }
    }

    // Salvar no cache (expira em 1 hora) - paginação já está incluída nos filtros
    try {
      salvarCache(cacheOptions, resultado, 'resultados-consolidados')
    } catch (cacheError) {
      console.error('Erro ao salvar cache (nao critico):', cacheError)
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Erro ao buscar resultados consolidados:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

