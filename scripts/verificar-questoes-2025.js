const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verificarQuestoes() {
  const client = await pool.connect();
  try {
    // Verificar questões com ano 2025
    const result2025 = await client.query(
      "SELECT codigo, ano_letivo FROM questoes WHERE ano_letivo = '2025' ORDER BY codigo"
    );

    // Verificar questões sem ano
    const resultSemAno = await client.query(
      "SELECT codigo, ano_letivo FROM questoes WHERE ano_letivo IS NULL ORDER BY codigo LIMIT 20"
    );

    console.log(`\n📋 Questões cadastradas:\n`);
    console.log(`✅ Questões com ano_letivo = 2025: ${result2025.rows.length}`);
    if (result2025.rows.length > 0) {
      console.log(`   Primeiras questões: ${result2025.rows.slice(0, 5).map(q => q.codigo).join(', ')}...`);
    }

    console.log(`\n⚠️  Questões sem ano_letivo: ${resultSemAno.rows.length}`);
    if (resultSemAno.rows.length > 0) {
      console.log(`   Primeiras questões: ${resultSemAno.rows.slice(0, 5).map(q => q.codigo).join(', ')}...`);
      console.log(`\n💡 Dica: Se as questões não têm ano_letivo, você pode atualizá-las para 2025 antes de adicionar os gabaritos.`);
    }

    // Verificar total de questões
    const total = await client.query('SELECT COUNT(*) as total FROM questoes');
    console.log(`\n📊 Total de questões no banco: ${total.rows[0].total}\n`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarQuestoes();

