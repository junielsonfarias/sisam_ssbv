/**
 * Script para calcular nivel_prod baseado na nota_producao
 * quando nivel_aprendizagem não está disponível
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import pool from '../database/connection'

// Função para calcular nível baseado na nota (0-10)
function calcularNivelPorNota(nota: number | null | undefined): string | null {
  if (nota === null || nota === undefined || nota <= 0) {
    return null
  }

  // Regras baseadas na nota de 0 a 10
  if (nota < 3) return 'N1'    // Insuficiente: 0-2.99
  if (nota < 5) return 'N2'    // Básico: 3-4.99
  if (nota < 7.5) return 'N3'  // Adequado: 5-7.49
  return 'N4'                   // Avançado: 7.5-10
}

// Função para converter texto para nível
function converterNivelProducao(nivelAtual: string | null | undefined): string | null {
  if (!nivelAtual || nivelAtual === 'null' || nivelAtual === 'S/R' || nivelAtual === '-') {
    return null
  }

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
  const mapeamento: Record<string, number> = { 'N1': 1, 'N2': 2, 'N3': 3, 'N4': 4 }
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
  const valoresValidos = [nivelParaValor(nivelLp), nivelParaValor(nivelMat), nivelParaValor(nivelProd)]
    .filter((v): v is number => v !== null && v !== undefined)

  if (valoresValidos.length === 0) return null

  const media = valoresValidos.reduce((acc, v) => acc + v, 0) / valoresValidos.length
  return valorParaNivel(media)
}

async function calcularNivelProducao() {
  console.log('='.repeat(60))
  console.log('CÁLCULO DE NÍVEL DE PRODUÇÃO TEXTUAL')
  console.log('='.repeat(60))
  console.log('')

  try {
    // Buscar registros que precisam de atualização
    const registrosResult = await pool.query(`
      SELECT
        id, serie, presenca,
        nota_producao, nivel_aprendizagem,
        nivel_lp, nivel_mat, nivel_prod, nivel_aluno
      FROM resultados_consolidados
      WHERE REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
        AND presenca = 'P'
        AND (
          -- Tem nota_producao mas não tem nivel_prod
          (nota_producao IS NOT NULL AND nota_producao > 0 AND nivel_prod IS NULL)
          OR
          -- Tem nivel_aprendizagem textual que precisa converter
          (nivel_aprendizagem IN ('S/R', '-') AND nivel_prod IS NULL)
        )
      ORDER BY serie, id
    `)

    const registros = registrosResult.rows
    console.log(`Encontrados ${registros.length} registros para atualizar\n`)

    if (registros.length === 0) {
      console.log('Nenhum registro precisa de atualização!')
      await pool.end()
      return
    }

    let atualizados = 0
    let erros = 0

    for (const registro of registros) {
      try {
        let nivelProd: string | null = null

        // Primeiro, tentar converter nivel_aprendizagem
        nivelProd = converterNivelProducao(registro.nivel_aprendizagem)

        // Se não conseguiu converter e tem nota_producao, calcular baseado na nota
        if (!nivelProd && registro.nota_producao !== null && registro.nota_producao > 0) {
          nivelProd = calcularNivelPorNota(registro.nota_producao)
        }

        // Recalcular nivel_aluno incluindo o nivel_prod
        const nivelAlunoCalc = calcularNivelAluno(registro.nivel_lp, registro.nivel_mat, nivelProd)

        // Atualizar registro
        await pool.query(`
          UPDATE resultados_consolidados
          SET
            nivel_prod = $1,
            nivel_aluno = $2,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [nivelProd, nivelAlunoCalc, registro.id])

        atualizados++

        if (atualizados % 50 === 0) {
          console.log(`  Processados: ${atualizados} registros...`)
        }
      } catch (error: any) {
        console.error(`  Erro ao atualizar registro ${registro.id}:`, error.message)
        erros++
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('RESUMO')
    console.log('='.repeat(60))
    console.log(`  - Registros processados: ${registros.length}`)
    console.log(`  - Atualizados: ${atualizados}`)
    console.log(`  - Erros: ${erros}`)
    console.log('')
    console.log('Cálculo concluído!')
    console.log('='.repeat(60))

  } catch (error: any) {
    console.error('Erro fatal:', error.message)
  } finally {
    await pool.end()
  }
}

calcularNivelProducao()
