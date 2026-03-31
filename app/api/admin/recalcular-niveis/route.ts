import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import {
  calcularNivelPorAcertos,
  converterNivelProducao,
  calcularNivelPorNota,
  calcularNivelAluno,
  isAnosIniciais,
} from '@/lib/config-series'
import { limparTodosOsCaches } from '@/lib/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('RecalcularNiveis')

export const dynamic = 'force-dynamic'

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
    const { searchParams } = new URL(request.url)
    const avaliacaoId = searchParams.get('avaliacao_id')

    log.info('Iniciando recálculo de níveis para registros existentes...')

    // Buscar todos os registros de anos iniciais que têm acertos mas não têm níveis calculados
    let registrosQuery = `
      SELECT
        id, serie, presenca,
        total_acertos_lp, total_acertos_mat,
        nota_producao, nivel_aprendizagem,
        nivel_lp, nivel_mat, nivel_prod, nivel_aluno
      FROM resultados_consolidados
      WHERE (
        -- Anos iniciais (2º, 3º e 5º ano)
        COALESCE(serie_numero, REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')
      )
      AND (
        -- Tem acertos mas não tem níveis calculados, OU tem nota de produção mas sem nível
        (total_acertos_lp > 0 OR total_acertos_mat > 0 OR (nota_producao IS NOT NULL AND CAST(nota_producao AS DECIMAL) > 0))
        AND (nivel_lp IS NULL OR nivel_mat IS NULL OR nivel_prod IS NULL OR nivel_aluno IS NULL)
      )
      AND presenca = 'P'
    `
    const registrosParams: string[] = []
    if (avaliacaoId) {
      registrosQuery += ` AND avaliacao_id = $1`
      registrosParams.push(avaliacaoId)
    }

    const registrosResult = await pool.query(registrosQuery, registrosParams)

    log.info(`Encontrados ${registrosResult.rows.length} registros para atualizar`)

    let atualizados = 0
    let erros = 0

    for (const registro of registrosResult.rows) {
      try {
        const serie = registro.serie

        // Calcular nível de LP baseado em acertos
        const nivelLp = calcularNivelPorAcertos(registro.total_acertos_lp, serie, 'LP')

        // Calcular nível de MAT baseado em acertos
        const nivelMat = calcularNivelPorAcertos(registro.total_acertos_mat, serie, 'MAT')

        // Converter nível de produção textual (do nivel_aprendizagem existente, com fallback pela nota)
        let nivelProd = converterNivelProducao(registro.nivel_aprendizagem)
        if (!nivelProd && registro.nota_producao !== null && registro.nota_producao !== undefined && Number(registro.nota_producao) > 0) {
          nivelProd = calcularNivelPorNota(Number(registro.nota_producao))
        }

        // Calcular nível geral do aluno (média dos 3 níveis)
        const nivelAlunoCalc = calcularNivelAluno(nivelLp, nivelMat, nivelProd)

        // Atualizar registro
        await pool.query(`
          UPDATE resultados_consolidados
          SET
            nivel_lp = $1,
            nivel_mat = $2,
            nivel_prod = $3,
            nivel_aluno = $4,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [nivelLp, nivelMat, nivelProd, nivelAlunoCalc, registro.id])

        atualizados++
      } catch (error: unknown) {
        log.error(`Erro ao atualizar registro ${registro.id}`, error)
        erros++
      }
    }

    // Limpar cache após atualização
    try {
      limparTodosOsCaches()
      log.info('Cache invalidado após recálculo')
    } catch (cacheError) {
      log.error('Erro ao invalidar cache (não crítico)', cacheError)
    }

    log.info(`Concluído: ${atualizados} atualizados, ${erros} erros`)

    return NextResponse.json({
      mensagem: 'Recálculo de níveis concluído',
      total_registros: registrosResult.rows.length,
      atualizados,
      erros,
    })
})

// Endpoint GET para verificar status
export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
    const { searchParams } = new URL(request.url)
    const avaliacaoId = searchParams.get('avaliacao_id')

    // Contar registros que precisam de atualização
    let countQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN nivel_lp IS NULL THEN 1 END) as sem_nivel_lp,
        COUNT(CASE WHEN nivel_mat IS NULL THEN 1 END) as sem_nivel_mat,
        COUNT(CASE WHEN nivel_prod IS NULL THEN 1 END) as sem_nivel_prod,
        COUNT(CASE WHEN nivel_aluno IS NULL THEN 1 END) as sem_nivel_aluno
      FROM resultados_consolidados
      WHERE (
        COALESCE(serie_numero, REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')
      )
      AND (total_acertos_lp > 0 OR total_acertos_mat > 0 OR (nota_producao IS NOT NULL AND CAST(nota_producao AS DECIMAL) > 0))
      AND presenca = 'P'
    `
    const countParams: string[] = []
    if (avaliacaoId) {
      countQuery += ` AND avaliacao_id = $1`
      countParams.push(avaliacaoId)
    }

    const countResult = await pool.query(countQuery, countParams)

    const stats = countResult.rows[0]

    return NextResponse.json({
      total_registros_anos_iniciais: parseInt(stats.total || '0'),
      sem_nivel_lp: parseInt(stats.sem_nivel_lp || '0'),
      sem_nivel_mat: parseInt(stats.sem_nivel_mat || '0'),
      sem_nivel_prod: parseInt(stats.sem_nivel_prod || '0'),
      sem_nivel_aluno: parseInt(stats.sem_nivel_aluno || '0'),
      necessita_recalculo: parseInt(stats.sem_nivel_aluno || '0') > 0 || parseInt(stats.sem_nivel_prod || '0') > 0,
    })
})
