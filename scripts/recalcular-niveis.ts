/**
 * Script para recalcular os níveis de todas as séries dos Anos Iniciais (2º, 3º e 5º)
 *
 * Execute com: npx ts-node scripts/recalcular-niveis.ts
 * Ou: npx tsx scripts/recalcular-niveis.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import pool from '../database/connection'

// Funções de cálculo de nível (copiadas de lib/config-series.ts)
function extrairNumeroSerie(serie: string | null | undefined): string | null {
  if (!serie) return null
  const match = serie.toString().match(/(\d+)/)
  return match ? match[1] : null
}

function isAnosIniciais(serie: string | null | undefined): boolean {
  const numero = extrairNumeroSerie(serie)
  return numero === '2' || numero === '3' || numero === '5'
}

function calcularNivelPorAcertos(
  acertos: number | null | undefined,
  serie: string | null | undefined,
  disciplina: 'LP' | 'MAT'
): string | null {
  if (acertos === null || acertos === undefined || acertos <= 0) {
    return null
  }

  const numeroSerie = extrairNumeroSerie(serie)
  if (!numeroSerie) return null

  // Regras para 2º e 3º Anos (LP e MAT: 14 questões cada)
  if (numeroSerie === '2' || numeroSerie === '3') {
    if (acertos >= 1 && acertos <= 3) return 'N1'
    if (acertos >= 4 && acertos <= 7) return 'N2'
    if (acertos >= 8 && acertos <= 11) return 'N3'
    if (acertos >= 12 && acertos <= 14) return 'N4'
    if (acertos > 14) return 'N4'
  }

  // Regras para 5º Ano
  if (numeroSerie === '5') {
    // LP: 14 questões (mesma regra do 2º/3º)
    if (disciplina === 'LP') {
      if (acertos >= 1 && acertos <= 3) return 'N1'
      if (acertos >= 4 && acertos <= 7) return 'N2'
      if (acertos >= 8 && acertos <= 11) return 'N3'
      if (acertos >= 12 && acertos <= 14) return 'N4'
      if (acertos > 14) return 'N4'
    }

    // MAT: 20 questões (regra diferente)
    if (disciplina === 'MAT') {
      if (acertos >= 1 && acertos <= 5) return 'N1'
      if (acertos >= 6 && acertos <= 10) return 'N2'
      if (acertos >= 11 && acertos <= 15) return 'N3'
      if (acertos >= 16 && acertos <= 20) return 'N4'
      if (acertos > 20) return 'N4'
    }
  }

  return null
}

function converterNivelProducao(nivelAtual: string | null | undefined): string | null {
  if (!nivelAtual) return null

  const nivelNormalizado = nivelAtual.toUpperCase().trim()

  const mapeamento: Record<string, string> = {
    'INSUFICIENTE': 'N1',
    'BÁSICO': 'N2',
    'BASICO': 'N2',
    'ADEQUADO': 'N3',
    'AVANÇADO': 'N4',
    'AVANCADO': 'N4',
    'N1': 'N1',
    'N2': 'N2',
    'N3': 'N3',
    'N4': 'N4',
  }

  return mapeamento[nivelNormalizado] || null
}

function nivelParaValor(nivel: string | null | undefined): number | null {
  if (!nivel) return null

  const mapeamento: Record<string, number> = {
    'N1': 1,
    'N2': 2,
    'N3': 3,
    'N4': 4,
  }

  return mapeamento[nivel.toUpperCase().trim()] || null
}

function valorParaNivel(valor: number): string {
  if (valor <= 1.5) return 'N1'
  if (valor <= 2.5) return 'N2'
  if (valor <= 3.5) return 'N3'
  return 'N4'
}

function calcularNivelAluno(
  nivelLp: string | null | undefined,
  nivelMat: string | null | undefined,
  nivelProd: string | null | undefined
): string | null {
  const valorLp = nivelParaValor(nivelLp)
  const valorMat = nivelParaValor(nivelMat)
  const valorProd = nivelParaValor(nivelProd)

  const valoresValidos = [valorLp, valorMat, valorProd].filter(
    (v): v is number => v !== null && v !== undefined
  )

  if (valoresValidos.length === 0) return null

  const soma = valoresValidos.reduce((acc, v) => acc + v, 0)
  const media = soma / valoresValidos.length

  return valorParaNivel(media)
}

async function recalcularNiveis() {
  console.log('='.repeat(60))
  console.log('RECÁLCULO DE NÍVEIS - ANOS INICIAIS (2º, 3º e 5º)')
  console.log('='.repeat(60))
  console.log('')

  try {
    // Buscar todos os registros de anos iniciais
    console.log('Buscando registros de anos iniciais...')

    const registrosResult = await pool.query(`
      SELECT
        id, serie, presenca,
        total_acertos_lp, total_acertos_mat,
        nivel_aprendizagem,
        nivel_lp, nivel_mat, nivel_prod, nivel_aluno
      FROM resultados_consolidados
      WHERE (
        REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
      )
      AND presenca = 'P'
      ORDER BY serie, id
    `)

    const registros = registrosResult.rows
    console.log(`Encontrados ${registros.length} registros de anos iniciais\n`)

    // Estatísticas por série
    const estatisticas: Record<string, { total: number, atualizados: number, jaCalculados: number }> = {
      '2': { total: 0, atualizados: 0, jaCalculados: 0 },
      '3': { total: 0, atualizados: 0, jaCalculados: 0 },
      '5': { total: 0, atualizados: 0, jaCalculados: 0 },
    }

    let atualizados = 0
    let jaCalculados = 0
    let erros = 0

    for (const registro of registros) {
      const numeroSerie = extrairNumeroSerie(registro.serie) || '0'

      if (estatisticas[numeroSerie]) {
        estatisticas[numeroSerie].total++
      }

      // Se já tem níveis calculados, pular
      if (registro.nivel_lp && registro.nivel_mat && registro.nivel_aluno) {
        jaCalculados++
        if (estatisticas[numeroSerie]) {
          estatisticas[numeroSerie].jaCalculados++
        }
        continue
      }

      try {
        // Calcular níveis
        const nivelLp = calcularNivelPorAcertos(registro.total_acertos_lp, registro.serie, 'LP')
        const nivelMat = calcularNivelPorAcertos(registro.total_acertos_mat, registro.serie, 'MAT')
        const nivelProd = converterNivelProducao(registro.nivel_aprendizagem)
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
        if (estatisticas[numeroSerie]) {
          estatisticas[numeroSerie].atualizados++
        }

        // Log de progresso a cada 100 registros
        if (atualizados % 100 === 0) {
          console.log(`  Processados: ${atualizados} registros...`)
        }
      } catch (error: any) {
        console.error(`  Erro ao atualizar registro ${registro.id}:`, error.message)
        erros++
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('RESUMO DO RECÁLCULO')
    console.log('='.repeat(60))
    console.log('')
    console.log('Por série:')
    console.log('-'.repeat(40))

    for (const [serie, stats] of Object.entries(estatisticas)) {
      if (stats.total > 0) {
        console.log(`  ${serie}º Ano:`)
        console.log(`    - Total: ${stats.total}`)
        console.log(`    - Atualizados: ${stats.atualizados}`)
        console.log(`    - Já calculados: ${stats.jaCalculados}`)
        console.log('')
      }
    }

    console.log('-'.repeat(40))
    console.log(`TOTAL GERAL:`)
    console.log(`  - Registros processados: ${registros.length}`)
    console.log(`  - Atualizados: ${atualizados}`)
    console.log(`  - Já calculados (pulados): ${jaCalculados}`)
    console.log(`  - Erros: ${erros}`)
    console.log('')
    console.log('Recálculo concluído!')
    console.log('='.repeat(60))

  } catch (error: any) {
    console.error('Erro fatal:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Executar
recalcularNiveis()
