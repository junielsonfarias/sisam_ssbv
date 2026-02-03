import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache'
import { NOTAS, LIMITES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// Helper para gerar filtro de range de questões baseado na série e disciplina
// Configuração de questões por série:
// - 2º/3º Ano: LP=14 (Q1-Q14), MAT=14 (Q15-Q28)
// - 5º Ano: LP=14 (Q1-Q14), MAT=20 (Q15-Q34)
// - 8º/9º Ano: LP=20 (Q1-Q20), CH=10 (Q21-Q30), MAT=20 (Q31-Q50), CN=10 (Q51-Q60)
function getQuestaoRangeFilter(serie: string | null, disciplina: string | null, tipoEnsino: string | null): string | null {
  // Extrair apenas o número da série
  const getNumeroSerie = (s: string) => {
    const match = s.match(/(\d+)/)
    return match ? match[1] : null
  }

  // Se temos série específica
  if (serie) {
    const numeroSerie = getNumeroSerie(serie)
    if (!numeroSerie) return null

    // Anos iniciais: 2º, 3º
    if (numeroSerie === '2' || numeroSerie === '3') {
      if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 14`
      if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 15 AND 28`
      // Se não tem disciplina específica, todas as questões da série (1-28)
      if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 28`
    }
    // 5º ano
    if (numeroSerie === '5') {
      if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 14`
      if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 15 AND 34`
      // Se não tem disciplina específica, todas as questões da série (1-34)
      if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 34`
    }
    // Anos finais: 6º, 7º, 8º, 9º
    if (['6', '7', '8', '9'].includes(numeroSerie)) {
      if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 20`
      if (disciplina === 'CH') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 21 AND 30`
      if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 31 AND 50`
      if (disciplina === 'CN') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 51 AND 60`
      // Se não tem disciplina específica, todas as questões da série (1-60)
      if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 60`
    }
  }

  // Se temos tipo de ensino mas não série específica
  if (tipoEnsino === 'anos_iniciais') {
    // Anos iniciais: 2º, 3º, 5º - considerar maior range
    if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 14`
    if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 15 AND 34`
    // Sem disciplina: considerar todas (1-34 para 5º ano que tem mais)
    if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 34`
  }

  if (tipoEnsino === 'anos_finais') {
    if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 20`
    if (disciplina === 'CH') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 21 AND 30`
    if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 31 AND 50`
    if (disciplina === 'CN') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 51 AND 60`
    // Sem disciplina: todas (1-60)
    if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 60`
  }

  return null
}

// Helper para calcular média geral com divisor fixo
// Anos Iniciais (2,3,5): (LP + MAT + PROD) / 3
// Anos Finais (6,7,8,9): (LP + CH + MAT + CN) / 4
function getMediaGeralSQL(campoSerie: string = 'rc.serie'): string {
  const numeroSerie = `REGEXP_REPLACE(${campoSerie}::text, '[^0-9]', '', 'g')`
  return `CASE
    WHEN ${numeroSerie} IN ('2', '3', '5') THEN
      (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_producao, 0)) / 3.0
    ELSE
      (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_ch, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_cn, 0)) / 4.0
  END`
}

// Helper para determinar campo de nota baseado na disciplina selecionada
function getCampoNota(disciplina: string | null): { campo: string, label: string, totalQuestoes: number, isCalculated?: boolean } {
  switch (disciplina) {
    case 'LP':
      return { campo: 'rc.nota_lp', label: 'Língua Portuguesa', totalQuestoes: 20 }
    case 'CH':
      return { campo: 'rc.nota_ch', label: 'Ciências Humanas', totalQuestoes: 10 }
    case 'MAT':
      return { campo: 'rc.nota_mat', label: 'Matemática', totalQuestoes: 20 }
    case 'CN':
      return { campo: 'rc.nota_cn', label: 'Ciências da Natureza', totalQuestoes: 10 }
    case 'PT':
      return { campo: 'rc.nota_producao', label: 'Produção Textual', totalQuestoes: 1 }
    default:
      // Para média geral, retorna expressão calculada com divisor fixo
      return { campo: getMediaGeralSQL(), label: 'Média Geral', totalQuestoes: 60, isCalculated: true }
  }
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
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
    const tipoGrafico = searchParams.get('tipo') || 'geral'
    const anoLetivo = searchParams.get('ano_letivo')
    const poloId = searchParams.get('polo_id')
    const escolaId = searchParams.get('escola_id')
    const serie = searchParams.get('serie')
    const disciplina = searchParams.get('disciplina')
    const turmaId = searchParams.get('turma_id')
    const tipoEnsino = searchParams.get('tipo_ensino')

    // Verificar cache
    const cacheOptions = {
      filtros: {
        tipoGrafico,
        anoLetivo,
        poloId,
        escolaId,
        serie,
        disciplina,
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
          console.log('Retornando gráficos do cache')
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
      console.log('[Gráficos] Cache não disponível, buscando do banco')
    }

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

    // Filtro de tipo de ensino (anos_iniciais ou anos_finais)
    if (tipoEnsino === 'anos_iniciais') {
      // Anos iniciais: 2º, 3º e 5º ano
      whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`)
    } else if (tipoEnsino === 'anos_finais') {
      // Anos finais: 6º, 7º, 8º e 9º ano
      whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Determinar se deve remover limites (quando todas escolas ou um polo completo é selecionado)
    const deveRemoverLimites = !escolaId || escolaId === '' || escolaId === 'undefined' || escolaId.toLowerCase() === 'todas'

    // Buscar séries disponíveis no banco de dados (apenas séries que realmente existem)
    // Usar apenas filtros básicos (ano_letivo e permissões de usuário), não filtros de escola/polo/série
    const whereSeriesConditions: string[] = []
    const paramsSeries: any[] = []
    let paramSeriesIndex = 1
    
    // Aplicar apenas restrições baseadas no tipo de usuário (não filtros opcionais)
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereSeriesConditions.push(`rc.escola_id = $${paramSeriesIndex}`)
      paramsSeries.push(usuario.escola_id)
      paramSeriesIndex++
    } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereSeriesConditions.push(`e.polo_id = $${paramSeriesIndex}`)
      paramsSeries.push(usuario.polo_id)
      paramSeriesIndex++
    }
    
    if (anoLetivo) {
      whereSeriesConditions.push(`rc.ano_letivo = $${paramSeriesIndex}`)
      paramsSeries.push(anoLetivo)
      paramSeriesIndex++
    }
    
    // Filtrar apenas séries que têm alunos com resultados válidos (presença P/F e tem nota LP)
    const baseSeriesCondition = `rc.serie IS NOT NULL AND rc.serie != ''
      AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
      AND rc.nota_lp IS NOT NULL`

    const whereSeriesClause = whereSeriesConditions.length > 0
      ? `WHERE ${whereSeriesConditions.join(' AND ')} AND ${baseSeriesCondition}`
      : `WHERE ${baseSeriesCondition}`

    const querySeriesDisponiveis = `
      SELECT DISTINCT rc.serie
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${whereSeriesClause}
      ORDER BY rc.serie
    `
    const resSeriesDisponiveis = await pool.query(querySeriesDisponiveis, paramsSeries)
    const seriesDisponiveis = resSeriesDisponiveis.rows.map((r: any) => r.serie).filter((s: string) => s && s.trim() !== '')

    let resultado: any = {
      series_disponiveis: seriesDisponiveis
    }

    // Gráfico Geral - Médias por Disciplina
    if (tipoGrafico === 'geral' || tipoGrafico === 'disciplinas') {
      // Se disciplina específica foi selecionada, mostrar apenas essa
      if (disciplina === 'LP') {
        const queryDisciplina = `
          SELECT 
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media,
            COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN 1 END) as total_alunos
          FROM resultados_consolidados_unificada rc
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
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media,
            COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN 1 END) as total_alunos
          FROM resultados_consolidados_unificada rc
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
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media,
            COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN 1 END) as total_alunos
          FROM resultados_consolidados_unificada rc
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
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media,
            COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN 1 END) as total_alunos
          FROM resultados_consolidados_unificada rc
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
      } else if (disciplina === 'PT') {
        // Produção Textual - apenas para Anos Iniciais (2º, 3º, 5º ano)
        const queryDisciplina = `
          SELECT
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media,
            COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN 1 END) as total_alunos
          FROM resultados_consolidados_unificada rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
        `
        const resDisciplina = await pool.query(queryDisciplina, params)
        if (resDisciplina.rows.length > 0 && resDisciplina.rows[0].total_alunos > 0) {
          resultado.disciplinas = {
            labels: ['Produção Textual'],
            dados: [parseFloat(resDisciplina.rows[0].media) || 0],
            totalAlunos: parseInt(resDisciplina.rows[0].total_alunos) || 0
          }
        }
      } else {
        // Sem disciplina específica, mostrar todas com indicadores estatísticos
        // Inclui PT (Produção Textual) que só existe para Anos Iniciais (2º, 3º, 5º)
        const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

        const queryDisciplinas = `
          SELECT
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
            -- PT (Produção Textual) - apenas para Anos Iniciais
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_pt,
            ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as desvio_lp,
            ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as desvio_ch,
            ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as desvio_mat,
            ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as desvio_cn,
            ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as desvio_pt,
            COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) as total_alunos,
            COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN 1 END) as total_alunos_pt,
            SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND CAST(rc.nota_lp AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_lp,
            SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND CAST(rc.nota_ch AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_ch,
            SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND CAST(rc.nota_mat AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_mat,
            SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND CAST(rc.nota_cn AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_cn,
            SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND CAST(rc.nota_producao AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_pt,
            -- Verificar se há dados de Anos Iniciais ou Anos Finais
            COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
            COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais
          FROM resultados_consolidados_unificada rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
        `
        const resDisciplinas = await pool.query(queryDisciplinas, params)
        if (resDisciplinas.rows.length > 0 && resDisciplinas.rows[0].total_alunos > 0) {
          const row = resDisciplinas.rows[0]
          const totalAlunos = parseInt(row.total_alunos) || 1
          const totalAlunosPT = parseInt(row.total_alunos_pt) || 0
          const countAnosIniciais = parseInt(row.count_anos_iniciais) || 0
          const countAnosFinais = parseInt(row.count_anos_finais) || 0

          // Determinar quais disciplinas mostrar baseado nos dados disponíveis
          const labels: string[] = ['Língua Portuguesa']
          const dados: number[] = [parseFloat(row.media_lp) || 0]
          const desvios: number[] = [parseFloat(row.desvio_lp) || 0]
          const taxas_aprovacao: number[] = [((parseInt(row.aprovados_lp) || 0) / totalAlunos) * 100]

          // CH e CN só existem para Anos Finais
          if (countAnosFinais > 0 && parseFloat(row.media_ch) > 0) {
            labels.push('Ciências Humanas')
            dados.push(parseFloat(row.media_ch) || 0)
            desvios.push(parseFloat(row.desvio_ch) || 0)
            taxas_aprovacao.push(((parseInt(row.aprovados_ch) || 0) / totalAlunos) * 100)
          }

          labels.push('Matemática')
          dados.push(parseFloat(row.media_mat) || 0)
          desvios.push(parseFloat(row.desvio_mat) || 0)
          taxas_aprovacao.push(((parseInt(row.aprovados_mat) || 0) / totalAlunos) * 100)

          if (countAnosFinais > 0 && parseFloat(row.media_cn) > 0) {
            labels.push('Ciências da Natureza')
            dados.push(parseFloat(row.media_cn) || 0)
            desvios.push(parseFloat(row.desvio_cn) || 0)
            taxas_aprovacao.push(((parseInt(row.aprovados_cn) || 0) / totalAlunos) * 100)
          }

          // PT (Produção Textual) só existe para Anos Iniciais
          if (countAnosIniciais > 0 && totalAlunosPT > 0 && parseFloat(row.media_pt) > 0) {
            labels.push('Produção Textual')
            dados.push(parseFloat(row.media_pt) || 0)
            desvios.push(parseFloat(row.desvio_pt) || 0)
            taxas_aprovacao.push(((parseInt(row.aprovados_pt) || 0) / totalAlunosPT) * 100)
          }

          resultado.disciplinas = {
            labels,
            dados,
            desvios,
            taxas_aprovacao,
            totalAlunos: totalAlunos,
            totalAlunosPT: totalAlunosPT,
            anosIniciais: countAnosIniciais,
            anosFinais: countAnosFinais,
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
      const notaConfig = getCampoNota(disciplina)
      const queryEscolas = `
        SELECT
          e.nome as escola,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN CAST(${notaConfig.campo} AS DECIMAL) ELSE NULL END), 2) as media,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN 1 END) as total_alunos
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY e.id, e.nome
        HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN 1 END) > 0
        ORDER BY media DESC
      `
      const resEscolas = await pool.query(queryEscolas, params)
      if (resEscolas.rows.length > 0) {
        resultado.escolas = {
          labels: resEscolas.rows.map((r, index) => `${index + 1}º ${r.escola}`),
          dados: resEscolas.rows.map(r => parseFloat(r.media) || 0),
          totais: resEscolas.rows.map(r => parseInt(r.total_alunos) || 0),
          rankings: resEscolas.rows.map((r, index) => index + 1),
          disciplina: notaConfig.label
        }
      }
    }

    // Gráfico por Série
    if (tipoGrafico === 'geral' || tipoGrafico === 'series') {
      const notaConfigSeries = getCampoNota(disciplina)
      const querySeries = `
        SELECT
          rc.serie,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigSeries.campo} IS NOT NULL AND CAST(${notaConfigSeries.campo} AS DECIMAL) > 0) THEN CAST(${notaConfigSeries.campo} AS DECIMAL) ELSE NULL END), 2) as media,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigSeries.campo} IS NOT NULL AND CAST(${notaConfigSeries.campo} AS DECIMAL) > 0) THEN 1 END) as total_alunos
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY rc.serie
        HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigSeries.campo} IS NOT NULL AND CAST(${notaConfigSeries.campo} AS DECIMAL) > 0) THEN 1 END) > 0
        ORDER BY rc.serie
      `
      const resSeries = await pool.query(querySeries, params)
      if (resSeries.rows.length > 0) {
        resultado.series = {
          labels: resSeries.rows.map(r => r.serie),
          dados: resSeries.rows.map(r => parseFloat(r.media) || 0),
          totais: resSeries.rows.map(r => parseInt(r.total_alunos) || 0),
          disciplina: notaConfigSeries.label
        }
      }
    }

    // Gráfico por Polo
    if (tipoGrafico === 'geral' || tipoGrafico === 'polos') {
      const notaConfigPolos = getCampoNota(disciplina)
      const queryPolos = `
        SELECT
          p.nome as polo,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigPolos.campo} IS NOT NULL AND CAST(${notaConfigPolos.campo} AS DECIMAL) > 0) THEN CAST(${notaConfigPolos.campo} AS DECIMAL) ELSE NULL END), 2) as media,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigPolos.campo} IS NOT NULL AND CAST(${notaConfigPolos.campo} AS DECIMAL) > 0) THEN 1 END) as total_alunos
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        INNER JOIN polos p ON e.polo_id = p.id
        ${whereClause}
        GROUP BY p.id, p.nome
        HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigPolos.campo} IS NOT NULL AND CAST(${notaConfigPolos.campo} AS DECIMAL) > 0) THEN 1 END) > 0
        ORDER BY media DESC
      `
      const resPolos = await pool.query(queryPolos, params)
      if (resPolos.rows.length > 0) {
        resultado.polos = {
          labels: resPolos.rows.map(r => r.polo),
          dados: resPolos.rows.map(r => parseFloat(r.media) || 0),
          totais: resPolos.rows.map(r => parseInt(r.total_alunos) || 0),
          disciplina: notaConfigPolos.label
        }
      }
    }

    // Distribuição de Notas
    if (tipoGrafico === 'geral' || tipoGrafico === 'distribuicao') {
      // Determinar qual campo de nota usar baseado no filtro de disciplina
      let campoNota = getMediaGeralSQL() // Usar cálculo com divisor fixo para média geral
      let labelDisciplina = 'Geral'
      let usandoMediaGeral = true

      if (disciplina === 'LP') {
        campoNota = 'rc.nota_lp'
        labelDisciplina = 'Língua Portuguesa'
        usandoMediaGeral = false
      } else if (disciplina === 'CH') {
        campoNota = 'rc.nota_ch'
        labelDisciplina = 'Ciências Humanas'
        usandoMediaGeral = false
      } else if (disciplina === 'MAT') {
        campoNota = 'rc.nota_mat'
        labelDisciplina = 'Matemática'
        usandoMediaGeral = false
      } else if (disciplina === 'CN') {
        campoNota = 'rc.nota_cn'
        labelDisciplina = 'Ciências da Natureza'
        usandoMediaGeral = false
      }

      // Adicionar condição para filtrar apenas notas válidas
      // Para média geral, verificar se tem nota_lp (presente em todas as séries)
      const condicaoValida = usandoMediaGeral
        ? 'rc.nota_lp IS NOT NULL'
        : `${campoNota} IS NOT NULL AND CAST(${campoNota} AS DECIMAL) > 0`

      const whereDistribuicao = disciplina || usandoMediaGeral
        ? (whereClause
            ? `${whereClause} AND ${condicaoValida}`
            : `WHERE ${condicaoValida}`)
        : whereClause

      const queryDistribuicao = `
        SELECT
          CASE
            WHEN (${campoNota}) >= 9 THEN '9.0 - 10.0'
            WHEN (${campoNota}) >= 8 THEN '8.0 - 8.9'
            WHEN (${campoNota}) >= 7 THEN '7.0 - 7.9'
            WHEN (${campoNota}) >= 6 THEN '6.0 - 6.9'
            WHEN (${campoNota}) >= 5 THEN '5.0 - 5.9'
            ELSE '0.0 - 4.9'
          END as faixa,
          COUNT(*) as quantidade
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereDistribuicao}
        GROUP BY faixa
        ORDER BY faixa DESC
      `
      const resDistribuicao = await pool.query(queryDistribuicao, params)
      if (resDistribuicao.rows.length > 0) {
        resultado.distribuicao = {
          labels: resDistribuicao.rows.map(r => r.faixa),
          dados: resDistribuicao.rows.map(r => parseInt(r.quantidade) || 0),
          disciplina: labelDisciplina
        }
      }
    }

    // Taxa de Presença
    if (tipoGrafico === 'geral' || tipoGrafico === 'presenca') {
      const queryPresenca = `
        SELECT 
          CASE WHEN rc.presenca IN ('P', 'p') THEN 'Presentes' ELSE 'Faltas' END as status,
          COUNT(*) as quantidade
        FROM resultados_consolidados_unificada rc
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

    // Comparativo de Escolas Detalhado (Top 5 e Bottom 5 ou Todas)
    // Inclui PT (Produção Textual) para Anos Iniciais
    if (tipoGrafico === 'comparativo_escolas') {
      const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`
      const mediaGeralCalc = getMediaGeralSQL()

      const queryComparativo = `
        WITH ranking_escolas AS (
          SELECT
            e.nome as escola,
            -- Média geral com divisor fixo
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END), 2) as media_geral,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
            -- PT (Produção Textual) - apenas para Anos Iniciais
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_pt,
            COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) as total_alunos,
            -- Contadores para determinar tipo de dados
            COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
            COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais,
            ROW_NUMBER() OVER (ORDER BY AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END) DESC NULLS LAST) as rank_desc,
            ROW_NUMBER() OVER (ORDER BY AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END) ASC NULLS LAST) as rank_asc
          FROM resultados_consolidados_unificada rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
          GROUP BY e.id, e.nome
          HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) > 0
        )
        SELECT * FROM ranking_escolas
        ${deveRemoverLimites ? '' : 'WHERE rank_desc <= 5 OR rank_asc <= 5'}
        ORDER BY media_geral DESC
      `
      const resComparativo = await pool.query(queryComparativo, params)
      if (resComparativo.rows.length > 0) {
        // Calcular totais para determinar se há dados de cada etapa
        const totalAnosIniciais = resComparativo.rows.reduce((acc, r) => acc + (parseInt(r.count_anos_iniciais) || 0), 0)
        const totalAnosFinais = resComparativo.rows.reduce((acc, r) => acc + (parseInt(r.count_anos_finais) || 0), 0)

        resultado.comparativo_escolas = {
          escolas: resComparativo.rows.map(r => r.escola),
          mediaGeral: resComparativo.rows.map(r => parseFloat(r.media_geral) || 0),
          mediaLP: resComparativo.rows.map(r => parseFloat(r.media_lp) || 0),
          mediaCH: resComparativo.rows.map(r => parseFloat(r.media_ch) || 0),
          mediaMAT: resComparativo.rows.map(r => parseFloat(r.media_mat) || 0),
          mediaCN: resComparativo.rows.map(r => parseFloat(r.media_cn) || 0),
          mediaPT: resComparativo.rows.map(r => parseFloat(r.media_pt) || 0),
          totais: resComparativo.rows.map(r => parseInt(r.total_alunos) || 0),
          // Metadados para o frontend saber quais disciplinas mostrar
          temAnosIniciais: totalAnosIniciais > 0,
          temAnosFinais: totalAnosFinais > 0
        }
      }
    }

    // Gráfico de Acertos e Erros - CORRIGIDO para considerar questões por série
    // Anos Iniciais (2º/3º): LP=14, MAT=14, Total=28
    // Anos Iniciais (5º): LP=14, MAT=20, Total=34
    // Anos Finais (6º-9º): LP=20, CH=10, MAT=20, CN=10, Total=60
    if (tipoGrafico === 'acertos_erros') {
      // SE DISCIPLINA ESPECÍFICA FOI SELECIONADA: Mostrar acertos/erros POR QUESTÃO
      // Isso permite ver quantos alunos acertaram/erraram cada questão da disciplina
      if (disciplina) {
        // Construir WHERE clause para resultados_provas (tabela com respostas individuais)
        const whereAcertosQuestao: string[] = []
        const paramsAcertosQuestao: any[] = []
        let paramIndexAcertos = 1

        // Restrições de permissão do usuário
        if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
          whereAcertosQuestao.push(`rp.escola_id = $${paramIndexAcertos}`)
          paramsAcertosQuestao.push(usuario.escola_id)
          paramIndexAcertos++
        } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
          whereAcertosQuestao.push(`e.polo_id = $${paramIndexAcertos}`)
          paramsAcertosQuestao.push(usuario.polo_id)
          paramIndexAcertos++
        }

        if (anoLetivo) {
          whereAcertosQuestao.push(`rp.ano_letivo = $${paramIndexAcertos}`)
          paramsAcertosQuestao.push(anoLetivo)
          paramIndexAcertos++
        }

        if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && poloId) {
          whereAcertosQuestao.push(`e.polo_id = $${paramIndexAcertos}`)
          paramsAcertosQuestao.push(poloId)
          paramIndexAcertos++
        }

        if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') &&
            escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas') {
          whereAcertosQuestao.push(`rp.escola_id = $${paramIndexAcertos}`)
          paramsAcertosQuestao.push(escolaId)
          paramIndexAcertos++
        }

        if (serie) {
          whereAcertosQuestao.push(`rp.serie = $${paramIndexAcertos}`)
          paramsAcertosQuestao.push(serie)
          paramIndexAcertos++
        }

        if (turmaId) {
          whereAcertosQuestao.push(`rp.turma_id = $${paramIndexAcertos}`)
          paramsAcertosQuestao.push(turmaId)
          paramIndexAcertos++
        }

        // Filtro de range de questões baseado na série e disciplina
        const questaoRangeFilter = getQuestaoRangeFilter(serie, disciplina, tipoEnsino)
        if (questaoRangeFilter) {
          whereAcertosQuestao.push(questaoRangeFilter)
        }

        // Filtro de tipo de ensino
        if (tipoEnsino === 'anos_iniciais') {
          whereAcertosQuestao.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`)
        } else if (tipoEnsino === 'anos_finais') {
          whereAcertosQuestao.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`)
        }

        const whereClauseAcertosQuestao = whereAcertosQuestao.length > 0
          ? `WHERE ${whereAcertosQuestao.join(' AND ')} AND rp.questao_codigo IS NOT NULL`
          : 'WHERE rp.questao_codigo IS NOT NULL'

        // PRIMEIRO: Buscar total de alunos (presentes e faltantes) usando resultados_consolidados_unificada
        // Isso garante consistência com o painel de dados
        const queryTotaisAlunos = `
          SELECT
            COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) as total_presentes,
            COUNT(DISTINCT CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_faltantes,
            COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos
          FROM resultados_consolidados_unificada rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
        `
        const resTotaisAlunos = await pool.query(queryTotaisAlunos, params)
        const totaisAlunos = resTotaisAlunos.rows[0] || { total_presentes: 0, total_faltantes: 0, total_alunos: 0 }

        // Query para buscar acertos/erros por questão individual (APENAS ALUNOS PRESENTES)
        const queryAcertosPorQuestao = `
          SELECT
            rp.questao_codigo as questao,
            COUNT(DISTINCT CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') THEN rp.aluno_id END) as total_presentes,
            SUM(CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') AND rp.acertou = true THEN 1 ELSE 0 END) as acertos,
            SUM(CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') AND (rp.acertou = false OR rp.acertou IS NULL) THEN 1 ELSE 0 END) as erros
          FROM resultados_provas rp
          INNER JOIN escolas e ON rp.escola_id = e.id
          ${whereClauseAcertosQuestao}
          GROUP BY rp.questao_codigo
          ORDER BY CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER)
        `

        const resAcertosPorQuestao = await pool.query(queryAcertosPorQuestao, paramsAcertosQuestao)

        if (resAcertosPorQuestao.rows.length > 0) {
          // Usar totais do resultados_consolidados_unificada (consistente com painel de dados)
          const totalPresentes = parseInt(totaisAlunos.total_presentes) || 0
          const totalFaltantes = parseInt(totaisAlunos.total_faltantes) || 0
          const totalAlunos = parseInt(totaisAlunos.total_alunos) || 0

          resultado.acertos_erros = resAcertosPorQuestao.rows.map((r: any) => ({
            nome: `Q${r.questao.replace(/[^0-9]/g, '')}`,
            questao: r.questao,
            acertos: parseInt(r.acertos) || 0,
            erros: parseInt(r.erros) || 0,
            total_alunos: parseInt(r.total_presentes) || 0, // Presentes que responderam esta questão
            tipo: 'questao' // Marcador para o frontend saber que são dados por questão
          }))
          // Adicionar metadados incluindo informação de presença (do resultados_consolidados)
          resultado.acertos_erros_meta = {
            tipo: 'por_questao',
            disciplina: disciplina,
            total_questoes: resAcertosPorQuestao.rows.length,
            total_alunos_cadastrados: totalAlunos,
            total_presentes: totalPresentes,
            total_faltantes: totalFaltantes
          }
        } else {
          resultado.acertos_erros = []
        }
      } else {
        // SEM DISCIPLINA ESPECÍFICA: Comportamento original (agrupado por escola/turma)
        // Helper para calcular total de questões baseado na série e disciplina
        const getQuestoesSQL = (disc: string | null, campoSerie: string = 'rc.serie') => {
          const numeroSerie = `REGEXP_REPLACE(${campoSerie}::text, '[^0-9]', '', 'g')`

          if (disc === 'LP') {
            // LP: 14 questões para anos iniciais, 20 para anos finais
            return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 14 ELSE 20 END`
          } else if (disc === 'CH') {
            // CH: não existe para anos iniciais, 10 para anos finais
            return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE 10 END`
          } else if (disc === 'MAT') {
            // MAT: 14 para 2º/3º, 20 para 5º e anos finais
            return `CASE WHEN ${numeroSerie} IN ('2', '3') THEN 14 ELSE 20 END`
          } else if (disc === 'CN') {
            // CN: não existe para anos iniciais, 10 para anos finais
            return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE 10 END`
          } else {
            // Geral: soma de todas as disciplinas válidas por série
            return `CASE
              WHEN ${numeroSerie} IN ('2', '3') THEN 28
              WHEN ${numeroSerie} = '5' THEN 34
              ELSE 60
            END`
          }
        }

        // Helper para calcular acertos baseado na disciplina
        const getAcertosSQL = (disc: string | null) => {
          const numeroSerie = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

          if (disc === 'LP') {
            return `SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0))`
          } else if (disc === 'CH') {
            // CH só existe para anos finais
            return `SUM(CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) END)`
          } else if (disc === 'MAT') {
            return `SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0))`
          } else if (disc === 'CN') {
            // CN só existe para anos finais
            return `SUM(CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0) END)`
          } else {
            // Geral: soma apenas disciplinas válidas por série
            return `SUM(
              COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) +
              COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) +
              CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) END +
              CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0) END
            )`
          }
        }

        // Se escola selecionada (e não é "Todas"), agrupar por série e turma
        if (escolaId && escolaId !== 'undefined' && escolaId !== '' && escolaId.toLowerCase() !== 'todas') {
          const queryAcertosErros = `
            SELECT
              COALESCE(t.codigo, CONCAT('Série ', rc.serie)) as nome,
              rc.serie,
              t.codigo as turma_codigo,
              ${getAcertosSQL(null)} as total_acertos,
              SUM(${getQuestoesSQL(null)}) - ${getAcertosSQL(null)} as total_erros,
              COUNT(*) as total_alunos,
              SUM(${getQuestoesSQL(null)}) as total_questoes
            FROM resultados_consolidados_unificada rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            LEFT JOIN turmas t ON rc.turma_id = t.id
            ${whereClause}
            GROUP BY rc.serie, t.codigo, t.id
            ORDER BY rc.serie, t.codigo
          `
          const resAcertosErros = await pool.query(queryAcertosErros, params)
          if (resAcertosErros.rows.length > 0) {
            resultado.acertos_erros = resAcertosErros.rows.map((r: any) => ({
              nome: r.nome || `Série ${r.serie}`,
              serie: r.serie,
              turma: r.turma_codigo || null,
              acertos: parseInt(r.total_acertos) || 0,
              erros: Math.max(0, parseInt(r.total_erros) || 0),
              total_alunos: parseInt(r.total_alunos) || 0,
              total_questoes: parseInt(r.total_questoes) || 0
            }))
          } else {
            resultado.acertos_erros = []
          }
        } else if (serie || (poloId && (!escolaId || escolaId === '' || escolaId === 'undefined' || escolaId.toLowerCase() === 'todas'))) {
          // Se série selecionada mas não escola, OU se há polo mas não escola, agrupar por escola
          const queryAcertosErros = `
            SELECT
              e.nome as nome,
              ${getAcertosSQL(null)} as total_acertos,
              SUM(${getQuestoesSQL(null)}) - ${getAcertosSQL(null)} as total_erros,
              COUNT(*) as total_alunos,
              SUM(${getQuestoesSQL(null)}) as total_questoes
            FROM resultados_consolidados_unificada rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            ${deveRemoverLimites ? '' : 'LIMIT 30'}
          `
          const resAcertosErros = await pool.query(queryAcertosErros, params)
          if (resAcertosErros.rows.length > 0) {
            resultado.acertos_erros = resAcertosErros.rows.map((r: any) => ({
              nome: r.nome,
              escola: r.nome,
              acertos: parseInt(r.total_acertos) || 0,
              erros: Math.max(0, parseInt(r.total_erros) || 0),
              total_alunos: parseInt(r.total_alunos) || 0,
              total_questoes: parseInt(r.total_questoes) || 0
            }))
          } else {
            resultado.acertos_erros = []
          }
        } else {
          // Se não há escola nem série, agrupar por escola
          const queryAcertosErros = `
            SELECT
              e.nome as nome,
              ${getAcertosSQL(null)} as total_acertos,
              SUM(${getQuestoesSQL(null)}) - ${getAcertosSQL(null)} as total_erros,
              COUNT(*) as total_alunos,
              SUM(${getQuestoesSQL(null)}) as total_questoes
            FROM resultados_consolidados_unificada rc
            INNER JOIN escolas e ON rc.escola_id = e.id
            ${whereClause}
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            ${deveRemoverLimites ? '' : 'LIMIT 30'}
          `
          const resAcertosErros = await pool.query(queryAcertosErros, params)
          if (resAcertosErros.rows.length > 0) {
            resultado.acertos_erros = resAcertosErros.rows.map((r: any) => ({
              nome: r.nome,
              acertos: parseInt(r.total_acertos) || 0,
              erros: Math.max(0, parseInt(r.total_erros) || 0),
              total_alunos: parseInt(r.total_alunos) || 0,
              total_questoes: parseInt(r.total_questoes) || 0
            }))
          } else {
            resultado.acertos_erros = []
          }
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
        // Mapear código da disciplina para nome completo usado em resultados_provas
        const disciplinaMap: Record<string, string> = {
          'LP': 'Língua Portuguesa',
          'MAT': 'Matemática',
          'CH': 'Ciências Humanas',
          'CN': 'Ciências da Natureza',
          'PT': 'Produção Textual'
        }
        const disciplinaNome = disciplinaMap[disciplina] || disciplina
        whereQuestoes.push(`rp.disciplina = $${paramIndexQuestoes}`)
        paramsQuestoes.push(disciplinaNome)
        paramIndexQuestoes++
      }

      // Filtro de tipo de ensino para questões
      if (tipoEnsino === 'anos_iniciais') {
        whereQuestoes.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`)
      } else if (tipoEnsino === 'anos_finais') {
        whereQuestoes.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`)
      }

      // Filtro de range de questões baseado na série e disciplina selecionadas
      const questaoRangeFilter = getQuestaoRangeFilter(serie, disciplina, tipoEnsino)
      if (questaoRangeFilter) {
        whereQuestoes.push(questaoRangeFilter)
        console.log('[Graficos] Filtro de range de questões aplicado:', questaoRangeFilter)
      }

      const whereClauseQuestoes = whereQuestoes.length > 0 ? `WHERE ${whereQuestoes.join(' AND ')} AND rp.questao_codigo IS NOT NULL` : 'WHERE rp.questao_codigo IS NOT NULL'

      // Debug: verificar disciplinas disponíveis na tabela
      const debugQuery = await pool.query(`
        SELECT DISTINCT rp.disciplina, rp.serie, COUNT(*) as qtd
        FROM resultados_provas rp
        GROUP BY rp.disciplina, rp.serie
        ORDER BY rp.disciplina, rp.serie
      `)
      console.log('[Graficos] Disciplinas disponíveis em resultados_provas:', debugQuery.rows)
      console.log('[Graficos] Filtro disciplina recebido:', disciplina)
      console.log('[Graficos] Filtro tipoEnsino recebido:', tipoEnsino)
      console.log('[Graficos] WHERE clause:', whereClauseQuestoes)
      console.log('[Graficos] Params:', paramsQuestoes)

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
          ) as taxa_acerto,
          CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) as numero_questao
        FROM resultados_provas rp
        LEFT JOIN questoes q ON rp.questao_codigo = q.codigo
        LEFT JOIN escolas e2 ON rp.escola_id = e2.id
        ${whereClauseQuestoes}
        GROUP BY rp.questao_codigo, q.descricao, q.disciplina, q.area_conhecimento
        ORDER BY CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) ASC
        ${deveRemoverLimites ? '' : 'LIMIT 50'}
      `
      const resQuestoes = await pool.query(queryQuestoes, paramsQuestoes)
      console.log('[Graficos] Resultados encontrados:', resQuestoes.rows.length)
      resultado.questoes = resQuestoes.rows.length > 0
        ? resQuestoes.rows.map((r: any) => ({
            codigo: r.codigo,
            numero: parseInt(r.numero_questao) || 0,
            descricao: r.descricao || r.codigo,
            disciplina: r.disciplina,
            area_conhecimento: r.area_conhecimento,
            total_respostas: parseInt(r.total_respostas) || 0,
            total_acertos: parseInt(r.total_acertos) || 0,
            taxa_acerto: parseFloat(r.taxa_acerto) || 0
          }))
        : []
    }

    // 2. Heatmap de Desempenho (Escolas × Disciplinas) - CORRIGIDO para Anos Iniciais
    // Anos Iniciais: LP, MAT, PT (se houver), Geral
    // Anos Finais: LP, CH, MAT, CN, Geral
    if (tipoGrafico === 'heatmap') {
      const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`
      const mediaGeralCalc = getMediaGeralSQL()

      const queryHeatmap = `
        SELECT
          e.id as escola_id,
          e.nome as escola_nome,
          -- Identificar se é predominantemente anos iniciais
          CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END)
               THEN true ELSE false END as anos_iniciais,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
          -- CH só para anos finais
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
          -- CN só para anos finais
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
          -- PT (Produção Textual) só para anos iniciais
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_pt,
          -- Média geral com divisor fixo
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END), 2) as media_geral
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY e.id, e.nome
        HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) > 0
        ORDER BY e.nome
        ${deveRemoverLimites ? '' : 'LIMIT 50'}
      `
      const resHeatmap = await pool.query(queryHeatmap, params)
      resultado.heatmap = resHeatmap.rows.length > 0
        ? resHeatmap.rows.map((r: any) => ({
            escola: r.escola_nome,
            escola_id: r.escola_id,
            anos_iniciais: r.anos_iniciais,
            LP: parseFloat(r.media_lp) || 0,
            CH: r.anos_iniciais ? null : (parseFloat(r.media_ch) || 0),
            MAT: parseFloat(r.media_mat) || 0,
            CN: r.anos_iniciais ? null : (parseFloat(r.media_cn) || 0),
            PT: r.anos_iniciais ? (parseFloat(r.media_pt) || null) : null,
            Geral: parseFloat(r.media_geral) || 0
          }))
        : []
    }

    // 3. Radar Chart (Perfil de Desempenho) - CORRIGIDO para Anos Iniciais
    // Anos Iniciais: LP, MAT, PT
    // Anos Finais: LP, CH, MAT, CN
    if (tipoGrafico === 'radar') {
      const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

      const queryRadar = `
        SELECT
          COALESCE(e.nome, 'Geral') as nome,
          -- Identificar se é predominantemente anos iniciais
          CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END)
               THEN true ELSE false END as anos_iniciais,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as lp,
          -- CH só para anos finais
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as ch,
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as mat,
          -- CN só para anos finais
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as cn,
          -- PT (Produção Textual) só para anos iniciais
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as pt
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY e.id, e.nome
        HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) > 0
        ORDER BY e.nome
        ${deveRemoverLimites ? '' : 'LIMIT 10'}
      `
      const resRadar = await pool.query(queryRadar, params)
      resultado.radar = resRadar.rows.length > 0
        ? resRadar.rows.map((r: any) => ({
            nome: r.nome,
            anos_iniciais: r.anos_iniciais,
            LP: parseFloat(r.lp) || 0,
            CH: r.anos_iniciais ? null : (parseFloat(r.ch) || 0),
            MAT: parseFloat(r.mat) || 0,
            CN: r.anos_iniciais ? null : (parseFloat(r.cn) || 0),
            PT: r.anos_iniciais ? (parseFloat(r.pt) || null) : null
          }))
        : []
    }

    // 4. Box Plot (Distribuição de Notas)
    if (tipoGrafico === 'boxplot') {
      const notaConfigBoxplot = getCampoNota(disciplina)
      const whereBoxPlot = whereClause
        ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfigBoxplot.campo} IS NOT NULL AND CAST(${notaConfigBoxplot.campo} AS DECIMAL) > 0`
        : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfigBoxplot.campo} IS NOT NULL AND CAST(${notaConfigBoxplot.campo} AS DECIMAL) > 0`

      const queryBoxPlot = `
        SELECT
          COALESCE(e.nome, rc.serie, 'Geral') as categoria,
          CAST(${notaConfigBoxplot.campo} AS DECIMAL) as nota
        FROM resultados_consolidados_unificada rc
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

      const boxplotData = Object.keys(categorias).length > 0
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
              min: Math.round(min * 100) / 100,
              q1: Math.round(q1 * 100) / 100,
              mediana: Math.round(mediana * 100) / 100,
              q3: Math.round(q3 * 100) / 100,
              max: Math.round(max * 100) / 100,
              media: Math.round(media * 100) / 100,
              total: notas.length
            }
          })
          .slice(0, 20) // Limitar a 20 categorias
        : []

      resultado.boxplot = boxplotData
      resultado.boxplot_disciplina = notaConfigBoxplot.label
    }

    // 5. Correlação entre Disciplinas - CORRIGIDO para Anos Iniciais
    // Anos Iniciais: correlação LP x MAT (e PT se houver)
    // Anos Finais: correlação LP x CH x MAT x CN
    if (tipoGrafico === 'correlacao') {
      const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

      // Buscar dados para anos finais (LP, CH, MAT, CN)
      const whereCorrelacaoFinais = whereClause
        ? `${whereClause} AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_ch IS NOT NULL AND rc.nota_mat IS NOT NULL AND rc.nota_cn IS NOT NULL`
        : `WHERE ${numeroSerieSQL} NOT IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_ch IS NOT NULL AND rc.nota_mat IS NOT NULL AND rc.nota_cn IS NOT NULL`

      // Buscar dados para anos iniciais (LP, MAT, PT)
      const whereCorrelacaoIniciais = whereClause
        ? `${whereClause} AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_mat IS NOT NULL`
        : `WHERE ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_mat IS NOT NULL`

      const queryCorrelacaoFinais = `
        SELECT
          'anos_finais' as tipo,
          CAST(rc.nota_lp AS DECIMAL) as lp,
          CAST(rc.nota_ch AS DECIMAL) as ch,
          CAST(rc.nota_mat AS DECIMAL) as mat,
          CAST(rc.nota_cn AS DECIMAL) as cn,
          NULL::DECIMAL as pt
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereCorrelacaoFinais}
        ${deveRemoverLimites ? '' : 'LIMIT 500'}
      `

      const queryCorrelacaoIniciais = `
        SELECT
          'anos_iniciais' as tipo,
          CAST(rc.nota_lp AS DECIMAL) as lp,
          NULL::DECIMAL as ch,
          CAST(rc.nota_mat AS DECIMAL) as mat,
          NULL::DECIMAL as cn,
          CAST(rc.nota_producao AS DECIMAL) as pt
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereCorrelacaoIniciais}
        ${deveRemoverLimites ? '' : 'LIMIT 500'}
      `

      const [resCorrelacaoFinais, resCorrelacaoIniciais] = await Promise.all([
        pool.query(queryCorrelacaoFinais, params),
        pool.query(queryCorrelacaoIniciais, params)
      ])

      // Combinar resultados
      const dadosFinais = resCorrelacaoFinais.rows.map((r: any) => ({
        tipo: 'anos_finais',
        LP: parseFloat(r.lp) || 0,
        CH: parseFloat(r.ch) || 0,
        MAT: parseFloat(r.mat) || 0,
        CN: parseFloat(r.cn) || 0,
        PT: null
      }))

      const dadosIniciais = resCorrelacaoIniciais.rows.map((r: any) => ({
        tipo: 'anos_iniciais',
        LP: parseFloat(r.lp) || 0,
        CH: null,
        MAT: parseFloat(r.mat) || 0,
        CN: null,
        PT: r.pt ? parseFloat(r.pt) : null
      }))

      resultado.correlacao = [...dadosFinais, ...dadosIniciais]

      // Adicionar metadados para o frontend saber quais gráficos mostrar
      resultado.correlacao_meta = {
        tem_anos_finais: dadosFinais.length > 0,
        tem_anos_iniciais: dadosIniciais.length > 0,
        total_anos_finais: dadosFinais.length,
        total_anos_iniciais: dadosIniciais.length
      }
    }

    // 6. Ranking Interativo - CORRIGIDO para incluir media_producao e médias por etapa
    if (tipoGrafico === 'ranking') {
      const tipoRanking = searchParams.get('tipo_ranking') || 'escolas' // escolas, turmas, polos
      const notaConfigRanking = getCampoNota(disciplina)
      const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

      if (tipoRanking === 'escolas') {
        const queryRanking = `
          SELECT
            e.id,
            e.nome,
            COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigRanking.campo} IS NOT NULL AND CAST(${notaConfigRanking.campo} AS DECIMAL) > 0) THEN rc.aluno_id END) as total_alunos,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigRanking.campo} IS NOT NULL AND CAST(${notaConfigRanking.campo} AS DECIMAL) > 0) THEN CAST(${notaConfigRanking.campo} AS DECIMAL) ELSE NULL END), 2) as media_geral,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
            -- Produção Textual (apenas Anos Iniciais)
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_producao,
            -- Média Anos Iniciais (LP + MAT + PROD) / 3
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') THEN
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
            ELSE NULL END), 2) as media_ai,
            -- Média Anos Finais (LP + CH + MAT + CN) / 4
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
            ELSE NULL END), 2) as media_af,
            -- Contadores por etapa
            COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
            COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais
          FROM resultados_consolidados_unificada rc
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereClause}
          GROUP BY e.id, e.nome
          HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigRanking.campo} IS NOT NULL AND CAST(${notaConfigRanking.campo} AS DECIMAL) > 0) THEN rc.aluno_id END) > 0
          ORDER BY media_geral DESC NULLS LAST
          ${deveRemoverLimites ? '' : 'LIMIT 50'}
        `
        const resRanking = await pool.query(queryRanking, params)
        const totalAnosIniciais = resRanking.rows.reduce((acc: number, r: any) => acc + (parseInt(r.count_anos_iniciais) || 0), 0)
        const totalAnosFinais = resRanking.rows.reduce((acc: number, r: any) => acc + (parseInt(r.count_anos_finais) || 0), 0)

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
              media_cn: parseFloat(r.media_cn) || 0,
              media_producao: parseFloat(r.media_producao) || 0,
              media_ai: parseFloat(r.media_ai) || 0,
              media_af: parseFloat(r.media_af) || 0
            }))
          : []
        resultado.ranking_disciplina = notaConfigRanking.label
        resultado.ranking_meta = {
          tem_anos_iniciais: totalAnosIniciais > 0,
          tem_anos_finais: totalAnosFinais > 0
        }
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
            t.serie as turma_serie,
            e.nome as escola_nome,
            COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigRanking.campo} IS NOT NULL AND CAST(${notaConfigRanking.campo} AS DECIMAL) > 0) THEN rc.aluno_id END) as total_alunos,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigRanking.campo} IS NOT NULL AND CAST(${notaConfigRanking.campo} AS DECIMAL) > 0) THEN CAST(${notaConfigRanking.campo} AS DECIMAL) ELSE NULL END), 2) as media_geral,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
            ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_producao,
            -- Determinar se é anos iniciais ou finais
            CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > 0 THEN true ELSE false END as anos_iniciais
          FROM resultados_consolidados_unificada rc
          INNER JOIN turmas t ON rc.turma_id = t.id
          INNER JOIN escolas e ON rc.escola_id = e.id
          ${whereRankingTurmas}
          GROUP BY t.id, t.codigo, t.nome, t.serie, e.nome
          HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfigRanking.campo} IS NOT NULL AND CAST(${notaConfigRanking.campo} AS DECIMAL) > 0) THEN rc.aluno_id END) > 0
          ORDER BY media_geral DESC NULLS LAST
          ${deveRemoverLimites ? '' : 'LIMIT 50'}
        `
        const resRanking = await pool.query(queryRanking, params)
        resultado.ranking = resRanking.rows.map((r: any, index: number) => ({
          posicao: index + 1,
          id: r.id,
          nome: r.codigo || r.nome || 'Turma',
          serie: r.turma_serie,
          escola: r.escola_nome,
          total_alunos: parseInt(r.total_alunos) || 0,
          media_geral: parseFloat(r.media_geral) || 0,
          media_lp: parseFloat(r.media_lp) || 0,
          media_mat: parseFloat(r.media_mat) || 0,
          media_ch: parseFloat(r.media_ch) || 0,
          media_cn: parseFloat(r.media_cn) || 0,
          media_producao: parseFloat(r.media_producao) || 0,
          anos_iniciais: r.anos_iniciais
        }))
        resultado.ranking_disciplina = notaConfigRanking.label
      } else {
        // Se tipo_ranking não for reconhecido, retornar array vazio
        resultado.ranking = []
      }
    }

    // 7. Taxa de Aprovação Estimada
    if (tipoGrafico === 'aprovacao') {
      const notaConfigAprovacao = getCampoNota(disciplina)
      const whereAprovacao = whereClause
        ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfigAprovacao.campo} IS NOT NULL AND CAST(${notaConfigAprovacao.campo} AS DECIMAL) > 0`
        : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfigAprovacao.campo} IS NOT NULL AND CAST(${notaConfigAprovacao.campo} AS DECIMAL) > 0`

      const queryAprovacao = `
        SELECT
          COALESCE(e.nome, 'Geral') as categoria,
          COUNT(*) as total_alunos,
          SUM(CASE WHEN CAST(${notaConfigAprovacao.campo} AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_6,
          SUM(CASE WHEN CAST(${notaConfigAprovacao.campo} AS DECIMAL) >= 7.0 THEN 1 ELSE 0 END) as aprovados_7,
          SUM(CASE WHEN CAST(${notaConfigAprovacao.campo} AS DECIMAL) >= 8.0 THEN 1 ELSE 0 END) as aprovados_8,
          ROUND(AVG(CAST(${notaConfigAprovacao.campo} AS DECIMAL)), 2) as media_geral
        FROM resultados_consolidados_unificada rc
        LEFT JOIN escolas e ON rc.escola_id = e.id
        ${whereAprovacao}
        GROUP BY e.id, e.nome
        HAVING COUNT(*) > 0
        ORDER BY media_geral DESC NULLS LAST
        ${deveRemoverLimites ? '' : 'LIMIT 30'}
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
              taxa_6: Math.round(((parseInt(r.aprovados_6) || 0) / totalAlunos) * 10000) / 100,
              taxa_7: Math.round(((parseInt(r.aprovados_7) || 0) / totalAlunos) * 10000) / 100,
              taxa_8: Math.round(((parseInt(r.aprovados_8) || 0) / totalAlunos) * 10000) / 100,
              media_geral: parseFloat(r.media_geral) || 0
            }
          })
        : []
      resultado.aprovacao_disciplina = notaConfigAprovacao.label
    }

    // 8. Análise de Gaps
    if (tipoGrafico === 'gaps') {
      const notaConfigGaps = getCampoNota(disciplina)
      const whereGaps = whereClause
        ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfigGaps.campo} IS NOT NULL AND CAST(${notaConfigGaps.campo} AS DECIMAL) > 0`
        : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfigGaps.campo} IS NOT NULL AND CAST(${notaConfigGaps.campo} AS DECIMAL) > 0`

      const queryGaps = `
        SELECT
          COALESCE(e.nome, 'Geral') as categoria,
          ROUND(MAX(CAST(${notaConfigGaps.campo} AS DECIMAL)), 2) as melhor_media,
          ROUND(MIN(CAST(${notaConfigGaps.campo} AS DECIMAL)), 2) as pior_media,
          ROUND(AVG(CAST(${notaConfigGaps.campo} AS DECIMAL)), 2) as media_geral,
          ROUND(MAX(CAST(${notaConfigGaps.campo} AS DECIMAL)) - MIN(CAST(${notaConfigGaps.campo} AS DECIMAL)), 2) as gap,
          COUNT(*) as total_alunos
        FROM resultados_consolidados_unificada rc
        LEFT JOIN escolas e ON rc.escola_id = e.id
        ${whereGaps}
        GROUP BY e.id, e.nome
        HAVING COUNT(*) > 0
        ORDER BY gap DESC
        ${deveRemoverLimites ? '' : 'LIMIT 30'}
      `
      const resGaps = await pool.query(queryGaps, params)
      resultado.gaps = resGaps.rows.length > 0
        ? resGaps.rows.map((r: any) => ({
            categoria: r.categoria,
            melhor_media: parseFloat(r.melhor_media) || 0,
            pior_media: parseFloat(r.pior_media) || 0,
            media_geral: parseFloat(r.media_geral) || 0,
            gap: parseFloat(r.gap) || 0,
            total_alunos: parseInt(r.total_alunos) || 0
          }))
        : []
      resultado.gaps_disciplina = notaConfigGaps.label
    }

    // 9. Distribuição de Níveis por Disciplina (N1, N2, N3, N4)
    if (tipoGrafico === 'niveis_disciplina') {
      const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

      const queryNiveis = `
        SELECT
          -- Níveis de LP
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N1' THEN 1 END) as lp_n1,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N2' THEN 1 END) as lp_n2,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N3' THEN 1 END) as lp_n3,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N4' THEN 1 END) as lp_n4,
          -- Níveis de MAT
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N1' THEN 1 END) as mat_n1,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N2' THEN 1 END) as mat_n2,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N3' THEN 1 END) as mat_n3,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N4' THEN 1 END) as mat_n4,
          -- Níveis de PROD (apenas Anos Iniciais)
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N1' THEN 1 END) as prod_n1,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N2' THEN 1 END) as prod_n2,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N3' THEN 1 END) as prod_n3,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N4' THEN 1 END) as prod_n4,
          -- Níveis do Aluno (geral)
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N1' THEN 1 END) as aluno_n1,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N2' THEN 1 END) as aluno_n2,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N3' THEN 1 END) as aluno_n3,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N4' THEN 1 END) as aluno_n4,
          -- Totais
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_presentes,
          COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
          COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
      `
      const resNiveis = await pool.query(queryNiveis, params)

      if (resNiveis.rows.length > 0) {
        const row = resNiveis.rows[0]
        resultado.niveis_disciplina = {
          LP: {
            N1: parseInt(row.lp_n1) || 0,
            N2: parseInt(row.lp_n2) || 0,
            N3: parseInt(row.lp_n3) || 0,
            N4: parseInt(row.lp_n4) || 0
          },
          MAT: {
            N1: parseInt(row.mat_n1) || 0,
            N2: parseInt(row.mat_n2) || 0,
            N3: parseInt(row.mat_n3) || 0,
            N4: parseInt(row.mat_n4) || 0
          },
          PROD: {
            N1: parseInt(row.prod_n1) || 0,
            N2: parseInt(row.prod_n2) || 0,
            N3: parseInt(row.prod_n3) || 0,
            N4: parseInt(row.prod_n4) || 0
          },
          GERAL: {
            N1: parseInt(row.aluno_n1) || 0,
            N2: parseInt(row.aluno_n2) || 0,
            N3: parseInt(row.aluno_n3) || 0,
            N4: parseInt(row.aluno_n4) || 0
          },
          total_presentes: parseInt(row.total_presentes) || 0,
          tem_anos_iniciais: (parseInt(row.count_anos_iniciais) || 0) > 0,
          tem_anos_finais: (parseInt(row.count_anos_finais) || 0) > 0
        }
      }
    }

    // 10. Médias por Etapa de Ensino (Anos Iniciais vs Anos Finais)
    if (tipoGrafico === 'medias_etapa') {
      const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

      const queryMediasEtapa = `
        SELECT
          COALESCE(e.nome, 'Geral') as escola,
          e.id as escola_id,
          -- Média Anos Iniciais (LP + MAT + PROD) / 3
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') THEN
            (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
          ELSE NULL END), 2) as media_ai,
          -- Média Anos Finais (LP + CH + MAT + CN) / 4
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN
            (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
          ELSE NULL END), 2) as media_af,
          -- Média Geral
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${getMediaGeralSQL()}) ELSE NULL END), 2) as media_geral,
          -- Contadores
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as total_ai,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as total_af,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_alunos
        FROM resultados_consolidados_unificada rc
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause}
        GROUP BY e.id, e.nome
        HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) > 0
        ORDER BY media_geral DESC NULLS LAST
        ${deveRemoverLimites ? '' : 'LIMIT 30'}
      `
      const resMediasEtapa = await pool.query(queryMediasEtapa, params)

      resultado.medias_etapa = resMediasEtapa.rows.length > 0
        ? resMediasEtapa.rows.map((r: any) => ({
            escola: r.escola,
            escola_id: r.escola_id,
            media_ai: parseFloat(r.media_ai) || null,
            media_af: parseFloat(r.media_af) || null,
            media_geral: parseFloat(r.media_geral) || 0,
            total_ai: parseInt(r.total_ai) || 0,
            total_af: parseInt(r.total_af) || 0,
            total_alunos: parseInt(r.total_alunos) || 0
          }))
        : []

      // Calcular totais gerais
      const totaisGerais = resMediasEtapa.rows.reduce((acc: any, r: any) => ({
        total_ai: acc.total_ai + (parseInt(r.total_ai) || 0),
        total_af: acc.total_af + (parseInt(r.total_af) || 0),
        total_alunos: acc.total_alunos + (parseInt(r.total_alunos) || 0)
      }), { total_ai: 0, total_af: 0, total_alunos: 0 })

      resultado.medias_etapa_totais = totaisGerais
    }

    // 11. Distribuição de Níveis por Turma
    if (tipoGrafico === 'niveis_turma') {
      const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

      const queryNiveisTurma = `
        SELECT
          t.id as turma_id,
          t.codigo as turma_codigo,
          t.nome as turma_nome,
          t.serie as turma_serie,
          e.nome as escola_nome,
          -- Determinar etapa
          CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > 0 THEN true ELSE false END as anos_iniciais,
          -- Níveis do Aluno (geral)
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N1' THEN 1 END) as n1,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N2' THEN 1 END) as n2,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N3' THEN 1 END) as n3,
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N4' THEN 1 END) as n4,
          -- Média da turma
          ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${getMediaGeralSQL()}) ELSE NULL END), 2) as media_turma,
          -- Total de alunos presentes
          COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_alunos
        FROM resultados_consolidados_unificada rc
        INNER JOIN turmas t ON rc.turma_id = t.id
        INNER JOIN escolas e ON rc.escola_id = e.id
        ${whereClause ? `${whereClause} AND rc.turma_id IS NOT NULL` : 'WHERE rc.turma_id IS NOT NULL'}
        GROUP BY t.id, t.codigo, t.nome, t.serie, e.nome
        HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
        ORDER BY media_turma DESC NULLS LAST
        ${deveRemoverLimites ? '' : 'LIMIT 50'}
      `
      const resNiveisTurma = await pool.query(queryNiveisTurma, params)

      resultado.niveis_turma = resNiveisTurma.rows.length > 0
        ? resNiveisTurma.rows.map((r: any) => ({
            turma_id: r.turma_id,
            turma: r.turma_codigo || r.turma_nome || 'Turma',
            serie: r.turma_serie,
            escola: r.escola_nome,
            anos_iniciais: r.anos_iniciais,
            niveis: {
              N1: parseInt(r.n1) || 0,
              N2: parseInt(r.n2) || 0,
              N3: parseInt(r.n3) || 0,
              N4: parseInt(r.n4) || 0
            },
            media_turma: parseFloat(r.media_turma) || 0,
            total_alunos: parseInt(r.total_alunos) || 0,
            // Calcular nível predominante
            nivel_predominante: (() => {
              const niveis = { N1: parseInt(r.n1) || 0, N2: parseInt(r.n2) || 0, N3: parseInt(r.n3) || 0, N4: parseInt(r.n4) || 0 }
              const maxNivel = Object.entries(niveis).reduce((a, b) => b[1] > a[1] ? b : a)
              return maxNivel[0]
            })()
          }))
        : []
    }

    // Salvar no cache (expira em 1 hora)
    try {
      salvarCache(cacheOptions, resultado, 'graficos')
    } catch (cacheError) {
      console.error('Erro ao salvar cache (nao critico):', cacheError)
    }

    return NextResponse.json({
      ...resultado,
      _cache: {
        origem: 'banco',
        geradoEm: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar dados para gráficos:', error)
    return NextResponse.json(
      { mensagem: `Erro ao buscar dados para gráficos: ${error.message || 'Erro desconhecido'}` },
      { status: 500 }
    )
  }
}

