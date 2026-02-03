/**
 * Script para verificar séries duplicadas no banco
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
  console.log('=== Investigação de Séries Duplicadas ===\n')

  // 1. Verificar séries distintas em resultados_consolidados
  console.log('1. Séries em resultados_consolidados:')
  const rc = await pool.query(`
    SELECT DISTINCT serie, COUNT(*) as total
    FROM resultados_consolidados
    GROUP BY serie
    ORDER BY serie
  `)
  rc.rows.forEach(r => console.log(`   "${r.serie}" -> ${r.total} registros`))

  // 2. Verificar séries distintas em resultados_provas
  console.log('\n2. Séries em resultados_provas:')
  const rp = await pool.query(`
    SELECT DISTINCT serie, COUNT(*) as total
    FROM resultados_provas
    GROUP BY serie
    ORDER BY serie
  `)
  rp.rows.forEach(r => console.log(`   "${r.serie}" -> ${r.total} registros`))

  // 3. Verificar séries distintas em alunos
  console.log('\n3. Séries em alunos:')
  const al = await pool.query(`
    SELECT DISTINCT serie, COUNT(*) as total
    FROM alunos
    GROUP BY serie
    ORDER BY serie
  `)
  al.rows.forEach(r => console.log(`   "${r.serie}" -> ${r.total} registros`))

  // 4. Verificar se há valores similares (5 vs 5º Ano)
  console.log('\n4. Análise de duplicação do 5º ano:')
  const analise = await pool.query(`
    SELECT serie, LENGTH(serie) as tamanho, COUNT(*) as total
    FROM resultados_consolidados
    WHERE serie LIKE '%5%'
    GROUP BY serie
    ORDER BY serie
  `)
  analise.rows.forEach(r => console.log(`   "${r.serie}" (${r.tamanho} chars) -> ${r.total} registros`))

  await pool.end()
}

main()
