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
  ssl: process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('supabase.co') 
    ? { rejectUnauthorized: false } 
    : false,
})

async function corrigirConstraint() {
  try {
    console.log('Corrigindo constraint de status na tabela importacoes...')
    
    await pool.query(`
      ALTER TABLE importacoes 
      DROP CONSTRAINT IF EXISTS importacoes_status_check;
    `)
    
    await pool.query(`
      ALTER TABLE importacoes 
      ADD CONSTRAINT importacoes_status_check 
      CHECK (status IN ('processando', 'pausado', 'concluido', 'erro', 'cancelado'));
    `)
    
    console.log('✅ Constraint corrigida com sucesso!')
    console.log('Status permitidos: processando, pausado, concluido, erro, cancelado')
    
  } catch (error) {
    console.error('❌ Erro ao corrigir constraint:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

corrigirConstraint()

