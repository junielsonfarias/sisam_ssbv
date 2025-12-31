const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function listarEscolas() {
  try {
    console.log('📋 Listando escolas cadastradas...\n');
    
    const result = await pool.query(
      `SELECT e.id, e.nome, e.codigo, p.nome as polo_nome 
       FROM escolas e 
       LEFT JOIN polos p ON e.polo_id = p.id 
       WHERE e.ativo = true 
       ORDER BY e.nome`
    );

    if (result.rows.length === 0) {
      console.log('⚠️  Nenhuma escola cadastrada no sistema!');
      console.log('\n💡 Dica: Cadastre escolas no painel administrativo antes de importar dados.');
    } else {
      console.log(`✅ Total de escolas: ${result.rows.length}\n`);
      console.log('Escolas cadastradas:');
      console.log('─'.repeat(80));
      
      result.rows.forEach((escola, index) => {
        console.log(`${index + 1}. ${escola.nome}`);
        if (escola.codigo) {
          console.log(`   Código: ${escola.codigo}`);
        }
        if (escola.polo_nome) {
          console.log(`   Polo: ${escola.polo_nome}`);
        }
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Erro ao listar escolas:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

listarEscolas();

