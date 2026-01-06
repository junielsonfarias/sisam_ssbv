const { Pool } = require('pg');
const path = require('path');

// Carregar variáveis de ambiente
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
  // dotenv não instalado, usar variáveis de ambiente do sistema
}

// Configuração do pool com SSL para Supabase
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
    console.log('MIGRACAO: Adicionar Indice em resultados_consolidados.aluno_id');
    console.log('='.repeat(60));
    console.log('');

    // Verificar conexão
    console.log('Verificando conexao com o banco de dados...');
    const testResult = await client.query('SELECT NOW() as time, current_database() as db');
    console.log(`Conectado ao banco: ${testResult.rows[0].db}`);
    console.log('');

    // Verificar índices existentes na tabela
    console.log('Verificando indices existentes em resultados_consolidados...');
    const existingIndexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'resultados_consolidados'
      AND schemaname = 'public'
      ORDER BY indexname
    `);

    console.log(`Indices existentes: ${existingIndexes.rows.length}`);
    existingIndexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    console.log('');

    // Executar migração
    console.log('Criando novos indices...');
    console.log('');

    // Índice para buscas por aluno_id
    console.log('1. Criando idx_consolidados_aluno_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_consolidados_aluno_id
      ON resultados_consolidados(aluno_id)
    `);
    console.log('   OK');

    // Índice composto para buscas por aluno + ano
    console.log('2. Criando idx_consolidados_aluno_ano...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_consolidados_aluno_ano
      ON resultados_consolidados(aluno_id, ano_letivo)
    `);
    console.log('   OK');

    // Verificar índices após migração
    const afterIndexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'resultados_consolidados'
      AND schemaname = 'public'
      AND indexname LIKE 'idx_consolidados_aluno%'
      ORDER BY indexname
    `);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRACAO CONCLUIDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Novos indices criados:');
    afterIndexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    console.log('');
    console.log(`Tempo de execucao: ${elapsedTime}s`);
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

executarMigracao();
