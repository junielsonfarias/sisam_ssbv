require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function excluirDadosAluno() {
  const client = await pool.connect();

  try {
    // Buscar o aluno
    const alunoResult = await client.query(`
      SELECT a.id, a.nome, e.nome as escola_nome, t.codigo as turma_codigo
      FROM alunos a
      JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE a.nome ILIKE '%WILLIAM FERREIRA FARIAS%'
      AND e.nome ILIKE '%NOSSA SRA DE LOURDES%'
    `);

    console.log('=== ALUNOS ENCONTRADOS ===');
    console.log(alunoResult.rows);

    if (alunoResult.rows.length === 0) {
      console.log('Aluno não encontrado!');
      return;
    }

    const alunoId = alunoResult.rows[0].id;
    console.log(`\nAluno ID: ${alunoId}`);

    // Verificar registros relacionados
    const resultadosProvasResult = await client.query(`
      SELECT COUNT(*) as total FROM resultados_provas WHERE aluno_id = $1
    `, [alunoId]);
    console.log(`Resultados provas: ${resultadosProvasResult.rows[0].total}`);

    const resultadosResult = await client.query(`
      SELECT COUNT(*) as total FROM resultados_consolidados WHERE aluno_id = $1
    `, [alunoId]);
    console.log(`Resultados consolidados: ${resultadosResult.rows[0].total}`);

    // Iniciar exclusão
    console.log('\n=== EXCLUINDO DADOS ===');

    await client.query('BEGIN');

    // Excluir resultados de provas do aluno
    const delProvas = await client.query(`
      DELETE FROM resultados_provas WHERE aluno_id = $1
    `, [alunoId]);
    console.log(`Resultados provas excluídos: ${delProvas.rowCount}`);

    // Excluir resultados consolidados
    const delResultados = await client.query(`
      DELETE FROM resultados_consolidados WHERE aluno_id = $1
    `, [alunoId]);
    console.log(`Resultados consolidados excluídos: ${delResultados.rowCount}`);

    await client.query('COMMIT');
    console.log('\n✅ Dados do aluno excluídos com sucesso!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

excluirDadosAluno();
