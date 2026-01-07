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
  // Verificar formatos de série nos resultados
  const result = await pool.query(`
    SELECT DISTINCT serie, COUNT(*) as total
    FROM resultados_consolidados
    WHERE serie IS NOT NULL
    GROUP BY serie
    ORDER BY serie
  `);

  console.log('=== SÉRIES NOS RESULTADOS CONSOLIDADOS ===');
  result.rows.forEach(r => {
    console.log(`  Série: "${r.serie}" (${r.total} registros)`);
    // Mostrar códigos dos caracteres
    const chars = r.serie.split('').map(c => c.charCodeAt(0));
    console.log(`    Códigos: [${chars.join(', ')}]`);
  });

  await pool.end();
}
verificar();
