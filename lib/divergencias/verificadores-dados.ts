// SISAM - Verificadores de Divergências: Integridade de Dados
// Funções que verificam consistência e integridade dos dados no banco

import pool from '@/database/connection'
import {
  Divergencia,
  DivergenciaDetalhe,
  CONFIGURACOES_DIVERGENCIAS
} from './tipos'
import { carregarConfigSeries, extrairNumeroSerie } from './verificadores-helpers'

/**
 * Verifica alunos duplicados:
 * 1. Mesmo código (global)
 * 2. Mesmo nome na mesma escola e série
 */
export async function verificarAlunosDuplicados(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.alunos_duplicados
    const detalhes: DivergenciaDetalhe[] = []

    // 1. Verificar códigos duplicados (mesmo código em qualquer lugar)
    const resultCodigo = await pool.query(`
      WITH duplicados_codigo AS (
        SELECT codigo
        FROM alunos
        WHERE codigo IS NOT NULL AND codigo != '' AND ativo = true
        GROUP BY codigo
        HAVING COUNT(*) > 1
      )
      SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo,
             a.escola_id, e.nome as escola_nome,
             (SELECT COUNT(*) FROM alunos a2 WHERE a2.codigo = a.codigo AND a2.ativo = true) as total_duplicatas
      FROM alunos a
      INNER JOIN duplicados_codigo d ON a.codigo = d.codigo
      LEFT JOIN escolas e ON a.escola_id = e.id
      WHERE a.ativo = true
      ORDER BY a.codigo, a.nome
      LIMIT 100
    `)

    resultCodigo.rows.forEach((row: any) => {
      detalhes.push({
        id: `codigo_${row.id}`,
        entidade: 'aluno',
        entidadeId: row.id,
        codigo: row.codigo,
        nome: row.nome,
        escola: row.escola_nome || 'Sem escola',
        escolaId: row.escola_id,
        serie: row.serie,
        anoLetivo: row.ano_letivo,
        descricaoProblema: `Código "${row.codigo}" duplicado (${row.total_duplicatas}x)`,
        valorAtual: row.total_duplicatas,
        dadosExtras: { tipoDuplicacao: 'codigo' },
        sugestaoCorrecao: 'Mesclar registros ou excluir duplicata'
      })
    })

    // 2. Verificar mesmo nome na mesma escola E série (possíveis duplicatas)
    const resultNome = await pool.query(`
      WITH duplicados_nome AS (
        SELECT UPPER(TRIM(nome)) as nome_normalizado, escola_id, serie, ano_letivo
        FROM alunos
        WHERE nome IS NOT NULL AND nome != '' AND ativo = true
          AND escola_id IS NOT NULL AND serie IS NOT NULL
        GROUP BY UPPER(TRIM(nome)), escola_id, serie, ano_letivo
        HAVING COUNT(*) > 1
      )
      SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo,
             a.escola_id, e.nome as escola_nome,
             (SELECT COUNT(*) FROM alunos a2
              WHERE UPPER(TRIM(a2.nome)) = UPPER(TRIM(a.nome))
                AND a2.escola_id = a.escola_id
                AND a2.serie = a.serie
                AND a2.ano_letivo = a.ano_letivo
                AND a2.ativo = true) as total_duplicatas
      FROM alunos a
      INNER JOIN duplicados_nome d
        ON UPPER(TRIM(a.nome)) = d.nome_normalizado
        AND a.escola_id = d.escola_id
        AND a.serie = d.serie
        AND a.ano_letivo = d.ano_letivo
      LEFT JOIN escolas e ON a.escola_id = e.id
      WHERE a.ativo = true
      ORDER BY e.nome, a.serie, a.nome
      LIMIT 100
    `)

    // Filtrar para não duplicar com os já encontrados por código
    const idsJaAdicionados = new Set(detalhes.map(d => d.entidadeId))

    resultNome.rows.forEach((row: any) => {
      // Evitar duplicar se já foi adicionado pela verificação de código
      if (idsJaAdicionados.has(row.id)) return

      detalhes.push({
        id: `nome_${row.id}`,
        entidade: 'aluno',
        entidadeId: row.id,
        codigo: row.codigo,
        nome: row.nome,
        escola: row.escola_nome || 'Sem escola',
        escolaId: row.escola_id,
        serie: row.serie,
        anoLetivo: row.ano_letivo,
        descricaoProblema: `Nome "${row.nome}" duplicado na mesma escola/série (${row.total_duplicatas}x)`,
        valorAtual: row.total_duplicatas,
        dadosExtras: { tipoDuplicacao: 'nome_escola_serie' },
        sugestaoCorrecao: 'Verificar se são alunos diferentes ou mesclar/excluir'
      })
    })

    if (detalhes.length === 0) return null

    return {
      id: 'alunos_duplicados',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar alunos duplicados:', error)
    return null
  }
}

