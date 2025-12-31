const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testar() {
  try {
    const result = await pool.query("SELECT * FROM personalizacao WHERE tipo = 'principal'");
    if (result.rows.length > 0) {
      console.log('✅ Personalização encontrada');
    } else {
      console.log('⚠️ Nenhuma personalização encontrada');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    pool.end();
  }
}

testar();

