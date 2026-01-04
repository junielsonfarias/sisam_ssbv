import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarCache, carregarCache, salvarCache } from '@/lib/cache-dashboard'

export const dynamic = 'force-dynamic'

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
    const limiteAlunos = Math.min(parseInt(searchParams.get('limite_alunos') || '100'), 500) // Máximo 500 por página
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

    // Verificar se existe cache valido (apenas se nao estiver forcando atualizacao)
    if (!forcarAtualizacao && verificarCache(cacheOptions)) {
      const dadosCache = carregarCache<any>(cacheOptions)
      if (dadosCache) {
        console.log('Retornando dados do cache')
        return NextResponse.json({
          ...dadosCache,
          _cache: {
            origem: 'cache',
            carregadoEm: new Date().toISOString()
          }
        })
      }
    }

    // Construir condições de filtro
    let whereConditions: string[] = []
    const params: any[] = []
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
      whereConditions.push(`rc.serie = $${paramIndex}`)
      params.push(serie)
      paramIndex++
    }

    if (turmaId) {
      whereConditions.push(`rc.turma_id = $${paramIndex}`)
      params.push(turmaId)
      paramIndex++
    }

    if (presenca) {
      whereConditions.push(`(rc.presenca = $${paramIndex} OR rc.presenca = LOWER($${paramIndex}))`)
      params.push(presenca.toUpperCase())
      paramIndex++
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
        whereConditions.push(`rc.media_aluno >= $${paramIndex} AND rc.media_aluno < $${paramIndex + 1}`)
        params.push(min, max === 10 ? 10.01 : max)
        paramIndex += 2
      }
    }

    if (disciplina) {
      // Filtrar por disciplina específica - apenas alunos que têm nota na disciplina
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

    // Filtro de taxa de acerto mínima/máxima
    if (taxaAcertoMin || taxaAcertoMax) {
      // Calcular taxa de acerto baseado nos totais de acertos
      // Taxa = (total_acertos / total_questoes) * 100
      if (taxaAcertoMin) {
        const taxaMin = parseFloat(taxaAcertoMin)
        if (!isNaN(taxaMin)) {
          // Aproximação: se média >= 7, taxa de acerto >= 70%
          const mediaMin = (taxaMin / 100) * 10
          whereConditions.push(`rc.media_aluno >= $${paramIndex}`)
          params.push(mediaMin)
          paramIndex++
        }
      }
      if (taxaAcertoMax) {
        const taxaMax = parseFloat(taxaAcertoMax)
        if (!isNaN(taxaMax)) {
          const mediaMax = (taxaMax / 100) * 10
          whereConditions.push(`rc.media_aluno <= $${paramIndex}`)
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
    
    const metricasQuery = `
      SELECT
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(DISTINCT rc.escola_id) as total_escolas,
        COUNT(DISTINCT rc.turma_id) as total_turmas,
        COUNT(DISTINCT e.polo_id) as total_polos,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as total_faltantes,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc_table.nota_producao IS NOT NULL AND CAST(rc_table.nota_producao AS DECIMAL) > 0) THEN CAST(rc_table.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_producao,
        MIN(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as menor_media,
        MAX(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as maior_media
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${whereClause}
    `

    // ========== DISTRIBUIÇÃO POR NÍVEL DE APRENDIZAGEM ==========
    // Usar LEFT JOIN com resultados_consolidados para pegar nivel_aprendizagem
    const niveisQuery = `
      SELECT
        COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado') as nivel,
        COUNT(*) as quantidade
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
      ${whereClause}
      GROUP BY COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado')
      ORDER BY
        CASE COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado')
          WHEN 'Insuficiente' THEN 1
          WHEN 'Básico' THEN 2
          WHEN 'Adequado' THEN 3
          WHEN 'Avançado' THEN 4
          ELSE 5
        END
    `

    // ========== MÉDIAS POR SÉRIE ==========
    const mediasPorSerieQuery = `
      SELECT
        rc.serie,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${whereClause}
      GROUP BY rc.serie
      HAVING rc.serie IS NOT NULL
      ORDER BY REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')::integer NULLS LAST
    `

    // ========== MÉDIAS POR POLO ==========
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
      ${whereClause}
      GROUP BY p.id, p.nome
      ORDER BY media_geral DESC NULLS LAST
    `

    // ========== MÉDIAS POR ESCOLA ==========
    const mediasPorEscolaQuery = `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${joinNivelAprendizagem}
      ${whereClause}
      GROUP BY e.id, e.nome, p.nome
      ORDER BY media_geral DESC NULLS LAST
    `

    // ========== MÉDIAS POR TURMA ==========
    const mediasPorTurmaQuery = `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rc.serie,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      ${joinNivelAprendizagem}
      ${whereClause}
      GROUP BY t.id, t.codigo, e.nome, rc.serie
      HAVING t.id IS NOT NULL
      ORDER BY media_geral DESC NULLS LAST
    `

    // ========== DISTRIBUIÇÃO POR FAIXA DE NOTA ==========
    const faixasNotaConditions = [...whereConditions]
    faixasNotaConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p')`)
    faixasNotaConditions.push(`(rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)`)
    const faixasNotaWhere = faixasNotaConditions.length > 0 ? `WHERE ${faixasNotaConditions.join(' AND ')}` : ''
    
    const faixasNotaQuery = `
      SELECT
        CASE
          WHEN rc.media_aluno >= 0 AND rc.media_aluno < 2 THEN '0-2'
          WHEN rc.media_aluno >= 2 AND rc.media_aluno < 4 THEN '2-4'
          WHEN rc.media_aluno >= 4 AND rc.media_aluno < 6 THEN '4-6'
          WHEN rc.media_aluno >= 6 AND rc.media_aluno < 8 THEN '6-8'
          WHEN rc.media_aluno >= 8 AND rc.media_aluno <= 10 THEN '8-10'
          ELSE 'N/A'
        END as faixa,
        COUNT(*) as quantidade
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${faixasNotaWhere}
      GROUP BY faixa
      ORDER BY faixa
    `

    // ========== DISTRIBUIÇÃO POR PRESENÇA ==========
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
      ${whereClause}
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
    topAlunosConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p')`)
    topAlunosConditions.push(`(rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)`)
    const topAlunosWhere = topAlunosConditions.length > 0 ? `WHERE ${topAlunosConditions.join(' AND ')}` : ''
    
    const topAlunosQuery = `
      SELECT
        a.nome as aluno,
        e.nome as escola,
        rc.serie,
        t.codigo as turma,
        rc.media_aluno,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        COALESCE(rc_table.nivel_aprendizagem, NULL) as nivel_aprendizagem
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
      ${topAlunosWhere}
      ORDER BY rc.media_aluno DESC
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
    const alunosDetalhadosQuery = `
      SELECT
        a.id,
        a.nome as aluno,
        a.codigo,
        e.nome as escola,
        p.nome as polo,
        rc.serie,
        t.codigo as turma,
        rc.presenca,
        rc.media_aluno,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        COALESCE(rc_table.nota_producao, NULL) as nota_producao,
        COALESCE(rc_table.nivel_aprendizagem, NULL) as nivel_aprendizagem,
        rc.total_acertos_lp,
        rc.total_acertos_ch,
        rc.total_acertos_mat,
        rc.total_acertos_cn
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
      ${whereClause}
      ORDER BY rc.media_aluno DESC NULLS LAST
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

    const polosQuery = `
      SELECT DISTINCT p.id, p.nome
      FROM polos p
      INNER JOIN escolas e ON e.polo_id = p.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      ${filtrosWhereClause}
      ORDER BY p.nome
    `

    const escolasQuery = `
      SELECT DISTINCT e.id, e.nome, e.polo_id
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      ${filtrosWhereClause}
      ORDER BY e.nome
    `

    const seriesConditions = [...filtrosWhereConditions]
    seriesConditions.push(`rc.serie IS NOT NULL AND rc.serie != ''`)
    const seriesWhereClause = seriesConditions.length > 0 ? `WHERE ${seriesConditions.join(' AND ')}` : ''
    
    const seriesQuery = `
      SELECT DISTINCT rc.serie, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')::integer as serie_numero
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${seriesWhereClause}
      ORDER BY serie_numero
    `

    const turmasQuery = `
      SELECT DISTINCT t.id, t.codigo, t.escola_id
      FROM turmas t
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${filtrosWhereClause}
      ORDER BY t.codigo
    `

    const anosLetivosConditions = [...filtrosWhereConditions]
    anosLetivosConditions.push(`rc.ano_letivo IS NOT NULL AND rc.ano_letivo != ''`)
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
      ${filtrosWhereClause}
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
      rpWhereConditions.push(`rp.serie = $${rpParamIndex}`)
      rpParams.push(serie)
      rpParamIndex++
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
    if (!presenca) {
      // Se não há filtro de presença, filtrar apenas presentes por padrão para análises
      rpWhereConditionsComPresenca.push(`(rp.presenca = 'P' OR rp.presenca = 'p')`)
    }
    const rpWhereClauseComPresenca = rpWhereConditionsComPresenca.length > 0 
      ? `WHERE ${rpWhereConditionsComPresenca.join(' AND ')}` 
      : ''
    
    const rpWhereClause = rpWhereConditions.length > 0 ? `WHERE ${rpWhereConditions.join(' AND ')}` : ''

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
      HAVING COUNT(*) >= 5
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
      HAVING COUNT(*) >= 10
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
      HAVING COUNT(*) >= 5
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
      HAVING COUNT(*) >= 10
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
    // Lote 1: Métricas principais e dados básicos
    const [
      metricasResult,
      niveisResult,
      mediasPorSerieResult,
      mediasPorPoloResult,
      faixasNotaResult
    ] = await Promise.all([
      pool.query(metricasQuery, params),
      pool.query(niveisQuery, params),
      pool.query(mediasPorSerieQuery, params),
      pool.query(mediasPorPoloQuery, params),
      pool.query(faixasNotaQuery, params)
    ])

    // Lote 2: Escolas, turmas e presença
    const [
      mediasPorEscolaResult,
      mediasPorTurmaResult,
      presencaResult,
      topAlunosResult,
      totalAlunosResult
    ] = await Promise.all([
      pool.query(mediasPorEscolaQuery, params),
      pool.query(mediasPorTurmaQuery, params),
      pool.query(presencaQuery, params),
      pool.query(topAlunosQuery, params),
      pool.query(totalAlunosQuery, params)
    ])

    // Lote 3: Alunos detalhados e filtros
    const [
      alunosDetalhadosResult,
      polosResult,
      escolasResult,
      seriesResult,
      turmasResult
    ] = await Promise.all([
      pool.query(alunosDetalhadosQuery, params),
      pool.query(polosQuery, filtrosParams),
      pool.query(escolasQuery, filtrosParams),
      pool.query(seriesQuery, filtrosParams),
      pool.query(turmasQuery, filtrosParams)
    ])

    // Lote 4: Anos letivos, níveis e taxa de acerto
    const [
      anosLetivosResult,
      niveisDispResult,
      taxaAcertoPorDisciplinaResult,
      taxaAcertoGeralResult
    ] = await Promise.all([
      pool.query(anosLetivosQuery, filtrosParams),
      pool.query(niveisDispQuery, filtrosParams),
      pool.query(taxaAcertoPorDisciplinaQuery, rpParams),
      pool.query(taxaAcertoGeralQuery, rpParams)
    ])

    // Lote 5: Análises de acertos/erros
    const [
      questoesComMaisErrosResult,
      escolasComMaisErrosResult,
      turmasComMaisErrosResult,
      questoesComMaisAcertosResult,
      escolasComMaisAcertosResult,
      turmasComMaisAcertosResult
    ] = await Promise.all([
      pool.query(questoesComMaisErrosQuery, rpParams),
      pool.query(escolasComMaisErrosQuery, rpParams),
      pool.query(turmasComMaisErrosQuery, rpParams),
      pool.query(questoesComMaisAcertosQuery, rpParams),
      pool.query(escolasComMaisAcertosQuery, rpParams),
      pool.query(turmasComMaisAcertosQuery, rpParams)
    ])

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
      mediasPorSerie: mediasPorSerieResult.rows.map(row => ({
        serie: row.serie,
        total_alunos: parseInt(row.total_alunos),
        presentes: parseInt(row.presentes),
        media_geral: parseFloat(row.media_geral) || 0,
        media_lp: parseFloat(row.media_lp) || 0,
        media_mat: parseFloat(row.media_mat) || 0,
        media_ch: parseFloat(row.media_ch) || 0,
        media_cn: parseFloat(row.media_cn) || 0
      })),
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
      }
    }

    // Salvar no cache para proximas requisicoes
    try {
      salvarCache(cacheOptions, dadosResposta)
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
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor', erro: error.message },
      { status: 500 }
    )
  }
}
