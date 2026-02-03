/**
 * Script para remover dados corrompidos com série "2025"
 * (ano letivo interpretado erroneamente como série)
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log('=== Correção de Série 2025 ===\n')

  try {
    // 1. Identificar dados corrompidos
    console.log('1. Identificando dados corrompidos...\n')

    const resultadosProvas = await pool.query(
      `SELECT COUNT(*) as total FROM resultados_provas WHERE serie LIKE '202%'`
    )
    console.log(`   resultados_provas com série "202%": ${resultadosProvas.rows[0].total}`)

    const resultadosConsolidados = await pool.query(
      `SELECT COUNT(*) as total FROM resultados_consolidados WHERE serie LIKE '202%'`
    )
    console.log(`   resultados_consolidados com série "202%": ${resultadosConsolidados.rows[0].total}`)

    const alunos = await pool.query(
      `SELECT COUNT(*) as total FROM alunos WHERE serie LIKE '202%'`
    )
    console.log(`   alunos com série "202%": ${alunos.rows[0].total}`)

    // Verificar séries distintas
    const seriesDistintas = await pool.query(
      `SELECT DISTINCT serie FROM resultados_consolidados WHERE serie LIKE '202%' ORDER BY serie`
    )
    if (seriesDistintas.rows.length > 0) {
      console.log(`\n   Séries incorretas encontradas: ${seriesDistintas.rows.map(r => r.serie).join(', ')}`)
    }

    // 2. Remover dados corrompidos
    console.log('\n2. Removendo dados corrompidos...\n')

    // Deletar de resultados_provas
    const deleteProvas = await pool.query(
      `DELETE FROM resultados_provas WHERE serie LIKE '202%' RETURNING id`
    )
    console.log(`   Removidos de resultados_provas: ${deleteProvas.rowCount} registros`)

    // Deletar de resultados_consolidados
    const deleteConsolidados = await pool.query(
      `DELETE FROM resultados_consolidados WHERE serie LIKE '202%' RETURNING id`
    )
    console.log(`   Removidos de resultados_consolidados: ${deleteConsolidados.rowCount} registros`)

    // Deletar de alunos
    const deleteAlunos = await pool.query(
      `DELETE FROM alunos WHERE serie LIKE '202%' RETURNING id`
    )
    console.log(`   Removidos de alunos: ${deleteAlunos.rowCount} registros`)

    // 3. Verificar resultado
    console.log('\n3. Verificando resultado...\n')

    const verificacao = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM resultados_provas WHERE serie LIKE '202%') as provas,
        (SELECT COUNT(*) FROM resultados_consolidados WHERE serie LIKE '202%') as consolidados,
        (SELECT COUNT(*) FROM alunos WHERE serie LIKE '202%') as alunos`
    )
    const v = verificacao.rows[0]
    console.log(`   Registros restantes com série "202%":`)
    console.log(`   - resultados_provas: ${v.provas}`)
    console.log(`   - resultados_consolidados: ${v.consolidados}`)
    console.log(`   - alunos: ${v.alunos}`)

    if (v.provas === '0' && v.consolidados === '0' && v.alunos === '0') {
      console.log('\n✓ Limpeza concluída com sucesso!')
    } else {
      console.log('\n⚠ Ainda há registros com série incorreta.')
    }

    // 4. Mostrar séries atuais válidas
    console.log('\n4. Séries válidas no banco:')
    const seriesValidas = await pool.query(
      `SELECT DISTINCT serie, COUNT(*) as total
       FROM resultados_consolidados
       WHERE serie IS NOT NULL AND serie != ''
       GROUP BY serie
       ORDER BY serie`
    )
    for (const row of seriesValidas.rows) {
      console.log(`   - Série ${row.serie}: ${row.total} alunos`)
    }

  } catch (error) {
    console.error('Erro:', error.message)
  } finally {
    await pool.end()
  }
}

main()
