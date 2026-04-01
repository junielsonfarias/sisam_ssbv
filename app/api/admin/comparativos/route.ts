import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache'
import { createLogger } from '@/lib/logger'
import { getMediaGeralSQL } from '@/lib/sql/media-geral'

const log = createLogger('AdminComparativos')

export const dynamic = 'force-dynamic';
export const GET = withAuth(['administrador', 'tecnico', 'polo'], async (request, usuario) => {
  try {
    // Limpar caches expirados
    try {
      limparCachesExpirados()
    } catch (error: unknown) {
      // Não crítico
    }

    const { searchParams } = new URL(request.url)
    const escolasIds = searchParams.get('escolas_ids')?.split(',').filter(Boolean) || []
    const poloId = searchParams.get('polo_id')
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const turmaId = searchParams.get('turma_id')
    const tipoEnsino = searchParams.get('tipo_ensino')
    const avaliacaoId = searchParams.get('avaliacao_id')

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
          log.info('Retornando comparativos do cache')
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
      log.info('Cache não disponível, buscando do banco')
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
            WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
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

    if (avaliacaoId) {
      query += ` AND rc.avaliacao_id = $${paramIndex}`
      params.push(avaliacaoId)
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
      query += ` AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')`
    } else if (tipoEnsino === 'anos_finais') {
      query += ` AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')`
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
            WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
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

    if (avaliacaoId) {
      queryAgregado += ` AND rc.avaliacao_id = $${paramIndexAgregado}`
      paramsAgregado.push(avaliacaoId)
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
      queryAgregado += ` AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')`
    } else if (tipoEnsino === 'anos_finais') {
      queryAgregado += ` AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')`
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

    // ===== QUERY ÚNICA PARA BUSCAR MELHORES ALUNOS =====
    // Busca todos os alunos presentes de uma vez (elimina N+1)
    const melhoresAlunos: Record<string, Record<string, any>> = {}

    if (resultAgregado.rows.length > 0) {
      let queryMelhores = `
        SELECT
          rc.escola_id,
          rc.serie,
          rc.aluno_id,
          a.nome as aluno_nome,
          t.id as turma_id,
          t.codigo as turma_codigo,
          ROUND((${getMediaGeralSQL('rc')})::numeric, 1) as media_geral,
          CAST(rc.nota_lp AS DECIMAL) as nota_lp,
          CAST(rc.nota_ch AS DECIMAL) as nota_ch,
          CAST(rc.nota_mat AS DECIMAL) as nota_mat,
          CAST(rc.nota_cn AS DECIMAL) as nota_cn,
          CAST(rc.nota_producao AS DECIMAL) as nota_producao
        FROM resultados_consolidados_unificada rc
        INNER JOIN alunos a ON rc.aluno_id = a.id
        LEFT JOIN turmas t ON rc.turma_id = t.id
        WHERE (rc.presenca = 'P' OR rc.presenca = 'p')
      `
      const paramsMelhores: any[] = []
      let paramIndexMelhores = 1

      // Filtrar pelas escolas do resultado agregado
      const escolasDoResultado = [...new Set(resultAgregado.rows.map((r: any) => r.escola_id))]
      const escolasPlaceholders = escolasDoResultado.map(() => `$${paramIndexMelhores++}`).join(', ')
      queryMelhores += ` AND rc.escola_id IN (${escolasPlaceholders})`
      paramsMelhores.push(...escolasDoResultado)

      // Restrições de acesso
      if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
        queryMelhores += ` AND rc.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndexMelhores})`
        paramsMelhores.push(usuario.polo_id)
        paramIndexMelhores++
      } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
        queryMelhores += ` AND rc.escola_id = $${paramIndexMelhores}`
        paramsMelhores.push(usuario.escola_id)
        paramIndexMelhores++
      }

      if (anoLetivo && anoLetivo.trim() !== '') {
        queryMelhores += ` AND rc.ano_letivo = $${paramIndexMelhores}`
        paramsMelhores.push(anoLetivo.trim())
        paramIndexMelhores++
      }

      if (avaliacaoId) {
        queryMelhores += ` AND rc.avaliacao_id = $${paramIndexMelhores}`
        paramsMelhores.push(avaliacaoId)
        paramIndexMelhores++
      }

      const resultMelhores = await pool.query(queryMelhores, paramsMelhores)

      // Agrupar por escola_id + serie e calcular melhores em memória
      const alunosPorChave: Record<string, any[]> = {}
      for (const aluno of resultMelhores.rows) {
        const key = `${aluno.escola_id}_${aluno.serie || 'Sem série'}`
        if (!alunosPorChave[key]) alunosPorChave[key] = []
        alunosPorChave[key].push(aluno)
      }

      const melhorPor = (alunos: any[], campo: string) =>
        alunos.reduce((prev, curr) => (parseFloat(curr[campo]) || 0) > (parseFloat(prev[campo]) || 0) ? curr : prev)

      for (const [key, alunos] of Object.entries(alunosPorChave)) {
        const alunosPorTurma: Record<string, any[]> = {}
        alunos.forEach((a: any) => {
          const tk = a.turma_id || 'sem-turma'
          if (!alunosPorTurma[tk]) alunosPorTurma[tk] = []
          alunosPorTurma[tk].push(a)
        })
        const melhoresPorTurma = Object.values(alunosPorTurma).map(ta => melhorPor(ta, 'media_geral'))

        melhoresAlunos[key] = {
          melhorGeral: melhorPor(alunos, 'media_geral'),
          melhorLP: melhorPor(alunos, 'nota_lp'),
          melhorCH: melhorPor(alunos, 'nota_ch'),
          melhorMAT: melhorPor(alunos, 'nota_mat'),
          melhorCN: melhorPor(alunos, 'nota_cn'),
          melhorPROD: melhorPor(alunos, 'nota_producao'),
          melhoresPorTurma,
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
      log.error('Erro ao salvar cache (não crítico)', cacheError)
    }

    return NextResponse.json({
      ...dadosResposta,
      _cache: {
        origem: 'banco',
        geradoEm: new Date().toISOString()
      }
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar comparativos', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
