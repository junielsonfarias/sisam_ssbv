const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Tentar carregar .env.local se existir
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=').trim()
      if (key && value) {
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '')
      }
    }
  })
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
    console.log('Aplicando migration: Adicionar suporte para pausar e cancelar importações...')
    
    const migrationSQL = `
      -- Atualizar constraint de status para incluir 'pausado' e 'cancelado'
      ALTER TABLE importacoes 
      DROP CONSTRAINT IF EXISTS importacoes_status_check;

      ALTER TABLE importacoes 
      ADD CONSTRAINT importacoes_status_check 
      CHECK (status IN ('processando', 'pausado', 'concluido', 'erro', 'cancelado'));
    `
    
    await pool.query(migrationSQL)
    
    console.log('✅ Migration aplicada com sucesso!')
    console.log('Status disponíveis: processando, pausado, concluido, erro, cancelado')
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

aplicarMigration()

