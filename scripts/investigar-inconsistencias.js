// Script para investigar inconsistências encontradas
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function investigar() {
  console.log('\n' + '='.repeat(100));
  console.log('INVESTIGAÇÃO DE INCONSISTÊNCIAS');
  console.log('='.repeat(100) + '\n');

  try {
    // 1. Investigar WILLIAM FERREIRA FARIAS (5º Ano)
    console.log('📋 1. WILLIAM FERREIRA FARIAS (5º Ano):');
    console.log('-'.repeat(100));

    // Em resultados_consolidados (tabela real)
    const rcWilliamQuery = `
      SELECT rc.serie, rc.nota_lp, rc.nota_mat, rc.nota_producao, rc.media_aluno
      FROM resultados_consolidados rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      WHERE a.nome ILIKE '%william%ferreira%farias%'
    `;
    const rcWilliamResult = await pool.query(rcWilliamQuery);
    if (rcWilliamResult.rows.length > 0) {
      const row = rcWilliamResult.rows[0];
      console.log(`\n  📦 resultados_consolidados (TABELA):`);
      console.log(`     Série: ${row.serie}`);
      console.log(`     LP: ${row.nota_lp}, MAT: ${row.nota_mat}, PROD: ${row.nota_producao}`);
      console.log(`     Média: ${row.media_aluno}`);
    } else {
      console.log('\n  ❌ Não encontrado em resultados_consolidados');
    }

    // Em resultados_consolidados_v2 (view)
    const v2WilliamQuery = `
      SELECT v2.serie, v2.nota_lp, v2.nota_mat, v2.nota_producao, v2.media_aluno
      FROM resultados_consolidados_v2 v2
      INNER JOIN alunos a ON v2.aluno_id = a.id
      WHERE a.nome ILIKE '%william%ferreira%farias%'
    `;
    const v2WilliamResult = await pool.query(v2WilliamQuery);
    if (v2WilliamResult.rows.length > 0) {
      const row = v2WilliamResult.rows[0];
      console.log(`\n  📊 resultados_consolidados_v2 (VIEW):`);
      console.log(`     Série: ${row.serie}`);
      console.log(`     LP: ${row.nota_lp}, MAT: ${row.nota_mat}, PROD: ${row.nota_producao || 'NULL'}`);
      console.log(`     Média: ${row.media_aluno}`);
    } else {
      console.log('\n  ❌ Não encontrado em resultados_consolidados_v2');
    }

    // Na view unificada
    const uniWilliamQuery = `
      SELECT u.serie, u.nota_lp, u.nota_mat, u.nota_producao, u.media_aluno
      FROM resultados_consolidados_unificada u
      INNER JOIN alunos a ON u.aluno_id = a.id
      WHERE a.nome ILIKE '%william%ferreira%farias%'
    `;
    const uniWilliamResult = await pool.query(uniWilliamQuery);
    if (uniWilliamResult.rows.length > 0) {
      const row = uniWilliamResult.rows[0];
      console.log(`\n  🔗 resultados_consolidados_unificada (VIEW FINAL):`);
      console.log(`     Série: ${row.serie}`);
      console.log(`     LP: ${row.nota_lp}, MAT: ${row.nota_mat}, PROD: ${row.nota_producao}`);
      console.log(`     Média: ${row.media_aluno}`);

      const lp = parseFloat(row.nota_lp) || 0;
      const mat = parseFloat(row.nota_mat) || 0;
      const prod = parseFloat(row.nota_producao) || 0;
      let soma = 0, count = 0;
      if (lp > 0) { soma += lp; count++; }
      if (mat > 0) { soma += mat; count++; }
      if (prod > 0) { soma += prod; count++; }
      const mediaCalc = count > 0 ? soma / count : 0;
      console.log(`     Média Calculada: ${mediaCalc.toFixed(2)}`);
    }

    // 2. Investigar alunos do 9º Ano com inconsistência
    console.log('\n\n📋 2. ALUNOS DO 9º ANO COM INCONSISTÊNCIA:');
    console.log('-'.repeat(100));

    const nomeIncons = ['AUGUSTO JUNIOR DA CONCEICAO FERREIRA', 'BRUNO GONCALVES FURTADO', 'EDUARDO MARINHO MARINHO'];

    for (const nome of nomeIncons) {
      console.log(`\n  👤 ${nome}:`);

      // Em rc
      const rcQuery = `
        SELECT rc.serie, rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn, rc.media_aluno
        FROM resultados_consolidados rc
        INNER JOIN alunos a ON rc.aluno_id = a.id
        WHERE a.nome ILIKE $1
      `;
      const rcResult = await pool.query(rcQuery, [`%${nome.split(' ')[0]}%${nome.split(' ').slice(-1)[0]}%`]);
      if (rcResult.rows.length > 0) {
        const row = rcResult.rows[0];
        console.log(`     📦 RC: LP:${row.nota_lp}, MAT:${row.nota_mat}, CH:${row.nota_ch}, CN:${row.nota_cn} | Média:${row.media_aluno}`);
      }

      // Em v2
      const v2Query = `
        SELECT v2.serie, v2.nota_lp, v2.nota_mat, v2.nota_ch, v2.nota_cn, v2.media_aluno
        FROM resultados_consolidados_v2 v2
        INNER JOIN alunos a ON v2.aluno_id = a.id
        WHERE a.nome ILIKE $1
      `;
      const v2Result = await pool.query(v2Query, [`%${nome.split(' ')[0]}%${nome.split(' ').slice(-1)[0]}%`]);
      if (v2Result.rows.length > 0) {
        const row = v2Result.rows[0];
        console.log(`     📊 V2: LP:${row.nota_lp}, MAT:${row.nota_mat}, CH:${row.nota_ch}, CN:${row.nota_cn} | Média:${row.media_aluno}`);
      }

      // Na unificada
      const uniQuery = `
        SELECT u.serie, u.nota_lp, u.nota_mat, u.nota_ch, u.nota_cn, u.media_aluno
        FROM resultados_consolidados_unificada u
        INNER JOIN alunos a ON u.aluno_id = a.id
        WHERE a.nome ILIKE $1
      `;
      const uniResult = await pool.query(uniQuery, [`%${nome.split(' ')[0]}%${nome.split(' ').slice(-1)[0]}%`]);
      if (uniResult.rows.length > 0) {
        const row = uniResult.rows[0];
        console.log(`     🔗 UNI: LP:${row.nota_lp}, MAT:${row.nota_mat}, CH:${row.nota_ch}, CN:${row.nota_cn} | Média:${row.media_aluno}`);

        const lp = parseFloat(row.nota_lp) || 0;
        const mat = parseFloat(row.nota_mat) || 0;
        const ch = parseFloat(row.nota_ch) || 0;
        const cn = parseFloat(row.nota_cn) || 0;
        let soma = 0, count = 0;
        if (lp > 0) { soma += lp; count++; }
        if (mat > 0) { soma += mat; count++; }
        if (ch > 0) { soma += ch; count++; }
        if (cn > 0) { soma += cn; count++; }
        const mediaCalc = count > 0 ? soma / count : 0;
        console.log(`     Média Esperada (disc > 0): ${mediaCalc.toFixed(2)}`);
      }
    }

    // 3. Verificar definição atual da VIEW
    console.log('\n\n📋 3. VERIFICAÇÃO DA VIEW UNIFICADA:');
    console.log('-'.repeat(100));

    const defQuery = `
      SELECT pg_get_viewdef('resultados_consolidados_unificada'::regclass, true) as definition
    `;
    const defResult = await pool.query(defQuery);
    console.log('\nLógica de media_aluno na VIEW:');

    const def = defResult.rows[0]?.definition || '';
    const mediaLine = def.split('\n').find(line => line.includes('media_aluno'));
    if (mediaLine) {
      console.log('  Encontrada definição de media_aluno');
    }

    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

investigar();
