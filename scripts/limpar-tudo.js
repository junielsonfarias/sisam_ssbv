const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function limparTudo() {
  try {
    console.log('🧹 LIMPEZA COMPLETA DO SISTEMA\n');
    console.log('⚠️  ATENÇÃO: Esta operação irá remover TODOS os dados e caches!\n');

    // 1. Limpar banco de dados
    console.log('1️⃣  Limpando banco de dados...\n');
    
    const tabelas = [
      'resultados_provas',
      'resultados_consolidados',
      'alunos',
      'turmas',
      'questoes',
      'escolas',
      'polos',
      'importacoes',
    ];

    for (const tabela of tabelas) {
      try {
        const result = await pool.query(`DELETE FROM ${tabela}`);
        console.log(`   ✅ ${tabela}: ${result.rowCount} registro(s) removido(s)`);
      } catch (error) {
        console.error(`   ❌ Erro ao limpar ${tabela}:`, error.message);
      }
    }

    // 2. Limpar cache do Next.js
    console.log('\n2️⃣  Limpando cache do Next.js...\n');
    
    const diretoriosCache = ['.next', 'node_modules/.cache'];
    
    for (const dir of diretoriosCache) {
      const caminho = path.join(process.cwd(), dir);
      if (fs.existsSync(caminho)) {
        try {
          fs.rmSync(caminho, { recursive: true, force: true });
          console.log(`   ✅ ${dir} removido`);
        } catch (error) {
          console.error(`   ❌ Erro ao remover ${dir}:`, error.message);
        }
      } else {
        console.log(`   ⏭️  ${dir} não existe`);
      }
    }

    // 3. Verificar limpeza
    console.log('\n3️⃣  Verificando limpeza...\n');
    
    for (const tabela of tabelas) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);
        const total = parseInt(result.rows[0].total);
        const status = total === 0 ? '✅' : '❌';
        console.log(`   ${status} ${tabela}: ${total} registro(s)`);
      } catch (error) {
        console.error(`   ❌ Erro ao verificar ${tabela}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ LIMPEZA COMPLETA CONCLUÍDA!\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Reinicie o servidor: npm run dev');
    console.log('   2. Limpe o cache do navegador (Ctrl + Shift + Delete)');
    console.log('   3. Faça um hard refresh (Ctrl + F5)');
    console.log('   4. O sistema está pronto para nova importação\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
}

limparTudo();


