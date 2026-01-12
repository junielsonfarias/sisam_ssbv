// Script para corrigir a VIEW resultados_consolidados_unificada
// Executar: node scripts/corrigir-view-unificada.js

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

async function corrigirView() {
  console.log('\n' + '='.repeat(80));
  console.log('CORRIGINDO VIEW resultados_consolidados_unificada');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Mostrar definição atual
    console.log('📋 1. DEFINIÇÃO ATUAL DA VIEW:');
    console.log('-'.repeat(80));

    const defQuery = `
      SELECT pg_get_viewdef('resultados_consolidados_unificada'::regclass, true) as definition
    `;
    const defResult = await pool.query(defQuery);
    console.log('A VIEW atual usa: COALESCE(v2.media_aluno, rc.media_aluno)');
    console.log('Isso prefere v2.media_aluno que NÃO inclui nota_producao para anos iniciais.');

    // 2. Criar nova definição da VIEW
    console.log('\n\n🔧 2. CRIANDO NOVA DEFINIÇÃO DA VIEW:');
    console.log('-'.repeat(80));

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
        -- CORREÇÃO: Para anos iniciais com nota_producao, usar rc.media_aluno
        CASE
          WHEN rc.nota_producao IS NOT NULL AND rc.nota_producao > 0
               AND REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
          THEN rc.media_aluno
          ELSE COALESCE(v2.media_aluno, rc.media_aluno)
        END AS media_aluno,
        COALESCE(v2.criado_em, rc.criado_em) AS criado_em,
        COALESCE(v2.atualizado_em, rc.atualizado_em) AS atualizado_em
      FROM resultados_consolidados_v2 v2
      FULL JOIN resultados_consolidados rc
        ON v2.aluno_id = rc.aluno_id
        AND v2.ano_letivo::text = rc.ano_letivo::text
    `;

    await pool.query(novaViewQuery);
    console.log('✅ VIEW atualizada com sucesso!');
    console.log('\nNova lógica para media_aluno:');
    console.log('  - Anos iniciais (2º, 3º, 5º) COM nota_producao: usa rc.media_aluno');
    console.log('  - Outros casos: usa COALESCE(v2.media_aluno, rc.media_aluno)');

    // 3. Verificar resultado
    console.log('\n\n📊 3. VERIFICAÇÃO APÓS CORREÇÃO:');
    console.log('-'.repeat(80));

    const verificarQuery = `
      SELECT
        u.serie,
        u.nota_lp,
        u.nota_mat,
        u.nota_producao,
        u.media_aluno
      FROM resultados_consolidados_unificada u
      INNER JOIN alunos a ON u.aluno_id = a.id
      WHERE a.nome ILIKE '%cecilia%beatriz%'
    `;

    const verificarResult = await pool.query(verificarQuery);
    if (verificarResult.rows.length > 0) {
      const row = verificarResult.rows[0];
      console.log(`\n  👤 CECILIA BEATRIZ:`);
      console.log(`     Série: ${row.serie}`);
      console.log(`     LP: ${row.nota_lp}, MAT: ${row.nota_mat}, PROD: ${row.nota_producao}`);
      console.log(`     Média: ${row.media_aluno}`);

      const lp = parseFloat(row.nota_lp) || 0;
      const mat = parseFloat(row.nota_mat) || 0;
      const prod = parseFloat(row.nota_producao) || 0;
      const mediaCalc = (lp + mat + prod) / 3;
      console.log(`     Média Esperada: ${mediaCalc.toFixed(2)}`);
      console.log(`     ${Math.abs(parseFloat(row.media_aluno) - mediaCalc) < 0.02 ? '✅ CORRETO!' : '⚠️ AINDA INCORRETO'}`);
    }

    // 4. Verificar outras séries
    console.log('\n\n📊 4. RESUMO POR SÉRIE (APÓS CORREÇÃO):');
    console.log('-'.repeat(80));

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

corrigirView();
