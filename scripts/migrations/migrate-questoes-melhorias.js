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
    
    console.log('🔄 Adicionando campos à tabela questoes...\n');

    // Adicionar coluna ano_letivo
    await client.query(`
      ALTER TABLE questoes 
      ADD COLUMN IF NOT EXISTS ano_letivo VARCHAR(10)
    `);
    console.log('✅ Coluna ano_letivo adicionada');

    // Adicionar coluna tipo (objetiva/discursiva)
    await client.query(`
      ALTER TABLE questoes 
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'objetiva'
    `);
    console.log('✅ Coluna tipo adicionada');

    // Criar tabela de gabaritos por série
    await client.query(`
      CREATE TABLE IF NOT EXISTS questoes_gabaritos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
        serie VARCHAR(50) NOT NULL,
        gabarito VARCHAR(10) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(questao_id, serie)
      )
    `);
    console.log('✅ Tabela questoes_gabaritos criada');

    // Criar índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questoes_gabaritos_questao 
      ON questoes_gabaritos(questao_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questoes_gabaritos_serie 
      ON questoes_gabaritos(serie)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questoes_ano_letivo 
      ON questoes(ano_letivo)
    `);
    console.log('✅ Índices criados');

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

