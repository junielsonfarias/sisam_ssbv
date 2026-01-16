import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache-dashboard'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo'])) {
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
    const escolasIds = searchParams.get('escolas_ids')?.split(',').filter(Boolean) || []
    const poloId = searchParams.get('polo_id')
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const turmaId = searchParams.get('turma_id')
    const tipoEnsino = searchParams.get('tipo_ensino')

    // Verificar cache
    const cacheOptions = {
      filtros: {
        escolasIds: escolasIds.join(','),
        poloId,
        anoLetivo,
        serie,
        turmaId,
        tipoEnsino
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
          console.log('Retornando comparativos do cache')
          return NextResponse.json({
            ...dadosCache,
            _cache: {
              origem: 'cache',
              carregadoEm: new Date().toISOString()
            }
          })
        }
      }
    } catch {
      // Ignorar erros de cache em ambientes serverless
      console.log('[Comparativos] Cache não disponível, buscando do banco')
    }

    if (escolasIds.length === 0 && !poloId) {
      return NextResponse.json(
        { mensagem: 'Selecione pelo menos uma escola ou um polo' },
        { status: 400 }
      )
    }

    let query = `
      SELECT
        e.id as escola_id,
        e.nome as escola_nome,
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        t.id as turma_id,
        t.codigo as turma_codigo,
        -- Total de alunos: contar apenas alunos com presença P ou F (exclui presença "-" não contabilizada)
        COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes,
        -- Media calculada dinamicamente baseada na serie (divisor FIXO - disciplinas obrigatórias)
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              -- Anos Iniciais: média de LP, MAT, PROD (OBRIGATÓRIAS - divisor fixo 3)
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
              ) / 3.0
            ELSE
              -- Anos Finais: média de LP, CH, MAT, CN (OBRIGATÓRIAS - divisor fixo 4)
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
              ) / 4.0
          END
        ELSE NULL END) as media_geral,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END) as media_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END) as media_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END) as media_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END) as media_cn,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END) as media_producao,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_lp IS NOT NULL) THEN CAST(rc.total_acertos_lp AS INTEGER) ELSE NULL END) as media_acertos_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_ch IS NOT NULL) THEN CAST(rc.total_acertos_ch AS INTEGER) ELSE NULL END) as media_acertos_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_mat IS NOT NULL) THEN CAST(rc.total_acertos_mat AS INTEGER) ELSE NULL END) as media_acertos_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_cn IS NOT NULL) THEN CAST(rc.total_acertos_cn AS INTEGER) ELSE NULL END) as media_acertos_cn
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      INNER JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      WHERE (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    `

    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND e.id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (escolasIds.length > 0) {
      // Usar IN para múltiplas escolas
      const placeholders = escolasIds.map((_, i) => `$${paramIndex + i}`).join(',')
      query += ` AND e.id IN (${placeholders})`
      params.push(...escolasIds)
      paramIndex += escolasIds.length
    }

    if (poloId) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(poloId)
      paramIndex++
    }

    // Ano letivo é opcional - se não informado, busca todos
    if (anoLetivo && anoLetivo.trim() !== '') {
      query += ` AND rc.ano_letivo = $${paramIndex}`
      params.push(anoLetivo.trim())
      paramIndex++
    }

    if (serie) {
      query += ` AND rc.serie = $${paramIndex}`
      params.push(serie)
      paramIndex++
    }

    if (turmaId) {
      query += ` AND rc.turma_id = $${paramIndex}`
      params.push(turmaId)
      paramIndex++
    }

    // Filtro de tipo de ensino (anos_iniciais ou anos_finais)
    if (tipoEnsino === 'anos_iniciais') {
      query += ` AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`
    } else if (tipoEnsino === 'anos_finais') {
      query += ` AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`
    }

    query += `
      GROUP BY
        e.id, e.nome, p.id, p.nome, rc.serie, t.id, t.codigo
      ORDER BY
        p.nome, e.nome, rc.serie, t.codigo
    `

    const result = await pool.query(query, params)

    // Agrupar por série para facilitar visualização (dados por turma)
    const dadosPorSerie: Record<string, any[]> = {}
    
    result.rows.forEach((row) => {
      const serieKey = row.serie || 'Sem série'
      if (!dadosPorSerie[serieKey]) {
        dadosPorSerie[serieKey] = []
      }
      dadosPorSerie[serieKey].push(row)
    })

    // ===== QUERY PARA DADOS AGREGADOS POR ESCOLA E SÉRIE (sem turma) =====
    // Reutilizar os mesmos filtros, mas agrupar apenas por escola e série
    let queryAgregado = `
      SELECT
        e.id as escola_id,
        e.nome as escola_nome,
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        NULL as turma_id,
        NULL as turma_codigo,
        -- Total de alunos: contar apenas alunos com presença P ou F (exclui presença "-" não contabilizada)
        COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes,
        -- Media calculada dinamicamente baseada na serie (divisor FIXO - disciplinas obrigatórias)
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              -- Anos Iniciais: média de LP, MAT, PROD (OBRIGATÓRIAS - divisor fixo 3)
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
              ) / 3.0
            ELSE
              -- Anos Finais: média de LP, CH, MAT, CN (OBRIGATÓRIAS - divisor fixo 4)
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
              ) / 4.0
          END
        ELSE NULL END) as media_geral,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END) as media_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END) as media_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END) as media_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END) as media_cn,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END) as media_producao,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_lp IS NOT NULL) THEN CAST(rc.total_acertos_lp AS INTEGER) ELSE NULL END) as media_acertos_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_ch IS NOT NULL) THEN CAST(rc.total_acertos_ch AS INTEGER) ELSE NULL END) as media_acertos_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_mat IS NOT NULL) THEN CAST(rc.total_acertos_mat AS INTEGER) ELSE NULL END) as media_acertos_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_cn IS NOT NULL) THEN CAST(rc.total_acertos_cn AS INTEGER) ELSE NULL END) as media_acertos_cn,
        COUNT(DISTINCT t.id) as total_turmas
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      INNER JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      WHERE (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    `

    const paramsAgregado: any[] = []
    let paramIndexAgregado = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      queryAgregado += ` AND e.polo_id = $${paramIndexAgregado}`
      paramsAgregado.push(usuario.polo_id)
      paramIndexAgregado++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      queryAgregado += ` AND e.id = $${paramIndexAgregado}`
      paramsAgregado.push(usuario.escola_id)
      paramIndexAgregado++
    }

    // Aplicar filtros (mesmos da query original, exceto turma_id)
    if (escolasIds.length > 0) {
      const placeholders = escolasIds.map((_, i) => `$${paramIndexAgregado + i}`).join(',')
      queryAgregado += ` AND e.id IN (${placeholders})`
      paramsAgregado.push(...escolasIds)
      paramIndexAgregado += escolasIds.length
    }

    if (poloId) {
      queryAgregado += ` AND e.polo_id = $${paramIndexAgregado}`
      paramsAgregado.push(poloId)
      paramIndexAgregado++
    }

    if (anoLetivo && anoLetivo.trim() !== '') {
      queryAgregado += ` AND rc.ano_letivo = $${paramIndexAgregado}`
      paramsAgregado.push(anoLetivo.trim())
      paramIndexAgregado++
    }

    if (serie) {
      queryAgregado += ` AND rc.serie = $${paramIndexAgregado}`
      paramsAgregado.push(serie)
      paramIndexAgregado++
    }

    // NÃO incluir filtro de turma_id na query agregada (queremos todas as turmas agregadas)

    // Filtro de tipo de ensino (anos_iniciais ou anos_finais)
    if (tipoEnsino === 'anos_iniciais') {
      queryAgregado += ` AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`
    } else if (tipoEnsino === 'anos_finais') {
      queryAgregado += ` AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`
    }

    queryAgregado += `
      GROUP BY
        e.id, e.nome, p.id, p.nome, rc.serie
      ORDER BY
        p.nome, e.nome, rc.serie
    `

    const resultAgregado = await pool.query(queryAgregado, paramsAgregado)

    // Agrupar por série - dados agregados
    const dadosPorSerieAgregado: Record<string, any[]> = {}
    resultAgregado.rows.forEach((row) => {
      const serieKey = row.serie || 'Sem série'
      if (!dadosPorSerieAgregado[serieKey]) {
        dadosPorSerieAgregado[serieKey] = []
      }
      dadosPorSerieAgregado[serieKey].push(row)
    })

    // ===== QUERY PARA BUSCAR MELHORES ALUNOS =====
    // Para cada escola/série, buscar os melhores alunos
    const melhoresAlunos: Record<string, Record<string, any>> = {}

    for (const row of resultAgregado.rows) {
      const escolaId = row.escola_id
      const serieKey = row.serie || 'Sem série'
      const key = `${escolaId}_${serieKey}`

      if (!melhoresAlunos[key]) {
        // Construir query para buscar melhores alunos desta escola/série
        let queryMelhores = `
          SELECT
            rc.aluno_id,
            a.nome as aluno_nome,
            t.id as turma_id,
            t.codigo as turma_codigo,
            -- Media calculada dinamicamente baseada na serie
            CASE
              WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
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
            END as media_geral,
            CAST(rc.nota_lp AS DECIMAL) as nota_lp,
            CAST(rc.nota_ch AS DECIMAL) as nota_ch,
            CAST(rc.nota_mat AS DECIMAL) as nota_mat,
            CAST(rc.nota_cn AS DECIMAL) as nota_cn,
            CAST(rc.nota_producao AS DECIMAL) as nota_producao
          FROM resultados_consolidados_unificada rc
          INNER JOIN alunos a ON rc.aluno_id = a.id
          LEFT JOIN turmas t ON rc.turma_id = t.id
          WHERE rc.escola_id = $1 AND rc.serie = $2
        `

        const paramsMelhores: any[] = [escolaId, serieKey]
        let paramIndexMelhores = 3

        // Aplicar restrições de acesso
        if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
          queryMelhores += ` AND rc.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndexMelhores})`
          paramsMelhores.push(usuario.polo_id)
          paramIndexMelhores++
        } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
          queryMelhores += ` AND rc.escola_id = $${paramIndexMelhores}`
          paramsMelhores.push(usuario.escola_id)
          paramIndexMelhores++
        }

        // Aplicar filtros de ano letivo
        if (anoLetivo && anoLetivo.trim() !== '') {
          queryMelhores += ` AND rc.ano_letivo = $${paramIndexMelhores}`
          paramsMelhores.push(anoLetivo.trim())
          paramIndexMelhores++
        }

        // Apenas alunos presentes
        queryMelhores += ` AND (rc.presenca = 'P' OR rc.presenca = 'p')`

        const resultMelhores = await pool.query(queryMelhores, paramsMelhores)

        if (resultMelhores.rows.length > 0) {
          const alunos = resultMelhores.rows

          // Melhor aluno geral (maior média geral)
          const melhorGeral = alunos.reduce((prev, curr) => {
            const prevMedia = parseFloat(prev.media_geral) || 0
            const currMedia = parseFloat(curr.media_geral) || 0
            return currMedia > prevMedia ? curr : prev
          })

          // Melhor aluno por componente
          const melhorLP = alunos.reduce((prev, curr) => {
            const prevNota = parseFloat(prev.nota_lp) || 0
            const currNota = parseFloat(curr.nota_lp) || 0
            return currNota > prevNota ? curr : prev
          })

          const melhorCH = alunos.reduce((prev, curr) => {
            const prevNota = parseFloat(prev.nota_ch) || 0
            const currNota = parseFloat(curr.nota_ch) || 0
            return currNota > prevNota ? curr : prev
          })

          const melhorMAT = alunos.reduce((prev, curr) => {
            const prevNota = parseFloat(prev.nota_mat) || 0
            const currNota = parseFloat(curr.nota_mat) || 0
            return currNota > prevNota ? curr : prev
          })

          const melhorCN = alunos.reduce((prev, curr) => {
            const prevNota = parseFloat(prev.nota_cn) || 0
            const currNota = parseFloat(curr.nota_cn) || 0
            return currNota > prevNota ? curr : prev
          })

          // Melhor aluno em Produção de Texto (anos iniciais)
          const melhorPROD = alunos.reduce((prev, curr) => {
            const prevNota = parseFloat(prev.nota_producao) || 0
            const currNota = parseFloat(curr.nota_producao) || 0
            return currNota > prevNota ? curr : prev
          })

          // Melhor aluno por turma
          const alunosPorTurma: Record<string, any[]> = {}
          alunos.forEach((aluno: any) => {
            const turmaKey = aluno.turma_id || 'sem-turma'
            if (!alunosPorTurma[turmaKey]) {
              alunosPorTurma[turmaKey] = []
            }
            alunosPorTurma[turmaKey].push(aluno)
          })

          const melhoresPorTurma: any[] = []
          Object.entries(alunosPorTurma).forEach(([turmaId, alunosTurma]) => {
            const melhor = alunosTurma.reduce((prev, curr) => {
              const prevMedia = parseFloat(prev.media_geral) || 0
              const currMedia = parseFloat(curr.media_geral) || 0
              return currMedia > prevMedia ? curr : prev
            })
            melhoresPorTurma.push(melhor)
          })

          melhoresAlunos[key] = {
            melhorGeral,
            melhorLP,
            melhorCH,
            melhorMAT,
            melhorCN,
            melhorPROD,
            melhoresPorTurma,
          }
        }
      }
    }

    const dadosResposta = {
      dados: result.rows,
      dadosPorSerie, // Por turma (atual)
      dadosPorSerieAgregado, // Agregado por série (novo)
      melhoresAlunos, // Melhores alunos por escola/série
      totalEscolas: new Set(result.rows.map((r: any) => r.escola_id)).size,
      totalSeries: Object.keys(dadosPorSerie).length,
    }

    // Salvar no cache (expira em 1 hora)
    try {
      salvarCache(cacheOptions, dadosResposta, 'comparativos')
    } catch (cacheError) {
      console.error('Erro ao salvar cache (nao critico):', cacheError)
    }

    return NextResponse.json({
      ...dadosResposta,
      _cache: {
        origem: 'banco',
        geradoEm: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar comparativos:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

