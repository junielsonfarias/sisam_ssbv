const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false,
});

async function verificarDados() {
  try {
    console.log('🔍 Verificando dados no Supabase...\n');

    // 1. Verificar resultados_provas
    console.log('📊 Tabela resultados_provas:');
    const rp = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as com_aluno_id,
        COUNT(DISTINCT aluno_codigo) FILTER (WHERE aluno_codigo IS NOT NULL) as com_codigo,
        COUNT(DISTINCT aluno_nome) FILTER (WHERE aluno_nome IS NOT NULL) as com_nome
      FROM resultados_provas
    `);
    console.log(JSON.stringify(rp.rows[0], null, 2));
    console.log();

    // 2. Verificar resultados_consolidados
    console.log('📊 Tabela resultados_consolidados:');
    const rc = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT aluno_id) as alunos_distintos
      FROM resultados_consolidados
    `);
    console.log(JSON.stringify(rc.rows[0], null, 2));
    console.log();

    // 3. Verificar alunos
    console.log('👥 Tabela alunos:');
    const alunos = await pool.query(`
      SELECT COUNT(*) as total FROM alunos
    `);
    console.log(JSON.stringify(alunos.rows[0], null, 2));
    console.log();

    // 4. Se houver dados consolidados, ver um exemplo
    if (parseInt(rc.rows[0].total) > 0) {
      console.log('📝 Exemplo de resultado consolidado:');
      const exemplo = await pool.query(`
        SELECT 
          rc.aluno_id,
          rc.total_acertos_lp,
          rc.total_acertos_ch,
          rc.total_acertos_mat,
          rc.total_acertos_cn,
          a.nome as aluno_nome,
          a.codigo as aluno_codigo
        FROM resultados_consolidados rc
        LEFT JOIN alunos a ON rc.aluno_id = a.id
        LIMIT 3
      `);
      exemplo.rows.forEach((r, i) => {
        console.log(`${i + 1}. Aluno: ${r.aluno_nome || 'N/A'} (ID: ${r.aluno_id}, Código: ${r.aluno_codigo || 'N/A'})`);
        console.log(`   Acertos - LP: ${r.total_acertos_lp}, CH: ${r.total_acertos_ch}, MAT: ${r.total_acertos_mat}, CN: ${r.total_acertos_cn}`);
      });
      console.log();
    }

    // 5. Verificar se há questões cadastradas
    console.log('❓ Tabela questoes:');
    const questoes = await pool.query(`
      SELECT COUNT(*) as total FROM questoes
    `);
    console.log(JSON.stringify(questoes.rows[0], null, 2));
    console.log();

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

verificarDados();

