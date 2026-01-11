/**
 * Script de teste para comparar dados do relatório com o dashboard
 * Execute com: npx ts-node scripts/testar-dados-relatorio.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

const ESCOLA_ID = 'e0690bbd-dc70-4ded-b1b3-9b310f3c4c5f'; // EMEIF CAETÉ
const ANO_LETIVO = '2025';

interface ComparacaoResultado {
  fonte: string;
  total_alunos: number;
  media_geral: number;
  media_lp: number;
  media_mat: number;
  media_ch: number;
  media_cn: number;
}

async function testarDados() {
  console.log('='.repeat(70));
  console.log('TESTE DE COMPARAÇÃO: RELATÓRIO vs DASHBOARD');
  console.log('='.repeat(70));
  console.log(`Escola ID: ${ESCOLA_ID}`);
  console.log(`Ano Letivo: ${ANO_LETIVO}`);
  console.log('');

  try {
    // =====================================================
    // QUERY DO DASHBOARD (como está no graficos/route.ts)
    // =====================================================
    const dashboardQuery = `
      SELECT
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END), 2) as media_geral,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN 1 END) as total_alunos
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
    `;

    const dashboardResult = await pool.query(dashboardQuery, [ESCOLA_ID, ANO_LETIVO]);
    const dashboard = dashboardResult.rows[0];

    // =====================================================
    // QUERY DO RELATÓRIO (como está no consultas-relatorio.ts)
    // =====================================================
    const relatorioEstatQuery = `
      SELECT
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
    `;

    const relatorioDiscQuery = `
      WITH disciplinas AS (
        SELECT
          'LP' as disciplina,
          AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END) as media
        FROM resultados_consolidados_unificada rc
        WHERE rc.escola_id = $1 AND rc.ano_letivo = $2

        UNION ALL

        SELECT
          'MAT' as disciplina,
          AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END) as media
        FROM resultados_consolidados_unificada rc
        WHERE rc.escola_id = $1 AND rc.ano_letivo = $2

        UNION ALL

        SELECT
          'CH' as disciplina,
          AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) END) as media
        FROM resultados_consolidados_unificada rc
        WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
          AND rc.serie IN ('8º Ano', '9º Ano')

        UNION ALL

        SELECT
          'CN' as disciplina,
          AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) END) as media
        FROM resultados_consolidados_unificada rc
        WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
          AND rc.serie IN ('8º Ano', '9º Ano')
      )
      SELECT disciplina, COALESCE(ROUND(media::numeric, 2), 0) as media FROM disciplinas
    `;

    const relatorioEstatResult = await pool.query(relatorioEstatQuery, [ESCOLA_ID, ANO_LETIVO]);
    const relatorioDiscResult = await pool.query(relatorioDiscQuery, [ESCOLA_ID, ANO_LETIVO]);

    const relatEstat = relatorioEstatResult.rows[0];
    const relatDisc: { [key: string]: number } = {};
    relatorioDiscResult.rows.forEach((r: any) => {
      relatDisc[r.disciplina] = parseFloat(r.media) || 0;
    });

    // =====================================================
    // COMPARAÇÃO
    // =====================================================
    console.log('DASHBOARD (graficos/route.ts):');
    console.log('-'.repeat(50));
    console.log(`  Total Alunos: ${dashboard.total_alunos}`);
    console.log(`  Média Geral:  ${dashboard.media_geral}`);
    console.log(`  Média LP:     ${dashboard.media_lp}`);
    console.log(`  Média MAT:    ${dashboard.media_mat}`);
    console.log(`  Média CH:     ${dashboard.media_ch}`);
    console.log(`  Média CN:     ${dashboard.media_cn}`);
    console.log('');

    console.log('RELATÓRIO (consultas-relatorio.ts):');
    console.log('-'.repeat(50));
    console.log(`  Total Alunos: ${relatEstat.total_alunos}`);
    console.log(`  Média Geral:  ${relatEstat.media_geral}`);
    console.log(`  Média LP:     ${relatDisc['LP'] || 0}`);
    console.log(`  Média MAT:    ${relatDisc['MAT'] || 0}`);
    console.log(`  Média CH:     ${relatDisc['CH'] || 0}`);
    console.log(`  Média CN:     ${relatDisc['CN'] || 0}`);
    console.log('');

    // =====================================================
    // VERIFICAR DIFERENÇAS
    // =====================================================
    console.log('VERIFICAÇÃO DE DIFERENÇAS:');
    console.log('-'.repeat(50));

    const diferencas: string[] = [];

    if (Number(dashboard.total_alunos) !== Number(relatEstat.total_alunos)) {
      diferencas.push(`Total Alunos: Dashboard=${dashboard.total_alunos} vs Relatório=${relatEstat.total_alunos}`);
    }
    if (Number(dashboard.media_geral) !== Number(relatEstat.media_geral)) {
      diferencas.push(`Média Geral: Dashboard=${dashboard.media_geral} vs Relatório=${relatEstat.media_geral}`);
    }
    if (Number(dashboard.media_lp) !== Number(relatDisc['LP'] || 0)) {
      diferencas.push(`Média LP: Dashboard=${dashboard.media_lp} vs Relatório=${relatDisc['LP'] || 0}`);
    }
    if (Number(dashboard.media_mat) !== Number(relatDisc['MAT'] || 0)) {
      diferencas.push(`Média MAT: Dashboard=${dashboard.media_mat} vs Relatório=${relatDisc['MAT'] || 0}`);
    }
    if (Number(dashboard.media_ch) !== Number(relatDisc['CH'] || 0)) {
      diferencas.push(`Média CH: Dashboard=${dashboard.media_ch} vs Relatório=${relatDisc['CH'] || 0}`);
    }
    if (Number(dashboard.media_cn) !== Number(relatDisc['CN'] || 0)) {
      diferencas.push(`Média CN: Dashboard=${dashboard.media_cn} vs Relatório=${relatDisc['CN'] || 0}`);
    }

    if (diferencas.length === 0) {
      console.log('  ✅ TODOS OS DADOS SÃO IDÊNTICOS!');
    } else {
      console.log('  ❌ DIFERENÇAS ENCONTRADAS:');
      diferencas.forEach(d => console.log(`     - ${d}`));
    }
    console.log('');

    // =====================================================
    // DADOS POR SÉRIE (Anos Iniciais vs Anos Finais)
    // =====================================================
    console.log('DADOS POR TIPO DE ENSINO:');
    console.log('-'.repeat(50));

    const anosIniciaisQuery = `
      SELECT
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END)::numeric, 2), 0) as media_lp,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END)::numeric, 2), 0) as media_mat
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    `;

    const anosFinaisQuery = `
      SELECT
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN CAST(rc.nota_lp AS DECIMAL) END)::numeric, 2), 0) as media_lp,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN CAST(rc.nota_mat AS DECIMAL) END)::numeric, 2), 0) as media_mat,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN CAST(rc.nota_ch AS DECIMAL) END)::numeric, 2), 0) as media_ch,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN CAST(rc.nota_cn AS DECIMAL) END)::numeric, 2), 0) as media_cn
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')
    `;

    const anosIniciaisResult = await pool.query(anosIniciaisQuery, [ESCOLA_ID, ANO_LETIVO]);
    const anosFinaisResult = await pool.query(anosFinaisQuery, [ESCOLA_ID, ANO_LETIVO]);

    const ai = anosIniciaisResult.rows[0];
    const af = anosFinaisResult.rows[0];

    console.log('  ANOS INICIAIS (2º, 3º, 5º):');
    console.log(`    Total Alunos: ${ai.total_alunos}`);
    console.log(`    Média Geral:  ${ai.media_geral}`);
    console.log(`    Média LP:     ${ai.media_lp}`);
    console.log(`    Média MAT:    ${ai.media_mat}`);
    console.log('');
    console.log('  ANOS FINAIS (6º, 7º, 8º, 9º):');
    console.log(`    Total Alunos: ${af.total_alunos}`);
    console.log(`    Média Geral:  ${af.media_geral}`);
    console.log(`    Média LP:     ${af.media_lp}`);
    console.log(`    Média MAT:    ${af.media_mat}`);
    console.log(`    Média CH:     ${af.media_ch}`);
    console.log(`    Média CN:     ${af.media_cn}`);
    console.log('');

    // =====================================================
    // DADOS POR SÉRIE INDIVIDUAL
    // =====================================================
    console.log('DADOS POR SÉRIE:');
    console.log('-'.repeat(50));

    const seriesQuery = `
      SELECT
        rc.serie,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) as total_alunos,
        COALESCE(ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN CAST(rc.media_aluno AS DECIMAL) END)::numeric, 2), 0) as media_geral
      FROM resultados_consolidados_unificada rc
      WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
      GROUP BY rc.serie
      HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0 THEN rc.aluno_id END) > 0
      ORDER BY rc.serie
    `;

    const seriesResult = await pool.query(seriesQuery, [ESCOLA_ID, ANO_LETIVO]);
    console.table(seriesResult.rows);

    console.log('');
    console.log('='.repeat(70));
    console.log('TESTE CONCLUÍDO');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testarDados();
