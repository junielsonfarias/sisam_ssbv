// Script de revisão completa do sistema
// Executar: node scripts/revisao-completa.js

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

async function revisaoCompleta() {
  console.log('\n' + '='.repeat(100));
  console.log('REVISÃO COMPLETA DO SISTEMA SISAM');
  console.log('='.repeat(100) + '\n');

  try {
    // =====================================================
    // 1. VERIFICAR SÉRIES CADASTRADAS
    // =====================================================
    console.log('📋 1. SÉRIES CADASTRADAS:');
    console.log('-'.repeat(100));

    const seriesQuery = `
      SELECT DISTINCT serie, COUNT(*) as total
      FROM resultados_consolidados_unificada
      GROUP BY serie
      ORDER BY serie
    `;
    const seriesResult = await pool.query(seriesQuery);

    console.log('\n| Série       | Total Registros |');
    console.log('|-------------|-----------------|');
    seriesResult.rows.forEach(row => {
      const isOk = row.serie?.includes('Ano') || row.serie === null;
      console.log(`| ${(row.serie || 'NULL').padEnd(11)} | ${row.total.toString().padStart(15)} | ${isOk ? '✅' : '⚠️ Série sem "Ano"'}`);
    });

    // =====================================================
    // 2. VERIFICAR CONSISTÊNCIA DE MÉDIAS POR SÉRIE
    // =====================================================
    console.log('\n\n📊 2. CONSISTÊNCIA DE MÉDIAS POR SÉRIE:');
    console.log('-'.repeat(100));

    const series = ['2º Ano', '3º Ano', '5º Ano', '8º Ano', '9º Ano'];

    for (const serie of series) {
      const isAnosIniciais = ['2º Ano', '3º Ano', '5º Ano'].includes(serie);

      // Buscar alunos presentes desta série
      const alunosQuery = `
        SELECT
          a.nome,
          e.nome as escola,
          u.nota_lp,
          u.nota_mat,
          u.nota_producao,
          u.nota_ch,
          u.nota_cn,
          u.media_aluno
        FROM resultados_consolidados_unificada u
        INNER JOIN alunos a ON u.aluno_id = a.id
        INNER JOIN escolas e ON u.escola_id = e.id
        WHERE u.serie = $1
        AND (u.presenca = 'P' OR u.presenca = 'p')
        ORDER BY e.nome, a.nome
        LIMIT 10
      `;

      const alunosResult = await pool.query(alunosQuery, [serie]);

      console.log(`\n📌 ${serie} (${isAnosIniciais ? 'Anos Iniciais - LP+MAT+PROD' : 'Anos Finais - LP+MAT+CH+CN'}):`);

      if (alunosResult.rows.length === 0) {
        console.log('   Nenhum aluno presente encontrado.');
        continue;
      }

      let inconsistentes = 0;
      alunosResult.rows.forEach((row, index) => {
        let mediaCalculada;
        let disciplinas = [];

        if (isAnosIniciais) {
          const lp = parseFloat(row.nota_lp) || 0;
          const mat = parseFloat(row.nota_mat) || 0;
          const prod = parseFloat(row.nota_producao) || 0;

          let soma = 0, count = 0;
          if (lp > 0) { soma += lp; count++; disciplinas.push(`LP:${lp}`); }
          if (mat > 0) { soma += mat; count++; disciplinas.push(`MAT:${mat}`); }
          if (prod > 0) { soma += prod; count++; disciplinas.push(`PROD:${prod}`); }

          mediaCalculada = count > 0 ? soma / count : 0;
        } else {
          const lp = parseFloat(row.nota_lp) || 0;
          const mat = parseFloat(row.nota_mat) || 0;
          const ch = parseFloat(row.nota_ch) || 0;
          const cn = parseFloat(row.nota_cn) || 0;

          let soma = 0, count = 0;
          if (lp > 0) { soma += lp; count++; disciplinas.push(`LP:${lp}`); }
          if (mat > 0) { soma += mat; count++; disciplinas.push(`MAT:${mat}`); }
          if (ch > 0) { soma += ch; count++; disciplinas.push(`CH:${ch}`); }
          if (cn > 0) { soma += cn; count++; disciplinas.push(`CN:${cn}`); }

          mediaCalculada = count > 0 ? soma / count : 0;
        }

        const mediaArmazenada = parseFloat(row.media_aluno) || 0;
        const diff = Math.abs(mediaCalculada - mediaArmazenada);
        const isOk = diff < 0.02;

        if (!isOk) {
          inconsistentes++;
          if (inconsistentes <= 3) {
            console.log(`   ⚠️ ${row.nome} (${row.escola})`);
            console.log(`      Notas: ${disciplinas.join(', ')}`);
            console.log(`      Média Armazenada: ${mediaArmazenada.toFixed(2)} | Calculada: ${mediaCalculada.toFixed(2)} | Diff: ${diff.toFixed(4)}`);
          }
        }
      });

      if (inconsistentes === 0) {
        console.log(`   ✅ Todos os ${alunosResult.rows.length} alunos verificados estão consistentes.`);
      } else {
        console.log(`   ⚠️ ${inconsistentes} inconsistência(s) encontrada(s) de ${alunosResult.rows.length} verificados.`);
      }
    }

    // =====================================================
    // 3. COMPARAR ALUNO x TURMA x ESCOLA (Amostragem)
    // =====================================================
    console.log('\n\n📊 3. COMPARAÇÃO ALUNO x TURMA x ESCOLA:');
    console.log('-'.repeat(100));

    for (const serie of series) {
      const isAnosIniciais = ['2º Ano', '3º Ano', '5º Ano'].includes(serie);

      // Buscar uma escola com alunos presentes nesta série
      const escolaQuery = `
        SELECT DISTINCT e.id, e.nome
        FROM escolas e
        INNER JOIN resultados_consolidados_unificada u ON u.escola_id = e.id
        WHERE u.serie = $1
        AND (u.presenca = 'P' OR u.presenca = 'p')
        LIMIT 1
      `;
      const escolaResult = await pool.query(escolaQuery, [serie]);

      if (escolaResult.rows.length === 0) {
        console.log(`\n📌 ${serie}: Nenhuma escola com alunos presentes.`);
        continue;
      }

      const escola = escolaResult.rows[0];

      // Média dos alunos (calculada manualmente)
      let mediasQuery;
      if (isAnosIniciais) {
        mediasQuery = `
          SELECT
            ROUND(AVG(CASE WHEN CAST(nota_lp AS DECIMAL) > 0 THEN CAST(nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
            ROUND(AVG(CASE WHEN CAST(nota_mat AS DECIMAL) > 0 THEN CAST(nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
            ROUND(AVG(CASE WHEN CAST(nota_producao AS DECIMAL) > 0 THEN CAST(nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
            ROUND(AVG(CAST(media_aluno AS DECIMAL)), 2) as media_geral,
            COUNT(*) as total_alunos
          FROM resultados_consolidados_unificada
          WHERE escola_id = $1
          AND serie = $2
          AND (presenca = 'P' OR presenca = 'p')
        `;
      } else {
        mediasQuery = `
          SELECT
            ROUND(AVG(CASE WHEN CAST(nota_lp AS DECIMAL) > 0 THEN CAST(nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
            ROUND(AVG(CASE WHEN CAST(nota_mat AS DECIMAL) > 0 THEN CAST(nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
            ROUND(AVG(CASE WHEN CAST(nota_ch AS DECIMAL) > 0 THEN CAST(nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
            ROUND(AVG(CASE WHEN CAST(nota_cn AS DECIMAL) > 0 THEN CAST(nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
            ROUND(AVG(CAST(media_aluno AS DECIMAL)), 2) as media_geral,
            COUNT(*) as total_alunos
          FROM resultados_consolidados_unificada
          WHERE escola_id = $1
          AND serie = $2
          AND (presenca = 'P' OR presenca = 'p')
        `;
      }

      const mediasResult = await pool.query(mediasQuery, [escola.id, serie]);
      const medias = mediasResult.rows[0];

      console.log(`\n📌 ${serie} - ${escola.nome} (${medias.total_alunos} alunos):`);

      if (isAnosIniciais) {
        console.log(`   LP: ${medias.media_lp || 'N/A'} | MAT: ${medias.media_mat || 'N/A'} | PROD: ${medias.media_prod || 'N/A'} | Média: ${medias.media_geral || 'N/A'}`);
      } else {
        console.log(`   LP: ${medias.media_lp || 'N/A'} | MAT: ${medias.media_mat || 'N/A'} | CH: ${medias.media_ch || 'N/A'} | CN: ${medias.media_cn || 'N/A'} | Média: ${medias.media_geral || 'N/A'}`);
      }
    }

    // =====================================================
    // 4. VERIFICAR CAMPOS NULL OU ZERADOS
    // =====================================================
    console.log('\n\n📊 4. VERIFICAÇÃO DE CAMPOS NULL/ZERADOS:');
    console.log('-'.repeat(100));

    const nullCheckQuery = `
      SELECT
        serie,
        COUNT(*) as total,
        COUNT(CASE WHEN (presenca = 'P' OR presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN nota_lp IS NULL OR CAST(nota_lp AS DECIMAL) = 0 THEN 1 END) as lp_vazio,
        COUNT(CASE WHEN nota_mat IS NULL OR CAST(nota_mat AS DECIMAL) = 0 THEN 1 END) as mat_vazio,
        COUNT(CASE WHEN nota_producao IS NULL OR CAST(nota_producao AS DECIMAL) = 0 THEN 1 END) as prod_vazio,
        COUNT(CASE WHEN media_aluno IS NULL OR CAST(media_aluno AS DECIMAL) = 0 THEN 1 END) as media_vazia
      FROM resultados_consolidados_unificada
      WHERE (presenca = 'P' OR presenca = 'p')
      GROUP BY serie
      ORDER BY serie
    `;

    const nullCheckResult = await pool.query(nullCheckQuery);

    console.log('\n| Série       | Presentes | LP Vazio | MAT Vazio | PROD Vazio | Média Vazia |');
    console.log('|-------------|-----------|----------|-----------|------------|-------------|');
    nullCheckResult.rows.forEach(row => {
      console.log(`| ${(row.serie || 'NULL').padEnd(11)} | ${row.presentes.toString().padStart(9)} | ${row.lp_vazio.toString().padStart(8)} | ${row.mat_vazio.toString().padStart(9)} | ${row.prod_vazio.toString().padStart(10)} | ${row.media_vazia.toString().padStart(11)} |`);
    });

    // =====================================================
    // 5. RESUMO FINAL
    // =====================================================
    console.log('\n\n📋 5. RESUMO FINAL:');
    console.log('-'.repeat(100));

    const resumoQuery = `
      SELECT
        serie,
        COUNT(CASE WHEN (presenca = 'P' OR presenca = 'p') THEN 1 END) as presentes,
        COUNT(CASE WHEN (presenca = 'F' OR presenca = 'f') THEN 1 END) as faltantes,
        COUNT(CASE WHEN presenca = '-' OR presenca IS NULL THEN 1 END) as sem_prova,
        ROUND(AVG(CASE WHEN (presenca = 'P' OR presenca = 'p') AND CAST(media_aluno AS DECIMAL) > 0 THEN CAST(media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral
      FROM resultados_consolidados_unificada
      GROUP BY serie
      ORDER BY serie
    `;

    const resumoResult = await pool.query(resumoQuery);

    console.log('\n| Série       | Presentes | Faltantes | Sem Prova | Média Geral |');
    console.log('|-------------|-----------|-----------|-----------|-------------|');
    resumoResult.rows.forEach(row => {
      console.log(`| ${(row.serie || 'NULL').padEnd(11)} | ${row.presentes.toString().padStart(9)} | ${row.faltantes.toString().padStart(9)} | ${row.sem_prova.toString().padStart(9)} | ${row.media_geral?.toString().padStart(11) || 'N/A'.padStart(11)} |`);
    });

    console.log('\n' + '='.repeat(100));
    console.log('FIM DA REVISÃO');
    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

revisaoCompleta();
