import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import {
  calcularNivelPorAcertos,
  converterNivelProducao,
  calcularNivelAluno,
  isAnosIniciais,
} from '@/lib/config-series'
import { limparTodosOsCaches } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    console.log('[Recalcular Níveis] Iniciando recálculo de níveis para registros existentes...')

    // Buscar todos os registros de anos iniciais que têm acertos mas não têm níveis calculados
    const registrosResult = await pool.query(`
      SELECT
        id, serie, presenca,
        total_acertos_lp, total_acertos_mat,
        nivel_aprendizagem,
        nivel_lp, nivel_mat, nivel_prod, nivel_aluno
      FROM resultados_consolidados
      WHERE (
        -- Anos iniciais (2º, 3º e 5º ano)
        REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
      )
      AND (
        -- Tem acertos mas não tem níveis calculados
        (total_acertos_lp > 0 OR total_acertos_mat > 0)
        AND (nivel_lp IS NULL OR nivel_mat IS NULL OR nivel_aluno IS NULL)
      )
      AND presenca = 'P'
    `)

    console.log(`[Recalcular Níveis] Encontrados ${registrosResult.rows.length} registros para atualizar`)

    let atualizados = 0
    let erros = 0

    for (const registro of registrosResult.rows) {
      try {
        const serie = registro.serie

        // Calcular nível de LP baseado em acertos
        const nivelLp = calcularNivelPorAcertos(registro.total_acertos_lp, serie, 'LP')

        // Calcular nível de MAT baseado em acertos
        const nivelMat = calcularNivelPorAcertos(registro.total_acertos_mat, serie, 'MAT')

        // Converter nível de produção textual (do nivel_aprendizagem existente)
        const nivelProd = converterNivelProducao(registro.nivel_aprendizagem)

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
      } catch (error: any) {
        console.error(`[Recalcular Níveis] Erro ao atualizar registro ${registro.id}:`, error.message)
        erros++
      }
    }

    // Limpar cache após atualização
    try {
      limparTodosOsCaches()
      console.log('[Recalcular Níveis] Cache invalidado após recálculo')
    } catch (cacheError) {
      console.error('[Recalcular Níveis] Erro ao invalidar cache (não crítico):', cacheError)
    }

    console.log(`[Recalcular Níveis] Concluído: ${atualizados} atualizados, ${erros} erros`)

    return NextResponse.json({
      mensagem: 'Recálculo de níveis concluído',
      total_registros: registrosResult.rows.length,
      atualizados,
      erros,
    })
  } catch (error: any) {
    console.error('[Recalcular Níveis] Erro:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar status
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Contar registros que precisam de atualização
    const countResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN nivel_lp IS NULL THEN 1 END) as sem_nivel_lp,
        COUNT(CASE WHEN nivel_mat IS NULL THEN 1 END) as sem_nivel_mat,
        COUNT(CASE WHEN nivel_aluno IS NULL THEN 1 END) as sem_nivel_aluno
      FROM resultados_consolidados
      WHERE (
        REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
      )
      AND (total_acertos_lp > 0 OR total_acertos_mat > 0)
      AND presenca = 'P'
    `)

    const stats = countResult.rows[0]

    return NextResponse.json({
      total_registros_anos_iniciais: parseInt(stats.total || '0'),
      sem_nivel_lp: parseInt(stats.sem_nivel_lp || '0'),
      sem_nivel_mat: parseInt(stats.sem_nivel_mat || '0'),
      sem_nivel_aluno: parseInt(stats.sem_nivel_aluno || '0'),
      necessita_recalculo: parseInt(stats.sem_nivel_aluno || '0') > 0,
    })
  } catch (error: any) {
    console.error('[Recalcular Níveis] Erro ao verificar status:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
