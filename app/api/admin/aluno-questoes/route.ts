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

    // Configuração hardcoded para séries (prioridade sobre banco de dados)
    const configuracoesHardcoded: Record<string, { disciplina: string; sigla: string; questao_inicio: number; questao_fim: number }[]> = {
      '2': [
        { disciplina: 'Língua Portuguesa', sigla: 'LP', questao_inicio: 1, questao_fim: 14 },
        { disciplina: 'Matemática', sigla: 'MAT', questao_inicio: 15, questao_fim: 28 }
      ],
      '3': [
        { disciplina: 'Língua Portuguesa', sigla: 'LP', questao_inicio: 1, questao_fim: 14 },
        { disciplina: 'Matemática', sigla: 'MAT', questao_inicio: 15, questao_fim: 28 }
      ],
      '5': [
        { disciplina: 'Língua Portuguesa', sigla: 'LP', questao_inicio: 1, questao_fim: 14 },
        { disciplina: 'Matemática', sigla: 'MAT', questao_inicio: 15, questao_fim: 34 }
      ],
      '8': [
        { disciplina: 'Língua Portuguesa', sigla: 'LP', questao_inicio: 1, questao_fim: 20 },
        { disciplina: 'Ciências Humanas', sigla: 'CH', questao_inicio: 21, questao_fim: 30 },
        { disciplina: 'Matemática', sigla: 'MAT', questao_inicio: 31, questao_fim: 50 },
        { disciplina: 'Ciências da Natureza', sigla: 'CN', questao_inicio: 51, questao_fim: 60 }
      ],
      '9': [
        { disciplina: 'Língua Portuguesa', sigla: 'LP', questao_inicio: 1, questao_fim: 20 },
        { disciplina: 'Ciências Humanas', sigla: 'CH', questao_inicio: 21, questao_fim: 30 },
        { disciplina: 'Matemática', sigla: 'MAT', questao_inicio: 31, questao_fim: 50 },
        { disciplina: 'Ciências da Natureza', sigla: 'CN', questao_inicio: 51, questao_fim: 60 }
      ]
    }

    // Buscar configuração de disciplinas para a série do aluno
    let disciplinaConfig: { disciplina: string; sigla: string; questao_inicio: number; questao_fim: number }[] = []
    if (aluno.serie) {
      // Extrair apenas o número da série
      const numeroSerie = aluno.serie.toString().match(/(\d+)/)?.[1] || aluno.serie

      // PRIORIDADE: Usar configuração hardcoded para garantir valores corretos
      if (configuracoesHardcoded[numeroSerie]) {
        disciplinaConfig = configuracoesHardcoded[numeroSerie]
        console.log(`[API] Usando configuração HARDCODED para série ${numeroSerie}:`, disciplinaConfig.length, 'disciplinas')
      } else {
        // Fallback: buscar do banco apenas se não tiver configuração hardcoded
        const configResult = await pool.query(
          `SELECT csd.disciplina, csd.sigla, csd.questao_inicio, csd.questao_fim
           FROM configuracao_series_disciplinas csd
           JOIN configuracao_series cs ON csd.serie_id = cs.id
           WHERE cs.serie = $1 AND csd.ativo = true
           ORDER BY csd.ordem`,
          [numeroSerie]
        )
        disciplinaConfig = configResult.rows
        console.log(`[API] Configuração do BANCO para série ${numeroSerie}:`, disciplinaConfig.length, 'disciplinas')
      }
    }

    // Buscar todas as questões do aluno
    // Tentar múltiplas estratégias: aluno_id, código, nome (case-insensitive)
    let whereConditions: string[] = []
    const params: (string | number | boolean | null | undefined)[] = []
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

    // Organizar questões por área - inicializar com disciplinas configuradas
    const questoesPorArea: Record<string, any[]> = {}

    // Se tem configuração de disciplinas, usar ela para inicializar as áreas
    if (disciplinaConfig.length > 0) {
      disciplinaConfig.forEach(config => {
        questoesPorArea[config.disciplina] = []
      })
    } else {
      // Fallback baseado na série
      const numeroSerie = aluno.serie?.toString().match(/(\d+)/)?.[1]

      // Anos Iniciais (2º, 3º, 5º): apenas LP e MAT
      if (numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5') {
        questoesPorArea['Língua Portuguesa'] = []
        questoesPorArea['Matemática'] = []
      } else {
        // Anos Finais (8º, 9º): 4 áreas
        questoesPorArea['Língua Portuguesa'] = []
        questoesPorArea['Ciências Humanas'] = []
        questoesPorArea['Matemática'] = []
        questoesPorArea['Ciências da Natureza'] = []
      }
    }

    // Função para encontrar a disciplina baseada no número da questão
    const encontrarDisciplina = (questaoNum: number): string => {
      // Se tem configuração do banco, usar ela
      if (disciplinaConfig.length > 0) {
        for (const config of disciplinaConfig) {
          if (questaoNum >= config.questao_inicio && questaoNum <= config.questao_fim) {
            return config.disciplina
          }
        }
      }

      // Extrair número da série para determinar o fallback correto
      const numeroSerie = aluno.serie?.toString().match(/(\d+)/)?.[1]

      // Fallback para 2º e 3º Ano (Anos Iniciais)
      // LP: Q1-Q14 (14 questões), MAT: Q15-Q28 (14 questões)
      if (numeroSerie === '2' || numeroSerie === '3') {
        if (questaoNum >= 1 && questaoNum <= 14) {
          return 'Língua Portuguesa'
        } else if (questaoNum >= 15 && questaoNum <= 28) {
          return 'Matemática'
        }
        return 'Outras'
      }

      // Fallback para 5º Ano (Anos Iniciais)
      // LP: Q1-Q14 (14 questões), MAT: Q15-Q34 (20 questões)
      if (numeroSerie === '5') {
        if (questaoNum >= 1 && questaoNum <= 14) {
          return 'Língua Portuguesa'
        } else if (questaoNum >= 15 && questaoNum <= 34) {
          return 'Matemática'
        }
        return 'Outras'
      }

      // Fallback para mapeamento padrão (Anos Finais: 8º e 9º)
      // LP: Q1-Q20, CH: Q21-Q30, MAT: Q31-Q50, CN: Q51-Q60
      if (questaoNum >= 1 && questaoNum <= 20) {
        return 'Língua Portuguesa'
      } else if (questaoNum >= 21 && questaoNum <= 30) {
        return 'Ciências Humanas'
      } else if (questaoNum >= 31 && questaoNum <= 50) {
        return 'Matemática'
      } else if (questaoNum >= 51 && questaoNum <= 60) {
        return 'Ciências da Natureza'
      }

      return 'Outras'
    }

    questoesResult.rows.forEach((questao) => {
      const questaoNum = parseInt(questao.questao_codigo?.replace('Q', '') || '0')

      // Usar a configuração da série para determinar a disciplina
      const areaNormalizada = encontrarDisciplina(questaoNum)

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
    let mediaGeral: number | null = null
    let notaProducao: number | null = null
    let nivelAprendizagem: string | null = null
    let notaLP: number | null = null
    let notaCH: number | null = null
    let notaMAT: number | null = null
    let notaCN: number | null = null
    let itensProducao: { item: number; nota: number | null }[] = []

    try {
      // Primeiro tenta buscar da tabela resultados_consolidados (mais confiável)
      // Media é calculada dinamicamente baseada na série
      const consolidadoResult = await pool.query(
        `SELECT
          -- Media calculada dinamicamente baseada na serie
          CASE
            WHEN REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              ROUND(
                (
                  COALESCE(CAST(nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(nota_producao AS DECIMAL), 0)
                ) /
                NULLIF(
                  CASE WHEN nota_lp IS NOT NULL AND CAST(nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN nota_mat IS NOT NULL AND CAST(nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN nota_producao IS NOT NULL AND CAST(nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                ),
                1
              )
            ELSE
              ROUND(
                (
                  COALESCE(CAST(nota_lp AS DECIMAL), 0) +
                  COALESCE(CAST(nota_ch AS DECIMAL), 0) +
                  COALESCE(CAST(nota_mat AS DECIMAL), 0) +
                  COALESCE(CAST(nota_cn AS DECIMAL), 0)
                ) /
                NULLIF(
                  CASE WHEN nota_lp IS NOT NULL AND CAST(nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN nota_ch IS NOT NULL AND CAST(nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN nota_mat IS NOT NULL AND CAST(nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                  CASE WHEN nota_cn IS NOT NULL AND CAST(nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                  0
                ),
                1
              )
          END as media_aluno,
          nota_producao,
          nivel_aprendizagem,
          nota_lp,
          nota_ch,
          nota_mat,
          nota_cn,
          item_producao_1,
          item_producao_2,
          item_producao_3,
          item_producao_4,
          item_producao_5,
          item_producao_6,
          item_producao_7,
          item_producao_8
        FROM resultados_consolidados
        WHERE aluno_id = $1::integer
        ${anoLetivo ? 'AND ano_letivo = $2' : ''}
        ORDER BY atualizado_em DESC NULLS LAST
        LIMIT 1`,
        anoLetivo ? [alunoId, anoLetivo] : [alunoId]
      )

      if (consolidadoResult.rows.length > 0) {
        const consolidado = consolidadoResult.rows[0]
        mediaGeral = consolidado.media_aluno !== null ? Number(consolidado.media_aluno) : null
        notaProducao = consolidado.nota_producao !== null ? Number(consolidado.nota_producao) : null
        nivelAprendizagem = consolidado.nivel_aprendizagem
        notaLP = consolidado.nota_lp !== null ? Number(consolidado.nota_lp) : null
        notaCH = consolidado.nota_ch !== null ? Number(consolidado.nota_ch) : null
        notaMAT = consolidado.nota_mat !== null ? Number(consolidado.nota_mat) : null
        notaCN = consolidado.nota_cn !== null ? Number(consolidado.nota_cn) : null

        // Processar itens de produção textual
        for (let i = 1; i <= 8; i++) {
          const itemKey = `item_producao_${i}`
          const valor = consolidado[itemKey]
          itensProducao.push({
            item: i,
            nota: valor !== null && valor !== undefined ? Number(valor) : null
          })
        }

        console.log(`[API] Dados consolidados encontrados para aluno ${alunoId}: media=${mediaGeral}, producao=${notaProducao}`)
      } else {
        // Fallback: tenta buscar da view unificada com média calculada dinamicamente
        const consolidadoView = await pool.query(
          `SELECT
            -- Media calculada dinamicamente baseada na serie
            CASE
              WHEN REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                ROUND(
                  (
                    COALESCE(CAST(nota_lp AS DECIMAL), 0) +
                    COALESCE(CAST(nota_mat AS DECIMAL), 0) +
                    COALESCE(CAST(nota_producao AS DECIMAL), 0)
                  ) /
                  NULLIF(
                    CASE WHEN nota_lp IS NOT NULL AND CAST(nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN nota_mat IS NOT NULL AND CAST(nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN nota_producao IS NOT NULL AND CAST(nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                    0
                  ),
                  1
                )
              ELSE
                ROUND(
                  (
                    COALESCE(CAST(nota_lp AS DECIMAL), 0) +
                    COALESCE(CAST(nota_ch AS DECIMAL), 0) +
                    COALESCE(CAST(nota_mat AS DECIMAL), 0) +
                    COALESCE(CAST(nota_cn AS DECIMAL), 0)
                  ) /
                  NULLIF(
                    CASE WHEN nota_lp IS NOT NULL AND CAST(nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN nota_ch IS NOT NULL AND CAST(nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN nota_mat IS NOT NULL AND CAST(nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN nota_cn IS NOT NULL AND CAST(nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                    0
                  ),
                  1
                )
            END as media_aluno,
            nota_producao,
            nivel_aprendizagem,
            nota_lp,
            nota_ch,
            nota_mat,
            nota_cn,
            item_producao_1,
            item_producao_2,
            item_producao_3,
            item_producao_4,
            item_producao_5,
            item_producao_6,
            item_producao_7,
            item_producao_8
          FROM resultados_consolidados_unificada
          WHERE aluno_id = $1::integer
          ${anoLetivo ? 'AND ano_letivo = $2' : ''}
          LIMIT 1`,
          anoLetivo ? [alunoId, anoLetivo] : [alunoId]
        )

        if (consolidadoView.rows.length > 0) {
          const consolidado = consolidadoView.rows[0]
          mediaGeral = consolidado.media_aluno !== null ? Number(consolidado.media_aluno) : null
          notaProducao = consolidado.nota_producao !== null ? Number(consolidado.nota_producao) : null
          nivelAprendizagem = consolidado.nivel_aprendizagem
          notaLP = consolidado.nota_lp !== null ? Number(consolidado.nota_lp) : null
          notaCH = consolidado.nota_ch !== null ? Number(consolidado.nota_ch) : null
          notaMAT = consolidado.nota_mat !== null ? Number(consolidado.nota_mat) : null
          notaCN = consolidado.nota_cn !== null ? Number(consolidado.nota_cn) : null

          // Processar itens de produção textual
          for (let i = 1; i <= 8; i++) {
            const itemKey = `item_producao_${i}`
            const valor = consolidado[itemKey]
            itensProducao.push({
              item: i,
              nota: valor !== null && valor !== undefined ? Number(valor) : null
            })
          }

          console.log(`[API] Dados da view unificada para aluno ${alunoId}: media=${mediaGeral}, producao=${notaProducao}`)
        }
      }

      // Se ainda não encontrou média, calcula a partir dos acertos (com mesma precisão)
      if (mediaGeral === null && totalQuestoes > 0) {
        // Usar mesma fórmula de arredondamento do banco: ROUND(..., 2)
        mediaGeral = Math.round(((totalAcertos / totalQuestoes) * 10) * 100) / 100
        console.log(`[API] Média calculada para aluno ${alunoId}: ${mediaGeral} (${totalAcertos}/${totalQuestoes})`)
      }
    } catch (e) {
      console.error('Erro ao buscar dados consolidados:', e)
      // Se der erro na view, calcula a média simples com mesma precisão
      if (totalQuestoes > 0) {
        mediaGeral = Math.round(((totalAcertos / totalQuestoes) * 10) * 100) / 100
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
        itens_producao: itensProducao,
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

