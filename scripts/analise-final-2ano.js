// Script para análise final do 2º Ano após correção
// Executar: node scripts/analise-final-2ano.js

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

async function analisar() {
  console.log('\n' + '='.repeat(80));
  console.log('ANÁLISE FINAL - 2º ANO (Após correção)');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Buscar alunos presentes no 2º Ano
    console.log('📚 1. ALUNOS PRESENTES NO 2º ANO:');
    console.log('-'.repeat(80));

    const alunoQuery = `
      SELECT
        a.nome as aluno_nome,
        e.nome as escola_nome,
        t.codigo as turma_codigo,
        rc.serie,
        rc.presenca,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_producao,
        rc.media_aluno
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN turmas t ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.serie = '2º Ano'
      AND (rc.presenca = 'P' OR rc.presenca = 'p')
      ORDER BY e.nome, a.nome
    `;

    const alunoResult = await pool.query(alunoQuery);

    if (alunoResult.rows.length === 0) {
      console.log('❌ Nenhum aluno presente no 2º Ano');
      return;
    }

    console.log(`Total de alunos presentes: ${alunoResult.rows.length}\n`);

    alunoResult.rows.forEach((row, index) => {
      const lp = parseFloat(row.nota_lp) || 0;
      const mat = parseFloat(row.nota_mat) || 0;
      const prod = parseFloat(row.nota_producao) || 0;

      // Calcular média (considerando apenas disciplinas > 0)
      let countDisc = 0;
      let somaDisc = 0;
      if (lp > 0) { somaDisc += lp; countDisc++; }
      if (mat > 0) { somaDisc += mat; countDisc++; }
      if (prod > 0) { somaDisc += prod; countDisc++; }
      const mediaCalc = countDisc > 0 ? somaDisc / countDisc : 0;

      console.log(`${index + 1}. ${row.aluno_nome}`);
      console.log(`   Escola: ${row.escola_nome}`);
      console.log(`   Turma: ${row.turma_codigo}`);
      console.log(`   LP: ${lp.toFixed(2)}, MAT: ${mat.toFixed(2)}, PROD: ${prod.toFixed(2)}`);
      console.log(`   Média Armazenada: ${parseFloat(row.media_aluno)?.toFixed(2) || 'N/A'}`);
      console.log(`   Média Calculada: ${mediaCalc.toFixed(2)} (${countDisc} disciplinas)`);
      console.log('');
    });

    // 2. Dados da TURMA (API /admin/turmas)
    console.log('\n📊 2. DADOS DA TURMA (como API /admin/turmas):');
    console.log('-'.repeat(80));

    const turmaQuery = `
      SELECT
        t.codigo,
        e.nome as escola_nome,
        rc.serie,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
            ) / NULLIF(
              CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
              0
            )
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM turmas t
      INNER JOIN escolas e ON t.escola_id = e.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
      WHERE rc.serie = '2º Ano'
      GROUP BY t.id, t.codigo, e.nome, rc.serie
      HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
      ORDER BY e.nome, t.codigo
    `;

    const turmaResult = await pool.query(turmaQuery);

    turmaResult.rows.forEach((row) => {
      console.log(`\nTurma: ${row.codigo} - ${row.escola_nome}`);
      console.log(`  Série: ${row.serie}`);
      console.log(`  Total Alunos: ${row.total_alunos}`);
      console.log(`  Presentes: ${row.presentes}, Faltantes: ${row.faltantes}`);
      console.log(`  Média Geral: ${row.media_geral}`);
      console.log(`  Média LP: ${row.media_lp}`);
      console.log(`  Média MAT: ${row.media_mat}`);
      console.log(`  Média PROD: ${row.media_prod}`);
    });

    // 3. Dados da ESCOLA (API /admin/escolas)
    console.log('\n\n🏫 3. DADOS DA ESCOLA (como API /admin/escolas):');
    console.log('-'.repeat(80));

    const escolaQuery = `
      SELECT
        e.nome,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
            ) / NULLIF(
              CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
              0
            )
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      WHERE rc.serie = '2º Ano'
      GROUP BY e.id, e.nome
      HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
      ORDER BY e.nome
    `;

    const escolaResult = await pool.query(escolaQuery);

    escolaResult.rows.forEach((row) => {
      console.log(`\nEscola: ${row.nome}`);
      console.log(`  Total Alunos: ${row.total_alunos}`);
      console.log(`  Presentes: ${row.presentes}, Faltantes: ${row.faltantes}`);
      console.log(`  Média Geral: ${row.media_geral}`);
      console.log(`  Média LP: ${row.media_lp}`);
      console.log(`  Média MAT: ${row.media_mat}`);
      console.log(`  Média PROD: ${row.media_prod}`);
    });

    // 4. COMPARAÇÃO FINAL
    console.log('\n\n📋 4. COMPARAÇÃO FINAL:');
    console.log('-'.repeat(80));

    if (alunoResult.rows.length > 0 && turmaResult.rows.length > 0 && escolaResult.rows.length > 0) {
      const aluno = alunoResult.rows[0];
      const turma = turmaResult.rows[0];
      const escola = escolaResult.rows[0];

      const alunoLP = parseFloat(aluno.nota_lp) || 0;
      const alunoMAT = parseFloat(aluno.nota_mat) || 0;
      const alunoPROD = parseFloat(aluno.nota_producao) || 0;

      console.log('\n| Métrica      | Aluno     | Turma     | Escola    | Status |');
      console.log('|--------------|-----------|-----------|-----------|--------|');
      console.log(`| LP           | ${alunoLP.toFixed(2).padStart(9)} | ${turma.media_lp?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_lp?.toString().padStart(9) || 'N/A'.padStart(9)} | ${alunoLP.toFixed(2) === turma.media_lp ? '✅' : '⚠️'} |`);
      console.log(`| MAT          | ${alunoMAT.toFixed(2).padStart(9)} | ${turma.media_mat?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_mat?.toString().padStart(9) || 'N/A'.padStart(9)} | ${alunoMAT.toFixed(2) === turma.media_mat ? '✅' : '⚠️'} |`);
      console.log(`| PROD         | ${alunoPROD.toFixed(2).padStart(9)} | ${turma.media_prod?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_prod?.toString().padStart(9) || 'N/A'.padStart(9)} | ${alunoPROD.toFixed(2) === turma.media_prod ? '✅' : '⚠️'} |`);
      console.log(`| Média Geral  | ${'3.62'.padStart(9)} | ${turma.media_geral?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_geral?.toString().padStart(9) || 'N/A'.padStart(9)} | ${turma.media_geral === '3.62' ? '✅' : '⚠️'} |`);

      console.log('\n📌 OBSERVAÇÃO:');
      console.log('   Como há apenas 1 aluno presente no 2º Ano, os valores de');
      console.log('   Aluno, Turma e Escola devem ser IDÊNTICOS (é a mesma pessoa!).');
      console.log('\n   Média esperada = (5.00 + 2.86 + 3.00) / 3 = 3.62');
    }

    console.log('\n' + '='.repeat(80));
    console.log('FIM DA ANÁLISE');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

analisar();
