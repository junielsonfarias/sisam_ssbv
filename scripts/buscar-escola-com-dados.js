// Script para encontrar uma escola com dados de prova no 2º Ano
// Executar: node scripts/buscar-escola-com-dados.js

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

async function buscar() {
  console.log('\n' + '='.repeat(80));
  console.log('BUSCA DE ESCOLAS COM DADOS DE PROVA - 2º ANO');
  console.log('='.repeat(80) + '\n');

  try {
    // Buscar escolas com alunos presentes no 2º ano
    const query = `
      SELECT
        e.nome as escola_nome,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(DISTINCT t.id) as total_turmas
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      INNER JOIN turmas t ON rc.turma_id = t.id
      WHERE rc.serie = '2º Ano'
      GROUP BY e.id, e.nome
      HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
      ORDER BY presentes ASC
      LIMIT 5
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('❌ Nenhuma escola encontrada com alunos presentes no 2º Ano');
      return;
    }

    console.log('Escolas com poucos alunos presentes (mais fácil para validação):');
    console.log('-'.repeat(80));

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.escola_nome}`);
      console.log(`   - Total Alunos: ${row.total_alunos}`);
      console.log(`   - Presentes: ${row.presentes}`);
      console.log(`   - Turmas: ${row.total_turmas}`);
      console.log('');
    });

    // Usar a primeira escola encontrada para análise detalhada
    const escolaParaAnalise = result.rows[0].escola_nome;
    console.log('\n' + '='.repeat(80));
    console.log(`ANÁLISE DETALHADA: ${escolaParaAnalise}`);
    console.log('='.repeat(80) + '\n');

    // Buscar dados dos alunos presentes
    const alunoQuery = `
      SELECT
        a.nome as aluno_nome,
        rc.serie,
        t.codigo as turma_codigo,
        e.nome as escola_nome,
        rc.presenca,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_producao,
        rc.media_aluno
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN turmas t ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.nome = $1
      AND rc.serie = '2º Ano'
      AND (rc.presenca = 'P' OR rc.presenca = 'p')
      ORDER BY a.nome
    `;

    const alunoResult = await pool.query(alunoQuery, [escolaParaAnalise]);

    console.log('📚 DADOS DOS ALUNOS PRESENTES:');
    console.log('-'.repeat(80));

    alunoResult.rows.forEach((row, index) => {
      console.log(`\nAluno ${index + 1}: ${row.aluno_nome}`);
      console.log(`  Turma: ${row.turma_codigo}`);
      console.log(`  Presença: ${row.presenca}`);
      console.log(`  LP: ${row.nota_lp}`);
      console.log(`  MAT: ${row.nota_mat}`);
      console.log(`  PROD: ${row.nota_producao}`);
      console.log(`  Média Armazenada: ${row.media_aluno}`);

      const lp = parseFloat(row.nota_lp) || 0;
      const mat = parseFloat(row.nota_mat) || 0;
      const prod = parseFloat(row.nota_producao) || 0;
      const mediaCalculada = (lp + mat + prod) / 3;
      console.log(`  Média Calculada (LP+MAT+PROD)/3: ${mediaCalculada.toFixed(2)}`);
    });

    // Buscar dados agregados da turma (como a API retorna)
    const turmaQuery = `
      SELECT
        t.codigo,
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
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes
      FROM turmas t
      INNER JOIN escolas e ON t.escola_id = e.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
      WHERE e.nome = $1
      AND rc.serie = '2º Ano'
      GROUP BY t.id, t.codigo, rc.serie
      HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
    `;

    const turmaResult = await pool.query(turmaQuery, [escolaParaAnalise]);

    console.log('\n\n📊 DADOS AGREGADOS DA TURMA (como API /admin/turmas):');
    console.log('-'.repeat(80));

    turmaResult.rows.forEach((row) => {
      console.log(`\nTurma: ${row.codigo}`);
      console.log(`  Total Alunos: ${row.total_alunos}`);
      console.log(`  Presentes: ${row.presentes}`);
      console.log(`  Média Geral: ${row.media_geral}`);
      console.log(`  Média LP: ${row.media_lp}`);
      console.log(`  Média MAT: ${row.media_mat}`);
      console.log(`  Média PROD: ${row.media_prod}`);
    });

    // Buscar dados agregados da escola (como a API retorna)
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
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      WHERE e.nome = $1
      AND rc.serie = '2º Ano'
      GROUP BY e.id, e.nome
      HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
    `;

    const escolaResult = await pool.query(escolaQuery, [escolaParaAnalise]);

    console.log('\n\n🏫 DADOS AGREGADOS DA ESCOLA (como API /admin/escolas):');
    console.log('-'.repeat(80));

    escolaResult.rows.forEach((row) => {
      console.log(`\nEscola: ${row.nome}`);
      console.log(`  Total Alunos: ${row.total_alunos}`);
      console.log(`  Presentes: ${row.presentes}`);
      console.log(`  Média Geral: ${row.media_geral}`);
      console.log(`  Média LP: ${row.media_lp}`);
      console.log(`  Média MAT: ${row.media_mat}`);
      console.log(`  Média PROD: ${row.media_prod}`);
    });

    // Comparação final
    console.log('\n\n📋 COMPARAÇÃO FINAL:');
    console.log('-'.repeat(80));

    if (alunoResult.rows.length > 0 && turmaResult.rows.length > 0 && escolaResult.rows.length > 0) {
      // Calcular média manual dos alunos
      let somaMediaAlunos = 0;
      let countAlunos = 0;
      let somaLP = 0, somaMAT = 0, somaPROD = 0;
      let countLP = 0, countMAT = 0, countPROD = 0;

      alunoResult.rows.forEach(row => {
        const lp = parseFloat(row.nota_lp) || 0;
        const mat = parseFloat(row.nota_mat) || 0;
        const prod = parseFloat(row.nota_producao) || 0;

        if (lp > 0) { somaLP += lp; countLP++; }
        if (mat > 0) { somaMAT += mat; countMAT++; }
        if (prod > 0) { somaPROD += prod; countPROD++; }

        // Calcular média do aluno considerando apenas disciplinas > 0
        let countDisc = 0;
        let somaDisc = 0;
        if (lp > 0) { somaDisc += lp; countDisc++; }
        if (mat > 0) { somaDisc += mat; countDisc++; }
        if (prod > 0) { somaDisc += prod; countDisc++; }

        if (countDisc > 0) {
          somaMediaAlunos += somaDisc / countDisc;
          countAlunos++;
        }
      });

      const mediaLP_Manual = countLP > 0 ? (somaLP / countLP).toFixed(2) : 'N/A';
      const mediaMAT_Manual = countMAT > 0 ? (somaMAT / countMAT).toFixed(2) : 'N/A';
      const mediaPROD_Manual = countPROD > 0 ? (somaPROD / countPROD).toFixed(2) : 'N/A';
      const mediaGeral_Manual = countAlunos > 0 ? (somaMediaAlunos / countAlunos).toFixed(2) : 'N/A';

      const turma = turmaResult.rows[0];
      const escola = escolaResult.rows[0];

      console.log('\n| Métrica      | Manual    | Turma API | Escola API | Status |');
      console.log('|--------------|-----------|-----------|------------|--------|');
      console.log(`| LP           | ${mediaLP_Manual.toString().padStart(9)} | ${turma.media_lp?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_lp?.toString().padStart(10) || 'N/A'.padStart(10)} | ${mediaLP_Manual === turma.media_lp?.toString() ? '✅' : '⚠️'} |`);
      console.log(`| MAT          | ${mediaMAT_Manual.toString().padStart(9)} | ${turma.media_mat?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_mat?.toString().padStart(10) || 'N/A'.padStart(10)} | ${mediaMAT_Manual === turma.media_mat?.toString() ? '✅' : '⚠️'} |`);
      console.log(`| PROD         | ${mediaPROD_Manual.toString().padStart(9)} | ${turma.media_prod?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_prod?.toString().padStart(10) || 'N/A'.padStart(10)} | ${mediaPROD_Manual === turma.media_prod?.toString() ? '✅' : '⚠️'} |`);
      console.log(`| Média Geral  | ${mediaGeral_Manual.toString().padStart(9)} | ${turma.media_geral?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_geral?.toString().padStart(10) || 'N/A'.padStart(10)} | ${mediaGeral_Manual === turma.media_geral?.toString() ? '✅' : '⚠️'} |`);

      console.log('\n📌 LEGENDA:');
      console.log('   ✅ = Valores consistentes');
      console.log('   ⚠️ = Diferença (verificar arredondamento)');
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

buscar();
