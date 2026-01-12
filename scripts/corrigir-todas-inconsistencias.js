// Script para corrigir TODAS as inconsistências encontradas
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

async function corrigirTudo() {
  console.log('\n' + '='.repeat(100));
  console.log('CORREÇÃO DE TODAS AS INCONSISTÊNCIAS');
  console.log('='.repeat(100) + '\n');

  try {
    // =====================================================
    // 1. CORRIGIR SÉRIES RESTANTES
    // =====================================================
    console.log('🔧 1. CORRIGINDO SÉRIES EM resultados_consolidados:');
    console.log('-'.repeat(100));

    const seriesParaCorrigir = [
      { de: '2º', para: '2º Ano' },
      { de: '3º', para: '3º Ano' },
      { de: '5º', para: '5º Ano' },
      { de: '6º', para: '6º Ano' },
      { de: '7º', para: '7º Ano' },
      { de: '8º', para: '8º Ano' },
      { de: '9º', para: '9º Ano' },
    ];

    for (const { de, para } of seriesParaCorrigir) {
      const updateQuery = `
        UPDATE resultados_consolidados
        SET serie = $1
        WHERE serie = $2
        RETURNING id
      `;
      const result = await pool.query(updateQuery, [para, de]);
      if (result.rowCount > 0) {
        console.log(`  ✅ "${de}" → "${para}": ${result.rowCount} registro(s)`);
      }
    }

    // =====================================================
    // 2. RECALCULAR MÉDIAS EM resultados_consolidados
    // =====================================================
    console.log('\n\n🔧 2. RECALCULANDO MÉDIAS EM resultados_consolidados:');
    console.log('-'.repeat(100));

    // Anos Iniciais (2º, 3º, 5º): média = (LP + MAT + PROD) / disciplinas > 0
    console.log('\n  📌 Anos Iniciais (2º, 3º, 5º Ano):');

    const updateAnosIniciaisQuery = `
      UPDATE resultados_consolidados
      SET media_aluno = ROUND(
        (
          CASE WHEN COALESCE(nota_lp, 0) > 0 THEN nota_lp ELSE 0 END +
          CASE WHEN COALESCE(nota_mat, 0) > 0 THEN nota_mat ELSE 0 END +
          CASE WHEN COALESCE(nota_producao, 0) > 0 THEN nota_producao ELSE 0 END
        ) / NULLIF(
          CASE WHEN COALESCE(nota_lp, 0) > 0 THEN 1 ELSE 0 END +
          CASE WHEN COALESCE(nota_mat, 0) > 0 THEN 1 ELSE 0 END +
          CASE WHEN COALESCE(nota_producao, 0) > 0 THEN 1 ELSE 0 END,
          0
        ), 2)
      WHERE serie IN ('2º Ano', '3º Ano', '5º Ano')
      AND (presenca = 'P' OR presenca = 'p')
      AND (
        COALESCE(nota_lp, 0) > 0 OR
        COALESCE(nota_mat, 0) > 0 OR
        COALESCE(nota_producao, 0) > 0
      )
      RETURNING id
    `;
    const aiResult = await pool.query(updateAnosIniciaisQuery);
    console.log(`     ✅ ${aiResult.rowCount} média(s) recalculada(s)`);

    // Anos Finais (6º, 7º, 8º, 9º): média = (LP + CH + MAT + CN) / disciplinas > 0
    console.log('\n  📌 Anos Finais (6º, 7º, 8º, 9º Ano):');

    const updateAnosFinaisQuery = `
      UPDATE resultados_consolidados
      SET media_aluno = ROUND(
        (
          CASE WHEN COALESCE(nota_lp, 0) > 0 THEN nota_lp ELSE 0 END +
          CASE WHEN COALESCE(nota_ch, 0) > 0 THEN nota_ch ELSE 0 END +
          CASE WHEN COALESCE(nota_mat, 0) > 0 THEN nota_mat ELSE 0 END +
          CASE WHEN COALESCE(nota_cn, 0) > 0 THEN nota_cn ELSE 0 END
        ) / NULLIF(
          CASE WHEN COALESCE(nota_lp, 0) > 0 THEN 1 ELSE 0 END +
          CASE WHEN COALESCE(nota_ch, 0) > 0 THEN 1 ELSE 0 END +
          CASE WHEN COALESCE(nota_mat, 0) > 0 THEN 1 ELSE 0 END +
          CASE WHEN COALESCE(nota_cn, 0) > 0 THEN 1 ELSE 0 END,
          0
        ), 2)
      WHERE serie IN ('6º Ano', '7º Ano', '8º Ano', '9º Ano')
      AND (presenca = 'P' OR presenca = 'p')
      AND (
        COALESCE(nota_lp, 0) > 0 OR
        COALESCE(nota_ch, 0) > 0 OR
        COALESCE(nota_mat, 0) > 0 OR
        COALESCE(nota_cn, 0) > 0
      )
      RETURNING id
    `;
    const afResult = await pool.query(updateAnosFinaisQuery);
    console.log(`     ✅ ${afResult.rowCount} média(s) recalculada(s)`);

    // =====================================================
    // 3. ATUALIZAR VIEW PARA PREFERIR RC.MEDIA_ALUNO
    // =====================================================
    console.log('\n\n🔧 3. ATUALIZANDO VIEW resultados_consolidados_unificada:');
    console.log('-'.repeat(100));

    // A VIEW deve SEMPRE preferir rc.media_aluno quando existir, pois está calculada corretamente
    const novaViewQuery = `
      CREATE OR REPLACE VIEW resultados_consolidados_unificada AS
      SELECT
        COALESCE(v2.aluno_id, rc.aluno_id) AS aluno_id,
        COALESCE(v2.escola_id, rc.escola_id) AS escola_id,
        COALESCE(v2.turma_id, rc.turma_id) AS turma_id,
        COALESCE(v2.ano_letivo, rc.ano_letivo) AS ano_letivo,
        COALESCE(v2.serie, rc.serie) AS serie,
        COALESCE(v2.presenca, rc.presenca::text) AS presenca,
        COALESCE(v2.total_acertos_lp, rc.total_acertos_lp, 0) AS total_acertos_lp,
        COALESCE(v2.total_acertos_ch, rc.total_acertos_ch, 0) AS total_acertos_ch,
        COALESCE(v2.total_acertos_mat, rc.total_acertos_mat, 0) AS total_acertos_mat,
        COALESCE(v2.total_acertos_cn, rc.total_acertos_cn, 0) AS total_acertos_cn,
        COALESCE(v2.nota_lp, rc.nota_lp) AS nota_lp,
        COALESCE(v2.nota_ch, rc.nota_ch) AS nota_ch,
        COALESCE(v2.nota_mat, rc.nota_mat) AS nota_mat,
        COALESCE(v2.nota_cn, rc.nota_cn) AS nota_cn,
        rc.nota_producao,
        -- SEMPRE preferir rc.media_aluno quando existir (está calculada corretamente)
        COALESCE(rc.media_aluno, v2.media_aluno) AS media_aluno,
        COALESCE(v2.criado_em, rc.criado_em) AS criado_em,
        COALESCE(v2.atualizado_em, rc.atualizado_em) AS atualizado_em
      FROM resultados_consolidados_v2 v2
      FULL JOIN resultados_consolidados rc
        ON v2.aluno_id = rc.aluno_id
        AND v2.ano_letivo::text = rc.ano_letivo::text
    `;

    await pool.query(novaViewQuery);
    console.log('  ✅ VIEW atualizada para preferir rc.media_aluno');

    // =====================================================
    // 4. VERIFICAÇÃO FINAL
    // =====================================================
    console.log('\n\n📊 4. VERIFICAÇÃO FINAL:');
    console.log('-'.repeat(100));

    // Verificar WILLIAM
    console.log('\n  👤 WILLIAM FERREIRA FARIAS (5º Ano):');
    const williamQuery = `
      SELECT u.serie, u.nota_lp, u.nota_mat, u.nota_producao, u.media_aluno
      FROM resultados_consolidados_unificada u
      INNER JOIN alunos a ON u.aluno_id = a.id
      WHERE a.nome ILIKE '%william%ferreira%farias%'
    `;
    const williamResult = await pool.query(williamQuery);
    if (williamResult.rows.length > 0) {
      const row = williamResult.rows[0];
      console.log(`     LP: ${row.nota_lp}, MAT: ${row.nota_mat}, PROD: ${row.nota_producao}`);
      console.log(`     Média: ${row.media_aluno}`);
      const mediaCalc = ((parseFloat(row.nota_lp) || 0) + (parseFloat(row.nota_mat) || 0) + (parseFloat(row.nota_producao) || 0)) / 3;
      console.log(`     Esperada: ${mediaCalc.toFixed(2)}`);
      console.log(`     ${Math.abs(parseFloat(row.media_aluno) - mediaCalc) < 0.02 ? '✅ CORRETO' : '⚠️ INCORRETO'}`);
    }

    // Verificar AUGUSTO
    console.log('\n  👤 AUGUSTO JUNIOR (9º Ano):');
    const augustoQuery = `
      SELECT u.serie, u.nota_lp, u.nota_mat, u.nota_ch, u.nota_cn, u.media_aluno
      FROM resultados_consolidados_unificada u
      INNER JOIN alunos a ON u.aluno_id = a.id
      WHERE a.nome ILIKE '%augusto%junior%'
    `;
    const augustoResult = await pool.query(augustoQuery);
    if (augustoResult.rows.length > 0) {
      const row = augustoResult.rows[0];
      console.log(`     LP: ${row.nota_lp}, MAT: ${row.nota_mat}, CH: ${row.nota_ch}, CN: ${row.nota_cn}`);
      console.log(`     Média: ${row.media_aluno}`);
      let soma = 0, count = 0;
      if (parseFloat(row.nota_lp) > 0) { soma += parseFloat(row.nota_lp); count++; }
      if (parseFloat(row.nota_mat) > 0) { soma += parseFloat(row.nota_mat); count++; }
      if (parseFloat(row.nota_ch) > 0) { soma += parseFloat(row.nota_ch); count++; }
      if (parseFloat(row.nota_cn) > 0) { soma += parseFloat(row.nota_cn); count++; }
      const mediaCalc = count > 0 ? soma / count : 0;
      console.log(`     Esperada: ${mediaCalc.toFixed(2)}`);
      console.log(`     ${Math.abs(parseFloat(row.media_aluno) - mediaCalc) < 0.02 ? '✅ CORRETO' : '⚠️ INCORRETO'}`);
    }

    // Resumo por série
    console.log('\n\n📋 5. RESUMO POR SÉRIE:');
    console.log('-'.repeat(100));

    const resumoQuery = `
      SELECT
        serie,
        COUNT(CASE WHEN (presenca = 'P' OR presenca = 'p') THEN 1 END) as presentes,
        ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND CAST(media_aluno AS DECIMAL) > 0 THEN CAST(media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral
      FROM resultados_consolidados_unificada
      GROUP BY serie
      ORDER BY serie
    `;
    const resumoResult = await pool.query(resumoQuery);

    console.log('\n| Série       | Presentes | Média Geral |');
    console.log('|-------------|-----------|-------------|');
    resumoResult.rows.forEach(row => {
      console.log(`| ${(row.serie || 'NULL').padEnd(11)} | ${row.presentes.toString().padStart(9)} | ${row.media_geral?.toString().padStart(11) || 'N/A'.padStart(11)} |`);
    });

    console.log('\n' + '='.repeat(100));
    console.log('CORREÇÕES CONCLUÍDAS');
    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

corrigirTudo();
