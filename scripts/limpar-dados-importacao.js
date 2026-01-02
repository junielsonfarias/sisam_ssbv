const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function limparDados() {
  try {
    console.log('🗑️  Iniciando limpeza de dados para nova importação...\n');
    console.log('⚠️  ATENÇÃO: Esta operação irá remover TODOS os dados!\n');

    // Contar registros antes da exclusão
    const contadores = {
      resultados_provas: await pool.query('SELECT COUNT(*) as total FROM resultados_provas'),
      resultados_consolidados: await pool.query('SELECT COUNT(*) as total FROM resultados_consolidados'),
      alunos: await pool.query('SELECT COUNT(*) as total FROM alunos'),
      turmas: await pool.query('SELECT COUNT(*) as total FROM turmas'),
      questoes: await pool.query('SELECT COUNT(*) as total FROM questoes'),
      escolas: await pool.query('SELECT COUNT(*) as total FROM escolas'),
      polos: await pool.query('SELECT COUNT(*) as total FROM polos'),
      importacoes: await pool.query('SELECT COUNT(*) as total FROM importacoes'),
    };

    console.log('📊 Dados atuais:\n');
    console.log(`   - Resultados de Provas: ${contadores.resultados_provas.rows[0].total}`);
    console.log(`   - Resultados Consolidados: ${contadores.resultados_consolidados.rows[0].total}`);
    console.log(`   - Alunos: ${contadores.alunos.rows[0].total}`);
    console.log(`   - Turmas: ${contadores.turmas.rows[0].total}`);
    console.log(`   - Questões: ${contadores.questoes.rows[0].total}`);
    console.log(`   - Escolas: ${contadores.escolas.rows[0].total}`);
    console.log(`   - Polos: ${contadores.polos.rows[0].total}`);
    console.log(`   - Importações: ${contadores.importacoes.rows[0].total}\n`);

    console.log('🔄 Iniciando exclusão...\n');

    // 1. Remover resultados_provas
    console.log('1️⃣  Removendo resultados de provas...');
    const delResultadosProvas = await pool.query('DELETE FROM resultados_provas');
    console.log(`   ✅ ${delResultadosProvas.rowCount} resultado(s) removido(s)\n`);

    // 2. Remover resultados_consolidados
    console.log('2️⃣  Removendo resultados consolidados...');
    const delResultadosConsolidados = await pool.query('DELETE FROM resultados_consolidados');
    console.log(`   ✅ ${delResultadosConsolidados.rowCount} resultado(s) removido(s)\n`);

    // 3. Remover alunos
    console.log('3️⃣  Removendo alunos...');
    const delAlunos = await pool.query('DELETE FROM alunos');
    console.log(`   ✅ ${delAlunos.rowCount} aluno(s) removido(s)\n`);

    // 4. Remover turmas
    console.log('4️⃣  Removendo turmas...');
    const delTurmas = await pool.query('DELETE FROM turmas');
    console.log(`   ✅ ${delTurmas.rowCount} turma(s) removida(s)\n`);

    // 5. Remover questões (opcional - você pode querer manter)
    console.log('5️⃣  Removendo questões...');
    const delQuestoes = await pool.query('DELETE FROM questoes');
    console.log(`   ✅ ${delQuestoes.rowCount} questão(ões) removida(s)\n`);

    // 6. Remover escolas
    console.log('6️⃣  Removendo escolas...');
    const delEscolas = await pool.query('DELETE FROM escolas');
    console.log(`   ✅ ${delEscolas.rowCount} escola(s) removida(s)\n`);

    // 7. Remover polos
    console.log('7️⃣  Removendo polos...');
    const delPolos = await pool.query('DELETE FROM polos');
    console.log(`   ✅ ${delPolos.rowCount} polo(s) removido(s)\n`);

    // 8. Limpar histórico de importações (opcional)
    console.log('8️⃣  Removendo histórico de importações...');
    const delImportacoes = await pool.query('DELETE FROM importacoes');
    console.log(`   ✅ ${delImportacoes.rowCount} importação(ões) removida(s)\n`);

    // Verificar se tudo foi removido
    console.log('🔍 Verificando limpeza...\n');
    const verificacao = {
      resultados_provas: await pool.query('SELECT COUNT(*) as total FROM resultados_provas'),
      resultados_consolidados: await pool.query('SELECT COUNT(*) as total FROM resultados_consolidados'),
      alunos: await pool.query('SELECT COUNT(*) as total FROM alunos'),
      turmas: await pool.query('SELECT COUNT(*) as total FROM turmas'),
      questoes: await pool.query('SELECT COUNT(*) as total FROM questoes'),
      escolas: await pool.query('SELECT COUNT(*) as total FROM escolas'),
      polos: await pool.query('SELECT COUNT(*) as total FROM polos'),
      importacoes: await pool.query('SELECT COUNT(*) as total FROM importacoes'),
    };

    console.log('📊 Dados após limpeza:\n');
    console.log(`   - Resultados de Provas: ${verificacao.resultados_provas.rows[0].total}`);
    console.log(`   - Resultados Consolidados: ${verificacao.resultados_consolidados.rows[0].total}`);
    console.log(`   - Alunos: ${verificacao.alunos.rows[0].total}`);
    console.log(`   - Turmas: ${verificacao.turmas.rows[0].total}`);
    console.log(`   - Questões: ${verificacao.questoes.rows[0].total}`);
    console.log(`   - Escolas: ${verificacao.escolas.rows[0].total}`);
    console.log(`   - Polos: ${verificacao.polos.rows[0].total}`);
    console.log(`   - Importações: ${verificacao.importacoes.rows[0].total}\n`);

    const tudoLimpo = 
      verificacao.resultados_provas.rows[0].total === '0' &&
      verificacao.resultados_consolidados.rows[0].total === '0' &&
      verificacao.alunos.rows[0].total === '0' &&
      verificacao.turmas.rows[0].total === '0' &&
      verificacao.escolas.rows[0].total === '0' &&
      verificacao.polos.rows[0].total === '0';

    if (tudoLimpo) {
      console.log('✅ Limpeza concluída com sucesso!');
      console.log('📝 O banco está pronto para uma nova importação.\n');
    } else {
      console.log('⚠️  Alguns dados ainda permanecem no banco.');
      console.log('   Verifique manualmente se há dependências restantes.\n');
    }

  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    console.error('   Detalhes:', error.message);
    process.exit(1);
  } finally {
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
}

limparDados();


