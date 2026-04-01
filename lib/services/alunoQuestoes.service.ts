import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('AlunoQuestoesService')

// ============================================================================
// Service de Questões do Aluno — análise de desempenho por área
// Extraído de app/api/admin/aluno-questoes/route.ts
// ============================================================================

/** Configuração de disciplina por série */
interface DisciplinaConfig {
  disciplina: string
  sigla: string
  questao_inicio: number
  questao_fim: number
}

/** Questão individual organizada */
interface QuestaoOrganizada {
  codigo: string
  acertou: boolean
  resposta_aluno: string | null
  descricao: string | null
  gabarito: string | null
  numero: number
}

/** Estatísticas por área */
interface EstatisticaArea {
  total: number
  acertos: number
  erros: number
}

/** Item de produção textual */
interface ItemProducao {
  item: number
  nota: number | null
}

/** Resultado completo da busca de questões do aluno */
export interface AlunoQuestoesResult {
  aluno: {
    id: string
    nome: string
    codigo: string | null
    serie: string | null
    ano_letivo: string | null
    escola_nome: string | null
    turma_codigo: string | null
  }
  questoes: Record<string, QuestaoOrganizada[]>
  estatisticas: {
    total: number
    acertos: number
    erros: number
    por_area: Record<string, EstatisticaArea>
    media_geral: number | null
    nota_producao: number | null
    itens_producao: ItemProducao[]
    nivel_aprendizagem: string | null
    notas_disciplinas: {
      lingua_portuguesa: number | null
      ciencias_humanas: number | null
      matematica: number | null
      ciencias_natureza: number | null
    }
  }
}

