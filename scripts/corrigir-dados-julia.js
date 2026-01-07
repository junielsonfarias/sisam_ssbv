/**
 * Script para corrigir dados da Julia Caroline
 * - Trocar disciplina de "Ciências Humanas" para "Matemática" nas questões Q21-Q28
 * - Atualizar resultados_consolidados: mover acertos de CH para MAT
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function corrigirDadosJulia() {
  const client = await pool.connect();

  try {
    console.log('=== Corrigindo dados da Julia Caroline ===\n');

    // 1. Buscar aluna Julia
    const alunaResult = await client.query(`
      SELECT a.id, a.nome, a.escola_id, e.nome as escola_nome
      FROM alunos a
      JOIN escolas e ON a.escola_id = e.id
      WHERE UPPER(a.nome) LIKE '%JULIA CAROLINE%'
    `);

    if (alunaResult.rows.length === 0) {
      console.log('Aluna Julia Caroline não encontrada!');
      return;
    }

    const aluna = alunaResult.rows[0];
    console.log(`Aluna encontrada: ${aluna.nome} (ID: ${aluna.id})`);
    console.log(`Escola: ${aluna.escola_nome}\n`);

    // 2. Corrigir disciplina nas questões Q21-Q28 em resultados_provas
    console.log('Corrigindo disciplina nas questões Q21-Q28 de CH para MAT...');

    const updateQuestoes = await client.query(`
      UPDATE resultados_provas
      SET disciplina = 'Matemática',
          area_conhecimento = 'Matemática',
          atualizado_em = CURRENT_TIMESTAMP
      WHERE aluno_id = $1
        AND questao_codigo IN ('Q21', 'Q22', 'Q23', 'Q24', 'Q25', 'Q26', 'Q27', 'Q28')
        AND disciplina = 'Ciências Humanas'
      RETURNING questao_codigo
    `, [aluna.id]);

    console.log(`Questões atualizadas: ${updateQuestoes.rowCount}`);
    if (updateQuestoes.rows.length > 0) {
      console.log(`Questões: ${updateQuestoes.rows.map(r => r.questao_codigo).join(', ')}`);
    }

    // 3. Recalcular acertos por disciplina
    console.log('\nRecalculando acertos por disciplina...');

    const acertosResult = await client.query(`
      SELECT
        disciplina,
        COUNT(*) FILTER (WHERE acertou = true) as acertos,
        COUNT(*) as total
      FROM resultados_provas
      WHERE aluno_id = $1 AND presenca = 'P'
      GROUP BY disciplina
      ORDER BY disciplina
    `, [aluna.id]);

    let acertosLP = 0, acertosMAT = 0, acertosCH = 0, acertosCN = 0;
    let totalLP = 0, totalMAT = 0;

    for (const row of acertosResult.rows) {
      console.log(`${row.disciplina}: ${row.acertos}/${row.total} acertos`);
      if (row.disciplina === 'Língua Portuguesa') {
        acertosLP = parseInt(row.acertos);
        totalLP = parseInt(row.total);
      } else if (row.disciplina === 'Matemática') {
        acertosMAT = parseInt(row.acertos);
        totalMAT = parseInt(row.total);
      } else if (row.disciplina === 'Ciências Humanas') {
        acertosCH = parseInt(row.acertos);
      } else if (row.disciplina === 'Ciências da Natureza') {
        acertosCN = parseInt(row.acertos);
      }
    }

    // 4. Calcular notas (para 3º ano: LP = 20 questões, MAT = 8 questões)
    const notaLP = totalLP > 0 ? (acertosLP / totalLP) * 10 : 0;
    const notaMAT = totalMAT > 0 ? (acertosMAT / totalMAT) * 10 : 0;

    console.log(`\nNotas calculadas:`);
    console.log(`  LP: ${acertosLP}/${totalLP} = ${notaLP.toFixed(2)}`);
    console.log(`  MAT: ${acertosMAT}/${totalMAT} = ${notaMAT.toFixed(2)}`);

    // 5. Buscar dados de produção atuais
    const consolidadoResult = await client.query(`
      SELECT nota_producao, nivel_aprendizagem,
             item_producao_1, item_producao_2, item_producao_3, item_producao_4,
             item_producao_5, item_producao_6, item_producao_7, item_producao_8
      FROM resultados_consolidados
      WHERE aluno_id = $1
    `, [aluna.id]);

    let notaProducao = 0;
    let nivelAprendizagem = null;

    if (consolidadoResult.rows.length > 0) {
      const consolidado = consolidadoResult.rows[0];
      notaProducao = parseFloat(consolidado.nota_producao) || 0;
      nivelAprendizagem = consolidado.nivel_aprendizagem;
      console.log(`  Produção: ${notaProducao.toFixed(2)} (Nível: ${nivelAprendizagem})`);
    }

    // 6. Calcular média (70% objetiva + 30% produção)
    const mediaObjetiva = (notaLP + notaMAT) / 2;
    const mediaFinal = notaProducao > 0
      ? (mediaObjetiva * 0.7) + (notaProducao * 0.3)
      : mediaObjetiva;

    console.log(`\nMédia objetiva: ${mediaObjetiva.toFixed(2)}`);
    console.log(`Média final (70% obj + 30% prod): ${mediaFinal.toFixed(2)}`);

    // 7. Atualizar resultados_consolidados
    console.log('\nAtualizando resultados_consolidados...');

    const updateConsolidado = await client.query(`
      UPDATE resultados_consolidados
      SET
        total_acertos_lp = $2,
        total_acertos_mat = $3,
        total_acertos_ch = 0,
        total_acertos_cn = 0,
        nota_lp = $4,
        nota_mat = $5,
        nota_ch = 0,
        nota_cn = 0,
        media_aluno = $6,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE aluno_id = $1
      RETURNING id
    `, [
      aluna.id,
      acertosLP,
      acertosMAT,
      notaLP.toFixed(2),
      notaMAT.toFixed(2),
      mediaFinal.toFixed(2)
    ]);

    if (updateConsolidado.rowCount > 0) {
      console.log('Resultados consolidados atualizados com sucesso!');
    } else {
      console.log('Nenhum registro consolidado encontrado para atualizar.');
    }

    // 8. Verificar resultado final
    console.log('\n=== Dados atualizados ===');

    const verificacao = await client.query(`
      SELECT
        total_acertos_lp, nota_lp,
        total_acertos_mat, nota_mat,
        total_acertos_ch, nota_ch,
        nota_producao, nivel_aprendizagem,
        media_aluno
      FROM resultados_consolidados
      WHERE aluno_id = $1
    `, [aluna.id]);

    if (verificacao.rows.length > 0) {
      const v = verificacao.rows[0];
      console.log(`LP: ${v.total_acertos_lp} acertos, nota ${v.nota_lp}`);
      console.log(`MAT: ${v.total_acertos_mat} acertos, nota ${v.nota_mat}`);
      console.log(`CH: ${v.total_acertos_ch} acertos, nota ${v.nota_ch}`);
      console.log(`Produção: ${v.nota_producao} (${v.nivel_aprendizagem})`);
      console.log(`Média final: ${v.media_aluno}`);
    }

    console.log('\nCorreção concluída!');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

corrigirDadosJulia();
