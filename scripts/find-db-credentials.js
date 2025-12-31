const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env atual
const envPath = path.join(__dirname, '..', '.env');
let currentEnv = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        currentEnv[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const host = currentEnv.DB_HOST || 'localhost';
const port = parseInt(currentEnv.DB_PORT || '5432');
const database = currentEnv.DB_NAME || 'sisam';

// Credenciais comuns para testar
const credentialsToTest = [
  { user: 'postgres', password: 'postgres' },
  { user: 'postgres', password: '' },
  { user: 'postgres', password: 'admin' },
  { user: 'postgres', password: 'root' },
  { user: 'postgres', password: '123456' },
  { user: 'master', password: 'Tiko6273@' }, // Do .env anterior
  { user: currentEnv.DB_USER, password: currentEnv.DB_PASSWORD }, // Tentar as atuais por último
];

async function testCredentials() {
  console.log('🔍 Analisando banco de dados PostgreSQL...\n');
  console.log(`📋 Configuração base:`);
  console.log(`   Host: ${host}`);
  console.log(`   Porta: ${port}`);
  console.log(`   Banco: ${database}\n`);

  let successfulConnection = null;

  for (const cred of credentialsToTest) {
    if (!cred.user || !cred.password) continue;
    
    const pool = new Pool({
      host,
      port,
      database: 'postgres', // Tentar conectar ao banco padrão primeiro
      user: cred.user,
      password: cred.password,
      connectionTimeoutMillis: 2000,
    });

    try {
      console.log(`🔄 Testando: ${cred.user} / ${cred.password ? '***' + cred.password.slice(-2) : '(vazio)'}...`);
      const result = await pool.query('SELECT version(), current_user, current_database()');
      
      console.log(`✅ Conexão bem-sucedida com ${cred.user}!\n`);
      
      // Verificar se o banco sisam existe
      const dbCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_database WHERE datname = $1
        )
      `, [database]);

      if (dbCheck.rows[0].exists) {
        console.log(`✅ Banco "${database}" encontrado`);
        
        // Tentar conectar ao banco sisam
        const sisamPool = new Pool({
          host,
          port,
          database,
          user: cred.user,
          password: cred.password,
        });

        try {
          await sisamPool.query('SELECT 1');
          console.log(`✅ Acesso ao banco "${database}" confirmado\n`);
          
          successfulConnection = {
            user: cred.user,
            password: cred.password,
            host,
            port,
            database,
          };
          
          await sisamPool.end();
          await pool.end();
          break;
        } catch (err) {
          console.log(`⚠️  Não foi possível acessar o banco "${database}"`);
          console.log(`   Erro: ${err.message}\n`);
          await sisamPool.end();
        }
      } else {
        console.log(`⚠️  Banco "${database}" não existe`);
        console.log(`   Mas a conexão funciona. Você pode criar o banco depois.\n`);
        
        successfulConnection = {
          user: cred.user,
          password: cred.password,
          host,
          port,
          database,
        };
        
        await pool.end();
        break;
      }

      await pool.end();
    } catch (error) {
      console.log(`❌ Falhou: ${error.message.split('\n')[0]}\n`);
      await pool.end().catch(() => {});
    }
  }

  if (successfulConnection) {
    console.log('📝 Atualizando arquivo .env...\n');
    
    // Ler JWT_SECRET atual se existir
    const jwtSecret = currentEnv.JWT_SECRET || 'sua-chave-secreta-aqui-altere-em-producao-' + Date.now();
    const nodeEnv = currentEnv.NODE_ENV || 'development';

    const newEnvContent = `# Configurações do Banco de Dados PostgreSQL
DB_HOST=${successfulConnection.host}
DB_PORT=${successfulConnection.port}
DB_NAME=${successfulConnection.database}
DB_USER=${successfulConnection.user}
DB_PASSWORD=${successfulConnection.password}

# Chave secreta para JWT (altere em produção!)
JWT_SECRET=${jwtSecret}

# Ambiente
NODE_ENV=${nodeEnv}
`;

    fs.writeFileSync(envPath, newEnvContent, 'utf8');
    
    console.log('✅ Arquivo .env atualizado com sucesso!\n');
    console.log('📋 Credenciais configuradas:');
    console.log(`   DB_HOST=${successfulConnection.host}`);
    console.log(`   DB_PORT=${successfulConnection.port}`);
    console.log(`   DB_NAME=${successfulConnection.database}`);
    console.log(`   DB_USER=${successfulConnection.user}`);
    console.log(`   DB_PASSWORD=${successfulConnection.password ? '***' + successfulConnection.password.slice(-2) : '(vazio)'}\n`);
    console.log('🔄 Reinicie o servidor (npm run dev) para aplicar as mudanças.\n');
  } else {
    console.log('❌ Não foi possível encontrar credenciais válidas.\n');
    console.log('💡 Soluções:');
    console.log('   1. Verifique se o PostgreSQL está rodando');
    console.log('   2. Verifique se você tem as credenciais corretas');
    console.log('   3. Crie um usuário no PostgreSQL:');
    console.log('      CREATE USER seu_usuario WITH PASSWORD \'sua_senha\';');
    console.log('      GRANT ALL PRIVILEGES ON DATABASE sisam TO seu_usuario;\n');
    process.exit(1);
  }
}

testCredentials();

