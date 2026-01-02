const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verificarLimpeza() {
  try {
    console.log('🔍 Verificando limpeza do banco de dados...\n');

    // Lista de todas as tabelas que devem estar vazias
    const tabelas = [
      { nome: 'resultados_provas', descricao: 'Resultados de Provas' },
      { nome: 'resultados_consolidados', descricao: 'Resultados Consolidados' },
      { nome: 'alunos', descricao: 'Alunos' },
      { nome: 'turmas', descricao: 'Turmas' },
      { nome: 'questoes', descricao: 'Questões' },
      { nome: 'escolas', descricao: 'Escolas' },
      { nome: 'polos', descricao: 'Polos' },
      { nome: 'importacoes', descricao: 'Importações' },
    ];

    const resultados = [];
    let totalRegistros = 0;
    let todasVazias = true;

    console.log('📊 Verificando tabelas:\n');

    for (const tabela of tabelas) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as total FROM ${tabela.nome}`);
        const total = parseInt(result.rows[0].total);
        totalRegistros += total;

        const status = total === 0 ? '✅' : '❌';
        const statusTexto = total === 0 ? 'VAZIA' : `${total} registro(s)`;

        console.log(`${status} ${tabela.descricao}: ${statusTexto}`);

        resultados.push({
          tabela: tabela.nome,
          descricao: tabela.descricao,
          total,
          vazia: total === 0
        });

        if (total > 0) {
          todasVazias = false;
        }
      } catch (error) {
        console.log(`⚠️  ${tabela.descricao}: Erro ao verificar - ${error.message}`);
        resultados.push({
          tabela: tabela.nome,
          descricao: tabela.descricao,
          total: -1,
          vazia: false,
          erro: error.message
        });
        todasVazias = false;
      }
    }

    // Verificar também tabelas relacionadas que podem ter dados
    console.log('\n📋 Verificando tabelas relacionadas:\n');

    const tabelasRelacionadas = [
      { nome: 'usuarios', descricao: 'Usuários' },
    ];

    for (const tabela of tabelasRelacionadas) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as total FROM ${tabela.nome}`);
        const total = parseInt(result.rows[0].total);
        const status = total === 0 ? '⚠️' : 'ℹ️';
        console.log(`${status} ${tabela.descricao}: ${total} registro(s) (mantidos)`);
      } catch (error) {
        console.log(`⚠️  ${tabela.descricao}: Erro ao verificar - ${error.message}`);
      }
    }

    // Resumo
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DA VERIFICAÇÃO\n');
    console.log(`Total de registros encontrados: ${totalRegistros}`);
    console.log(`Tabelas verificadas: ${tabelas.length}`);
    console.log(`Tabelas vazias: ${resultados.filter(r => r.vazia).length}`);
    console.log(`Tabelas com dados: ${resultados.filter(r => !r.vazia && r.total > 0).length}`);

    if (todasVazias) {
      console.log('\n✅ BANCO DE DADOS LIMPO!');
      console.log('✅ Todas as tabelas estão vazias.');
      console.log('✅ Pronto para nova importação.\n');
    } else {
      console.log('\n⚠️  ATENÇÃO: Algumas tabelas ainda contêm dados!');
      console.log('\nTabelas com dados restantes:');
      resultados
        .filter(r => !r.vazia && r.total > 0)
        .forEach(r => {
          console.log(`   ❌ ${r.descricao}: ${r.total} registro(s)`);
        });
      console.log('\n⚠️  Execute o script de limpeza novamente se necessário.\n');
    }

    // Verificar estrutura das tabelas (se existem)
    console.log('🔍 Verificando estrutura das tabelas...\n');
    const tabelasExistentes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`Tabelas existentes no banco: ${tabelasExistentes.rows.length}`);
    tabelasExistentes.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar limpeza:', error);
    console.error('   Detalhes:', error.message);
    process.exit(1);
  } finally {
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
}

verificarLimpeza();


