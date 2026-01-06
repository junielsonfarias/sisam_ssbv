const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuracao do pool com SSL para Supabase
const isSupabase = (process.env.DB_HOST || '').includes('supabase');
const sslConfig = isSupabase || process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: sslConfig,
});

async function executarMigracao() {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    console.log('='.repeat(60));
    console.log('MIGRACAO: Adicionar Indices Compostos');
    console.log('='.repeat(60));
    console.log('');

    // Verificar conexao
    console.log('Verificando conexao com o banco de dados...');
    const testResult = await client.query('SELECT NOW() as time, current_database() as db');
    console.log(`Conectado ao banco: ${testResult.rows[0].db}`);
    console.log('');

    // Contar indices existentes antes
    const beforeCount = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
    `);
    console.log(`Indices existentes antes: ${beforeCount.rows[0].total}`);
    console.log('');

    console.log('Executando migracao...');
    console.log('');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'add-composite-indexes.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo de migracao nao encontrado: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migracao
    await client.query(sql);

    // Contar indices depois
    const afterCount = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
    `);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRACAO CONCLUIDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('');

    console.log('Resumo:');
    console.log(`  Indices antes: ${beforeCount.rows[0].total}`);
    console.log(`  Indices depois: ${afterCount.rows[0].total}`);
    console.log(`  Novos indices: ${afterCount.rows[0].total - beforeCount.rows[0].total}`);
    console.log(`  Tempo de execucao: ${elapsedTime}s`);
    console.log('');

    // Listar novos indices
    console.log('Indices compostos criados:');
    const newIndexes = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND (
        indexname LIKE '%_escola_ano_%'
        OR indexname LIKE '%_aluno_%'
        OR indexname LIKE '%_turma_%'
        OR indexname LIKE '%_polo_%'
        OR indexname LIKE '%_lower'
        OR indexname LIKE '%_ativo'
      )
      ORDER BY tablename, indexname
    `);

    let currentTable = '';
    for (const row of newIndexes.rows) {
      if (row.tablename !== currentTable) {
        console.log(`\n  ${row.tablename}:`);
        currentTable = row.tablename;
      }
      console.log(`    - ${row.indexname}`);
    }

    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('ERRO NA MIGRACAO');
    console.error('='.repeat(60));
    console.error('');
    console.error('Mensagem:', error.message);
    console.error('');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Verificar se dotenv esta disponivel
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
  // dotenv nao instalado, usar variaveis de ambiente do sistema
}

executarMigracao();
