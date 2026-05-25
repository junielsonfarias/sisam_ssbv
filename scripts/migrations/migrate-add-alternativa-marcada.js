const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Adicionando campo alternativa_marcada à tabela resultados_provas...\n');

    // Adicionar coluna alternativa_marcada
    await client.query(`
      ALTER TABLE resultados_provas 
      ADD COLUMN IF NOT EXISTS alternativa_marcada VARCHAR(10)
    `);
    console.log('✅ Coluna alternativa_marcada adicionada');

    // Criar índice para melhor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resultados_provas_alternativa 
      ON resultados_provas(ano_letivo, questao_codigo, alternativa_marcada)
    `);
    console.log('✅ Índice criado');

    await client.query('COMMIT');
    console.log('\n✅ Migration concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

