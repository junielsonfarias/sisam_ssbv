/**
 * Script de debug para verificar dados disponíveis para relatórios
 * Execute com: npx ts-node scripts/debug-relatorio.ts
 */

import pool from '../database/connection';

async function debugRelatorio() {
  const escolaId = 'e0690bbd-dc70-4ded-b1b3-9b310f3c4c5f'; // EMEIF CAETÉ

  console.log('='.repeat(60));
  console.log('DEBUG - Dados para Relatório');
  console.log('='.repeat(60));

  try {
    // 1. Verificar escola
    const escola = await pool.query(
      'SELECT id, nome, polo_id FROM escolas WHERE id = $1',
      [escolaId]
    );
    console.log('\n1. ESCOLA:');
    console.log(escola.rows[0] || 'Não encontrada');

    // 2. Verificar anos letivos disponíveis
    const anosDisponiveis = await pool.query(`
      SELECT DISTINCT ano_letivo, COUNT(*) as total
      FROM resultados_consolidados
      WHERE escola_id = $1
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `, [escolaId]);
    console.log('\n2. ANOS LETIVOS COM DADOS:');
    console.log(anosDisponiveis.rows.length > 0 ? anosDisponiveis.rows : 'Nenhum dado encontrado');

    // 3. Verificar total de registros por ano
    const totaisPorAno = await pool.query(`
      SELECT
        ano_letivo,
        COUNT(DISTINCT aluno_id) as alunos,
        COUNT(DISTINCT turma_id) as turmas,
        ROUND(AVG(media_aluno)::numeric, 2) as media_geral,
        COUNT(*) as registros
      FROM resultados_consolidados
      WHERE escola_id = $1
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `, [escolaId]);
    console.log('\n3. TOTAIS POR ANO:');
    console.table(totaisPorAno.rows);

    // 4. Verificar turmas da escola
    const turmas = await pool.query(`
      SELECT t.id, t.codigo, t.nome, t.serie,
             COUNT(DISTINCT a.id) as alunos_matriculados
      FROM turmas t
      LEFT JOIN alunos a ON a.turma_id = t.id
      WHERE t.escola_id = $1
      GROUP BY t.id, t.codigo, t.nome, t.serie
      ORDER BY t.serie
    `, [escolaId]);
    console.log('\n4. TURMAS DA ESCOLA:');
    console.table(turmas.rows);

    // 5. Verificar se há dados em resultados_provas
    const resultadosProvas = await pool.query(`
      SELECT ano_letivo, COUNT(*) as total
      FROM resultados_provas
      WHERE escola_id = $1
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `, [escolaId]);
    console.log('\n5. RESULTADOS_PROVAS POR ANO:');
    console.log(resultadosProvas.rows.length > 0 ? resultadosProvas.rows : 'Nenhum dado');

    // 6. Verificar último ano com dados
    const ultimoAno = await pool.query(`
      SELECT MAX(ano_letivo) as ultimo_ano
      FROM resultados_consolidados
      WHERE escola_id = $1
    `, [escolaId]);
    const anoComDados = ultimoAno.rows[0]?.ultimo_ano;
    console.log('\n6. ÚLTIMO ANO COM DADOS:', anoComDados || 'Nenhum');

    if (anoComDados) {
      // 7. Amostra de dados do último ano
      const amostra = await pool.query(`
        SELECT
          rc.serie,
          COUNT(DISTINCT rc.aluno_id) as alunos,
          ROUND(AVG(rc.nota_lp)::numeric, 2) as media_lp,
          ROUND(AVG(rc.nota_mat)::numeric, 2) as media_mat,
          ROUND(AVG(rc.media_aluno)::numeric, 2) as media_geral
        FROM resultados_consolidados rc
        WHERE rc.escola_id = $1 AND rc.ano_letivo = $2
        GROUP BY rc.serie
        ORDER BY rc.serie
      `, [escolaId, anoComDados]);
      console.log(`\n7. DADOS DO ANO ${anoComDados}:`);
      console.table(amostra.rows);
    }

    // 8. Verificar se as VIEWs existem
    const views = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name LIKE '%consolidado%'
    `);
    console.log('\n8. VIEWS DISPONÍVEIS:');
    console.log(views.rows.map(r => r.table_name));

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

debugRelatorio();
