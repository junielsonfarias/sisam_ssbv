// Script para analisar dados da EMEIF Castanhal - 8º Ano
// Executar: node scripts/analise-emeif-castanhal-8ano.js

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
  console.log('ANÁLISE DE DADOS - EMEIF CASTANHAL - 8º ANO');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Buscar dados dos alunos PRESENTES
    console.log('📚 1. DADOS DOS ALUNOS PRESENTES:');
    console.log('-'.repeat(80));

    const alunoQuery = `
      SELECT
        a.nome as aluno_nome,
        rc.serie,
        t.codigo as turma_codigo,
        e.nome as escola_nome,
        rc.presenca,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        rc.media_aluno
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN turmas t ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.nome ILIKE '%castanhal%'
      AND rc.serie = '8º Ano'
      AND (rc.presenca = 'P' OR rc.presenca = 'p')
      ORDER BY a.nome
    `;

    const alunoResult = await pool.query(alunoQuery);

    if (alunoResult.rows.length === 0) {
      console.log('❌ Nenhum aluno presente encontrado');
      return;
    }

    console.log(`Total de alunos presentes: ${alunoResult.rows.length}\n`);

    // Calcular médias manuais
    let somaLP = 0, somaMAT = 0, somaCH = 0, somaCN = 0;
    let countLP = 0, countMAT = 0, countCH = 0, countCN = 0;
    let somaMediaAlunos = 0;
    let countMedias = 0;

    alunoResult.rows.forEach((row, index) => {
      const lp = parseFloat(row.nota_lp) || 0;
      const mat = parseFloat(row.nota_mat) || 0;
      const ch = parseFloat(row.nota_ch) || 0;
      const cn = parseFloat(row.nota_cn) || 0;

      // Contar para médias (apenas valores > 0)
      if (lp > 0) { somaLP += lp; countLP++; }
      if (mat > 0) { somaMAT += mat; countMAT++; }
      if (ch > 0) { somaCH += ch; countCH++; }
      if (cn > 0) { somaCN += cn; countCN++; }

      // Calcular média do aluno (LP+CH+MAT+CN)/4 para anos finais
      // Considerando apenas disciplinas > 0
      let countDisc = 0;
      let somaDisc = 0;
      if (lp > 0) { somaDisc += lp; countDisc++; }
      if (mat > 0) { somaDisc += mat; countDisc++; }
      if (ch > 0) { somaDisc += ch; countDisc++; }
      if (cn > 0) { somaDisc += cn; countDisc++; }

      const mediaCalculada = countDisc > 0 ? somaDisc / countDisc : 0;
      const mediaArmazenada = parseFloat(row.media_aluno) || 0;
      const diff = Math.abs(mediaCalculada - mediaArmazenada);

      console.log(`Aluno ${index + 1}: ${row.aluno_nome}`);
      console.log(`  LP: ${lp.toFixed(2)}, MAT: ${mat.toFixed(2)}, CH: ${ch.toFixed(2)}, CN: ${cn.toFixed(2)}`);
      console.log(`  Média Armazenada: ${mediaArmazenada.toFixed(2)}`);
      console.log(`  Média Calculada: ${mediaCalculada.toFixed(2)} (${countDisc} disciplinas)`);
      console.log(`  ${diff < 0.02 ? '✅' : '⚠️'} Diferença: ${diff.toFixed(4)}`);
      console.log('');

      if (mediaCalculada > 0) {
        somaMediaAlunos += mediaCalculada;
        countMedias++;
      }
    });

    // Calcular médias gerais manuais
    const mediaLP_Manual = countLP > 0 ? somaLP / countLP : 0;
    const mediaMAT_Manual = countMAT > 0 ? somaMAT / countMAT : 0;
    const mediaCH_Manual = countCH > 0 ? somaCH / countCH : 0;
    const mediaCN_Manual = countCN > 0 ? somaCN / countCN : 0;
    const mediaGeral_Manual = countMedias > 0 ? somaMediaAlunos / countMedias : 0;

    console.log('\n📊 MÉDIAS CALCULADAS MANUALMENTE:');
    console.log('-'.repeat(80));
    console.log(`  Média LP: ${mediaLP_Manual.toFixed(2)} (de ${countLP} alunos com nota > 0)`);
    console.log(`  Média MAT: ${mediaMAT_Manual.toFixed(2)} (de ${countMAT} alunos com nota > 0)`);
    console.log(`  Média CH: ${mediaCH_Manual.toFixed(2)} (de ${countCH} alunos com nota > 0)`);
    console.log(`  Média CN: ${mediaCN_Manual.toFixed(2)} (de ${countCN} alunos com nota > 0)`);
    console.log(`  Média Geral: ${mediaGeral_Manual.toFixed(2)} (de ${countMedias} alunos)`);

    // 2. Buscar dados da turma (como a API retorna)
    console.log('\n\n📊 2. DADOS DA TURMA (como API /admin/turmas retorna):');
    console.log('-'.repeat(80));

    const turmaQuery = `
      SELECT
        t.codigo,
        rc.serie,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        -- Anos finais (8, 9): média de LP, CH, MAT, CN
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
            ) / NULLIF(
              CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
              0
            )
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM turmas t
      INNER JOIN escolas e ON t.escola_id = e.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
      WHERE e.nome ILIKE '%castanhal%'
      AND rc.serie = '8º Ano'
      GROUP BY t.id, t.codigo, rc.serie
      HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
    `;

    const turmaResult = await pool.query(turmaQuery);

    turmaResult.rows.forEach((row) => {
      console.log(`\nTurma: ${row.codigo}`);
      console.log(`  Série: ${row.serie}`);
      console.log(`  Total Alunos: ${row.total_alunos}`);
      console.log(`  Presentes: ${row.presentes}`);
      console.log(`  Faltantes: ${row.faltantes}`);
      console.log(`  Média Geral: ${row.media_geral}`);
      console.log(`  Média LP: ${row.media_lp}`);
      console.log(`  Média MAT: ${row.media_mat}`);
      console.log(`  Média CH: ${row.media_ch}`);
      console.log(`  Média CN: ${row.media_cn}`);
    });

    // 3. Buscar dados da escola (como a API retorna)
    console.log('\n\n🏫 3. DADOS DA ESCOLA (como API /admin/escolas retorna):');
    console.log('-'.repeat(80));

    const escolaQuery = `
      SELECT
        e.nome,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        -- Anos finais (8, 9): média de LP, CH, MAT, CN
        ROUND(AVG(CASE
          WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
            ) / NULLIF(
              CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
              0
            )
          ELSE NULL
        END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      WHERE e.nome ILIKE '%castanhal%'
      AND rc.serie = '8º Ano'
      GROUP BY e.id, e.nome
      HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
    `;

    const escolaResult = await pool.query(escolaQuery);

    escolaResult.rows.forEach((row) => {
      console.log(`\nEscola: ${row.nome}`);
      console.log(`  Total Alunos: ${row.total_alunos}`);
      console.log(`  Presentes: ${row.presentes}`);
      console.log(`  Faltantes: ${row.faltantes}`);
      console.log(`  Média Geral: ${row.media_geral}`);
      console.log(`  Média LP: ${row.media_lp}`);
      console.log(`  Média MAT: ${row.media_mat}`);
      console.log(`  Média CH: ${row.media_ch}`);
      console.log(`  Média CN: ${row.media_cn}`);
    });

    // 4. Comparação final
    console.log('\n\n📋 4. COMPARAÇÃO FINAL:');
    console.log('-'.repeat(80));

    if (turmaResult.rows.length > 0 && escolaResult.rows.length > 0) {
      const turma = turmaResult.rows[0];
      const escola = escolaResult.rows[0];

      console.log('\n| Métrica      | Manual    | Turma API | Escola API | Status |');
      console.log('|--------------|-----------|-----------|------------|--------|');
      console.log(`| LP           | ${mediaLP_Manual.toFixed(2).padStart(9)} | ${turma.media_lp?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_lp?.toString().padStart(10) || 'N/A'.padStart(10)} | ${Math.abs(mediaLP_Manual - parseFloat(turma.media_lp || 0)) < 0.02 ? '✅' : '⚠️'} |`);
      console.log(`| MAT          | ${mediaMAT_Manual.toFixed(2).padStart(9)} | ${turma.media_mat?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_mat?.toString().padStart(10) || 'N/A'.padStart(10)} | ${Math.abs(mediaMAT_Manual - parseFloat(turma.media_mat || 0)) < 0.02 ? '✅' : '⚠️'} |`);
      console.log(`| CH           | ${mediaCH_Manual.toFixed(2).padStart(9)} | ${turma.media_ch?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_ch?.toString().padStart(10) || 'N/A'.padStart(10)} | ${Math.abs(mediaCH_Manual - parseFloat(turma.media_ch || 0)) < 0.02 ? '✅' : '⚠️'} |`);
      console.log(`| CN           | ${mediaCN_Manual.toFixed(2).padStart(9)} | ${turma.media_cn?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_cn?.toString().padStart(10) || 'N/A'.padStart(10)} | ${Math.abs(mediaCN_Manual - parseFloat(turma.media_cn || 0)) < 0.02 ? '✅' : '⚠️'} |`);
      console.log(`| Média Geral  | ${mediaGeral_Manual.toFixed(2).padStart(9)} | ${turma.media_geral?.toString().padStart(9) || 'N/A'.padStart(9)} | ${escola.media_geral?.toString().padStart(10) || 'N/A'.padStart(10)} | ${Math.abs(mediaGeral_Manual - parseFloat(turma.media_geral || 0)) < 0.02 ? '✅' : '⚠️'} |`);

      console.log('\n📌 LEGENDA:');
      console.log('   ✅ = Valores consistentes (diferença < 0.02)');
      console.log('   ⚠️ = Diferença significativa (verificar arredondamento)');

      // Verificar se turma e escola têm mesmos valores (já que é única turma)
      console.log('\n📌 OBSERVAÇÃO:');
      console.log('   Como há apenas 1 turma do 8º Ano na escola, os valores de');
      console.log('   Turma API e Escola API devem ser idênticos.');
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
