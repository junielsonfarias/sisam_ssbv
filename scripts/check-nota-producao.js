const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    // Verificar estrutura da view unificada
    console.log('=== Verificando colunas da view unificada ===');
    const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'resultados_consolidados_unificada'
      ORDER BY ordinal_position
    `);
    console.log('Colunas disponíveis:');
    cols.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));

    // Simular a query da API offline/resultados
    console.log('\n=== Testando query da API offline ===');
    const apiQuery = await pool.query(`
      SELECT
        CONCAT(rc.aluno_id, '-', rc.ano_letivo) as id,
        rc.aluno_id,
        rc.escola_id,
        rc.turma_id,
        rc.ano_letivo,
        rc.serie,
        COALESCE(rc.presenca, 'P') as presenca,
        COALESCE(rc.total_acertos_lp, 0) as total_acertos_lp,
        COALESCE(rc.total_acertos_ch, 0) as total_acertos_ch,
        COALESCE(rc.total_acertos_mat, 0) as total_acertos_mat,
        COALESCE(rc.total_acertos_cn, 0) as total_acertos_cn,
        rc.nota_lp,
        rc.nota_ch,
        rc.nota_mat,
        rc.nota_cn,
        rc.nota_producao,
        orig.nivel_aprendizagem,
        rc.media_aluno
      FROM resultados_consolidados_unificada rc
      LEFT JOIN resultados_consolidados orig ON rc.aluno_id = orig.aluno_id AND rc.ano_letivo = orig.ano_letivo
      WHERE rc.serie = '2º Ano'
      LIMIT 3
    `);
    console.log('Query API - amostra 2º Ano:');
    apiQuery.rows.forEach((r, i) => {
      console.log(`  [${i}] nota_lp: ${r.nota_lp}, nota_mat: ${r.nota_mat}, nota_producao: ${r.nota_producao}, media: ${r.media_aluno}`);
    });

    // Verificar se nota_producao tem dados
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(nota_producao) as com_nota_prod,
        SUM(CASE WHEN nota_producao > 0 THEN 1 ELSE 0 END) as com_nota_prod_maior_zero,
        AVG(CASE WHEN nota_producao > 0 THEN nota_producao END) as media_prod_positivos
      FROM resultados_consolidados_unificada
      WHERE serie IN ('2º Ano', '3º Ano', '5º Ano')
    `);
    console.log('\n=== Estatísticas nota_producao (Anos Iniciais) ===');
    console.log('Total registros:', stats.rows[0].total);
    console.log('Com nota_producao:', stats.rows[0].com_nota_prod);
    console.log('Com nota_producao > 0:', stats.rows[0].com_nota_prod_maior_zero);
    console.log('Média (apenas >0):', stats.rows[0].media_prod_positivos);

    // Buscar alunos com nota_producao > 0
    const alunosComProd = await pool.query(`
      SELECT aluno_id, serie, nota_lp, nota_mat, nota_producao, media_aluno
      FROM resultados_consolidados_unificada
      WHERE serie IN ('2º Ano', '3º Ano', '5º Ano')
        AND nota_producao > 0
    `);
    console.log('\n=== Alunos com nota_producao > 0 ===');
    alunosComProd.rows.forEach(row => console.log(row));

  } catch (err) {
    console.error('Erro:', err.message);
    console.error('Detalhe:', err);
  } finally {
    await pool.end();
  }
}
check();
