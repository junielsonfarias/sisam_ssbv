const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Conecta ao banco padrão primeiro
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const dbName = process.env.DB_NAME || 'sisam';

async function setupDatabase() {
  const pool = new Pool(config);

  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    
    // Verificar se o banco já existe
    const checkDb = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      console.log(`📦 Criando banco de dados '${dbName}'...`);
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Banco de dados '${dbName}' criado com sucesso!`);
    } else {
      console.log(`ℹ️  Banco de dados '${dbName}' já existe.`);
    }

    await pool.end();

    // Conectar ao banco criado
    const dbPool = new Pool({
      ...config,
      database: dbName,
    });

    console.log('📄 Executando schema SQL...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Executar o schema
    await dbPool.query(schemaSQL);
    console.log('✅ Schema executado com sucesso!');

    await dbPool.end();
    console.log('\n🎉 Configuração do banco de dados concluída!');
    console.log('\n📝 Próximo passo: Execute "npm run seed" para criar o usuário administrador.');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Dica: Verifique se o PostgreSQL está rodando e se as credenciais estão corretas no arquivo .env');
    } else if (error.code === '28P01') {
      console.error('\n💡 Dica: Verifique o usuário e senha do PostgreSQL no arquivo .env');
    } else if (error.code === '3D000') {
      console.error('\n💡 Dica: O usuário não tem permissão para criar bancos de dados. Crie manualmente o banco "sisam"');
    }
    
    process.exit(1);
  }
}

setupDatabase();

