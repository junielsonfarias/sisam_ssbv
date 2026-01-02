const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function popularAlunoId() {
  try {
    console.log('🔄 Iniciando população do aluno_id na tabela resultados_provas...');
    
    // 1. Atualizar por código do aluno
    const updatePorCodigo = await pool.query(`
      UPDATE resultados_provas rp
      SET aluno_id = a.id
      FROM alunos a
      WHERE rp.aluno_id IS NULL
        AND rp.aluno_codigo IS NOT NULL
        AND rp.aluno_codigo = a.codigo
    `);
    console.log(`✅ Atualizados ${updatePorCodigo.rowCount} registros por código`);

    // 2. Atualizar por nome do aluno (case-insensitive e trimmed)
    const updatePorNome = await pool.query(`
      UPDATE resultados_provas rp
      SET aluno_id = a.id
      FROM alunos a
      WHERE rp.aluno_id IS NULL
        AND rp.aluno_nome IS NOT NULL
        AND UPPER(TRIM(rp.aluno_nome)) = UPPER(TRIM(a.nome))
        AND rp.ano_letivo = a.ano_letivo
    `);
    console.log(`✅ Atualizados ${updatePorNome.rowCount} registros por nome`);

    // 3. Verificar resultados
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(aluno_id) as com_aluno_id,
        COUNT(*) - COUNT(aluno_id) as sem_aluno_id
      FROM resultados_provas
    `);
    
    console.log('\n📊 Estatísticas finais:');
    console.log(`Total de registros: ${stats.rows[0].total}`);
    console.log(`Com aluno_id: ${stats.rows[0].com_aluno_id}`);
    console.log(`Sem aluno_id: ${stats.rows[0].sem_aluno_id}`);
    
    if (parseInt(stats.rows[0].sem_aluno_id) > 0) {
      console.log('\n⚠️  Ainda há registros sem aluno_id. Verifique:');
      const exemplos = await pool.query(`
        SELECT aluno_codigo, aluno_nome, ano_letivo
        FROM resultados_provas
        WHERE aluno_id IS NULL
        LIMIT 5
      `);
      console.log('Exemplos:');
      exemplos.rows.forEach(r => {
        console.log(`  - Código: ${r.aluno_codigo}, Nome: ${r.aluno_nome}, Ano: ${r.ano_letivo}`);
      });
    } else {
      console.log('\n✅ Todos os registros foram atualizados com sucesso!');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Erro ao popular aluno_id:', error);
    await pool.end();
    process.exit(1);
  }
}

// Executar
popularAlunoId();

