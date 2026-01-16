const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Carregar .env.local
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
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co') ? { rejectUnauthorized: false } : false,
})

async function limparCache() {
  try {
    await pool.query('DELETE FROM cache_dashboard WHERE 1=1')
    console.log('Cache do dashboard limpo com sucesso!')
  } catch (e) {
    console.log('Tabela de cache nao existe ou ja esta limpa')
  }
  await pool.end()
}

limparCache()
