// Script completo para corrigir médias e séries inconsistentes
// Executar: node scripts/corrigir-medias-completo.js

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
  console.log('\n' + '='.repeat(80));
  console.log('CORREÇÃO COMPLETA DE MÉDIAS E SÉRIES');
  console.log('='.repeat(80) + '\n');

  try {
    // =====================================================
    // PARTE 1: CORRIGIR SÉRIES EM resultados_consolidados
    // =====================================================
    console.log('🔧 1. CORRIGINDO SÉRIES EM resultados_consolidados:');
    console.log('-'.repeat(80));

    // Corrigir "2º" para "2º Ano"
    const update2RCQuery = `
      UPDATE resultados_consolidados
      SET serie = '2º Ano'
      WHERE serie = '2º'
      RETURNING id
    `;
    const update2RCResult = await pool.query(update2RCQuery);
    console.log(`  ✅ ${update2RCResult.rowCount} registro(s) corrigido(s) de "2º" para "2º Ano"`);

    // Corrigir "3º" para "3º Ano"
    const update3RCQuery = `
      UPDATE resultados_consolidados
      SET serie = '3º Ano'
      WHERE serie = '3º'
      RETURNING id
    `;
    const update3RCResult = await pool.query(update3RCQuery);
    console.log(`  ✅ ${update3RCResult.rowCount} registro(s) corrigido(s) de "3º" para "3º Ano"`);

    // =====================================================
    // PARTE 2: CORRIGIR MÉDIAS EM resultados_consolidados
    // =====================================================
    console.log('\n\n🔧 2. CORRIGINDO MÉDIAS EM resultados_consolidados:');
    console.log('-'.repeat(80));

    // 2.1 Anos Iniciais (2º, 3º, 5º Ano): média = (LP + MAT + PROD) / disciplinas > 0
    console.log('\n  📌 Anos Iniciais (2º, 3º, 5º Ano):');

    const updateAnosIniciaisRCQuery = `
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
    const updateAnosIniciaisRCResult = await pool.query(updateAnosIniciaisRCQuery);
    console.log(`     ✅ ${updateAnosIniciaisRCResult.rowCount} média(s) corrigida(s)`);

    // 2.2 Anos Finais (6º, 7º, 8º, 9º Ano): média = (LP + CH + MAT + CN) / disciplinas > 0
    console.log('\n  📌 Anos Finais (6º, 7º, 8º, 9º Ano):');

    const updateAnosFinaisRCQuery = `
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
    const updateAnosFinaisRCResult = await pool.query(updateAnosFinaisRCQuery);
    console.log(`     ✅ ${updateAnosFinaisRCResult.rowCount} média(s) corrigida(s)`);

    // =====================================================
    // PARTE 3: CORRIGIR SÉRIES EM resultados_consolidados_v2
    // =====================================================
    console.log('\n\n🔧 3. CORRIGINDO SÉRIES EM resultados_consolidados_v2:');
    console.log('-'.repeat(80));

    // Corrigir "2º" para "2º Ano"
    const update2V2Query = `
      UPDATE resultados_consolidados_v2
      SET serie = '2º Ano'
      WHERE serie = '2º'
      RETURNING aluno_id
    `;
    const update2V2Result = await pool.query(update2V2Query);
    console.log(`  ✅ ${update2V2Result.rowCount} registro(s) corrigido(s) de "2º" para "2º Ano"`);

    // Corrigir "3º" para "3º Ano"
    const update3V2Query = `
      UPDATE resultados_consolidados_v2
      SET serie = '3º Ano'
      WHERE serie = '3º'
      RETURNING aluno_id
    `;
    const update3V2Result = await pool.query(update3V2Query);
    console.log(`  ✅ ${update3V2Result.rowCount} registro(s) corrigido(s) de "3º" para "3º Ano"`);

    // =====================================================
    // PARTE 4: SINCRONIZAR nota_producao de RC para V2
    // =====================================================
    console.log('\n\n🔧 4. SINCRONIZANDO nota_producao EM resultados_consolidados_v2:');
    console.log('-'.repeat(80));

    const syncProdQuery = `
      UPDATE resultados_consolidados_v2 v2
      SET nota_producao = rc.nota_producao
      FROM resultados_consolidados rc
      WHERE v2.aluno_id = rc.aluno_id
      AND v2.ano_letivo = rc.ano_letivo
      AND v2.nota_producao IS NULL
      AND rc.nota_producao IS NOT NULL
      RETURNING v2.aluno_id
    `;
    const syncProdResult = await pool.query(syncProdQuery);
    console.log(`  ✅ ${syncProdResult.rowCount} nota_producao sincronizada(s)`);

    // =====================================================
    // PARTE 5: CORRIGIR MÉDIAS EM resultados_consolidados_v2
    // =====================================================
    console.log('\n\n🔧 5. CORRIGINDO MÉDIAS EM resultados_consolidados_v2:');
    console.log('-'.repeat(80));

    // 5.1 Anos Iniciais
    console.log('\n  📌 Anos Iniciais (2º, 3º, 5º Ano):');

    const updateAnosIniciaisV2Query = `
      UPDATE resultados_consolidados_v2
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
      RETURNING aluno_id
    `;
    const updateAnosIniciaisV2Result = await pool.query(updateAnosIniciaisV2Query);
    console.log(`     ✅ ${updateAnosIniciaisV2Result.rowCount} média(s) corrigida(s)`);

    // 5.2 Anos Finais
    console.log('\n  📌 Anos Finais (6º, 7º, 8º, 9º Ano):');

    const updateAnosFinaisV2Query = `
      UPDATE resultados_consolidados_v2
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
      RETURNING aluno_id
    `;
    const updateAnosFinaisV2Result = await pool.query(updateAnosFinaisV2Query);
    console.log(`     ✅ ${updateAnosFinaisV2Result.rowCount} média(s) corrigida(s)`);

    // =====================================================
    // PARTE 6: VERIFICAÇÃO FINAL
    // =====================================================
    console.log('\n\n📊 6. VERIFICAÇÃO FINAL:');
    console.log('-'.repeat(80));

    // Verificar CECILIA BEATRIZ
    console.log('\n  👤 CECILIA BEATRIZ:');

    const verificarQuery = `
      SELECT
        'VIEW' as fonte,
        rc.serie,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_producao,
        rc.media_aluno
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      WHERE a.nome ILIKE '%cecilia%beatriz%'
    `;

    const verificarResult = await pool.query(verificarQuery);
    if (verificarResult.rows.length > 0) {
      const row = verificarResult.rows[0];
      console.log(`     Série: ${row.serie}`);
      console.log(`     LP: ${row.nota_lp}, MAT: ${row.nota_mat}, PROD: ${row.nota_producao}`);
      console.log(`     Média Armazenada: ${row.media_aluno}`);

      const lp = parseFloat(row.nota_lp) || 0;
      const mat = parseFloat(row.nota_mat) || 0;
      const prod = parseFloat(row.nota_producao) || 0;
      let count = 0, soma = 0;
      if (lp > 0) { soma += lp; count++; }
      if (mat > 0) { soma += mat; count++; }
      if (prod > 0) { soma += prod; count++; }
      const mediaCalc = count > 0 ? soma / count : 0;
      console.log(`     Média Calculada: ${mediaCalc.toFixed(2)}`);
      console.log(`     ${Math.abs(parseFloat(row.media_aluno) - mediaCalc) < 0.02 ? '✅ CONSISTENTE' : '⚠️ INCONSISTENTE'}`);
    }

    // Resumo por série
    console.log('\n\n  📊 RESUMO POR SÉRIE (VIEW):');

    const resumoQuery = `
      SELECT
        serie,
        COUNT(*) as total,
        COUNT(CASE WHEN presenca = 'P' THEN 1 END) as presentes,
        ROUND(AVG(CASE WHEN presenca = 'P' AND CAST(media_aluno AS DECIMAL) > 0 THEN CAST(media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral
      FROM resultados_consolidados_unificada
      GROUP BY serie
      ORDER BY serie
    `;

    const resumoResult = await pool.query(resumoQuery);

    console.log('\n     | Série       | Total | Presentes | Média Geral |');
    console.log('     |-------------|-------|-----------|-------------|');
    resumoResult.rows.forEach(row => {
      console.log(`     | ${(row.serie || 'NULL').padEnd(11)} | ${row.total.toString().padStart(5)} | ${row.presentes.toString().padStart(9)} | ${row.media_geral?.toString().padStart(11) || 'N/A'.padStart(11)} |`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('CORREÇÃO COMPLETA FINALIZADA');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

corrigirTudo();
