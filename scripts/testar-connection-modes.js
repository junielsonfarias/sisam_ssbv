const { Pool } = require('pg');

console.log('🔍 Testando diferentes modos de conexão do Supabase...\n');

const projectRef = 'cjxejpgtuuqnbczpbdfe';
const password = 'Master@sisam&&';

const configs = [
  {
    name: 'Transaction Mode (Recomendado para Serverless)',
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 6543,
    user: `postgres.${projectRef}`,
    database: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Session Mode',
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 5432,
    user: `postgres`,
    database: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Direct Connection',
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    user: 'postgres',
    database: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false }
  }
];

async function testarConfiguracao(config) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📡 Testando: ${config.name}`);
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);
  console.log(`${'='.repeat(70)}\n`);

  const pool = new Pool(config);

  try {
    console.log('⏳ Conectando...');
    const client = await pool.connect();
    
    console.log('✅ Conexão estabelecida!');
    
    console.log('⏳ Testando query...');
    const result = await client.query('SELECT current_database(), current_user, version()');
    
    console.log('✅ Query executada com sucesso!\n');
    console.log('📊 Resultado:');
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   Version: ${result.rows[0].version.split(',')[0]}`);
    
    // Testar se as tabelas do SISAM existem
    console.log('\n⏳ Verificando tabelas do SISAM...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('usuarios', 'polos', 'escolas', 'alunos')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ Tabelas encontradas:');
      tablesResult.rows.forEach(row => console.log(`   - ${row.table_name}`));
    } else {
      console.log('⚠️  Nenhuma tabela do SISAM encontrada');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅✅✅ ESTA CONFIGURAÇÃO FUNCIONA! ✅✅✅');
    
    return { success: true, config };
  } catch (error) {
    console.log(`❌ Erro ao conectar: ${error.message}`);
    console.log(`   Código: ${error.code}`);
    
    await pool.end().catch(() => {});
    
    return { success: false, config, error: error.message };
  }
}

async function testarTodas() {
  const resultados = [];
  
  for (const config of configs) {
    const resultado = await testarConfiguracao(config);
    resultados.push(resultado);
    
    // Aguardar 2 segundos entre testes
    if (configs.indexOf(config) < configs.length - 1) {
      console.log('\n⏸️  Aguardando 2 segundos antes do próximo teste...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMO DOS TESTES                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  resultados.forEach((resultado, index) => {
    const status = resultado.success ? '✅ FUNCIONOU' : '❌ FALHOU';
    console.log(`${status} - ${configs[index].name}`);
    if (!resultado.success) {
      console.log(`         Erro: ${resultado.error}`);
    }
  });
  
  const funcionando = resultados.find(r => r.success);
  
  if (funcionando) {
    console.log('\n\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║              CONFIGURAÇÃO RECOMENDADA PARA O VERCEL                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    console.log('Use estas variáveis no Vercel:\n');
    console.log(`DB_HOST=${funcionando.config.host}`);
    console.log(`DB_PORT=${funcionando.config.port}`);
    console.log(`DB_USER=${funcionando.config.user}`);
    console.log(`DB_NAME=${funcionando.config.database}`);
    console.log(`DB_PASSWORD=${funcionando.config.password}`);
    console.log(`DB_SSL=true`);
    console.log('\n');
  } else {
    console.log('\n❌ Nenhuma configuração funcionou. Verifique:');
    console.log('   1. A senha está correta?');
    console.log('   2. O projeto Supabase está ativo?');
    console.log('   3. O IP está na whitelist do Supabase?');
  }
}

testarTodas()
  .then(() => {
    console.log('\n✅ Testes concluídos!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro nos testes:', error.message);
    process.exit(1);
  });

