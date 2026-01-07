require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  const tabelas = ['questoes', 'resultados_consolidados', 'itens_producao', 'niveis_aprendizagem', 'resultados_provas'];

  for (const tabela of tabelas) {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tabela]);

    console.log(`\n=== ${tabela.toUpperCase()} ===`);
    result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  }

  await pool.end();
}
verificar();
