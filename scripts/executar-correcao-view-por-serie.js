/**
 * Script para executar a migracao que corrige a VIEW resultados_consolidados_v2
 * para considerar a estrutura de questoes por serie.
 *
 * Problema corrigido:
 * - A view anterior usava Q1-Q20 para LP em todas as series
 * - Anos iniciais (2,3,5) tem estrutura diferente:
 *   - 2o/3o ano: LP = Q1-Q14, MAT = Q15-Q28
 *   - 5o ano: LP = Q1-Q14, MAT = Q15-Q34
 *
 * Uso: node scripts/executar-correcao-view-por-serie.js
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
    console.log('MIGRACAO: Corrigir VIEW por Serie')
    console.log('='.repeat(60))
    console.log('')

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'corrigir-view-por-serie.sql')

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
      console.log('   - Recriando VIEW resultados_consolidados_v2')
      console.log('   - Recriando VIEW resultados_consolidados_unificada')

      await client.query(sqlContent)

      console.log('4. Confirmando transacao...')
      await client.query('COMMIT')

      console.log('')
      console.log('='.repeat(60))
      console.log('MIGRACAO CONCLUIDA COM SUCESSO!')
      console.log('='.repeat(60))
      console.log('')
      console.log('As VIEWs foram atualizadas para considerar:')
      console.log('- 2o/3o ano: LP = Q1-Q14, MAT = Q15-Q28')
      console.log('- 5o ano: LP = Q1-Q14, MAT = Q15-Q34')
      console.log('- Anos finais: LP = Q1-Q20, CH = Q21-Q30, MAT = Q31-Q50, CN = Q51-Q60')
      console.log('')

      // Testar a view
      console.log('5. Verificando dados (amostra)...')
      const testResult = await client.query(`
        SELECT
          serie,
          COUNT(*) as total_alunos,
          AVG(total_acertos_lp) as media_acertos_lp,
          AVG(total_acertos_mat) as media_acertos_mat,
          AVG(nota_lp) as media_nota_lp,
          AVG(nota_mat) as media_nota_mat
        FROM resultados_consolidados_v2
        GROUP BY serie
        ORDER BY serie
        LIMIT 10
      `)

      console.log('')
      console.log('Resumo por serie:')
      console.table(testResult.rows)

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
