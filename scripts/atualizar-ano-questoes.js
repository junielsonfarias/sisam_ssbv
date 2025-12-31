const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function atualizarAnoQuestoes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Atualizando ano_letivo das questões para 2025...\n');

    // Atualizar questões sem ano_letivo ou com ano_letivo diferente de 2025
    const result = await client.query(
      `UPDATE questoes 
       SET ano_letivo = '2025' 
       WHERE ano_letivo IS NULL OR ano_letivo != '2025'`
    );

    console.log(`✅ ${result.rowCount} questões atualizadas para ano_letivo = 2025\n`);

    // Verificar resultado
    const verificacao = await client.query(
      "SELECT COUNT(*) as total FROM questoes WHERE ano_letivo = '2025'"
    );

    console.log(`📊 Total de questões com ano_letivo = 2025: ${verificacao.rows[0].total}\n`);

    await client.query('COMMIT');
    console.log('✅ Processo concluído!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao atualizar questões:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

atualizarAnoQuestoes();

