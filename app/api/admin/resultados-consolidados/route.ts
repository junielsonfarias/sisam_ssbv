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
    const presencaParam = searchParams.get('presenca')
    // Filtrar valores vazios, "Todas", "todas" - considerar como sem filtro
    const presenca = presencaParam && presencaParam.trim() !== '' && presencaParam.toLowerCase() !== 'todas' ? presencaParam : null
    const turmaId = searchParams.get('turma_id')
    
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
        pagina,
        limite
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
    `
    
    // IMPORTANTE: Filtrar apenas alunos com presença 'P' ou 'F' (excluir '-' sem dados)
    // Mas apenas se não houver filtro específico de presença
    if (!presenca) {
      query += ` AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`
    }

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
    
    // Query para contar total (sem ORDER BY, LIMIT, OFFSET)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM resultados_consolidados rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      WHERE 1=1
    `
    
    // Aplicar filtro de presença padrão se não houver filtro específico
    if (!presenca) {
      countQuery += ` AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`
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
      countQuery += ` AND rc.serie = $${countParamIndex}`
      countParams.push(serie)
      countParamIndex++
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
    
    // Adicionar LIMIT e OFFSET à query principal
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limite, offset)

    // Query para estatísticas gerais (SEM paginação - calcula sobre TODOS os alunos)
    let estatisticasQuery = `
      SELECT
        COUNT(*) as total_alunos,
        COUNT(CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN 1 END) as total_presentes,
        COUNT(CASE WHEN rc.presenca = 'F' OR rc.presenca = 'f' THEN 1 END) as total_faltas,
        AVG(CASE 
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') 
          AND rc.media_aluno IS NOT NULL 
          AND CAST(rc.media_aluno AS DECIMAL) > 0 
          THEN CAST(rc.media_aluno AS DECIMAL) 
          ELSE NULL 
        END) as media_geral,
        AVG(CASE 
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') 
          AND rc.nota_lp IS NOT NULL 
          AND CAST(rc.nota_lp AS DECIMAL) > 0 
          THEN CAST(rc.nota_lp AS DECIMAL) 
          ELSE NULL 
        END) as media_lp,
        AVG(CASE 
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') 
          AND rc.nota_ch IS NOT NULL 
          AND CAST(rc.nota_ch AS DECIMAL) > 0 
          THEN CAST(rc.nota_ch AS DECIMAL) 
          ELSE NULL 
        END) as media_ch,
        AVG(CASE 
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') 
          AND rc.nota_mat IS NOT NULL 
          AND CAST(rc.nota_mat AS DECIMAL) > 0 
          THEN CAST(rc.nota_mat AS DECIMAL) 
          ELSE NULL 
        END) as media_mat,
        AVG(CASE 
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') 
          AND rc.nota_cn IS NOT NULL 
          AND CAST(rc.nota_cn AS DECIMAL) > 0 
          THEN CAST(rc.nota_cn AS DECIMAL) 
          ELSE NULL 
        END) as media_cn
      FROM resultados_consolidados rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      WHERE 1=1
    `
    
    // Aplicar filtro de presença padrão se não houver filtro específico
    if (!presenca) {
      estatisticasQuery += ` AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`
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
      estatisticasQuery += ` AND rc.serie = $${estatisticasParamIndex}`
      estatisticasParams.push(serie)
      estatisticasParamIndex++
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
      mediaCN: parseFloat(stats.media_cn || '0') || 0
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
  } catch (error) {
    console.error('Erro ao buscar resultados consolidados:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

