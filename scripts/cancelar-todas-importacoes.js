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

async function cancelarTodasImportacoes() {
  try {
    console.log('Buscando importações em processamento...')
    
    // Buscar todas as importações em processamento ou pausadas
    const result = await pool.query(`
      SELECT id, nome_arquivo, status, linhas_processadas, total_linhas
      FROM importacoes
      WHERE status IN ('processando', 'pausado')
      ORDER BY criado_em DESC
    `)
    
    if (result.rows.length === 0) {
      console.log('✅ Nenhuma importação em processamento encontrada.')
      return
    }
    
    console.log(`\nEncontradas ${result.rows.length} importação(ões) em processamento:\n`)
    result.rows.forEach((imp, index) => {
      console.log(`${index + 1}. ${imp.nome_arquivo} (${imp.status}) - ${imp.linhas_processadas}/${imp.total_linhas} linhas`)
    })
    
    // Cancelar todas
    const updateResult = await pool.query(`
      UPDATE importacoes
      SET status = 'cancelado',
          concluido_em = CURRENT_TIMESTAMP
      WHERE status IN ('processando', 'pausado')
      RETURNING id, nome_arquivo
    `)
    
    console.log(`\n✅ ${updateResult.rows.length} importação(ões) cancelada(s) com sucesso!`)
    
    updateResult.rows.forEach((imp, index) => {
      console.log(`   ${index + 1}. ${imp.nome_arquivo}`)
    })
    
  } catch (error) {
    console.error('❌ Erro ao cancelar importações:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

cancelarTodasImportacoes()

