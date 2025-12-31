const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function vincularAlunos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Vinculando alunos da escola São Lucas (8º ano) à turma F8T901...\n');

    // Buscar a escola São Lucas
    const escolaResult = await client.query(
      `SELECT id, nome FROM escolas 
       WHERE UPPER(TRIM(nome)) LIKE '%SÃO LUCAS%' 
       OR UPPER(TRIM(nome)) LIKE '%SAO LUCAS%'
       ORDER BY nome LIMIT 1`
    );

    if (escolaResult.rows.length === 0) {
      console.log('❌ Escola "São Lucas" não encontrada.');
      console.log('   Escolas disponíveis:');
      const todasEscolas = await client.query('SELECT nome FROM escolas ORDER BY nome LIMIT 10');
      todasEscolas.rows.forEach(e => console.log(`   - ${e.nome}`));
      await client.query('ROLLBACK');
      return;
    }

    const escola = escolaResult.rows[0];
    console.log(`✅ Escola encontrada: ${escola.nome} (ID: ${escola.id})\n`);

    // Buscar a turma F8T901
    const turmaResult = await client.query(
      `SELECT id, codigo, nome, escola_id, serie, ano_letivo 
       FROM turmas 
       WHERE codigo = 'F8T901' AND escola_id = $1`,
      [escola.id]
    );

    if (turmaResult.rows.length === 0) {
      console.log(`❌ Turma "F8T901" não encontrada na escola ${escola.nome}.`);
      console.log('   Verificando turmas disponíveis...');
      const turmasDisponiveis = await client.query(
        'SELECT codigo, serie, ano_letivo FROM turmas WHERE escola_id = $1 ORDER BY codigo',
        [escola.id]
      );
      if (turmasDisponiveis.rows.length > 0) {
        console.log('   Turmas encontradas:');
        turmasDisponiveis.rows.forEach(t => {
          console.log(`   - ${t.codigo} (${t.serie || 'sem série'}, ${t.ano_letivo || 'sem ano'})`);
        });
      } else {
        console.log('   Nenhuma turma encontrada para esta escola.');
      }
      await client.query('ROLLBACK');
      return;
    }

    const turma = turmaResult.rows[0];
    console.log(`✅ Turma encontrada: ${turma.codigo} (ID: ${turma.id})`);
    console.log(`   Série: ${turma.serie || 'não informada'}`);
    console.log(`   Ano Letivo: ${turma.ano_letivo || 'não informado'}\n`);

    // Buscar alunos da escola São Lucas do 8º ano
    const alunosResult = await client.query(
      `SELECT id, nome, codigo, serie, turma_id 
       FROM alunos 
       WHERE escola_id = $1 
       AND (serie = '8º Ano' OR serie = '8º' OR serie LIKE '%8%')
       ORDER BY nome`,
      [escola.id]
    );

    if (alunosResult.rows.length === 0) {
      console.log(`⚠️  Nenhum aluno encontrado na escola ${escola.nome} do 8º ano.`);
      console.log('   Verificando alunos disponíveis...');
      const todosAlunos = await client.query(
        'SELECT nome, serie FROM alunos WHERE escola_id = $1 ORDER BY serie, nome LIMIT 10',
        [escola.id]
      );
      if (todosAlunos.rows.length > 0) {
        console.log('   Alunos encontrados:');
        todosAlunos.rows.forEach(a => {
          console.log(`   - ${a.nome} (${a.serie || 'sem série'})`);
        });
      } else {
        console.log('   Nenhum aluno encontrado para esta escola.');
      }
      await client.query('ROLLBACK');
      return;
    }

    console.log(`📋 Encontrados ${alunosResult.rows.length} alunos do 8º ano:\n`);

    let vinculados = 0;
    let jaVinculados = 0;
    let atualizados = 0;

    for (const aluno of alunosResult.rows) {
      // Verificar se já está vinculado à turma correta
      if (aluno.turma_id === turma.id) {
        console.log(`   ✓ ${aluno.nome} - já vinculado à turma ${turma.codigo}`);
        jaVinculados++;
        continue;
      }

      // Atualizar aluno
      await client.query(
        `UPDATE alunos 
         SET turma_id = $1, serie = $2, ano_letivo = $3, atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [turma.id, turma.serie || '8º Ano', turma.ano_letivo || null, aluno.id]
      );

      if (aluno.turma_id) {
        console.log(`   ↻ ${aluno.nome} - atualizado de outra turma para ${turma.codigo}`);
        atualizados++;
      } else {
        console.log(`   ➕ ${aluno.nome} - vinculado à turma ${turma.codigo}`);
        vinculados++;
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Processo concluído!');
    console.log(`   📊 Total de alunos processados: ${alunosResult.rows.length}`);
    console.log(`   ➕ Novos vínculos: ${vinculados}`);
    console.log(`   ↻ Atualizações: ${atualizados}`);
    console.log(`   ✓ Já vinculados: ${jaVinculados}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao vincular alunos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

vincularAlunos().catch(console.error);

