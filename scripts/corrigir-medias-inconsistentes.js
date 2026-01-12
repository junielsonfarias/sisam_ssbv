// Script para analisar e corrigir médias inconsistentes
// Executar: node scripts/corrigir-medias-inconsistentes.js

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

async function analisarECorrigir() {
  console.log('\n' + '='.repeat(80));
  console.log('ANÁLISE E CORREÇÃO DE MÉDIAS INCONSISTENTES');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Buscar todos os registros com presença P e calcular média correta
    console.log('📊 1. ANALISANDO TODOS OS REGISTROS COM PRESENÇA:');
    console.log('-'.repeat(80));

    // Query para anos iniciais (2º, 3º, 5º) - média = (LP + MAT + PROD) / disciplinas > 0
    const anosIniciaisQuery = `
      SELECT
        rp.id,
        a.nome as aluno_nome,
        rp.serie,
        e.nome as escola_nome,
        rp.nota_lp,
        rp.nota_mat,
        rp.nota_producao,
        rp.media_aluno as media_armazenada,
        -- Calcular média correta (apenas disciplinas > 0)
        CASE
          WHEN (
            CASE WHEN CAST(rp.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
            CASE WHEN CAST(rp.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
            CASE WHEN CAST(rp.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END
          ) > 0 THEN
            ROUND((
              CASE WHEN CAST(rp.nota_lp AS DECIMAL) > 0 THEN CAST(rp.nota_lp AS DECIMAL) ELSE 0 END +
              CASE WHEN CAST(rp.nota_mat AS DECIMAL) > 0 THEN CAST(rp.nota_mat AS DECIMAL) ELSE 0 END +
              CASE WHEN CAST(rp.nota_producao AS DECIMAL) > 0 THEN CAST(rp.nota_producao AS DECIMAL) ELSE 0 END
            ) / (
              CASE WHEN CAST(rp.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN CAST(rp.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN CAST(rp.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END
            ), 2)
          ELSE 0
        END as media_calculada
      FROM resultados_provas rp
      INNER JOIN alunos a ON rp.aluno_id = a.id
      INNER JOIN escolas e ON rp.escola_id = e.id
      WHERE (rp.presenca = 'P' OR rp.presenca = 'p')
      AND REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
      AND (
        CAST(rp.nota_lp AS DECIMAL) > 0 OR
        CAST(rp.nota_mat AS DECIMAL) > 0 OR
        CAST(rp.nota_producao AS DECIMAL) > 0
      )
    `;

    const anosIniciaisResult = await pool.query(anosIniciaisQuery);

    // Query para anos finais (6º, 7º, 8º, 9º) - média = (LP + CH + MAT + CN) / disciplinas > 0
    const anosFinaisQuery = `
      SELECT
        rp.id,
        a.nome as aluno_nome,
        rp.serie,
        e.nome as escola_nome,
        rp.nota_lp,
        rp.nota_mat,
        rp.nota_ch,
        rp.nota_cn,
        rp.media_aluno as media_armazenada,
        -- Calcular média correta (apenas disciplinas > 0)
        CASE
          WHEN (
            CASE WHEN CAST(rp.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
            CASE WHEN CAST(rp.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
            CASE WHEN CAST(rp.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
            CASE WHEN CAST(rp.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END
          ) > 0 THEN
            ROUND((
              CASE WHEN CAST(rp.nota_lp AS DECIMAL) > 0 THEN CAST(rp.nota_lp AS DECIMAL) ELSE 0 END +
              CASE WHEN CAST(rp.nota_mat AS DECIMAL) > 0 THEN CAST(rp.nota_mat AS DECIMAL) ELSE 0 END +
              CASE WHEN CAST(rp.nota_ch AS DECIMAL) > 0 THEN CAST(rp.nota_ch AS DECIMAL) ELSE 0 END +
              CASE WHEN CAST(rp.nota_cn AS DECIMAL) > 0 THEN CAST(rp.nota_cn AS DECIMAL) ELSE 0 END
            ) / (
              CASE WHEN CAST(rp.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN CAST(rp.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN CAST(rp.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
              CASE WHEN CAST(rp.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END
            ), 2)
          ELSE 0
        END as media_calculada
      FROM resultados_provas rp
      INNER JOIN alunos a ON rp.aluno_id = a.id
      INNER JOIN escolas e ON rp.escola_id = e.id
      WHERE (rp.presenca = 'P' OR rp.presenca = 'p')
      AND REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')
      AND (
        CAST(rp.nota_lp AS DECIMAL) > 0 OR
        CAST(rp.nota_mat AS DECIMAL) > 0 OR
        CAST(rp.nota_ch AS DECIMAL) > 0 OR
        CAST(rp.nota_cn AS DECIMAL) > 0
      )
    `;

    const anosFinaisResult = await pool.query(anosFinaisQuery);

    // Combinar resultados e encontrar discrepâncias
    const todosRegistros = [...anosIniciaisResult.rows, ...anosFinaisResult.rows];

    console.log(`\nTotal de registros analisados: ${todosRegistros.length}`);

    // Encontrar discrepâncias (diferença > 0.01)
    const discrepancias = todosRegistros.filter(row => {
      const armazenada = parseFloat(row.media_armazenada) || 0;
      const calculada = parseFloat(row.media_calculada) || 0;
      return Math.abs(armazenada - calculada) > 0.01;
    });

    console.log(`Registros com discrepância: ${discrepancias.length}\n`);

    // 2. Mostrar discrepâncias por série
    console.log('\n📋 2. DISCREPÂNCIAS ENCONTRADAS POR SÉRIE:');
    console.log('-'.repeat(80));

    // Agrupar por série
    const porSerie = {};
    discrepancias.forEach(row => {
      if (!porSerie[row.serie]) {
        porSerie[row.serie] = [];
      }
      porSerie[row.serie].push(row);
    });

    Object.keys(porSerie).sort().forEach(serie => {
      console.log(`\n📌 ${serie}: ${porSerie[serie].length} discrepância(s)`);
      porSerie[serie].slice(0, 5).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.aluno_nome} (${row.escola_nome})`);
        console.log(`      Armazenada: ${parseFloat(row.media_armazenada)?.toFixed(2) || 'NULL'} → Calculada: ${row.media_calculada}`);
      });
      if (porSerie[serie].length > 5) {
        console.log(`   ... e mais ${porSerie[serie].length - 5} registro(s)`);
      }
    });

    // 3. Corrigir as médias
    if (discrepancias.length > 0) {
      console.log('\n\n🔧 3. CORRIGINDO MÉDIAS:');
      console.log('-'.repeat(80));

      let corrigidos = 0;

      for (const row of discrepancias) {
        const updateQuery = `
          UPDATE resultados_provas
          SET media_aluno = $1
          WHERE id = $2
        `;

        await pool.query(updateQuery, [row.media_calculada, row.id]);
        corrigidos++;
      }

      console.log(`\n✅ ${corrigidos} média(s) corrigida(s) com sucesso!`);
    } else {
      console.log('\n✅ Nenhuma discrepância encontrada. Todas as médias estão corretas!');
    }

    // 4. Verificação final
    console.log('\n\n📊 4. VERIFICAÇÃO FINAL - CECILIA BEATRIZ:');
    console.log('-'.repeat(80));

    const verificarQuery = `
      SELECT
        a.nome,
        rp.serie,
        rp.nota_lp,
        rp.nota_mat,
        rp.nota_producao,
        rp.media_aluno
      FROM resultados_provas rp
      INNER JOIN alunos a ON rp.aluno_id = a.id
      WHERE a.nome ILIKE '%cecilia%beatriz%'
    `;

    const verificarResult = await pool.query(verificarQuery);
    if (verificarResult.rows.length > 0) {
      const aluno = verificarResult.rows[0];
      console.log(`  Nome: ${aluno.nome}`);
      console.log(`  Série: ${aluno.serie}`);
      console.log(`  LP: ${aluno.nota_lp}, MAT: ${aluno.nota_mat}, PROD: ${aluno.nota_producao}`);
      console.log(`  Média Armazenada: ${aluno.media_aluno}`);

      const lp = parseFloat(aluno.nota_lp) || 0;
      const mat = parseFloat(aluno.nota_mat) || 0;
      const prod = parseFloat(aluno.nota_producao) || 0;
      let count = 0;
      let soma = 0;
      if (lp > 0) { soma += lp; count++; }
      if (mat > 0) { soma += mat; count++; }
      if (prod > 0) { soma += prod; count++; }
      const mediaCalc = count > 0 ? soma / count : 0;
      console.log(`  Média Calculada: ${mediaCalc.toFixed(2)}`);
      console.log(`  ${Math.abs(parseFloat(aluno.media_aluno) - mediaCalc) < 0.02 ? '✅ CONSISTENTE' : '⚠️ AINDA INCONSISTENTE'}`);
    }

    // 5. Resumo por série após correção
    console.log('\n\n📊 5. RESUMO POR SÉRIE (APÓS CORREÇÃO):');
    console.log('-'.repeat(80));

    const resumoQuery = `
      SELECT
        serie,
        COUNT(*) as total,
        COUNT(CASE WHEN presenca = 'P' THEN 1 END) as presentes,
        ROUND(AVG(CASE WHEN presenca = 'P' AND CAST(media_aluno AS DECIMAL) > 0 THEN CAST(media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral
      FROM resultados_provas
      GROUP BY serie
      ORDER BY serie
    `;

    const resumoResult = await pool.query(resumoQuery);

    console.log('\n| Série       | Total | Presentes | Média Geral |');
    console.log('|-------------|-------|-----------|-------------|');
    resumoResult.rows.forEach(row => {
      console.log(`| ${(row.serie || 'NULL').padEnd(11)} | ${row.total.toString().padStart(5)} | ${row.presentes.toString().padStart(9)} | ${row.media_geral?.toString().padStart(11) || 'N/A'.padStart(11)} |`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('CORREÇÃO CONCLUÍDA');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

analisarECorrigir();