/**
 * Verifica alunos sem escola válida
 */
export async function verificarAlunosOrfaos(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.alunos_orfaos

    const result = await pool.query(`
      SELECT a.id, a.codigo, a.nome, a.serie, a.escola_id
      FROM alunos a
      LEFT JOIN escolas e ON a.escola_id = e.id
      WHERE a.ativo = true AND (a.escola_id IS NULL OR e.id IS NULL)
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((row: any) => ({
      id: row.id,
      entidade: 'aluno',
      entidadeId: row.id,
      codigo: row.codigo,
      nome: row.nome,
      serie: row.serie,
      descricaoProblema: 'Aluno sem escola válida vinculada',
      sugestaoCorrecao: 'Vincular a uma escola ou excluir o registro'
    }))

    return {
      id: 'alunos_orfaos',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar alunos órfãos:', error)
    return null
  }
}

/**
 * Verifica resultados sem aluno ou escola correspondente
 * Inclui: aluno_id NULL, aluno deletado, escola deletada
 */
export async function verificarResultadosOrfaos(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.resultados_orfaos

    // Verificar resultados consolidados órfãos (aluno ou escola inexistente)
    const resultConsolidados = await pool.query(`
      SELECT rc.id, rc.aluno_id, rc.escola_id, rc.ano_letivo, rc.serie,
             'consolidado' as tipo,
             CASE
               WHEN rc.aluno_id IS NULL THEN 'Sem aluno_id'
               WHEN a.id IS NULL THEN 'Aluno deletado'
               WHEN e.id IS NULL THEN 'Escola deletada'
             END as motivo
      FROM resultados_consolidados rc
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.aluno_id IS NULL OR a.id IS NULL OR e.id IS NULL
      LIMIT 100
    `)

    // Verificar resultados de provas órfãos
    const resultProvas = await pool.query(`
      SELECT rp.id, rp.aluno_id, rp.escola_id, rp.ano_letivo, rp.serie,
             rp.disciplina, 'prova' as tipo,
             CASE
               WHEN rp.aluno_id IS NULL THEN 'Sem aluno_id'
               WHEN a.id IS NULL THEN 'Aluno deletado'
               WHEN e.id IS NULL THEN 'Escola deletada'
             END as motivo
      FROM resultados_provas rp
      LEFT JOIN alunos a ON rp.aluno_id = a.id
      LEFT JOIN escolas e ON rp.escola_id = e.id
      WHERE rp.aluno_id IS NULL OR a.id IS NULL OR e.id IS NULL
      LIMIT 100
    `)

    const detalhes: DivergenciaDetalhe[] = []

    resultConsolidados.rows.forEach((row: any) => {
      detalhes.push({
        id: `consolidado_${row.id}`,
        entidade: 'resultado_consolidado',
        entidadeId: row.id,
        anoLetivo: row.ano_letivo,
        serie: row.serie,
        descricaoProblema: `Resultado consolidado órfão: ${row.motivo}`,
        dadosExtras: { tipo: 'consolidado', aluno_id: row.aluno_id },
        sugestaoCorrecao: 'Vincular ao aluno correto ou remover'
      })
    })

    resultProvas.rows.forEach((row: any) => {
      detalhes.push({
        id: `prova_${row.id}`,
        entidade: 'resultado_prova',
        entidadeId: row.id,
        anoLetivo: row.ano_letivo,
        serie: row.serie,
        descricaoProblema: `Resultado de prova órfão: ${row.motivo}`,
        dadosExtras: { tipo: 'prova', disciplina: row.disciplina, aluno_id: row.aluno_id },
        sugestaoCorrecao: 'Vincular ao aluno correto ou remover'
      })
    })

    if (detalhes.length === 0) return null

    return {
      id: 'resultados_orfaos',
      ...config,
      quantidade: detalhes.length,
      detalhes
    }
  } catch (error) {
    console.error('Erro ao verificar resultados órfãos:', error)
    return null
  }
}

/**
 * Verifica médias calculadas incorretamente
 * USA A MESMA LÓGICA DO PAINEL DE DADOS E RESULTADOS CONSOLIDADOS:
 * - Anos Iniciais (2º, 3º, 5º): (LP + MAT + PROD) / quantidade de notas > 0
 * - Anos Finais (8º, 9º): (LP + CH + MAT + CN) / quantidade de notas > 0
 * IMPORTANTE: Só conta a nota se nota > 0 (não apenas != null)
 */
export async function verificarMediasInconsistentes(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.medias_inconsistentes

    // Query que usa EXATAMENTE a mesma lógica do Resultados Consolidados
    const result = await pool.query(`
      SELECT
        rc.id, rc.aluno_id, rc.escola_id, rc.ano_letivo, rc.serie,
        rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn, rc.nota_producao,
        rc.media_aluno as media_armazenada,
        a.nome as aluno_nome, a.codigo as aluno_codigo, e.nome as escola_nome,
        -- Tipo de cálculo baseado na série
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN 'anos_iniciais'
          ELSE 'anos_finais'
        END as tipo_calculo,
        -- Média calculada dinamicamente (MESMA LÓGICA DO PAINEL DE DADOS)
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            -- Anos iniciais: media de LP, MAT e PROD (se nota > 0)
            ROUND(
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
              ) /
              NULLIF(
                CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                0
              ),
              2
            )
          ELSE
            -- Anos finais: media de LP, CH, MAT, CN
            ROUND(
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
              ) /
              NULLIF(
                CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                0
              ),
              2
            )
        END as media_calculada
      FROM resultados_consolidados rc
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.presenca = 'P'
        AND rc.media_aluno IS NOT NULL
    `)

    const detalhes: DivergenciaDetalhe[] = []

    result.rows.forEach((r: any) => {
      const mediaArmazenada = parseFloat(r.media_armazenada) || 0
      const mediaCalculada = parseFloat(r.media_calculada) || 0

      // Se não conseguiu calcular (todas notas = 0), pular
      if (mediaCalculada === 0 && mediaArmazenada === 0) return
      if (isNaN(mediaCalculada)) return

      // Tolerância de 0.1 para arredondamentos
      if (Math.abs(mediaCalculada - mediaArmazenada) > 0.1) {
        // Montar descrição das notas
        const notasInfo: string[] = []
        const isAnosIniciais = r.tipo_calculo === 'anos_iniciais'

        if (r.nota_lp && parseFloat(r.nota_lp) > 0) notasInfo.push(`LP:${parseFloat(r.nota_lp).toFixed(1)}`)
        if (r.nota_mat && parseFloat(r.nota_mat) > 0) notasInfo.push(`MAT:${parseFloat(r.nota_mat).toFixed(1)}`)

        if (isAnosIniciais) {
          if (r.nota_producao && parseFloat(r.nota_producao) > 0) notasInfo.push(`Prod:${parseFloat(r.nota_producao).toFixed(1)}`)
        } else {
          if (r.nota_ch && parseFloat(r.nota_ch) > 0) notasInfo.push(`CH:${parseFloat(r.nota_ch).toFixed(1)}`)
          if (r.nota_cn && parseFloat(r.nota_cn) > 0) notasInfo.push(`CN:${parseFloat(r.nota_cn).toFixed(1)}`)
        }

        detalhes.push({
          id: r.id,
          entidade: 'resultado_consolidado',
          entidadeId: r.id,
          nome: r.aluno_nome,
          codigo: r.aluno_codigo,
          escola: r.escola_nome,
          escolaId: r.escola_id,
          serie: r.serie,
          anoLetivo: r.ano_letivo,
          descricaoProblema: `Média banco ${mediaArmazenada.toFixed(2)} ≠ esperada ${mediaCalculada.toFixed(2)} (${notasInfo.join(', ')})`,
          valorAtual: mediaArmazenada,
          valorEsperado: mediaCalculada,
          dadosExtras: {
            tipoCalculo: isAnosIniciais ? 'Anos Iniciais' : 'Anos Finais',
            notas: notasInfo.join(', ')
          },
          sugestaoCorrecao: 'Atualizar media_aluno no banco de dados'
        })
      }
    })

    if (detalhes.length === 0) return null

    return { id: 'medias_inconsistentes', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar médias inconsistentes:', error)
    return null
  }
}

/**
 * Verifica notas fora do intervalo válido (0-10)
 */
export async function verificarNotasForaRange(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.notas_fora_range

    const result = await pool.query(`
      SELECT rc.id, rc.aluno_id, rc.escola_id, rc.ano_letivo, rc.serie,
             rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn, rc.media_aluno,
             a.nome as aluno_nome, a.codigo as aluno_codigo, e.nome as escola_nome
      FROM resultados_consolidados rc
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE (rc.nota_lp IS NOT NULL AND (rc.nota_lp < 0 OR rc.nota_lp > 10))
         OR (rc.nota_mat IS NOT NULL AND (rc.nota_mat < 0 OR rc.nota_mat > 10))
         OR (rc.nota_ch IS NOT NULL AND (rc.nota_ch < 0 OR rc.nota_ch > 10))
         OR (rc.nota_cn IS NOT NULL AND (rc.nota_cn < 0 OR rc.nota_cn > 10))
         OR (rc.media_aluno IS NOT NULL AND (rc.media_aluno < 0 OR rc.media_aluno > 10))
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = []
    result.rows.forEach((r: any) => {
      const campos = [
        { nome: 'nota_lp', valor: r.nota_lp, label: 'Nota LP' },
        { nome: 'nota_mat', valor: r.nota_mat, label: 'Nota MAT' },
        { nome: 'nota_ch', valor: r.nota_ch, label: 'Nota CH' },
        { nome: 'nota_cn', valor: r.nota_cn, label: 'Nota CN' },
        { nome: 'media_aluno', valor: r.media_aluno, label: 'Média' }
      ]
      campos.forEach(campo => {
        if (campo.valor !== null && (campo.valor < 0 || campo.valor > 10)) {
          detalhes.push({
            id: `${r.id}_${campo.nome}`,
            entidade: 'resultado_consolidado',
            entidadeId: r.id,
            nome: r.aluno_nome,
            codigo: r.aluno_codigo,
            escola: r.escola_nome,
            escolaId: r.escola_id,
            serie: r.serie,
            anoLetivo: r.ano_letivo,
            descricaoProblema: `${campo.label} com valor inválido: ${campo.valor}`,
            valorAtual: campo.valor,
            valorEsperado: 'Entre 0 e 10',
            dadosExtras: { campo: campo.nome },
            sugestaoCorrecao: 'Corrigir nota para valor válido'
          })
        }
      })
    })

    if (detalhes.length === 0) return null
    return { id: 'notas_fora_range', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar notas fora do range:', error)
    return null
  }
}

