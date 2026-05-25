const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Configuração SSL para produção
const sslConfig = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' 
  ? {
      rejectUnauthorized: false,
    }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: sslConfig,
});

async function seed() {
  try {
    console.log('Criando usuário administrador padrão...');
    
    const senhaHash = await bcrypt.hash('admin123', 10);
    
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha
       RETURNING id, nome, email`,
      ['Administrador', 'admin@sisam.com', senhaHash, 'administrador']
    );

    if (result.rows.length > 0) {
      console.log('✅ Usuário administrador criado com sucesso!');
      console.log('   Email: admin@sisam.com');
      console.log('   Senha: admin123');
      console.log('   ⚠️  ALTERE A SENHA APÓS O PRIMEIRO ACESSO!');
    } else {
      console.log('ℹ️  Usuário administrador já existe.');
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();

