const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase — use variáveis de ambiente (NUNCA hardcode credenciais)
const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD'];
const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`❌ Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}`);
  console.error('   Configure .env ou passe via linha de comando.');
  process.exit(1);
}

const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000,
};

async function aplicarSchema() {
  const pool = new Pool(config);

  try {
    console.log('🔌 Conectando ao Supabase...');
    console.log(`   Host: ${config.host}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    
    // Testar conexão
    await pool.query('SELECT 1');
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Ler o schema SQL
    console.log('\n📄 Lendo arquivo schema.sql...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Executar o schema
    console.log('🚀 Aplicando schema no Supabase...');
    await pool.query(schemaSQL);
    
    console.log('✅ Schema aplicado com sucesso!');
    
    // Verificar tabelas criadas
    console.log('\n📋 Verificando tabelas criadas...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('usuarios', 'polos', 'escolas', 'turmas', 'alunos', 'questoes', 'resultados_provas', 'resultados_consolidados', 'importacoes', 'personalizacao')
      ORDER BY table_name;
    `);
    
    console.log(`\n✅ Tabelas encontradas (${result.rows.length}/10):`);
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    if (result.rows.length === 10) {
      console.log('\n🎉 Todas as tabelas foram criadas com sucesso!');
    } else {
      console.log(`\n⚠️  Apenas ${result.rows.length} de 10 tabelas foram encontradas.`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar schema:', error.message);
    
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

aplicarSchema();

