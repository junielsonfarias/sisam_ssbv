const { Pool } = require('pg');

console.log('🔍 Testando Connection Pooler com mais detalhes...\n');

const projectRef = 'cjxejpgtuuqnbczpbdfe';
const password = 'Master@sisam&&';

// Testar diferentes hosts do pooler
const poolerHosts = [
  'aws-0-us-east-1.pooler.supabase.com',
  `aws-0-us-east-1.pooler.supabase.com/${projectRef}`,
  `db.${projectRef}.supabase.co`,
];

// Testar diferentes formatos de usuário
const userFormats = [
  `postgres.${projectRef}`,
  `postgres`,
  `pooler.${projectRef}`,
];

// Testar diferentes portas
const ports = [6543, 5432];

async function testarCombinacao(host, port, user) {
  const config = {
    host: host,
    port: port,
    user: user,
    database: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  };

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`🧪 Testando combinação:`);
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   User: ${user}`);
  
  const pool = new Pool(config);

  try {
    const client = await pool.connect();
    console.log('   ✅ CONEXÃO BEM-SUCEDIDA!');
    
    const result = await client.query('SELECT current_database(), current_user');
    console.log(`   📊 Database: ${result.rows[0].current_database}`);
    console.log(`   👤 User: ${result.rows[0].current_user}`);
    
    client.release();
    await pool.end();
    
    return { success: true, config };
  } catch (error) {
    console.log(`   ❌ Falhou: ${error.message}`);
    console.log(`   🔴 Código: ${error.code || 'N/A'}`);
    
    await pool.end().catch(() => {});
    return { success: false, config, error };
  }
}

async function testarTodas() {
  console.log('🎯 Iniciando testes de todas as combinações possíveis...\n');
  
  const resultados = [];
  let encontrouSucesso = false;

  for (const host of poolerHosts) {
    for (const port of ports) {
      for (const user of userFormats) {
        const resultado = await testarCombinacao(host, port, user);
        resultados.push(resultado);
        
        if (resultado.success) {
          encontrouSucesso = true;
          
          console.log('\n');
          console.log('╔════════════════════════════════════════════════════════════════════╗');
          console.log('║              🎉 CONFIGURAÇÃO QUE FUNCIONA! 🎉                      ║');
          console.log('╚════════════════════════════════════════════════════════════════════╝\n');
          
          console.log('Use estas variáveis no Vercel:\n');
          console.log(`DB_HOST=${resultado.config.host}`);
          console.log(`DB_PORT=${resultado.config.port}`);
          console.log(`DB_USER=${resultado.config.user}`);
          console.log(`DB_NAME=${resultado.config.database}`);
          console.log(`DB_PASSWORD=${password}`);
          console.log(`DB_SSL=true\n`);
          
          // Parar após encontrar a primeira que funciona
          return;
        }
        
        // Pequena pausa entre tentativas
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  if (!encontrouSucesso) {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║              ❌ NENHUMA COMBINAÇÃO FUNCIONOU                       ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    console.log('⚠️  Possíveis problemas:\n');
    console.log('1. Connection Pooling não está habilitado no projeto Supabase');
    console.log('2. A senha pode estar incorreta');
    console.log('3. O projeto pode estar pausado');
    console.log('4. Pode haver restrições de IP\n');
    
    console.log('📚 Soluções:\n');
    console.log('1. Verifique: https://supabase.com/dashboard/project/cjxejpgtuuqnbczpbdfe/settings/database');
    console.log('2. Certifique-se de que "Connection Pooling" está ENABLED');
    console.log('3. Verifique se o projeto está ACTIVE (não pausado)');
    console.log('4. Tente resetar a senha do banco de dados\n');
  }
}

testarTodas()
  .then(() => {
    console.log('✅ Testes concluídos!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro nos testes:', error.message);
    process.exit(1);
  });

