import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')
    const anoLetivo = searchParams.get('ano_letivo')

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'ID do aluno é obrigatório' }, { status: 400 })
    }

    // Buscar informações do aluno
    const alunoResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo,
              e.nome as escola_nome, e.id as escola_id,
              t.codigo as turma_codigo, t.id as turma_id
       FROM alunos a
       LEFT JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Buscar todas as questões do aluno
    // Tentar múltiplas estratégias: aluno_id, código, nome (case-insensitive)
    let whereConditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // Estratégia 1: Por aluno_id (mais confiável)
    whereConditions.push(`(rp.aluno_id = $${paramIndex})`)
    params.push(alunoId)
    paramIndex++

    // Estratégia 2: Por código do aluno (se disponível)
    if (aluno.codigo) {
      whereConditions.push(`(rp.aluno_codigo = $${paramIndex})`)
      params.push(aluno.codigo)
      paramIndex++
    }

    // Estratégia 3: Por nome do aluno (case-insensitive, trimmed)
    if (aluno.nome) {
      // Remover espaços extras e normalizar
      const nomeNormalizado = aluno.nome.trim().replace(/\s+/g, ' ')
      whereConditions.push(`(UPPER(TRIM(rp.aluno_nome)) = UPPER($${paramIndex}))`)
      params.push(nomeNormalizado)
      paramIndex++
    }

    // Se nenhuma condição foi criada, usar apenas o aluno_id
    if (whereConditions.length === 0) {
      whereConditions.push(`(rp.aluno_id = $${paramIndex})`)
      params.push(alunoId)
      paramIndex++
    }

    let query = `
      SELECT 
        rp.questao_codigo,
        rp.acertou,
        rp.resposta_aluno,
        rp.area_conhecimento,
        rp.disciplina,
        rp.ano_letivo,
        q.descricao as questao_descricao,
        q.gabarito
      FROM resultados_provas rp
      LEFT JOIN questoes q ON (rp.questao_id = q.id OR rp.questao_codigo = q.codigo)
      WHERE (${whereConditions.join(' OR ')})
    `

    if (anoLetivo) {
      query += ` AND rp.ano_letivo = $${paramIndex}`
      params.push(anoLetivo)
      paramIndex++
    }

    query += ' ORDER BY rp.questao_codigo'

    const questoesResult = await pool.query(query, params)

    console.log(`[API] Questões encontradas para aluno ${alunoId} (${aluno.nome}):`, questoesResult.rows.length)
    console.log(`[API] Query: ${query.substring(0, 200)}...`)
    console.log(`[API] Params:`, params)

    // Se não encontrou questões, tentar diagnóstico mais detalhado
    if (questoesResult.rows.length === 0) {
      // Diagnóstico geral
      const diagnostico = await pool.query(`
        SELECT 
          COUNT(*) as total_geral,
          COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as registros_com_aluno_id,
          COUNT(DISTINCT aluno_codigo) FILTER (WHERE aluno_codigo IS NOT NULL) as registros_com_codigo,
          COUNT(DISTINCT aluno_nome) FILTER (WHERE aluno_nome IS NOT NULL) as registros_com_nome
        FROM resultados_provas
        WHERE ($1::varchar IS NULL OR ano_letivo = $1)
      `, [anoLetivo])
      
      console.log('[API] Diagnóstico geral:', diagnostico.rows[0])
      console.log(`[API] Buscando por: aluno_id=${alunoId}, codigo=${aluno.codigo}, nome=${aluno.nome}`)
      
      // Tentar buscar especificamente por cada critério
      if (aluno.codigo) {
        const porCodigo = await pool.query(`
          SELECT COUNT(*) as total
          FROM resultados_provas
          WHERE aluno_codigo = $1 AND ($2::varchar IS NULL OR ano_letivo = $2)
        `, [aluno.codigo, anoLetivo])
        console.log(`[API] Questões encontradas por código (${aluno.codigo}):`, porCodigo.rows[0].total)
      }
      
      if (aluno.nome) {
        const porNome = await pool.query(`
          SELECT COUNT(*) as total
          FROM resultados_provas
          WHERE UPPER(TRIM(aluno_nome)) = UPPER($1) AND ($2::varchar IS NULL OR ano_letivo = $2)
        `, [aluno.nome.trim(), anoLetivo])
        console.log(`[API] Questões encontradas por nome (${aluno.nome}):`, porNome.rows[0].total)
      }
    }

    // Organizar questões por área
    const questoesPorArea: Record<string, any[]> = {
      'Língua Portuguesa': [],
      'Ciências Humanas': [],
      'Matemática': [],
      'Ciências da Natureza': [],
    }

    questoesResult.rows.forEach((questao) => {
      const area = questao.area_conhecimento || questao.disciplina || 'Outras'
      
      // Mapear áreas
      let areaNormalizada = 'Outras'
      if (area.includes('Português') || area.includes('LP') || area.includes('Língua Portuguesa')) {
        areaNormalizada = 'Língua Portuguesa'
      } else if (area.includes('Humanas') || area.includes('CH') || area.includes('Ciências Humanas')) {
        areaNormalizada = 'Ciências Humanas'
      } else if (area.includes('Matemática') || area.includes('MAT') || area.includes('Matematica')) {
        areaNormalizada = 'Matemática'
      } else if (area.includes('Natureza') || area.includes('CN') || area.includes('Ciências da Natureza')) {
        areaNormalizada = 'Ciências da Natureza'
      }

      // Determinar faixa de questões por área baseado no código
      const questaoNum = parseInt(questao.questao_codigo?.replace('Q', '') || '0')
      if (questaoNum >= 1 && questaoNum <= 20) {
        areaNormalizada = 'Língua Portuguesa'
      } else if (questaoNum >= 21 && questaoNum <= 30) {
        areaNormalizada = 'Ciências Humanas'
      } else if (questaoNum >= 31 && questaoNum <= 50) {
        areaNormalizada = 'Matemática'
      } else if (questaoNum >= 51 && questaoNum <= 60) {
        areaNormalizada = 'Ciências da Natureza'
      }

      if (!questoesPorArea[areaNormalizada]) {
        questoesPorArea[areaNormalizada] = []
      }

      questoesPorArea[areaNormalizada].push({
        codigo: questao.questao_codigo,
        acertou: questao.acertou,
        resposta_aluno: questao.resposta_aluno,
        descricao: questao.questao_descricao,
        gabarito: questao.gabarito,
        numero: questaoNum,
      })
    })

    // Ordenar questões por número dentro de cada área
    Object.keys(questoesPorArea).forEach((area) => {
      questoesPorArea[area].sort((a, b) => a.numero - b.numero)
    })

    // Calcular estatísticas
    const totalQuestoes = questoesResult.rows.length
    const totalAcertos = questoesResult.rows.filter((q) => q.acertou).length
    const totalErros = totalQuestoes - totalAcertos

    const estatisticasPorArea: Record<string, { total: number; acertos: number; erros: number }> = {}
    Object.keys(questoesPorArea).forEach((area) => {
      const questoes = questoesPorArea[area]
      estatisticasPorArea[area] = {
        total: questoes.length,
        acertos: questoes.filter((q) => q.acertou).length,
        erros: questoes.filter((q) => !q.acertou).length,
      }
    })

    // Buscar média geral, nota de produção e nível de aprendizagem
    let mediaGeral = null
    let notaProducao = null
    let nivelAprendizagem = null
    let notaLP = null
    let notaCH = null
    let notaMAT = null
    let notaCN = null

    try {
      // Primeiro tenta buscar da view unificada
      const consolidadoResult = await pool.query(
        `SELECT
          media_aluno,
          nota_producao,
          nivel_aprendizagem,
          nota_lp,
          nota_ch,
          nota_mat,
          nota_cn
        FROM resultados_consolidados_unificada
        WHERE aluno_id = $1
        ${anoLetivo ? 'AND ano_letivo = $2' : ''}
        LIMIT 1`,
        anoLetivo ? [alunoId, anoLetivo] : [alunoId]
      )

      if (consolidadoResult.rows.length > 0) {
        const consolidado = consolidadoResult.rows[0]
        mediaGeral = consolidado.media_aluno ? parseFloat(consolidado.media_aluno) : null
        notaProducao = consolidado.nota_producao ? parseFloat(consolidado.nota_producao) : null
        nivelAprendizagem = consolidado.nivel_aprendizagem
        notaLP = consolidado.nota_lp ? parseFloat(consolidado.nota_lp) : null
        notaCH = consolidado.nota_ch ? parseFloat(consolidado.nota_ch) : null
        notaMAT = consolidado.nota_mat ? parseFloat(consolidado.nota_mat) : null
        notaCN = consolidado.nota_cn ? parseFloat(consolidado.nota_cn) : null
      } else {
        // Fallback: tenta buscar da tabela resultados_consolidados diretamente
        const consolidadoFallback = await pool.query(
          `SELECT
            media_aluno,
            nota_producao,
            nivel_aprendizagem,
            nota_lp,
            nota_ch,
            nota_mat,
            nota_cn
          FROM resultados_consolidados
          WHERE aluno_id = $1
          ${anoLetivo ? 'AND ano_letivo = $2' : ''}
          LIMIT 1`,
          anoLetivo ? [alunoId, anoLetivo] : [alunoId]
        )

        if (consolidadoFallback.rows.length > 0) {
          const consolidado = consolidadoFallback.rows[0]
          mediaGeral = consolidado.media_aluno ? parseFloat(consolidado.media_aluno) : null
          notaProducao = consolidado.nota_producao ? parseFloat(consolidado.nota_producao) : null
          nivelAprendizagem = consolidado.nivel_aprendizagem
          notaLP = consolidado.nota_lp ? parseFloat(consolidado.nota_lp) : null
          notaCH = consolidado.nota_ch ? parseFloat(consolidado.nota_ch) : null
          notaMAT = consolidado.nota_mat ? parseFloat(consolidado.nota_mat) : null
          notaCN = consolidado.nota_cn ? parseFloat(consolidado.nota_cn) : null
        }
      }

      // Se ainda não encontrou média, calcula a partir dos acertos
      if (mediaGeral === null && totalQuestoes > 0) {
        mediaGeral = (totalAcertos / totalQuestoes) * 10
      }
    } catch (e) {
      console.error('Erro ao buscar dados consolidados:', e)
      // Se der erro na view, calcula a média simples
      if (totalQuestoes > 0) {
        mediaGeral = (totalAcertos / totalQuestoes) * 10
      }
    }

    return NextResponse.json({
      aluno: {
        id: aluno.id,
        nome: aluno.nome,
        codigo: aluno.codigo,
        serie: aluno.serie,
        ano_letivo: aluno.ano_letivo,
        escola_nome: aluno.escola_nome,
        turma_codigo: aluno.turma_codigo,
      },
      questoes: questoesPorArea,
      estatisticas: {
        total: totalQuestoes,
        acertos: totalAcertos,
        erros: totalErros,
        por_area: estatisticasPorArea,
        media_geral: mediaGeral,
        nota_producao: notaProducao,
        nivel_aprendizagem: nivelAprendizagem,
        notas_disciplinas: {
          lingua_portuguesa: notaLP,
          ciencias_humanas: notaCH,
          matematica: notaMAT,
          ciencias_natureza: notaCN,
        },
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar questões do aluno:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao buscar questões do aluno', erro: error.message },
      { status: 500 }
    )
  }
}

