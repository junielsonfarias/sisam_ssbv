import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tipoGrafico = searchParams.get('tipo') || 'geral'
    const anoLetivo = searchParams.get('ano_letivo')
    const poloId = searchParams.get('polo_id')
    const escolaId = searchParams.get('escola_id')
    const serie = searchParams.get('serie')

    let whereConditions = ['rc.ativo = true']
    let params: any[] = []
    let paramIndex = 1

    // Aplicar restrições baseadas no tipo de usuário
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      // Escola: apenas dados da própria escola
      whereConditions.push(`rc.escola_id = $${paramIndex}`)
      params.push(usuario.escola_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      // Polo: apenas dados das escolas do seu polo
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(usuario.polo_id)
      paramIndex++
    }

    if (anoLetivo) {
      whereConditions.push(`rc.ano_letivo = $${paramIndex}`)
      params.push(anoLetivo)
      paramIndex++
    }

    // Admin e Técnico podem usar filtros adicionais
    if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && poloId) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(poloId)
      paramIndex++
    }

    if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') && escolaId) {
      whereConditions.push(`rc.escola_id = $${paramIndex}`)
      params.push(escolaId)
      paramIndex++
    }

    if (serie) {
      whereConditions.push(`rc.serie = $${paramIndex}`)
      params.push(serie)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    let resultado: any = {}

    // Gráfico Geral - Médias por Disciplina
    if (tipoGrafico === 'geral' || tipoGrafico === 'disciplinas') {
      const queryDisciplinas = `
        SELECT 
          ROUND(AVG(CAST(rc.nota_lp AS DECIMAL)), 2) as media_lp,
          ROUND(AVG(CAST(rc.nota_ch AS DECIMAL)), 2) as media_ch,
          ROUND(AVG(CAST(rc.nota_mat AS DECIMAL)), 2) as media_mat,
          ROUND(AVG(CAST(rc.nota_cn AS DECIMAL)), 2) as media_cn,
          COUNT(*) as total_alunos
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
      `
      const resDisciplinas = await pool.query(queryDisciplinas, params)
      resultado.disciplinas = {
        labels: ['Língua Portuguesa', 'Ciências Humanas', 'Matemática', 'Ciências da Natureza'],
        dados: [
          parseFloat(resDisciplinas.rows[0].media_lp) || 0,
          parseFloat(resDisciplinas.rows[0].media_ch) || 0,
          parseFloat(resDisciplinas.rows[0].media_mat) || 0,
          parseFloat(resDisciplinas.rows[0].media_cn) || 0,
        ],
        totalAlunos: parseInt(resDisciplinas.rows[0].total_alunos) || 0
      }
    }

    // Gráfico por Escola
    if (tipoGrafico === 'geral' || tipoGrafico === 'escolas') {
      const queryEscolas = `
        SELECT 
          e.nome as escola,
          ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media,
          COUNT(*) as total_alunos
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY e.id, e.nome
        ORDER BY media DESC
        LIMIT 10
      `
      const resEscolas = await pool.query(queryEscolas, params)
      resultado.escolas = {
        labels: resEscolas.rows.map(r => r.escola),
        dados: resEscolas.rows.map(r => parseFloat(r.media) || 0),
        totais: resEscolas.rows.map(r => parseInt(r.total_alunos) || 0)
      }
    }

    // Gráfico por Série
    if (tipoGrafico === 'geral' || tipoGrafico === 'series') {
      const querySeries = `
        SELECT 
          rc.serie,
          ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media,
          COUNT(*) as total_alunos
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY rc.serie
        ORDER BY rc.serie
      `
      const resSeries = await pool.query(querySeries, params)
      resultado.series = {
        labels: resSeries.rows.map(r => r.serie),
        dados: resSeries.rows.map(r => parseFloat(r.media) || 0),
        totais: resSeries.rows.map(r => parseInt(r.total_alunos) || 0)
      }
    }

    // Gráfico por Polo
    if (tipoGrafico === 'geral' || tipoGrafico === 'polos') {
      const queryPolos = `
        SELECT 
          p.nome as polo,
          ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media,
          COUNT(*) as total_alunos
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        INNER JOIN polos p ON e.polo_id = p.id
        ${whereClause}
        GROUP BY p.id, p.nome
        ORDER BY media DESC
      `
      const resPolos = await pool.query(queryPolos, params)
      resultado.polos = {
        labels: resPolos.rows.map(r => r.polo),
        dados: resPolos.rows.map(r => parseFloat(r.media) || 0),
        totais: resPolos.rows.map(r => parseInt(r.total_alunos) || 0)
      }
    }

    // Distribuição de Notas
    if (tipoGrafico === 'geral' || tipoGrafico === 'distribuicao') {
      const queryDistribuicao = `
        SELECT 
          CASE 
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 9 THEN '9.0 - 10.0'
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 THEN '8.0 - 8.9'
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 7 THEN '7.0 - 7.9'
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 THEN '6.0 - 6.9'
            WHEN CAST(rc.media_aluno AS DECIMAL) >= 5 THEN '5.0 - 5.9'
            ELSE '0.0 - 4.9'
          END as faixa,
          COUNT(*) as quantidade
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY faixa
        ORDER BY faixa DESC
      `
      const resDistribuicao = await pool.query(queryDistribuicao, params)
      resultado.distribuicao = {
        labels: resDistribuicao.rows.map(r => r.faixa),
        dados: resDistribuicao.rows.map(r => parseInt(r.quantidade) || 0)
      }
    }

    // Taxa de Presença
    if (tipoGrafico === 'geral' || tipoGrafico === 'presenca') {
      const queryPresenca = `
        SELECT 
          CASE WHEN rc.presenca IN ('P', 'p') THEN 'Presentes' ELSE 'Faltas' END as status,
          COUNT(*) as quantidade
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY status
      `
      const resPresenca = await pool.query(queryPresenca, params)
      resultado.presenca = {
        labels: resPresenca.rows.map(r => r.status),
        dados: resPresenca.rows.map(r => parseInt(r.quantidade) || 0)
      }
    }

    // Comparativo de Escolas Detalhado (Top 5 e Bottom 5)
    if (tipoGrafico === 'comparativo_escolas') {
      const queryComparativo = `
        WITH ranking_escolas AS (
          SELECT 
            e.nome as escola,
            ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media_geral,
            ROUND(AVG(CAST(rc.nota_lp AS DECIMAL)), 2) as media_lp,
            ROUND(AVG(CAST(rc.nota_ch AS DECIMAL)), 2) as media_ch,
            ROUND(AVG(CAST(rc.nota_mat AS DECIMAL)), 2) as media_mat,
            ROUND(AVG(CAST(rc.nota_cn AS DECIMAL)), 2) as media_cn,
            COUNT(*) as total_alunos,
            ROW_NUMBER() OVER (ORDER BY AVG(CAST(rc.media_aluno AS DECIMAL)) DESC) as rank_desc,
            ROW_NUMBER() OVER (ORDER BY AVG(CAST(rc.media_aluno AS DECIMAL)) ASC) as rank_asc
          FROM resultados_consolidados rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
          GROUP BY e.id, e.nome
        )
        SELECT * FROM ranking_escolas
        WHERE rank_desc <= 5 OR rank_asc <= 5
        ORDER BY media_geral DESC
      `
      const resComparativo = await pool.query(queryComparativo, params)
      resultado.comparativo_escolas = {
        escolas: resComparativo.rows.map(r => r.escola),
        mediaGeral: resComparativo.rows.map(r => parseFloat(r.media_geral) || 0),
        mediaLP: resComparativo.rows.map(r => parseFloat(r.media_lp) || 0),
        mediaCH: resComparativo.rows.map(r => parseFloat(r.media_ch) || 0),
        mediaMAT: resComparativo.rows.map(r => parseFloat(r.media_mat) || 0),
        mediaCN: resComparativo.rows.map(r => parseFloat(r.media_cn) || 0),
        totais: resComparativo.rows.map(r => parseInt(r.total_alunos) || 0)
      }
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro ao buscar dados para gráficos:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao buscar dados para gráficos' },
      { status: 500 }
    )
  }
}

