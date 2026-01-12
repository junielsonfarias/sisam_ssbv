// Script para analisar dados da EMEIF Castanhal - 2º Ano
// Executar: node scripts/analise-emeif-castanhal.js

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
  console.log('ANÁLISE DE DADOS - EMEIF CASTANHAL - 2º ANO');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Buscar dados do aluno
    console.log('📚 1. DADOS DO ALUNO (resultados_consolidados_unificada)');
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
        rc.nota_producao,
        rc.nota_ch,
        rc.nota_cn,
        rc.media_aluno,
        rc.total_acertos_lp,
        rc.total_acertos_mat
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN turmas t ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE e.nome ILIKE '%castanhal%'
      AND rc.serie = '2º Ano'
      ORDER BY a.nome
    `;

    const alunoResult = await pool.query(alunoQuery);

    if (alunoResult.rows.length === 0) {
      console.log('❌ Nenhum aluno encontrado para EMEIF Castanhal - 2º Ano');
      return;
    }

    alunoResult.rows.forEach((row, index) => {
      console.log(`\nAluno ${index + 1}: ${row.aluno_nome}`);
      console.log(`  Escola: ${row.escola_nome}`);
      console.log(`  Turma: ${row.turma_codigo}`);
      console.log(`  Série: ${row.serie}`);
      console.log(`  Presença: ${row.presenca}`);
      console.log(`  LP: ${row.nota_lp} (acertos: ${row.total_acertos_lp})`);
      console.log(`  MAT: ${row.nota_mat} (acertos: ${row.total_acertos_mat})`);
      console.log(`  PROD: ${row.nota_producao}`);
      console.log(`  CH: ${row.nota_ch || 'N/A'}`);
      console.log(`  CN: ${row.nota_cn || 'N/A'}`);
      console.log(`  Média Armazenada: ${row.media_aluno}`);

      // Calcular média manualmente
      const lp = parseFloat(row.nota_lp) || 0;
      const mat = parseFloat(row.nota_mat) || 0;
      const prod = parseFloat(row.nota_producao) || 0;
      const mediaCalculada = (lp + mat + prod) / 3;
      console.log(`  Média Calculada (LP+MAT+PROD)/3: ${mediaCalculada.toFixed(2)}`);

      const diff = Math.abs(parseFloat(row.media_aluno) - mediaCalculada);
      if (diff > 0.01) {
        console.log(`  ⚠️ DIFERENÇA: ${diff.toFixed(4)}`);
      } else {
        console.log(`  ✅ Média consistente`);
      }
    });

    // 2. Buscar dados da turma (como a API retorna)
    console.log('\n\n📊 2. DADOS DA TURMA (como API /admin/turmas retorna)');
    console.log('-'.repeat(80));

    const turmaQuery = `
      SELECT
        t.id,
        t.codigo,
        t.nome,
        rc.serie,
        e.nome as escola_nome,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        -- Média CORRIGIDA: anos iniciais inclui PROD
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
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM turmas t
      INNER JOIN escolas e ON t.escola_id = e.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
      WHERE e.nome ILIKE '%castanhal%'
      AND rc.serie = '2º Ano'
      GROUP BY t.id, t.codigo, t.nome, rc.serie, e.nome
    `;

    const turmaResult = await pool.query(turmaQuery);

    turmaResult.rows.forEach((row) => {
      console.log(`\nTurma: ${row.codigo}`);
      console.log(`  Escola: ${row.escola_nome}`);
      console.log(`  Série: ${row.serie}`);
      console.log(`  Total Alunos: ${row.total_alunos}`);
      console.log(`  Média Geral: ${row.media_geral}`);
      console.log(`  Média LP: ${row.media_lp}`);
      console.log(`  Média MAT: ${row.media_mat}`);
      console.log(`  Média PROD: ${row.media_prod}`);
      console.log(`  Presentes: ${row.presentes}`);
      console.log(`  Faltantes: ${row.faltantes}`);
    });

    // 3. Buscar dados da escola (como a API retorna)
    console.log('\n\n🏫 3. DADOS DA ESCOLA (como API /admin/escolas retorna)');
    console.log('-'.repeat(80));

    const escolaQuery = `
      SELECT
        e.id,
        e.nome,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(DISTINCT t.id) as total_turmas,
        -- Média CORRIGIDA: anos iniciais inclui PROD
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
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
      FROM escolas e
      LEFT JOIN turmas t ON t.escola_id = e.id AND t.ativo = true
      LEFT JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
        AND rc.serie = '2º Ano'
      WHERE e.nome ILIKE '%castanhal%'
      GROUP BY e.id, e.nome
      HAVING COUNT(DISTINCT rc.aluno_id) > 0
    `;

    const escolaResult = await pool.query(escolaQuery);

    escolaResult.rows.forEach((row) => {
      console.log(`\nEscola: ${row.nome}`);
      console.log(`  Total Alunos (2º Ano): ${row.total_alunos}`);
      console.log(`  Total Turmas: ${row.total_turmas}`);
      console.log(`  Média Geral: ${row.media_geral}`);
      console.log(`  Média LP: ${row.media_lp}`);
      console.log(`  Média MAT: ${row.media_mat}`);
      console.log(`  Média PROD: ${row.media_prod}`);
      console.log(`  Presentes: ${row.presentes}`);
      console.log(`  Faltantes: ${row.faltantes}`);
    });

    // 4. Comparação final
    console.log('\n\n📋 4. COMPARAÇÃO FINAL');
    console.log('-'.repeat(80));

    if (alunoResult.rows.length > 0 && turmaResult.rows.length > 0 && escolaResult.rows.length > 0) {
      const aluno = alunoResult.rows[0];
      const turma = turmaResult.rows[0];
      const escola = escolaResult.rows[0];

      const alunoLp = parseFloat(aluno.nota_lp) || 0;
      const alunoMat = parseFloat(aluno.nota_mat) || 0;
      const alunoProd = parseFloat(aluno.nota_producao) || 0;
      const alunoMediaCalc = (alunoLp + alunoMat + alunoProd) / 3;

      console.log('\n| Métrica          | Aluno     | Turma     | Escola    | Status |');
      console.log('|------------------|-----------|-----------|-----------|--------|');
      console.log(`| LP               | ${alunoLp.toFixed(2).padStart(9)} | ${turma.media_lp?.toString().padStart(9) || '-'.padStart(9)} | ${escola.media_lp?.toString().padStart(9) || '-'.padStart(9)} | ${alunoLp.toFixed(2) === turma.media_lp ? '✅' : '⚠️'} |`);
      console.log(`| MAT              | ${alunoMat.toFixed(2).padStart(9)} | ${turma.media_mat?.toString().padStart(9) || '-'.padStart(9)} | ${escola.media_mat?.toString().padStart(9) || '-'.padStart(9)} | ${alunoMat.toFixed(2) === turma.media_mat ? '✅' : '⚠️'} |`);
      console.log(`| PROD             | ${alunoProd.toFixed(2).padStart(9)} | ${turma.media_prod?.toString().padStart(9) || '-'.padStart(9)} | ${escola.media_prod?.toString().padStart(9) || '-'.padStart(9)} | ${alunoProd.toFixed(2) === turma.media_prod ? '✅' : '⚠️'} |`);
      console.log(`| Média (calc)     | ${alunoMediaCalc.toFixed(2).padStart(9)} | ${turma.media_geral?.toString().padStart(9) || '-'.padStart(9)} | ${escola.media_geral?.toString().padStart(9) || '-'.padStart(9)} | ${Math.abs(alunoMediaCalc - parseFloat(turma.media_geral)) < 0.01 ? '✅' : '⚠️'} |`);
      console.log(`| Média (armaz.)   | ${parseFloat(aluno.media_aluno).toFixed(2).padStart(9)} | ${'N/A'.padStart(9)} | ${'N/A'.padStart(9)} | ${Math.abs(alunoMediaCalc - parseFloat(aluno.media_aluno)) < 0.01 ? '✅' : '⚠️'} |`);

      console.log('\n📌 LEGENDA:');
      console.log('   ✅ = Valores consistentes');
      console.log('   ⚠️ = Possível inconsistência (verificar)');
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
