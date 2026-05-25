const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Tentar carregar dotenv se disponível
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
} catch (e) {
  // dotenv não disponível, usar variáveis de ambiente do sistema
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

async function aplicarMigration() {
  try {
    console.log('Aplicando migration: Otimizar importação e adicionar histórico...')
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'migrations', 'otimizar-importacao.sql'),
      'utf8'
    )
    
    await pool.query(migrationSQL)
    
    console.log('✅ Migration aplicada com sucesso!')
    console.log('Otimizações implementadas:')
    console.log('  - Índice único em resultados_provas para evitar duplicatas')
    console.log('  - Campos de estatísticas na tabela importacoes')
    console.log('  - Campo ano_letivo na tabela importacoes')
    console.log('  - Índices adicionais para melhorar performance')
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

aplicarMigration()

