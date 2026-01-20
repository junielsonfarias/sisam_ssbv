/**
 * Script para executar a migração que adiciona colunas de níveis por disciplina
 *
 * Execute: node scripts/executar-migration-niveis.js
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sisam'
})

async function executarMigracao() {
  console.log('='.repeat(60))
  console.log('MIGRAÇÃO: Adicionar colunas de níveis por disciplina')
  console.log('='.repeat(60))

  const client = await pool.connect()

  try {
    // Ler o arquivo SQL de migração
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'add-niveis-disciplinas.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('\n📄 Arquivo SQL:', sqlPath)
    console.log('\n🔄 Executando migração...\n')

    // Executar a migração
    await client.query(sql)

    console.log('✅ Migração executada com sucesso!')

    // Verificar se as colunas foram criadas
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'resultados_consolidados'
      AND column_name IN ('nivel_lp', 'nivel_mat', 'nivel_prod', 'nivel_aluno')
      ORDER BY column_name
    `)

    console.log('\n📊 Colunas criadas:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

    // Verificar índices criados
    const indices = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'resultados_consolidados'
      AND indexname LIKE 'idx_resultados_nivel%'
    `)

    console.log('\n📇 Índices criados:')
    indices.rows.forEach(row => {
      console.log(`  - ${row.indexname}`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Erro ao executar migração:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

executarMigracao().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
