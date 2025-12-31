const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env manualmente
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

async function testConnection() {
  console.log('🔍 Testando conexão com PostgreSQL...\n');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sisam',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  console.log('📋 Configuração atual:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Porta: ${config.port}`);
  console.log(`   Banco: ${config.database}`);
  console.log(`   Usuário: ${config.user}`);
  console.log(`   Senha: ${config.password ? '***' + config.password.slice(-3) : '(não definida)'}\n`);

  const pool = new Pool(config);

  try {
    console.log('🔄 Tentando conectar...');
    const result = await pool.query('SELECT version(), current_database(), current_user');
    
    console.log('✅ Conexão bem-sucedida!\n');
    console.log('📊 Informações do banco:');
    console.log(`   PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
    console.log(`   Banco atual: ${result.rows[0].current_database}`);
    console.log(`   Usuário atual: ${result.rows[0].current_user}\n`);

    // Verificar se a tabela usuarios existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      )
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Tabela "usuarios" encontrada');
      
      const userCount = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true');
      console.log(`   Usuários ativos: ${userCount.rows[0].total}\n`);
    } else {
      console.log('⚠️  Tabela "usuarios" não encontrada');
      console.log('   Execute: npm run setup-db\n');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.error('\n💡 Possíveis soluções:');
    
    if (error.code === '28P01' || error.message.includes('password authentication failed')) {
      console.error('   1. Verifique se o usuário e senha estão corretos no arquivo .env');
      console.error('   2. Teste com o usuário padrão "postgres"');
      console.error('   3. Verifique se o usuário tem permissão para acessar o banco "sisam"');
    } else if (error.code === '3D000' || error.message.includes('does not exist')) {
      console.error('   1. O banco de dados "sisam" não existe');
      console.error('   2. Execute: npm run setup-db');
    } else if (error.code === 'ECONNREFUSED' || error.message.includes('ENOTFOUND')) {
      console.error('   1. Verifique se o PostgreSQL está rodando');
      console.error('   2. Verifique se o host e porta estão corretos');
      console.error('   3. Para Docker: docker ps (verifique se o container está rodando)');
    } else {
      console.error('   Erro desconhecido. Verifique os logs acima.');
    }
    
    console.error('\n📝 Para corrigir, edite o arquivo .env com as credenciais corretas:\n');
    console.error('   DB_HOST=localhost');
    console.error('   DB_PORT=5432');
    console.error('   DB_NAME=sisam');
    console.error('   DB_USER=postgres  # ou seu usuário do PostgreSQL');
    console.error('   DB_PASSWORD=sua_senha_aqui\n');
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();

