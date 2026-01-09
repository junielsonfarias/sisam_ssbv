/**
 * Script para executar a migracao que cria a tabela de logs de acesso.
 *
 * Esta tabela registra todos os logins bem-sucedidos para permitir
 * auditoria e analise de uso do sistema.
 *
 * Uso: node scripts/executar-migracao-logs-acesso.js
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Carregar .env se existir
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch (e) {
  console.log('dotenv nao disponivel, usando variaveis de ambiente')
}

async function executarMigracao() {
  // Usar variaveis separadas (padrao do projeto)
  const host = process.env.DB_HOST
  const port = process.env.DB_PORT || '5432'
  const database = process.env.DB_NAME
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD

  if (!host || !database || !user || !password) {
    console.error('Erro: Variaveis de ambiente do banco nao configuradas')
    console.log('Configure DB_HOST, DB_NAME, DB_USER e DB_PASSWORD')
    console.log('')
    console.log('Variaveis encontradas:')
    console.log('  DB_HOST:', host ? 'OK' : 'FALTANDO')
    console.log('  DB_NAME:', database ? 'OK' : 'FALTANDO')
    console.log('  DB_USER:', user ? 'OK' : 'FALTANDO')
    console.log('  DB_PASSWORD:', password ? 'OK' : 'FALTANDO')
    process.exit(1)
  }

  const isSupabase = host.includes('supabase') || host.includes('pooler')
  const shouldUseSSL = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' || isSupabase

  const pool = new Pool({
    host,
    port: parseInt(port),
    database,
    user,
    password,
    ssl: shouldUseSSL ? { rejectUnauthorized: false } : false
  })

  try {
    console.log('='.repeat(60))
    console.log('MIGRACAO: Criar tabela de logs de acesso')
    console.log('='.repeat(60))
    console.log('')

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'add-logs-acesso.sql')

    if (!fs.existsSync(sqlPath)) {
      console.error('Erro: Arquivo SQL nao encontrado:', sqlPath)
      process.exit(1)
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    console.log('1. Conectando ao banco de dados...')
    const client = await pool.connect()

    try {
      console.log('2. Iniciando transacao...')
      await client.query('BEGIN')

      console.log('3. Executando migracao...')
      console.log('   - Criando tabela logs_acesso')
      console.log('   - Criando indices')

      await client.query(sqlContent)

      console.log('4. Confirmando transacao...')
      await client.query('COMMIT')

      console.log('')
      console.log('='.repeat(60))
      console.log('MIGRACAO CONCLUIDA COM SUCESSO!')
      console.log('='.repeat(60))
      console.log('')
      console.log('A tabela logs_acesso foi criada com os seguintes campos:')
      console.log('- id: UUID (chave primaria)')
      console.log('- usuario_id: UUID (referencia usuarios)')
      console.log('- usuario_nome: Nome do usuario')
      console.log('- email: Email do login')
      console.log('- tipo_usuario: Tipo (administrador, tecnico, polo, escola)')
      console.log('- ip_address: IP do cliente')
      console.log('- user_agent: Navegador/cliente')
      console.log('- criado_em: Data/hora do login')
      console.log('')

      // Verificar se a tabela foi criada
      console.log('5. Verificando tabela criada...')
      const checkResult = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'logs_acesso'
        ORDER BY ordinal_position
      `)

      if (checkResult.rows.length > 0) {
        console.log('')
        console.log('Colunas da tabela logs_acesso:')
        console.table(checkResult.rows)
      } else {
        console.log('Aviso: Tabela nao encontrada apos migracao')
      }

    } catch (error) {
      console.error('Erro durante a migracao:', error.message)
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Erro fatal:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Executar
executarMigracao()
