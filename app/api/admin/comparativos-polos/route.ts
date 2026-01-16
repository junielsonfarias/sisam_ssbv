import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre revalidar, sem cache

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const polosIds = searchParams.get('polos_ids')?.split(',').filter(Boolean) || []
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const escolaId = searchParams.get('escola_id')
    const turmaId = searchParams.get('turma_id')

    if (polosIds.length !== 2) {
      return NextResponse.json(
        { mensagem: 'Selecione exatamente 2 polos para comparar' },
        { status: 400 }
      )
    }

    // Calcular média geral corretamente por série:
    // Anos Iniciais (2, 3, 5): média de LP, MAT, PT (se houver)
    // Anos Finais (6, 7, 8, 9): média de LP, CH, MAT, CN
    const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

    let query = `
      SELECT
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        t.id as turma_id,
        t.codigo as turma_codigo,
        -- Total de alunos: contar apenas alunos com presença P ou F (exclui presença "-" não contabilizada)
        COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes,
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT t.id) as total_turmas,
        -- Média geral calculada corretamente por série (divisor FIXO - disciplinas obrigatórias)
        AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN
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
          ELSE NULL
        END) as media_geral,
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
      WHERE p.id IN ($1, $2)
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    `

    const params: (string | number | boolean | null | undefined)[] = [polosIds[0], polosIds[1]]
    let paramIndex = 3

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

    if (escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas') {
      query += ` AND e.id = $${paramIndex}`
      params.push(escolaId)
      paramIndex++
    }

    if (turmaId && turmaId !== '' && turmaId !== 'undefined') {
      query += ` AND rc.turma_id = $${paramIndex}`
      params.push(turmaId)
      paramIndex++
    }

    query += `
      GROUP BY 
        p.id, p.nome, rc.serie, t.id, t.codigo
      ORDER BY 
        p.nome, rc.serie, t.codigo
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

    // ===== QUERY PARA DADOS AGREGADOS POR POLO E SÉRIE (sem turma) =====
    let queryAgregado = `
      SELECT
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        -- Total de alunos: contar apenas alunos com presença P ou F (exclui presença "-" não contabilizada)
        COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes,
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT t.id) as total_turmas,
        -- Média geral calculada corretamente por série (divisor FIXO - disciplinas obrigatórias)
        AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            CASE
              WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN
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
          ELSE NULL
        END) as media_geral,
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
      WHERE p.id IN ($1, $2)
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    `

    const paramsAgregado: any[] = [polosIds[0], polosIds[1]]
    let paramIndexAgregado = 3

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

    if (escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas') {
      queryAgregado += ` AND e.id = $${paramIndexAgregado}`
      paramsAgregado.push(escolaId)
      paramIndexAgregado++
    }

    if (turmaId && turmaId !== '' && turmaId !== 'undefined') {
      queryAgregado += ` AND rc.turma_id = $${paramIndexAgregado}`
      paramsAgregado.push(turmaId)
      paramIndexAgregado++
    }

    queryAgregado += `
      GROUP BY 
        p.id, p.nome, rc.serie
      ORDER BY 
        rc.serie, AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) DESC NULLS LAST
    `

    const resultAgregado = await pool.query(queryAgregado, paramsAgregado)

    // Agrupar por série para facilitar visualização (dados agregados)
    const dadosPorSerieAgregado: Record<string, any[]> = {}
    
    resultAgregado.rows.forEach((row) => {
      const serieKey = row.serie || 'Sem série'
      if (!dadosPorSerieAgregado[serieKey]) {
        dadosPorSerieAgregado[serieKey] = []
      }
      dadosPorSerieAgregado[serieKey].push(row)
    })
    
    // Garantir ordenação por média geral (descendente) dentro de cada série
    Object.keys(dadosPorSerieAgregado).forEach((serieKey) => {
      dadosPorSerieAgregado[serieKey].sort((a, b) => {
        const mediaA = parseFloat(a.media_geral) || 0
        const mediaB = parseFloat(b.media_geral) || 0
        return mediaB - mediaA
      })
    })

    // ===== QUERY PARA DADOS POR ESCOLA DENTRO DE CADA POLO =====
    let queryEscolas = `
      SELECT
        p.id as polo_id,
        p.nome as polo_nome,
        e.id as escola_id,
        e.nome as escola_nome,
        rc.serie,
        -- Total de alunos: contar apenas alunos com presença P ou F (exclui presença "-" não contabilizada)
        COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes,
        COUNT(DISTINCT t.id) as total_turmas,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as media_geral,
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
      WHERE p.id IN ($1, $2)
        AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    `

    const paramsEscolas: any[] = [polosIds[0], polosIds[1]]
    let paramIndexEscolas = 3

    if (anoLetivo && anoLetivo.trim() !== '') {
      queryEscolas += ` AND rc.ano_letivo = $${paramIndexEscolas}`
      paramsEscolas.push(anoLetivo.trim())
      paramIndexEscolas++
    }

    if (serie) {
      queryEscolas += ` AND rc.serie = $${paramIndexEscolas}`
      paramsEscolas.push(serie)
      paramIndexEscolas++
    }

    if (escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas') {
      queryEscolas += ` AND e.id = $${paramIndexEscolas}`
      paramsEscolas.push(escolaId)
      paramIndexEscolas++
    }

    if (turmaId && turmaId !== '' && turmaId !== 'undefined') {
      queryEscolas += ` AND rc.turma_id = $${paramIndexEscolas}`
      paramsEscolas.push(turmaId)
      paramIndexEscolas++
    }

    queryEscolas += `
      GROUP BY 
        p.id, p.nome, e.id, e.nome, rc.serie
      ORDER BY 
        p.id, rc.serie, AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) DESC NULLS LAST
    `

    const resultEscolas = await pool.query(queryEscolas, paramsEscolas)

    // Agrupar por série e polo para facilitar visualização (dados por escola)
    const dadosPorSerieEscola: Record<string, Record<string, any[]>> = {}
    
    resultEscolas.rows.forEach((row) => {
      const serieKey = row.serie || 'Sem série'
      const poloKey = row.polo_id
      if (!dadosPorSerieEscola[serieKey]) {
        dadosPorSerieEscola[serieKey] = {}
      }
      if (!dadosPorSerieEscola[serieKey][poloKey]) {
        dadosPorSerieEscola[serieKey][poloKey] = []
      }
      dadosPorSerieEscola[serieKey][poloKey].push(row)
    })
    
    // Garantir ordenação por média geral (descendente) dentro de cada polo
    Object.keys(dadosPorSerieEscola).forEach((serieKey) => {
      Object.keys(dadosPorSerieEscola[serieKey]).forEach((poloKey) => {
        dadosPorSerieEscola[serieKey][poloKey].sort((a, b) => {
          const mediaA = parseFloat(a.media_geral) || 0
          const mediaB = parseFloat(b.media_geral) || 0
          return mediaB - mediaA
        })
      })
    })

    return NextResponse.json({
      dadosPorSerie,
      dadosPorSerieAgregado,
      dadosPorSerieEscola,
      polos: polosIds
    })
  } catch (error: any) {
    console.error('Erro ao buscar comparativo de polos:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor', erro: error.message },
      { status: 500 }
    )
  }
}