/** Configuração hardcoded para séries (prioridade sobre banco de dados) */
const configuracoesHardcoded: Record<string, DisciplinaConfig[]> = {
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

/** SQL para calcular media dinamicamente baseada na serie */
const MEDIA_CASE_SQL = `
  CASE
    WHEN COALESCE(serie_numero, REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
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
  END as media_aluno`

/** Colunas de consolidado compartilhadas entre as duas queries */
const CONSOLIDADO_COLUMNS = `
  ${MEDIA_CASE_SQL},
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
  item_producao_8`

/**
 * Busca a configuração de disciplinas para uma série.
 * Prioriza config hardcoded, fallback para banco de dados.
 */
async function buscarDisciplinaConfig(serie: string | null): Promise<DisciplinaConfig[]> {
  if (!serie) return []

  const numeroSerie = serie.toString().match(/(\d+)/)?.[1] || serie

  // PRIORIDADE: Usar configuração hardcoded para garantir valores corretos
  if (configuracoesHardcoded[numeroSerie]) {
    log.debug('Usando configuração hardcoded', { serie: numeroSerie, disciplinas: configuracoesHardcoded[numeroSerie].length })
    return configuracoesHardcoded[numeroSerie]
  }

  // Fallback: buscar do banco apenas se não tiver configuração hardcoded
  const configResult = await pool.query(
    `SELECT csd.disciplina, csd.sigla, csd.questao_inicio, csd.questao_fim
     FROM configuracao_series_disciplinas csd
     JOIN configuracao_series cs ON csd.serie_id = cs.id
     WHERE cs.serie = $1 AND csd.ativo = true
     ORDER BY csd.ordem`,
    [numeroSerie]
  )
  log.debug('Configuração do banco', { serie: numeroSerie, disciplinas: configResult.rows.length })
  return configResult.rows
}

/**
 * Encontra a disciplina baseada no número da questão e configuração da série.
 */
function encontrarDisciplina(
  questaoNum: number,
  disciplinaConfig: DisciplinaConfig[],
  serie: string | null
): string {
  // Se tem configuração, usar ela
  if (disciplinaConfig.length > 0) {
    for (const config of disciplinaConfig) {
      if (questaoNum >= config.questao_inicio && questaoNum <= config.questao_fim) {
        return config.disciplina
      }
    }
  }

  // Extrair número da série para determinar o fallback correto
  const numeroSerie = serie?.toString().match(/(\d+)/)?.[1]

  // Fallback para 2º e 3º Ano (Anos Iniciais)
  // LP: Q1-Q14 (14 questões), MAT: Q15-Q28 (14 questões)
  if (numeroSerie === '2' || numeroSerie === '3') {
    if (questaoNum >= 1 && questaoNum <= 14) return 'Língua Portuguesa'
    if (questaoNum >= 15 && questaoNum <= 28) return 'Matemática'
    return 'Outras'
  }

  // Fallback para 5º Ano (Anos Iniciais)
  // LP: Q1-Q14 (14 questões), MAT: Q15-Q34 (20 questões)
  if (numeroSerie === '5') {
    if (questaoNum >= 1 && questaoNum <= 14) return 'Língua Portuguesa'
    if (questaoNum >= 15 && questaoNum <= 34) return 'Matemática'
    return 'Outras'
  }

  // Fallback para mapeamento padrão (Anos Finais: 8º e 9º)
  // LP: Q1-Q20, CH: Q21-Q30, MAT: Q31-Q50, CN: Q51-Q60
  if (questaoNum >= 1 && questaoNum <= 20) return 'Língua Portuguesa'
  if (questaoNum >= 21 && questaoNum <= 30) return 'Ciências Humanas'
  if (questaoNum >= 31 && questaoNum <= 50) return 'Matemática'
  if (questaoNum >= 51 && questaoNum <= 60) return 'Ciências da Natureza'

  return 'Outras'
}

/**
 * Inicializa o mapa de questões por área baseado na configuração ou série.
 */
function inicializarQuestoesPorArea(
  disciplinaConfig: DisciplinaConfig[],
  serie: string | null
): Record<string, QuestaoOrganizada[]> {
  const questoesPorArea: Record<string, QuestaoOrganizada[]> = {}

  if (disciplinaConfig.length > 0) {
    disciplinaConfig.forEach(config => {
      questoesPorArea[config.disciplina] = []
    })
  } else {
    const numeroSerie = serie?.toString().match(/(\d+)/)?.[1]

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

  return questoesPorArea
}

/**
 * Processa um registro consolidado extraindo notas e itens de produção.
 */
function processarConsolidado(consolidado: Record<string, unknown>) {
  const mediaGeral = consolidado.media_aluno !== null ? Number(consolidado.media_aluno) : null
  const notaProducao = consolidado.nota_producao !== null ? Number(consolidado.nota_producao) : null
  const nivelAprendizagem = consolidado.nivel_aprendizagem as string | null
  const notaLP = consolidado.nota_lp !== null ? Number(consolidado.nota_lp) : null
  const notaCH = consolidado.nota_ch !== null ? Number(consolidado.nota_ch) : null
  const notaMAT = consolidado.nota_mat !== null ? Number(consolidado.nota_mat) : null
  const notaCN = consolidado.nota_cn !== null ? Number(consolidado.nota_cn) : null

  const itensProducao: ItemProducao[] = []
  for (let i = 1; i <= 8; i++) {
    const itemKey = `item_producao_${i}`
    const valor = consolidado[itemKey]
    itensProducao.push({
      item: i,
      nota: valor !== null && valor !== undefined ? Number(valor) : null
    })
  }

  return { mediaGeral, notaProducao, nivelAprendizagem, notaLP, notaCH, notaMAT, notaCN, itensProducao }
}

/**
 * Busca questões e resultados de um aluno para análise de desempenho.
 * Consolida as queries e cálculos de admin/aluno-questoes.
 *
 * @param alunoId - ID do aluno
 * @param anoLetivo - Ano letivo (opcional)
 * @param limite - Limite de segurança para evitar retornos muito grandes (default 500, max 1000)
 * @returns Resultado completo ou null se aluno não encontrado
 */
export async function buscarAlunoQuestoes(
  alunoId: string,
  anoLetivo?: string | null,
  limite: number = 500
): Promise<AlunoQuestoesResult | null> {
  const limiteSeguranca = Math.min(limite, 1000)

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
    return null
  }

  const aluno = alunoResult.rows[0]

  // Buscar configuração de disciplinas para a série do aluno
  const disciplinaConfig = await buscarDisciplinaConfig(aluno.serie)

  // Construir query de questões com múltiplas estratégias de busca
  const whereConditions: string[] = []
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

  query += ` ORDER BY rp.questao_codigo LIMIT $${paramIndex}`
  params.push(limiteSeguranca)

  const questoesResult = await pool.query(query, params)

  log.debug('Questões encontradas', { alunoId, nome: aluno.nome, total: questoesResult.rows.length })

  // Se não encontrou questões, diagnóstico detalhado
  if (questoesResult.rows.length === 0) {
    const diagnostico = await pool.query(`
      SELECT
        COUNT(*) as total_geral,
        COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as registros_com_aluno_id,
        COUNT(DISTINCT aluno_codigo) FILTER (WHERE aluno_codigo IS NOT NULL) as registros_com_codigo,
        COUNT(DISTINCT aluno_nome) FILTER (WHERE aluno_nome IS NOT NULL) as registros_com_nome
      FROM resultados_provas
      WHERE ($1::varchar IS NULL OR ano_letivo = $1)
    `, [anoLetivo ?? null])

    log.debug('Diagnóstico geral', { ...diagnostico.rows[0], alunoId, codigo: aluno.codigo, nome: aluno.nome })

    if (aluno.codigo) {
      const porCodigo = await pool.query(`
        SELECT COUNT(*) as total
        FROM resultados_provas
        WHERE aluno_codigo = $1 AND ($2::varchar IS NULL OR ano_letivo = $2)
      `, [aluno.codigo, anoLetivo ?? null])
      log.debug('Questões por código', { codigo: aluno.codigo, total: porCodigo.rows[0].total })
    }

    if (aluno.nome) {
      const porNome = await pool.query(`
        SELECT COUNT(*) as total
        FROM resultados_provas
        WHERE UPPER(TRIM(aluno_nome)) = UPPER($1) AND ($2::varchar IS NULL OR ano_letivo = $2)
      `, [aluno.nome.trim(), anoLetivo ?? null])
      log.debug('Questões por nome', { nome: aluno.nome, total: porNome.rows[0].total })
    }
  }

  // Organizar questões por área
  const questoesPorArea = inicializarQuestoesPorArea(disciplinaConfig, aluno.serie)

  questoesResult.rows.forEach((questao) => {
    const questaoNum = parseInt(questao.questao_codigo?.replace('Q', '') || '0')
    const areaNormalizada = encontrarDisciplina(questaoNum, disciplinaConfig, aluno.serie)

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

  const estatisticasPorArea: Record<string, EstatisticaArea> = {}
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
  let itensProducao: ItemProducao[] = []

  try {
    // Primeiro tenta buscar da tabela resultados_consolidados (mais confiável)
    const consolidadoResult = await pool.query(
      `SELECT ${CONSOLIDADO_COLUMNS}
      FROM resultados_consolidados
      WHERE aluno_id = $1
      ${anoLetivo ? 'AND ano_letivo = $2' : ''}
      ORDER BY atualizado_em DESC NULLS LAST
      LIMIT 1`,
      anoLetivo ? [alunoId, anoLetivo] : [alunoId]
    )

    if (consolidadoResult.rows.length > 0) {
      const dados = processarConsolidado(consolidadoResult.rows[0])
      mediaGeral = dados.mediaGeral
      notaProducao = dados.notaProducao
      nivelAprendizagem = dados.nivelAprendizagem
      notaLP = dados.notaLP
      notaCH = dados.notaCH
      notaMAT = dados.notaMAT
      notaCN = dados.notaCN
      itensProducao = dados.itensProducao

      log.debug('Dados consolidados', { alunoId, media: mediaGeral, producao: notaProducao, itensProducao: itensProducao.length })
    } else {
      // Fallback: tenta buscar da view unificada
      const consolidadoView = await pool.query(
        `SELECT ${CONSOLIDADO_COLUMNS}
        FROM resultados_consolidados_unificada
        WHERE aluno_id = $1
        ${anoLetivo ? 'AND ano_letivo = $2' : ''}
        LIMIT 1`,
        anoLetivo ? [alunoId, anoLetivo] : [alunoId]
      )

      if (consolidadoView.rows.length > 0) {
        const dados = processarConsolidado(consolidadoView.rows[0])
        mediaGeral = dados.mediaGeral
        notaProducao = dados.notaProducao
        nivelAprendizagem = dados.nivelAprendizagem
        notaLP = dados.notaLP
        notaCH = dados.notaCH
        notaMAT = dados.notaMAT
        notaCN = dados.notaCN
        itensProducao = dados.itensProducao

        log.debug('Dados da view unificada', { alunoId, media: mediaGeral, producao: notaProducao })
      }
    }

    // Se ainda não encontrou média, calcula a partir dos acertos
    if (mediaGeral === null && totalQuestoes > 0) {
      mediaGeral = Math.round(((totalAcertos / totalQuestoes) * 10) * 100) / 100
      log.debug('Média calculada', { alunoId, media: mediaGeral, acertos: totalAcertos, total: totalQuestoes })
    }
  } catch (e) {
    log.error('Erro ao buscar dados consolidados', { error: e })
    // Se der erro na view, calcula a média simples com mesma precisão
    if (totalQuestoes > 0) {
      mediaGeral = Math.round(((totalAcertos / totalQuestoes) * 10) * 100) / 100
    }
  }

  return {
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
  }
}
