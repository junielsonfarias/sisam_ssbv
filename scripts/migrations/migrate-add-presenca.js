const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  try {
    console.log('🔄 Adicionando campo de presença...\n');

    // Adicionar coluna presenca na tabela resultados_provas
    const colPresenca = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='resultados_provas' AND column_name='presenca'
    `);
    
    if (colPresenca.rows.length === 0) {
      await pool.query(`
        ALTER TABLE resultados_provas 
        ADD COLUMN presenca VARCHAR(10) DEFAULT 'P'
      `);
      console.log('✅ Coluna presenca adicionada');
    } else {
      console.log('ℹ️  Coluna presenca já existe');
    }

    // Criar índice para presença
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resultados_presenca ON resultados_provas(presenca)');
    console.log('✅ Índice de presença criado');

    console.log('\n🎉 Migração concluída!');
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

