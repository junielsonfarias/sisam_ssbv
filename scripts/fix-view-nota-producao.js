/**
 * Script para corrigir a VIEW resultados_consolidados_unificada
 * adicionando o campo nota_producao
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function fix() {
  const client = await pool.connect();
  try {
    console.log('Dropando VIEW resultados_consolidados_unificada...');
    await client.query('DROP VIEW IF EXISTS resultados_consolidados_unificada CASCADE');
    console.log('VIEW dropada com sucesso!');

    console.log('Recriando VIEW com nota_producao...');
    await client.query(`
      CREATE OR REPLACE VIEW resultados_consolidados_unificada AS
      SELECT
        COALESCE(v2.aluno_id, rc.aluno_id) as aluno_id,
        COALESCE(v2.escola_id, rc.escola_id) as escola_id,
        COALESCE(v2.turma_id, rc.turma_id) as turma_id,
        COALESCE(v2.ano_letivo, rc.ano_letivo) as ano_letivo,
        COALESCE(v2.serie, rc.serie) as serie,
        COALESCE(v2.presenca, rc.presenca) as presenca,
        COALESCE(v2.total_acertos_lp, rc.total_acertos_lp::INTEGER, 0) as total_acertos_lp,
        COALESCE(v2.total_acertos_ch, rc.total_acertos_ch::INTEGER, 0) as total_acertos_ch,
        COALESCE(v2.total_acertos_mat, rc.total_acertos_mat::INTEGER, 0) as total_acertos_mat,
        COALESCE(v2.total_acertos_cn, rc.total_acertos_cn::INTEGER, 0) as total_acertos_cn,
        COALESCE(v2.nota_lp, rc.nota_lp) as nota_lp,
        COALESCE(v2.nota_ch, rc.nota_ch) as nota_ch,
        COALESCE(v2.nota_mat, rc.nota_mat) as nota_mat,
        COALESCE(v2.nota_cn, rc.nota_cn) as nota_cn,
        rc.nota_producao as nota_producao,
        COALESCE(v2.media_aluno, rc.media_aluno) as media_aluno,
        COALESCE(v2.criado_em, rc.criado_em) as criado_em,
        COALESCE(v2.atualizado_em, rc.atualizado_em) as atualizado_em
      FROM resultados_consolidados_v2 v2
      FULL OUTER JOIN resultados_consolidados rc
        ON v2.aluno_id = rc.aluno_id
        AND v2.ano_letivo = rc.ano_letivo
    `);
    console.log('VIEW recriada com sucesso!');

    // Verificar
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'resultados_consolidados_unificada'
      AND column_name = 'nota_producao'
    `);

    if (result.rows.length > 0) {
      console.log('\n[OK] VIEW resultados_consolidados_unificada agora tem nota_producao!');
    } else {
      console.log('\n[ERRO] Campo nota_producao nao encontrado');
    }

    // Testar se consegue ler dados
    const testResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(nota_producao) as com_nota_prod
      FROM resultados_consolidados_unificada
      WHERE serie LIKE '%2%' OR serie LIKE '%3%' OR serie LIKE '%5%'
    `);

    console.log('\nDados de anos iniciais na VIEW:');
    console.log('  Total de registros:', testResult.rows[0].total);
    console.log('  Com nota_producao:', testResult.rows[0].com_nota_prod);

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
