const { Pool } = require('pg');

// Configuração do Supabase (use as mesmas variáveis de ambiente do projeto)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false,
});

async function verificarDados() {
  try {
    console.log('🔍 Verificando dados no banco de dados...\n');

    // 1. Estatísticas gerais da tabela resultados_provas
    console.log('📊 Estatísticas da tabela resultados_provas:');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as alunos_com_id,
        COUNT(DISTINCT aluno_codigo) FILTER (WHERE aluno_codigo IS NOT NULL) as alunos_com_codigo,
        COUNT(DISTINCT aluno_nome) FILTER (WHERE aluno_nome IS NOT NULL) as alunos_com_nome,
        COUNT(DISTINCT questao_codigo) FILTER (WHERE questao_codigo IS NOT NULL) as questoes_cadastradas,
        COUNT(*) FILTER (WHERE acertou = true) as total_acertos,
        COUNT(*) FILTER (WHERE acertou = false) as total_erros
      FROM resultados_provas
    `);
    console.log(JSON.stringify(stats.rows[0], null, 2));
    console.log();

    // 2. Verificar registros sem aluno_id
    console.log('⚠️  Registros sem aluno_id:');
    const semAlunoId = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT aluno_codigo) as codigos_distintos,
        COUNT(DISTINCT aluno_nome) as nomes_distintos
      FROM resultados_provas
      WHERE aluno_id IS NULL
    `);
    console.log(JSON.stringify(semAlunoId.rows[0], null, 2));
    console.log();

    // 3. Exemplos de registros
    console.log('📝 Exemplos de registros (primeiros 5):');
    const exemplos = await pool.query(`
      SELECT 
        aluno_id,
        aluno_codigo,
        aluno_nome,
        questao_codigo,
        acertou,
        ano_letivo
      FROM resultados_provas
      LIMIT 5
    `);
    exemplos.rows.forEach((r, i) => {
      console.log(`${i + 1}. Aluno ID: ${r.aluno_id || 'NULL'}, Código: ${r.aluno_codigo || 'NULL'}, Nome: ${r.aluno_nome || 'NULL'}, Questão: ${r.questao_codigo}, Acertou: ${r.acertou}, Ano: ${r.ano_letivo}`);
    });
    console.log();

    // 4. Verificar um aluno específico (se houver dados)
    const alunoExemplo = await pool.query(`
      SELECT DISTINCT aluno_id, aluno_codigo, aluno_nome
      FROM resultados_provas
      WHERE aluno_id IS NOT NULL
      LIMIT 1
    `);

    if (alunoExemplo.rows.length > 0) {
      const aluno = alunoExemplo.rows[0];
      console.log(`🔍 Verificando questões para o aluno: ${aluno.aluno_nome} (ID: ${aluno.aluno_id}):`);
      
      const questoesAluno = await pool.query(`
        SELECT 
          COUNT(*) as total_questoes,
          COUNT(*) FILTER (WHERE acertou = true) as acertos,
          COUNT(*) FILTER (WHERE acertou = false) as erros
        FROM resultados_provas
        WHERE aluno_id = $1
      `, [aluno.aluno_id]);
      
      console.log(JSON.stringify(questoesAluno.rows[0], null, 2));
      console.log();

      // Tentar buscar por código também
      if (aluno.aluno_codigo) {
        const questoesPorCodigo = await pool.query(`
          SELECT 
            COUNT(*) as total_questoes,
            COUNT(*) FILTER (WHERE acertou = true) as acertos,
            COUNT(*) FILTER (WHERE acertou = false) as erros
          FROM resultados_provas
          WHERE aluno_codigo = $1 AND (aluno_id IS NULL OR aluno_id = $2)
        `, [aluno.aluno_codigo, aluno.aluno_id]);
        
        console.log(`Questões encontradas por código (${aluno.aluno_codigo}):`);
        console.log(JSON.stringify(questoesPorCodigo.rows[0], null, 2));
        console.log();
      }
    } else {
      console.log('⚠️  Nenhum aluno com ID encontrado na tabela resultados_provas');
      console.log();

      // Tentar encontrar por código ou nome
      const alunosSemId = await pool.query(`
        SELECT DISTINCT aluno_codigo, aluno_nome, COUNT(*) as total_questoes
        FROM resultados_provas
        WHERE aluno_id IS NULL
        GROUP BY aluno_codigo, aluno_nome
        LIMIT 5
      `);

      if (alunosSemId.rows.length > 0) {
        console.log('📋 Exemplos de alunos sem ID (mas com código/nome):');
        alunosSemId.rows.forEach((a, i) => {
          console.log(`${i + 1}. ${a.aluno_nome || 'Sem nome'} (Código: ${a.aluno_codigo || 'Sem código'}) - ${a.total_questoes} questões`);
        });
        console.log();
      }
    }

    // 5. Verificar se existem alunos na tabela alunos
    console.log('👥 Verificando tabela alunos:');
    const alunos = await pool.query(`
      SELECT COUNT(*) as total_alunos
      FROM alunos
    `);
    console.log(`Total de alunos cadastrados: ${alunos.rows[0].total_alunos}`);
    console.log();

    // 6. Verificar correspondência entre alunos e resultados_provas
    console.log('🔗 Verificando correspondência alunos <-> resultados_provas:');
    const correspondencia = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.id) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM resultados_provas rp 
            WHERE rp.aluno_id = a.id OR rp.aluno_codigo = a.codigo OR UPPER(TRIM(rp.aluno_nome)) = UPPER(TRIM(a.nome))
          )
        ) as alunos_com_resultados,
        COUNT(DISTINCT a.id) as total_alunos
      FROM alunos a
    `);
    console.log(JSON.stringify(correspondencia.rows[0], null, 2));
    console.log();

    await pool.end();
    console.log('✅ Verificação concluída!');
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    await pool.end();
    process.exit(1);
  }
}

verificarDados();