/**
 * Verifica total de acertos incorreto
 * O total de acertos deve corresponder à contagem real de questões acertadas
 */
export async function verificarTotalAcertosErrado(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.total_acertos_errado
    const configSeries = await carregarConfigSeries()

    const result = await pool.query(`
      SELECT rc.id, rc.aluno_id, rc.escola_id, rc.ano_letivo, rc.serie,
             rc.total_acertos_lp, rc.total_acertos_mat, rc.total_acertos_ch, rc.total_acertos_cn,
             rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn,
             a.nome as aluno_nome, a.codigo as aluno_codigo, e.nome as escola_nome
      FROM resultados_consolidados rc
      LEFT JOIN alunos a ON rc.aluno_id = a.id
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.presenca = 'P'
    `)

    const detalhes: DivergenciaDetalhe[] = []

    result.rows.forEach((r: any) => {
      const numeroSerie = extrairNumeroSerie(r.serie)
      const configSerie = numeroSerie ? configSeries.get(numeroSerie) : null

      if (!configSerie) return

      // Verificar cada disciplina
      const verificacoes = [
        {
          disciplina: 'LP',
          acertos: parseInt(r.total_acertos_lp) || 0,
          nota: parseFloat(r.nota_lp),
          totalQuestoes: configSerie.qtd_questoes_lp,
          avalia: configSerie.avalia_lp
        },
        {
          disciplina: 'MAT',
          acertos: parseInt(r.total_acertos_mat) || 0,
          nota: parseFloat(r.nota_mat),
          totalQuestoes: configSerie.qtd_questoes_mat,
          avalia: configSerie.avalia_mat
        },
        {
          disciplina: 'CH',
          acertos: parseInt(r.total_acertos_ch) || 0,
          nota: parseFloat(r.nota_ch),
          totalQuestoes: configSerie.qtd_questoes_ch,
          avalia: configSerie.avalia_ch
        },
        {
          disciplina: 'CN',
          acertos: parseInt(r.total_acertos_cn) || 0,
          nota: parseFloat(r.nota_cn),
          totalQuestoes: configSerie.qtd_questoes_cn,
          avalia: configSerie.avalia_cn
        }
      ]

      verificacoes.forEach(v => {
        if (!v.avalia || v.totalQuestoes === 0) return
        if (isNaN(v.nota)) return

        // Calcular acertos esperados a partir da nota (nota = acertos/total * 10)
        const acertosEsperados = Math.round((v.nota / 10) * v.totalQuestoes)

        // Se a diferença for maior que 1, reportar
        if (Math.abs(v.acertos - acertosEsperados) > 1) {
          detalhes.push({
            id: `${r.id}_${v.disciplina}`,
            entidade: 'resultado_consolidado',
            entidadeId: r.id,
            nome: r.aluno_nome,
            codigo: r.aluno_codigo,
            escola: r.escola_nome,
            escolaId: r.escola_id,
            serie: r.serie,
            anoLetivo: r.ano_letivo,
            descricaoProblema: `${v.disciplina}: ${v.acertos} acertos mas nota ${v.nota.toFixed(2)} sugere ~${acertosEsperados}`,
            valorAtual: v.acertos,
            valorEsperado: acertosEsperados,
            dadosExtras: {
              disciplina: v.disciplina,
              nota: v.nota.toFixed(2),
              totalQuestoes: v.totalQuestoes
            },
            sugestaoCorrecao: 'Recalcular total de acertos ou verificar nota'
          })
        }
      })
    })

    if (detalhes.length === 0) return null

    return { id: 'total_acertos_errado', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar total de acertos:', error)
    return null
  }
}

