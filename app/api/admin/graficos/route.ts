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
    const disciplina = searchParams.get('disciplina')
    const turmaId = searchParams.get('turma_id')

    let whereConditions: string[] = []
    let params: any[] = []
    let paramIndex = 1
    
    // Adicionar condição de ativo apenas se a coluna existir (pode não existir em todas as tabelas)
    // whereConditions.push('rc.ativo = true') // Removido pois resultados_consolidados pode não ter coluna ativo

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

    // Aplicar filtro de escola apenas se escolaId for válido (não vazio, não "undefined", não "Todas")
    if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') && 
        escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas') {
      whereConditions.push(`rc.escola_id = $${paramIndex}`)
      params.push(escolaId)
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

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    let resultado: any = {}

    // Gráfico Geral - Médias por Disciplina
    if (tipoGrafico === 'geral' || tipoGrafico === 'disciplinas') {
      // Se disciplina específica foi selecionada, mostrar apenas essa
      if (disciplina === 'LP') {
        const queryDisciplina = `
          SELECT 
            ROUND(AVG(CAST(rc.nota_lp AS DECIMAL)), 2) as media,
            COUNT(*) as total_alunos
          FROM resultados_consolidados rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
        `
        const resDisciplina = await pool.query(queryDisciplina, params)
        if (resDisciplina.rows.length > 0 && resDisciplina.rows[0].total_alunos > 0) {
          resultado.disciplinas = {
            labels: ['Língua Portuguesa'],
            dados: [parseFloat(resDisciplina.rows[0].media) || 0],
            totalAlunos: parseInt(resDisciplina.rows[0].total_alunos) || 0
          }
        }
      } else if (disciplina === 'CH') {
        const queryDisciplina = `
          SELECT 
            ROUND(AVG(CAST(rc.nota_ch AS DECIMAL)), 2) as media,
            COUNT(*) as total_alunos
          FROM resultados_consolidados rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
        `
        const resDisciplina = await pool.query(queryDisciplina, params)
        if (resDisciplina.rows.length > 0 && resDisciplina.rows[0].total_alunos > 0) {
          resultado.disciplinas = {
            labels: ['Ciências Humanas'],
            dados: [parseFloat(resDisciplina.rows[0].media) || 0],
            totalAlunos: parseInt(resDisciplina.rows[0].total_alunos) || 0
          }
        }
      } else if (disciplina === 'MAT') {
        const queryDisciplina = `
          SELECT 
            ROUND(AVG(CAST(rc.nota_mat AS DECIMAL)), 2) as media,
            COUNT(*) as total_alunos
          FROM resultados_consolidados rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
        `
        const resDisciplina = await pool.query(queryDisciplina, params)
        if (resDisciplina.rows.length > 0 && resDisciplina.rows[0].total_alunos > 0) {
          resultado.disciplinas = {
            labels: ['Matemática'],
            dados: [parseFloat(resDisciplina.rows[0].media) || 0],
            totalAlunos: parseInt(resDisciplina.rows[0].total_alunos) || 0
          }
        }
      } else if (disciplina === 'CN') {
        const queryDisciplina = `
          SELECT 
            ROUND(AVG(CAST(rc.nota_cn AS DECIMAL)), 2) as media,
            COUNT(*) as total_alunos
          FROM resultados_consolidados rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
        `
        const resDisciplina = await pool.query(queryDisciplina, params)
        if (resDisciplina.rows.length > 0 && resDisciplina.rows[0].total_alunos > 0) {
          resultado.disciplinas = {
            labels: ['Ciências da Natureza'],
            dados: [parseFloat(resDisciplina.rows[0].media) || 0],
            totalAlunos: parseInt(resDisciplina.rows[0].total_alunos) || 0
          }
        }
      } else {
        // Sem disciplina específica, mostrar todas com indicadores estatísticos
        const queryDisciplinas = `
          SELECT 
            ROUND(AVG(CAST(rc.nota_lp AS DECIMAL)), 2) as media_lp,
            ROUND(AVG(CAST(rc.nota_ch AS DECIMAL)), 2) as media_ch,
            ROUND(AVG(CAST(rc.nota_mat AS DECIMAL)), 2) as media_mat,
            ROUND(AVG(CAST(rc.nota_cn AS DECIMAL)), 2) as media_cn,
            ROUND(STDDEV(CAST(rc.nota_lp AS DECIMAL)), 2) as desvio_lp,
            ROUND(STDDEV(CAST(rc.nota_ch AS DECIMAL)), 2) as desvio_ch,
            ROUND(STDDEV(CAST(rc.nota_mat AS DECIMAL)), 2) as desvio_mat,
            ROUND(STDDEV(CAST(rc.nota_cn AS DECIMAL)), 2) as desvio_cn,
            COUNT(*) as total_alunos,
            SUM(CASE WHEN CAST(rc.nota_lp AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_lp,
            SUM(CASE WHEN CAST(rc.nota_ch AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_ch,
            SUM(CASE WHEN CAST(rc.nota_mat AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_mat,
            SUM(CASE WHEN CAST(rc.nota_cn AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_cn
          FROM resultados_consolidados rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
        `
        const resDisciplinas = await pool.query(queryDisciplinas, params)
        if (resDisciplinas.rows.length > 0 && resDisciplinas.rows[0].total_alunos > 0) {
          const row = resDisciplinas.rows[0]
          const totalAlunos = parseInt(row.total_alunos) || 1
          
          resultado.disciplinas = {
            labels: ['Língua Portuguesa', 'Ciências Humanas', 'Matemática', 'Ciências da Natureza'],
            dados: [
              parseFloat(row.media_lp) || 0,
              parseFloat(row.media_ch) || 0,
              parseFloat(row.media_mat) || 0,
              parseFloat(row.media_cn) || 0,
            ],
            desvios: [
              parseFloat(row.desvio_lp) || 0,
              parseFloat(row.desvio_ch) || 0,
              parseFloat(row.desvio_mat) || 0,
              parseFloat(row.desvio_cn) || 0
            ],
            taxas_aprovacao: [
              ((parseInt(row.aprovados_lp) || 0) / totalAlunos) * 100,
              ((parseInt(row.aprovados_ch) || 0) / totalAlunos) * 100,
              ((parseInt(row.aprovados_mat) || 0) / totalAlunos) * 100,
              ((parseInt(row.aprovados_cn) || 0) / totalAlunos) * 100
            ],
            totalAlunos: totalAlunos,
            faixas: {
              insuficiente: [0, 4],
              regular: [4, 6],
              bom: [6, 8],
              excelente: [8, 10]
            }
          }
        }
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
      if (resEscolas.rows.length > 0) {
        resultado.escolas = {
          labels: resEscolas.rows.map(r => r.escola),
          dados: resEscolas.rows.map(r => parseFloat(r.media) || 0),
          totais: resEscolas.rows.map(r => parseInt(r.total_alunos) || 0)
        }
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
      if (resSeries.rows.length > 0) {
        resultado.series = {
          labels: resSeries.rows.map(r => r.serie),
          dados: resSeries.rows.map(r => parseFloat(r.media) || 0),
          totais: resSeries.rows.map(r => parseInt(r.total_alunos) || 0)
        }
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
      if (resPolos.rows.length > 0) {
        resultado.polos = {
          labels: resPolos.rows.map(r => r.polo),
          dados: resPolos.rows.map(r => parseFloat(r.media) || 0),
          totais: resPolos.rows.map(r => parseInt(r.total_alunos) || 0)
        }
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
      if (resDistribuicao.rows.length > 0) {
        resultado.distribuicao = {
          labels: resDistribuicao.rows.map(r => r.faixa),
          dados: resDistribuicao.rows.map(r => parseInt(r.quantidade) || 0)
        }
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
      if (resPresenca.rows.length > 0) {
        resultado.presenca = {
          labels: resPresenca.rows.map(r => r.status),
          dados: resPresenca.rows.map(r => parseInt(r.quantidade) || 0)
        }
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
      if (resComparativo.rows.length > 0) {
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
    }

    // Gráfico de Acertos e Erros
    if (tipoGrafico === 'acertos_erros') {
      // Se escola selecionada (e não é "Todas"), agrupar por série e turma
      if (escolaId && escolaId !== 'undefined' && escolaId !== '' && escolaId.toLowerCase() !== 'todas') {
        let queryAcertosErros = ''
        if (disciplina === 'LP') {
          queryAcertosErros = `
            SELECT 
              COALESCE(t.codigo, CONCAT('Série ', rc.serie)) as nome,
              rc.serie,
              t.codigo as turma_codigo,
              SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 20 - SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            LEFT JOIN turmas t ON rc.turma_id = t.id
            ${whereClause}
            GROUP BY rc.serie, t.codigo, t.id
            ORDER BY rc.serie, t.codigo
          `
        } else if (disciplina === 'CH') {
          queryAcertosErros = `
            SELECT 
              COALESCE(t.codigo, CONCAT('Série ', rc.serie)) as nome,
              rc.serie,
              t.codigo as turma_codigo,
              SUM(COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 10 - SUM(COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            LEFT JOIN turmas t ON rc.turma_id = t.id
            ${whereClause}
            GROUP BY rc.serie, t.codigo, t.id
            ORDER BY rc.serie, t.codigo
          `
        } else if (disciplina === 'MAT') {
          queryAcertosErros = `
            SELECT 
              COALESCE(t.codigo, CONCAT('Série ', rc.serie)) as nome,
              rc.serie,
              t.codigo as turma_codigo,
              SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 20 - SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            LEFT JOIN turmas t ON rc.turma_id = t.id
            ${whereClause}
            GROUP BY rc.serie, t.codigo, t.id
            ORDER BY rc.serie, t.codigo
          `
        } else if (disciplina === 'CN') {
          queryAcertosErros = `
            SELECT 
              COALESCE(t.codigo, CONCAT('Série ', rc.serie)) as nome,
              rc.serie,
              t.codigo as turma_codigo,
              SUM(COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 10 - SUM(COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            LEFT JOIN turmas t ON rc.turma_id = t.id
            ${whereClause}
            GROUP BY rc.serie, t.codigo, t.id
            ORDER BY rc.serie, t.codigo
          `
        } else {
          // Geral: soma de todas as disciplinas
          queryAcertosErros = `
            SELECT 
              COALESCE(t.codigo, CONCAT('Série ', rc.serie)) as nome,
              rc.serie,
              t.codigo as turma_codigo,
              SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 60 - SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            LEFT JOIN turmas t ON rc.turma_id = t.id
            ${whereClause}
            GROUP BY rc.serie, t.codigo, t.id
            ORDER BY rc.serie, t.codigo
          `
        }
        const resAcertosErros = await pool.query(queryAcertosErros, params)
        if (resAcertosErros.rows.length > 0) {
          resultado.acertos_erros = resAcertosErros.rows.map((r: any) => ({
            nome: r.nome || `Série ${r.serie}`,
            serie: r.serie,
            turma: r.turma_codigo || null,
            acertos: parseInt(r.total_acertos) || 0,
            erros: parseInt(r.total_erros) || 0,
            total_alunos: parseInt(r.total_alunos) || 0
          }))
        } else {
          console.log('[DEBUG ACERTOS_ERROS] Nenhum resultado encontrado! Verificando se há dados no banco...')
          // Verificar se há dados no banco com os filtros
          const queryVerificacao = `
            SELECT COUNT(*) as total
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
          `
          const resVerificacao = await pool.query(queryVerificacao, params)
          console.log('[DEBUG ACERTOS_ERROS] Total de registros no banco com os filtros:', resVerificacao.rows[0]?.total || 0)
          resultado.acertos_erros = []
        }
      } else if (serie || (poloId && (!escolaId || escolaId === '' || escolaId === 'undefined' || escolaId.toLowerCase() === 'todas'))) {
        console.log('[DEBUG ACERTOS_ERROS] Caminho: Série ou Polo (sem escola) - agrupar por escola')
        // Se série selecionada mas não escola, OU se há polo mas não escola, agrupar apenas por escola
        let queryAcertosErros = ''
        if (disciplina === 'LP') {
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 20 - SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        } else if (disciplina === 'CH') {
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 10 - SUM(COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        } else if (disciplina === 'MAT') {
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 20 - SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        } else if (disciplina === 'CN') {
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 10 - SUM(COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        } else {
          // Geral: soma de todas as disciplinas
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 60 - SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        }
        const resAcertosErros = await pool.query(queryAcertosErros, params)
        console.log('[DEBUG ACERTOS_ERROS] Query executada (primeiros 400 chars):', queryAcertosErros.substring(0, 400))
        console.log('[DEBUG ACERTOS_ERROS] Params usados:', params)
        console.log('[DEBUG ACERTOS_ERROS] Resultados encontrados:', resAcertosErros.rows.length)
        if (resAcertosErros.rows.length > 0) {
          console.log('[DEBUG ACERTOS_ERROS] Primeiro resultado:', resAcertosErros.rows[0])
          resultado.acertos_erros = resAcertosErros.rows.map((r: any) => ({
            nome: r.nome,
            escola: r.nome,
            acertos: parseInt(r.total_acertos) || 0,
            erros: parseInt(r.total_erros) || 0,
            total_alunos: parseInt(r.total_alunos) || 0
          }))
        } else {
          console.log('[DEBUG ACERTOS_ERROS] Nenhum resultado encontrado! Verificando se há dados no banco...')
          // Verificar se há dados no banco com os filtros
          const queryVerificacao = `
            SELECT COUNT(*) as total
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
          `
          const resVerificacao = await pool.query(queryVerificacao, params)
          console.log('[DEBUG ACERTOS_ERROS] Total de registros no banco com os filtros:', resVerificacao.rows[0]?.total || 0)
          resultado.acertos_erros = []
        }
      } else {
        // Se não há escola nem série, agrupar por escola
        let queryAcertosErros = ''
        if (disciplina === 'LP') {
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 20 - SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        } else if (disciplina === 'CH') {
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 10 - SUM(COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        } else if (disciplina === 'MAT') {
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 20 - SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        } else if (disciplina === 'CN') {
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 10 - SUM(COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        } else {
          // Geral: soma de todas as disciplinas
          queryAcertosErros = `
            SELECT 
              e.nome as nome,
              SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_acertos,
              COUNT(*) * 60 - SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) + COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0)) as total_erros,
              COUNT(*) as total_alunos
            FROM resultados_consolidados rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 30
          `
        }
        const resAcertosErros = await pool.query(queryAcertosErros, params)
        if (resAcertosErros.rows.length > 0) {
          resultado.acertos_erros = resAcertosErros.rows.map((r: any) => ({
            nome: r.nome,
            acertos: parseInt(r.total_acertos) || 0,
            erros: parseInt(r.total_erros) || 0,
            total_alunos: parseInt(r.total_alunos) || 0
          }))
        } else {
          resultado.acertos_erros = []
        }
      }
    }

    // Garantir que acertos_erros sempre seja um array, mesmo se vazio
    if (tipoGrafico === 'acertos_erros' && !resultado.acertos_erros) {
      resultado.acertos_erros = []
    }

    // ========== NOVOS GRÁFICOS ==========

    // 1. Taxa de Acerto por Questão
    if (tipoGrafico === 'questoes') {
      // Construir WHERE clause para resultados_provas
      const whereQuestoes: string[] = []
      const paramsQuestoes: any[] = []
      let paramIndexQuestoes = 1

      if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
        whereQuestoes.push(`rp.escola_id = $${paramIndexQuestoes}`)
        paramsQuestoes.push(usuario.escola_id)
        paramIndexQuestoes++
      } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
        whereQuestoes.push(`e2.polo_id = $${paramIndexQuestoes}`)
        paramsQuestoes.push(usuario.polo_id)
        paramIndexQuestoes++
      }

      if (anoLetivo) {
        whereQuestoes.push(`rp.ano_letivo = $${paramIndexQuestoes}`)
        paramsQuestoes.push(anoLetivo)
        paramIndexQuestoes++
      }

      if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && poloId) {
        whereQuestoes.push(`e2.polo_id = $${paramIndexQuestoes}`)
        paramsQuestoes.push(poloId)
        paramIndexQuestoes++
      }

      if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') && 
          escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas') {
        whereQuestoes.push(`rp.escola_id = $${paramIndexQuestoes}`)
        paramsQuestoes.push(escolaId)
        paramIndexQuestoes++
      }

      if (serie) {
        whereQuestoes.push(`rp.serie = $${paramIndexQuestoes}`)
        paramsQuestoes.push(serie)
        paramIndexQuestoes++
      }

      if (disciplina) {
        whereQuestoes.push(`rp.disciplina = $${paramIndexQuestoes}`)
        paramsQuestoes.push(disciplina)
        paramIndexQuestoes++
      }

      const whereClauseQuestoes = whereQuestoes.length > 0 ? `WHERE ${whereQuestoes.join(' AND ')} AND rp.questao_codigo IS NOT NULL` : 'WHERE rp.questao_codigo IS NOT NULL'

      const queryQuestoes = `
        SELECT 
          rp.questao_codigo as codigo,
          q.descricao,
          q.disciplina,
          q.area_conhecimento,
          COUNT(rp.id) as total_respostas,
          SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END) as total_acertos,
          ROUND(
            (SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END)::DECIMAL / 
             NULLIF(COUNT(rp.id), 0)) * 100, 
            2
          ) as taxa_acerto
        FROM resultados_provas rp
        LEFT JOIN questoes q ON rp.questao_codigo = q.codigo
        LEFT JOIN escolas e2 ON rp.escola_id = e2.id
        ${whereClauseQuestoes}
        GROUP BY rp.questao_codigo, q.descricao, q.disciplina, q.area_conhecimento
        ORDER BY taxa_acerto ASC
        LIMIT 50
      `
      const resQuestoes = await pool.query(queryQuestoes, paramsQuestoes)
      resultado.questoes = resQuestoes.rows.length > 0
        ? resQuestoes.rows.map((r: any) => ({
            codigo: r.codigo,
            descricao: r.descricao || r.codigo,
            disciplina: r.disciplina,
            area_conhecimento: r.area_conhecimento,
            total_respostas: parseInt(r.total_respostas) || 0,
            total_acertos: parseInt(r.total_acertos) || 0,
            taxa_acerto: parseFloat(r.taxa_acerto) || 0
          }))
        : []
    }

    // 2. Heatmap de Desempenho (Escolas × Disciplinas)
    if (tipoGrafico === 'heatmap') {
      const queryHeatmap = `
        SELECT 
          e.id as escola_id,
          e.nome as escola_nome,
          ROUND(AVG(CAST(rc.nota_lp AS DECIMAL)), 2) as media_lp,
          ROUND(AVG(CAST(rc.nota_ch AS DECIMAL)), 2) as media_ch,
          ROUND(AVG(CAST(rc.nota_mat AS DECIMAL)), 2) as media_mat,
          ROUND(AVG(CAST(rc.nota_cn AS DECIMAL)), 2) as media_cn,
          ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media_geral
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY e.id, e.nome
        ORDER BY e.nome
        LIMIT 50
      `
      const resHeatmap = await pool.query(queryHeatmap, params)
      resultado.heatmap = resHeatmap.rows.length > 0
        ? resHeatmap.rows.map((r: any) => ({
            escola: r.escola_nome,
            escola_id: r.escola_id,
            LP: parseFloat(r.media_lp) || 0,
            CH: parseFloat(r.media_ch) || 0,
            MAT: parseFloat(r.media_mat) || 0,
            CN: parseFloat(r.media_cn) || 0,
            Geral: parseFloat(r.media_geral) || 0
          }))
        : []
    }

    // 3. Radar Chart (Perfil de Desempenho)
    if (tipoGrafico === 'radar') {
      const queryRadar = `
        SELECT 
          COALESCE(e.nome, 'Geral') as nome,
          ROUND(AVG(CAST(rc.nota_lp AS DECIMAL)), 2) as lp,
          ROUND(AVG(CAST(rc.nota_ch AS DECIMAL)), 2) as ch,
          ROUND(AVG(CAST(rc.nota_mat AS DECIMAL)), 2) as mat,
          ROUND(AVG(CAST(rc.nota_cn AS DECIMAL)), 2) as cn
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY e.id, e.nome
        ORDER BY e.nome
        LIMIT 10
      `
      const resRadar = await pool.query(queryRadar, params)
      resultado.radar = resRadar.rows.length > 0 
        ? resRadar.rows.map((r: any) => ({
            nome: r.nome,
            LP: parseFloat(r.lp) || 0,
            CH: parseFloat(r.ch) || 0,
            MAT: parseFloat(r.mat) || 0,
            CN: parseFloat(r.cn) || 0
          }))
        : []
    }

    // 4. Box Plot (Distribuição de Notas)
    if (tipoGrafico === 'boxplot') {
      const whereBoxPlot = whereClause 
        ? `${whereClause} AND rc.media_aluno IS NOT NULL`
        : 'WHERE rc.media_aluno IS NOT NULL'
      
      const queryBoxPlot = `
        SELECT 
          COALESCE(e.nome, rc.serie, 'Geral') as categoria,
          CAST(rc.media_aluno AS DECIMAL) as nota
        FROM resultados_consolidados rc
        LEFT JOIN escolas e ON rc.escola_id = e.id
        ${whereBoxPlot}
        ORDER BY categoria, nota
      `
      const resBoxPlot = await pool.query(queryBoxPlot, params)
      
      // Agrupar por categoria e calcular quartis
      const categorias: { [key: string]: number[] } = {}
      resBoxPlot.rows.forEach((r: any) => {
        const cat = r.categoria || 'Geral'
        if (!categorias[cat]) categorias[cat] = []
        const nota = parseFloat(r.nota)
        if (!isNaN(nota)) {
          categorias[cat].push(nota)
        }
      })

      resultado.boxplot = Object.keys(categorias).length > 0 
        ? Object.entries(categorias)
          .filter(([_, notas]) => notas.length > 0) // Filtrar categorias vazias
          .map(([categoria, notas]) => {
            notas.sort((a, b) => a - b)
            const q1 = notas.length > 0 ? notas[Math.floor(notas.length * 0.25)] : 0
            const mediana = notas.length > 0 ? notas[Math.floor(notas.length * 0.5)] : 0
            const q3 = notas.length > 0 ? notas[Math.floor(notas.length * 0.75)] : 0
            const min = notas.length > 0 ? notas[0] : 0
            const max = notas.length > 0 ? notas[notas.length - 1] : 0
            const media = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0

            return {
              categoria,
              min,
              q1,
              mediana,
              q3,
              max,
              media,
              total: notas.length
            }
          })
          .slice(0, 20) // Limitar a 20 categorias
        : []
    }

    // 5. Correlação entre Disciplinas
    if (tipoGrafico === 'correlacao') {
      const whereCorrelacao = whereClause 
        ? `${whereClause} AND rc.nota_lp IS NOT NULL AND rc.nota_ch IS NOT NULL AND rc.nota_mat IS NOT NULL AND rc.nota_cn IS NOT NULL`
        : 'WHERE rc.nota_lp IS NOT NULL AND rc.nota_ch IS NOT NULL AND rc.nota_mat IS NOT NULL AND rc.nota_cn IS NOT NULL'
      
      const queryCorrelacao = `
        SELECT 
          CAST(rc.nota_lp AS DECIMAL) as lp,
          CAST(rc.nota_ch AS DECIMAL) as ch,
          CAST(rc.nota_mat AS DECIMAL) as mat,
          CAST(rc.nota_cn AS DECIMAL) as cn
        FROM resultados_consolidados rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereCorrelacao}
        LIMIT 1000
      `
      const resCorrelacao = await pool.query(queryCorrelacao, params)
      resultado.correlacao = resCorrelacao.rows.length > 0
        ? resCorrelacao.rows.map((r: any) => ({
            LP: parseFloat(r.lp) || 0,
            CH: parseFloat(r.ch) || 0,
            MAT: parseFloat(r.mat) || 0,
            CN: parseFloat(r.cn) || 0
          }))
        : []
    }

    // 6. Ranking Interativo
    if (tipoGrafico === 'ranking') {
      const tipoRanking = searchParams.get('tipo_ranking') || 'escolas' // escolas, turmas, polos
      
      if (tipoRanking === 'escolas') {
        const queryRanking = `
          SELECT 
            e.id,
            e.nome,
            COUNT(DISTINCT rc.aluno_id) as total_alunos,
            ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media_geral,
            ROUND(AVG(CAST(rc.nota_lp AS DECIMAL)), 2) as media_lp,
            ROUND(AVG(CAST(rc.nota_ch AS DECIMAL)), 2) as media_ch,
            ROUND(AVG(CAST(rc.nota_mat AS DECIMAL)), 2) as media_mat,
            ROUND(AVG(CAST(rc.nota_cn AS DECIMAL)), 2) as media_cn
          FROM resultados_consolidados rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
          GROUP BY e.id, e.nome
          ORDER BY media_geral DESC
          LIMIT 50
        `
        const resRanking = await pool.query(queryRanking, params)
        resultado.ranking = resRanking.rows.length > 0
          ? resRanking.rows.map((r: any, index: number) => ({
              posicao: index + 1,
              id: r.id,
              nome: r.nome,
              total_alunos: parseInt(r.total_alunos) || 0,
              media_geral: parseFloat(r.media_geral) || 0,
              media_lp: parseFloat(r.media_lp) || 0,
              media_ch: parseFloat(r.media_ch) || 0,
              media_mat: parseFloat(r.media_mat) || 0,
              media_cn: parseFloat(r.media_cn) || 0
            }))
          : []
      } else if (tipoRanking === 'turmas') {
        // Adicionar filtro para garantir que há turma_id
        const whereRankingTurmas = whereClause 
          ? `${whereClause} AND rc.turma_id IS NOT NULL`
          : 'WHERE rc.turma_id IS NOT NULL'
        
        const queryRanking = `
          SELECT 
            t.id,
            t.codigo,
            t.nome,
            e.nome as escola_nome,
            COUNT(DISTINCT rc.aluno_id) as total_alunos,
            ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media_geral
          FROM resultados_consolidados rc
          INNER JOIN turmas t ON rc.turma_id = t.id
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereRankingTurmas}
          GROUP BY t.id, t.codigo, t.nome, e.nome
          ORDER BY media_geral DESC
          LIMIT 50
        `
        const resRanking = await pool.query(queryRanking, params)
        resultado.ranking = resRanking.rows.map((r: any, index: number) => ({
          posicao: index + 1,
          id: r.id,
          nome: r.codigo || r.nome || 'Turma',
          escola: r.escola_nome,
          total_alunos: parseInt(r.total_alunos) || 0,
          media_geral: parseFloat(r.media_geral) || 0
        }))
      } else {
        // Se tipo_ranking não for reconhecido, retornar array vazio
        resultado.ranking = []
      }
    }

    // 7. Taxa de Aprovação Estimada
    if (tipoGrafico === 'aprovacao') {
      const whereAprovacao = whereClause 
        ? `${whereClause} AND rc.media_aluno IS NOT NULL`
        : 'WHERE rc.media_aluno IS NOT NULL'
      
      const queryAprovacao = `
        SELECT 
          COALESCE(e.nome, 'Geral') as categoria,
          COUNT(*) as total_alunos,
          SUM(CASE WHEN CAST(rc.media_aluno AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_6,
          SUM(CASE WHEN CAST(rc.media_aluno AS DECIMAL) >= 7.0 THEN 1 ELSE 0 END) as aprovados_7,
          SUM(CASE WHEN CAST(rc.media_aluno AS DECIMAL) >= 8.0 THEN 1 ELSE 0 END) as aprovados_8,
          ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media_geral
        FROM resultados_consolidados rc
        LEFT JOIN escolas e ON rc.escola_id = e.id
        ${whereAprovacao}
        GROUP BY e.id, e.nome
        ORDER BY media_geral DESC
        LIMIT 30
      `
      const resAprovacao = await pool.query(queryAprovacao, params)
      resultado.aprovacao = resAprovacao.rows.length > 0
        ? resAprovacao.rows.map((r: any) => {
            const totalAlunos = parseInt(r.total_alunos) || 1 // Evitar divisão por zero
            return {
              categoria: r.categoria,
              total_alunos: totalAlunos,
              aprovados_6: parseInt(r.aprovados_6) || 0,
              aprovados_7: parseInt(r.aprovados_7) || 0,
              aprovados_8: parseInt(r.aprovados_8) || 0,
              taxa_6: ((parseInt(r.aprovados_6) || 0) / totalAlunos) * 100,
              taxa_7: ((parseInt(r.aprovados_7) || 0) / totalAlunos) * 100,
              taxa_8: ((parseInt(r.aprovados_8) || 0) / totalAlunos) * 100,
              media_geral: parseFloat(r.media_geral) || 0
            }
          })
        : []
    }

    // 8. Análise de Gaps
    if (tipoGrafico === 'gaps') {
      const whereGaps = whereClause 
        ? `${whereClause} AND rc.media_aluno IS NOT NULL`
        : 'WHERE rc.media_aluno IS NOT NULL'
      
      const queryGaps = `
        SELECT 
          COALESCE(e.nome, 'Geral') as categoria,
          ROUND(MAX(CAST(rc.media_aluno AS DECIMAL)), 2) as melhor_media,
          ROUND(MIN(CAST(rc.media_aluno AS DECIMAL)), 2) as pior_media,
          ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media_geral,
          ROUND(MAX(CAST(rc.media_aluno AS DECIMAL)) - MIN(CAST(rc.media_aluno AS DECIMAL)), 2) as gap
        FROM resultados_consolidados rc
        LEFT JOIN escolas e ON rc.escola_id = e.id
        ${whereGaps}
        GROUP BY e.id, e.nome
        ORDER BY gap DESC
        LIMIT 30
      `
      const resGaps = await pool.query(queryGaps, params)
      resultado.gaps = resGaps.rows.length > 0
        ? resGaps.rows.map((r: any) => ({
            categoria: r.categoria,
            melhor_media: parseFloat(r.melhor_media) || 0,
            pior_media: parseFloat(r.pior_media) || 0,
            media_geral: parseFloat(r.media_geral) || 0,
            gap: parseFloat(r.gap) || 0
          }))
        : []
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Erro ao buscar dados para gráficos:', error)
    return NextResponse.json(
      { mensagem: `Erro ao buscar dados para gráficos: ${error.message || 'Erro desconhecido'}` },
      { status: 500 }
    )
  }
}

