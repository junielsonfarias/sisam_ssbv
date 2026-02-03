/**
 * Script para remover dados do 8º e 9º ano para reimportação
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  console.log('=== Limpeza de dados do 8º e 9º Ano ===\n')

  // 1. Identificar registros a remover
  console.log('1. Identificando registros do 8º e 9º ano...')

  const rc = await pool.query(`SELECT serie, COUNT(*) as total FROM resultados_consolidados WHERE serie LIKE '%8%' OR serie LIKE '%9%' GROUP BY serie`)
  console.log('   resultados_consolidados:')
  rc.rows.forEach(r => console.log(`     - "${r.serie}": ${r.total}`))

  const rp = await pool.query(`SELECT serie, COUNT(*) as total FROM resultados_provas WHERE serie LIKE '%8%' OR serie LIKE '%9%' GROUP BY serie`)
  console.log('   resultados_provas:')
  rp.rows.forEach(r => console.log(`     - "${r.serie}": ${r.total}`))

  const al = await pool.query(`SELECT serie, COUNT(*) as total FROM alunos WHERE serie LIKE '%8%' OR serie LIKE '%9%' GROUP BY serie`)
  console.log('   alunos:')
  al.rows.forEach(r => console.log(`     - "${r.serie}": ${r.total}`))

  // 2. Remover dados
  console.log('\n2. Removendo dados...')

  const delRp = await pool.query(`DELETE FROM resultados_provas WHERE serie LIKE '%8%' OR serie LIKE '%9%' RETURNING id`)
  console.log(`   Removidos de resultados_provas: ${delRp.rowCount}`)

  const delRc = await pool.query(`DELETE FROM resultados_consolidados WHERE serie LIKE '%8%' OR serie LIKE '%9%' RETURNING id`)
  console.log(`   Removidos de resultados_consolidados: ${delRc.rowCount}`)

  const delAl = await pool.query(`DELETE FROM alunos WHERE serie LIKE '%8%' OR serie LIKE '%9%' RETURNING id`)
  console.log(`   Removidos de alunos: ${delAl.rowCount}`)

  // 3. Verificar resultado
  console.log('\n3. Verificando resultado...')
  const check = await pool.query(`
    SELECT DISTINCT serie, COUNT(*) as total
    FROM resultados_consolidados
    GROUP BY serie
    ORDER BY serie
  `)
  console.log('   Séries restantes:')
  check.rows.forEach(r => console.log(`   - "${r.serie}": ${r.total}`))

  console.log('\n✓ Limpeza do 8º e 9º ano concluída!')

  await pool.end()
}

main()
