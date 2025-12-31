const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function listUsers() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        nome,
        email,
        tipo_usuario,
        ativo,
        criado_em
      FROM usuarios
      WHERE ativo = true
      ORDER BY nome
    `);

    console.log('👥 Usuários cadastrados no sistema:\n');
    
    if (result.rows.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado.');
      console.log('   Execute: npm run seed\n');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nome}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Tipo: ${user.tipo_usuario}`);
        console.log(`   Status: ${user.ativo ? '✅ Ativo' : '❌ Inativo'}`);
        console.log(`   Criado em: ${new Date(user.criado_em).toLocaleString('pt-BR')}\n`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

listUsers();

