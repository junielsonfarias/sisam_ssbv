// Script para corrigir série "2º" para "2º Ano"
// Executar: node scripts/corrigir-serie-2ano.js

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

async function corrigir() {
  console.log('\n' + '='.repeat(80));
  console.log('CORREÇÃO DE SÉRIES INCONSISTENTES');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Verificar se é uma view ou tabela
    console.log('📋 1. VERIFICANDO ESTRUTURA:');
    console.log('-'.repeat(80));

    const estruturaQuery = `
      SELECT table_type
      FROM information_schema.tables
      WHERE table_name = 'resultados_consolidados_unificada'
    `;

    const estruturaResult = await pool.query(estruturaQuery);
    const tipo = estruturaResult.rows[0]?.table_type || 'DESCONHECIDO';
    console.log(`  Tipo de "resultados_consolidados_unificada": ${tipo}`);

    // 2. Se for VIEW, verificar a definição
    if (tipo === 'VIEW') {
      console.log('\n  É uma VIEW. Verificando tabela de origem...');

      // Verificar se existe tabela resultados_provas
      const tabelaQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'resultados_provas'
        AND column_name = 'serie'
      `;

      const tabelaResult = await pool.query(tabelaQuery);

      if (tabelaResult.rows.length > 0) {
        console.log('  Tabela "resultados_provas" encontrada com coluna "serie"');

        // Verificar registros na tabela real
        const verificarQuery = `
          SELECT serie, COUNT(*) as total
          FROM resultados_provas
          WHERE serie IN ('2º', '3º', '2º Ano', '3º Ano')
          GROUP BY serie
          ORDER BY serie
        `;

        const verificarResult = await pool.query(verificarQuery);
        console.log('\n  Registros em resultados_provas:');
        verificarResult.rows.forEach(row => {
          console.log(`    "${row.serie}": ${row.total} registros`);
        });

        // Corrigir na tabela real
        console.log('\n\n🔧 2. CORRIGINDO NA TABELA resultados_provas:');
        console.log('-'.repeat(80));

        // Corrigir "2º" para "2º Ano"
        const update2Query = `
          UPDATE resultados_provas
          SET serie = '2º Ano'
          WHERE serie = '2º'
          RETURNING id
        `;

        const update2Result = await pool.query(update2Query);
        console.log(`  ✅ ${update2Result.rowCount} registro(s) corrigido(s) de "2º" para "2º Ano"`);

        // Corrigir "3º" para "3º Ano"
        const update3Query = `
          UPDATE resultados_provas
          SET serie = '3º Ano'
          WHERE serie = '3º'
          RETURNING id
        `;

        const update3Result = await pool.query(update3Query);
        console.log(`  ✅ ${update3Result.rowCount} registro(s) corrigido(s) de "3º" para "3º Ano"`);
      }
    } else {
      // É uma tabela, atualizar diretamente
      console.log('\n\n🔧 2. CORRIGINDO NA TABELA:');
      console.log('-'.repeat(80));

      const update2Query = `
        UPDATE resultados_consolidados_unificada
        SET serie = '2º Ano'
        WHERE serie = '2º'
        RETURNING aluno_id
      `;

      const update2Result = await pool.query(update2Query);
      console.log(`  ✅ ${update2Result.rowCount} registro(s) corrigido(s) de "2º" para "2º Ano"`);

      const update3Query = `
        UPDATE resultados_consolidados_unificada
        SET serie = '3º Ano'
        WHERE serie = '3º'
        RETURNING aluno_id
      `;

      const update3Result = await pool.query(update3Query);
      console.log(`  ✅ ${update3Result.rowCount} registro(s) corrigido(s) de "3º" para "3º Ano"`);
    }

    // 3. Verificar resultado final na VIEW
    console.log('\n\n📋 3. VERIFICAÇÃO FINAL (na VIEW):');
    console.log('-'.repeat(80));

    const finalQuery = `
      SELECT serie, COUNT(*) as total,
        COUNT(CASE WHEN presenca = 'P' THEN 1 END) as presentes
      FROM resultados_consolidados_unificada
      WHERE serie LIKE '2%' OR serie LIKE '3%'
      GROUP BY serie
      ORDER BY serie
    `;

    const finalResult = await pool.query(finalQuery);
    console.log('\n| Série       | Total | Presentes |');
    console.log('|-------------|-------|-----------|');
    finalResult.rows.forEach(row => {
      console.log(`| ${(row.serie || 'NULL').padEnd(11)} | ${row.total.toString().padStart(5)} | ${row.presentes.toString().padStart(9)} |`);
    });

    // 4. Verificar aluno CECILIA
    console.log('\n\n👤 4. VERIFICANDO ALUNO CECILIA BEATRIZ:');
    console.log('-'.repeat(80));

    const alunoQuery = `
      SELECT
        a.nome,
        rc.serie,
        rc.presenca,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_producao,
        rc.media_aluno
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      WHERE a.nome ILIKE '%cecilia%beatriz%'
    `;

    const alunoResult = await pool.query(alunoQuery);
    if (alunoResult.rows.length > 0) {
      const aluno = alunoResult.rows[0];
      console.log(`  Nome: ${aluno.nome}`);
      console.log(`  Série: "${aluno.serie}"`);
      console.log(`  Presença: ${aluno.presenca}`);
      console.log(`  LP: ${aluno.nota_lp}`);
      console.log(`  MAT: ${aluno.nota_mat}`);
      console.log(`  PROD: ${aluno.nota_producao}`);
      console.log(`  Média: ${aluno.media_aluno}`);

      const lp = parseFloat(aluno.nota_lp) || 0;
      const mat = parseFloat(aluno.nota_mat) || 0;
      const prod = parseFloat(aluno.nota_producao) || 0;
      const mediaCalc = (lp + mat + prod) / 3;
      console.log(`  Média Calculada: ${mediaCalc.toFixed(2)}`);
    }

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

corrigir();
