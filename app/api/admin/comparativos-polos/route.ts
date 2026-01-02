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
    const turmaId = searchParams.get('turma_id')

    if (polosIds.length !== 2) {
      return NextResponse.json(
        { mensagem: 'Selecione exatamente 2 polos para comparar' },
        { status: 400 }
      )
    }

    let query = `
      SELECT 
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        t.id as turma_id,
        t.codigo as turma_codigo,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes,
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT t.id) as total_turmas,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as media_geral,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END) as media_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END) as media_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END) as media_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END) as media_cn,
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
    `

    const params: any[] = [polosIds[0], polosIds[1]]
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

    if (turmaId) {
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
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes,
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT t.id) as total_turmas,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as media_geral,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END) as media_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END) as media_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END) as media_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END) as media_cn,
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

    if (turmaId) {
      queryAgregado += ` AND rc.turma_id = $${paramIndexAgregado}`
      paramsAgregado.push(turmaId)
      paramIndexAgregado++
    }

    queryAgregado += `
      GROUP BY 
        p.id, p.nome, rc.serie
      ORDER BY 
        p.nome, rc.serie
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

    return NextResponse.json({
      dadosPorSerie,
      dadosPorSerieAgregado,
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

