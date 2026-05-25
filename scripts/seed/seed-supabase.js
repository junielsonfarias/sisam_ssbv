const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Detectar se está conectando ao Supabase
const isSupabase = process.env.DB_HOST?.includes('supabase.co') || 
                   process.env.DB_HOST?.includes('pooler.supabase.com');

// Configuração SSL para Supabase
const sslConfig = process.env.NODE_ENV === 'production' || 
                  process.env.DB_SSL === 'true' || 
                  isSupabase
  ? {
      rejectUnauthorized: false,
    }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: sslConfig,
  connectionTimeoutMillis: isSupabase ? 15000 : 10000,
});

async function seed() {
  try {
    console.log('🔐 Criando usuário administrador no Supabase...');
    console.log(`   Host: ${process.env.DB_HOST || 'não configurado'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'postgres'}`);
    
    const senhaHash = await bcrypt.hash('admin123', 10);
    
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha, tipo_usuario = EXCLUDED.tipo_usuario
       RETURNING id, nome, email`,
      ['Administrador', 'admin@sisam.com', senhaHash, 'administrador']
    );

    if (result.rows.length > 0) {
      console.log('✅ Usuário administrador criado/atualizado com sucesso!');
      console.log('   Email: admin@sisam.com');
      console.log('   Senha: admin123');
      console.log('   ⚠️  ALTERE A SENHA APÓS O PRIMEIRO ACESSO!');
    } else {
      console.log('ℹ️  Usuário administrador já existe.');
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Dica: Verifique se o PostgreSQL/Supabase está acessível e as credenciais estão corretas no arquivo .env');
    } else if (error.code === '28P01') {
      console.error('\n💡 Dica: Verifique o usuário e senha do Supabase no arquivo .env');
    } else if (error.code === '3D000') {
      console.error('\n💡 Dica: O banco de dados não existe. Execute o schema SQL primeiro no Supabase.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();

