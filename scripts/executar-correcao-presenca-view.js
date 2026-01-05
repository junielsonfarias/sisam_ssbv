/**
 * Script para executar a migração que corrige o campo presença nas VIEWs
 *
 * O problema: MAX(presenca) retornava 'P' quando havia mistura de valores,
 * fazendo com que faltantes aparecessem como presentes.
 *
 * A solução: Usar MIN(presenca) e priorizar presença da tabela resultados_consolidados
 *
 * Execute: node scripts/executar-correcao-presenca-view.js
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
  console.log('MIGRAÇÃO: Corrigir campo presença nas VIEWs')
  console.log('='.repeat(60))

  const client = await pool.connect()

  try {
    // Ler o arquivo SQL de migração
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'corrigir-presenca-view.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('\n📄 Lendo arquivo de migração...')
    console.log(`   Arquivo: ${sqlPath}`)

    // Iniciar transação
    await client.query('BEGIN')
    console.log('\n🔄 Iniciando transação...')

    // Executar migração
    console.log('\n⚙️  Executando migração SQL...')
    await client.query(sql)

    // Verificar se as VIEWs foram criadas corretamente
    console.log('\n✅ Verificando VIEWs...')

    const viewsResult = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name IN ('resultados_consolidados_v2', 'resultados_consolidados_unificada')
    `)

    console.log(`   VIEWs encontradas: ${viewsResult.rows.map(r => r.table_name).join(', ')}`)

    // Testar a VIEW com alguns dados
    const testeResult = await client.query(`
      SELECT
        presenca,
        COUNT(*) as quantidade
      FROM resultados_consolidados_unificada
      GROUP BY presenca
      ORDER BY presenca
    `)

    console.log('\n📊 Distribuição de presença na VIEW unificada:')
    testeResult.rows.forEach(row => {
      console.log(`   ${row.presenca || 'NULL'}: ${row.quantidade} registros`)
    })

    // Commit da transação
    await client.query('COMMIT')
    console.log('\n✅ Migração concluída com sucesso!')
    console.log('='.repeat(60))

  } catch (error) {
    // Rollback em caso de erro
    await client.query('ROLLBACK')
    console.error('\n❌ Erro na migração:', error.message)
    console.error('   Rollback executado.')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Executar
executarMigracao()
  .then(() => {
    console.log('\n🎉 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Falha na execução:', error.message)
    process.exit(1)
  })
