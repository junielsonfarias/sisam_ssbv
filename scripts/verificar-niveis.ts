/**
 * Script para verificar os valores de nivel_aprendizagem e nivel_prod no banco
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import pool from '../database/connection'

async function verificarNiveis() {
  console.log('Verificando valores de nivel_aprendizagem e nivel_prod...\n')

  try {
    // Verificar valores únicos de nivel_aprendizagem
    const nivelAprendizagemResult = await pool.query(`
      SELECT DISTINCT nivel_aprendizagem, COUNT(*) as quantidade
      FROM resultados_consolidados
      WHERE REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
      GROUP BY nivel_aprendizagem
      ORDER BY quantidade DESC
    `)

    console.log('Valores de nivel_aprendizagem encontrados:')
    console.log('-'.repeat(50))
    for (const row of nivelAprendizagemResult.rows) {
      console.log(`  "${row.nivel_aprendizagem}" -> ${row.quantidade} registros`)
    }

    // Verificar valores únicos de nivel_prod
    console.log('\n')
    const nivelProdResult = await pool.query(`
      SELECT DISTINCT nivel_prod, COUNT(*) as quantidade
      FROM resultados_consolidados
      WHERE REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
      GROUP BY nivel_prod
      ORDER BY quantidade DESC
    `)

    console.log('Valores de nivel_prod encontrados:')
    console.log('-'.repeat(50))
    for (const row of nivelProdResult.rows) {
      console.log(`  "${row.nivel_prod}" -> ${row.quantidade} registros`)
    }

    // Verificar registros onde nivel_aprendizagem existe mas nivel_prod é null
    console.log('\n')
    const semConversaoResult = await pool.query(`
      SELECT DISTINCT nivel_aprendizagem, COUNT(*) as quantidade
      FROM resultados_consolidados
      WHERE REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
        AND nivel_aprendizagem IS NOT NULL
        AND nivel_aprendizagem != ''
        AND nivel_prod IS NULL
      GROUP BY nivel_aprendizagem
      ORDER BY quantidade DESC
    `)

    if (semConversaoResult.rows.length > 0) {
      console.log('Registros com nivel_aprendizagem mas SEM nivel_prod:')
      console.log('-'.repeat(50))
      for (const row of semConversaoResult.rows) {
        console.log(`  "${row.nivel_aprendizagem}" -> ${row.quantidade} registros (PRECISA CONVERTER!)`)
      }
    } else {
      console.log('Todos os registros com nivel_aprendizagem têm nivel_prod convertido!')
    }

    // Exemplo de um aluno do 3º ano
    console.log('\n')
    const exemploResult = await pool.query(`
      SELECT
        id, serie, nivel_aprendizagem, nivel_lp, nivel_mat, nivel_prod, nivel_aluno,
        total_acertos_lp, total_acertos_mat
      FROM resultados_consolidados
      WHERE REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') = '3'
        AND presenca = 'P'
      LIMIT 5
    `)

    console.log('Exemplos de registros do 3º ano:')
    console.log('-'.repeat(80))
    for (const row of exemploResult.rows) {
      console.log(`  ID: ${row.id}`)
      console.log(`    Serie: ${row.serie}`)
      console.log(`    Acertos LP: ${row.total_acertos_lp} -> Nivel LP: ${row.nivel_lp}`)
      console.log(`    Acertos MAT: ${row.total_acertos_mat} -> Nivel MAT: ${row.nivel_mat}`)
      console.log(`    nivel_aprendizagem: "${row.nivel_aprendizagem}"`)
      console.log(`    nivel_prod: "${row.nivel_prod}"`)
      console.log(`    nivel_aluno: "${row.nivel_aluno}"`)
      console.log('')
    }

  } catch (error: any) {
    console.error('Erro:', error.message)
  } finally {
    await pool.end()
  }
}

verificarNiveis()
