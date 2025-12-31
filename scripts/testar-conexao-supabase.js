const { Pool } = require('pg');

// Configuração do Supabase
const config = {
  host: process.env.DB_HOST || 'db.cjxejpgtuuqnbczpbdfe.supabase.co',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Master@sisam&&',
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000,
};

async function testarConexao() {
  const pool = new Pool(config);

  try {
    console.log('🔌 Testando conexão com Supabase...');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    
    // Testar conexão
    const result = await pool.query('SELECT current_database(), current_user, version()');
    
    console.log('\n✅ Conexão estabelecida com sucesso!');
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    
    // Verificar tabelas
    console.log('\n📋 Verificando tabelas do SISAM...');
    const tabelas = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('usuarios', 'polos', 'escolas', 'turmas', 'alunos', 'questoes', 'resultados_provas', 'resultados_consolidados', 'importacoes', 'personalizacao')
      ORDER BY table_name;
    `);
    
    if (tabelas.rows.length === 0) {
      console.log('⚠️  Nenhuma tabela do SISAM encontrada.');
      console.log('   Execute: npm run aplicar-schema-supabase');
    } else {
      console.log(`✅ Encontradas ${tabelas.rows.length} tabelas do SISAM:`);
      tabelas.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Dica: Verifique se o host está correto e o projeto Supabase está ativo.');
    } else if (error.code === '28P01') {
      console.error('\n💡 Dica: Verifique o usuário e senha do Supabase.');
    } else if (error.code === '3D000') {
      console.error('\n💡 Dica: O banco de dados não existe. No Supabase, use sempre "postgres" como nome do banco.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testarConexao();