/**
 * Verifica alunos sem resultados
 */
export async function verificarAlunosSemResultados(): Promise<Divergencia | null> {
  try {
    const config = CONFIGURACOES_DIVERGENCIAS.alunos_sem_resultados

    const result = await pool.query(`
      SELECT a.id, a.codigo, a.nome, a.serie, a.escola_id, e.nome as escola_nome
      FROM alunos a
      LEFT JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN resultados_consolidados rc ON a.id = rc.aluno_id
      WHERE a.ativo = true AND rc.id IS NULL
      LIMIT 100
    `)

    if (result.rows.length === 0) return null

    const detalhes: DivergenciaDetalhe[] = result.rows.map((r: any) => ({
      id: r.id,
      entidade: 'aluno',
      entidadeId: r.id,
      codigo: r.codigo,
      nome: r.nome,
      escola: r.escola_nome,
      escolaId: r.escola_id,
      serie: r.serie,
      descricaoProblema: 'Aluno cadastrado sem nenhum resultado de prova',
      sugestaoCorrecao: 'Importar resultados ou verificar se aluno está correto'
    }))

    return { id: 'alunos_sem_resultados', ...config, quantidade: detalhes.length, detalhes }
  } catch (error) {
    console.error('Erro ao verificar alunos sem resultados:', error)
    return null
  }
}
