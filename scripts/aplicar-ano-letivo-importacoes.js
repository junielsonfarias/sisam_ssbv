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

async function aplicarColunaAnoLetivo() {
  try {
    console.log('Verificando se a coluna ano_letivo existe...')
    
    // Verificar se a coluna já existe
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'importacoes' AND column_name = 'ano_letivo'
    `)
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Coluna ano_letivo já existe na tabela importacoes')
    } else {
      console.log('Adicionando coluna ano_letivo...')
      await pool.query(`
        ALTER TABLE importacoes 
        ADD COLUMN ano_letivo VARCHAR(10)
      `)
      console.log('✅ Coluna ano_letivo adicionada com sucesso!')
    }
    
    // Verificar e adicionar outros campos se necessário
    console.log('Verificando outros campos de estatísticas...')
    
    const campos = [
      'polos_criados', 'polos_existentes',
      'escolas_criadas', 'escolas_existentes',
      'turmas_criadas', 'turmas_existentes',
      'alunos_criados', 'alunos_existentes',
      'questoes_criadas', 'questoes_existentes',
      'resultados_novos', 'resultados_duplicados'
    ]
    
    for (const campo of campos) {
      const checkCampo = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'importacoes' AND column_name = $1
      `, [campo])
      
      if (checkCampo.rows.length === 0) {
        await pool.query(`
          ALTER TABLE importacoes 
          ADD COLUMN ${campo} INTEGER DEFAULT 0
        `)
        console.log(`  ✅ Campo ${campo} adicionado`)
      }
    }
    
    console.log('✅ Todos os campos foram verificados/adicionados!')
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

aplicarColunaAnoLetivo()

