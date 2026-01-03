/**
 * Script de diagnóstico de conexão com banco de dados
 * Testa a conexão e fornece informações detalhadas sobre problemas
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function diagnosticarConexao() {
  console.log('🔍 Iniciando diagnóstico de conexão...\n');

  // Verificar variáveis de ambiente
  console.log('📋 Variáveis de Ambiente:');
  const envVars = {
    DB_HOST: process.env.DB_HOST || 'NÃO CONFIGURADO',
    DB_PORT: process.env.DB_PORT || 'NÃO CONFIGURADO',
    DB_NAME: process.env.DB_NAME || 'NÃO CONFIGURADO',
    DB_USER: process.env.DB_USER || 'NÃO CONFIGURADO',
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'NÃO CONFIGURADO',
    DB_SSL: process.env.DB_SSL || 'NÃO CONFIGURADO',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  // Verificar se todas as variáveis estão configuradas
  const missingVars = [];
  if (!process.env.DB_HOST) missingVars.push('DB_HOST');
  if (!process.env.DB_PORT) missingVars.push('DB_PORT');
  if (!process.env.DB_NAME) missingVars.push('DB_NAME');
  if (!process.env.DB_USER) missingVars.push('DB_USER');
  if (!process.env.DB_PASSWORD) missingVars.push('DB_PASSWORD');

  if (missingVars.length > 0) {
    console.log('\n❌ Variáveis faltando:', missingVars.join(', '));
    console.log('Configure as variáveis de ambiente antes de continuar.');
    process.exit(1);
  }

  // Detectar tipo de conexão
  const isSupabase = process.env.DB_HOST.includes('supabase.co') || 
                     process.env.DB_HOST.includes('pooler.supabase.com') ||
                     process.env.DB_HOST.includes('aws-0-');
  
  console.log('\n🔗 Tipo de Conexão:');
  console.log(`  Supabase: ${isSupabase ? 'Sim' : 'Não'}`);
  if (isSupabase) {
    const isPooler = process.env.DB_HOST.includes('pooler') || process.env.DB_HOST.includes('aws-0-');
    console.log(`  Connection Pooler: ${isPooler ? 'Sim' : 'Não'}`);
    console.log(`  Porta: ${process.env.DB_PORT} (${process.env.DB_PORT === '6543' ? 'Transaction Mode' : process.env.DB_PORT === '5432' ? 'Session Mode' : 'Desconhecida'})`);
  }

  // Configurar SSL
  const sslConfig = process.env.NODE_ENV === 'production' || 
                    process.env.DB_SSL === 'true' || 
                    isSupabase
    ? { rejectUnauthorized: false }
    : false;

  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: sslConfig,
    connectionTimeoutMillis: isSupabase ? 30000 : 10000,
    family: isSupabase && process.env.NODE_ENV === 'production' ? 4 : undefined, // IPv4
  };

  console.log('\n🔧 Configuração de Conexão:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Porta: ${config.port}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}`);
  console.log(`  SSL: ${sslConfig ? 'Sim' : 'Não'}`);
  console.log(`  Timeout: ${config.connectionTimeoutMillis}ms`);
  if (config.family) {
    console.log(`  IP Family: IPv4`);
  }

  // Tentar conectar
  console.log('\n🔌 Tentando conectar...');
  const pool = new Pool(config);

  try {
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    const duration = Date.now() - startTime;

    console.log('✅ Conexão bem-sucedida!');
    console.log(`  Tempo de resposta: ${duration}ms`);
    console.log(`  Hora do servidor: ${result.rows[0].current_time}`);
    console.log(`  PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);

    // Testar algumas queries básicas
    console.log('\n📊 Testando queries básicas...');
    
    try {
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      console.log(`  ✅ Tabelas encontradas: ${tablesResult.rows.length}`);
    } catch (e) {
      console.log(`  ⚠️  Erro ao listar tabelas: ${e.message}`);
    }

    try {
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM usuarios');
      console.log(`  ✅ Usuários na tabela: ${usersResult.rows[0].count}`);
    } catch (e) {
      console.log(`  ⚠️  Tabela 'usuarios' não encontrada ou erro: ${e.message}`);
    }

    console.log('\n✅ Diagnóstico completo - Conexão funcionando corretamente!');
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.log('\n❌ Erro ao conectar:');
    console.log(`  Código: ${error.code || 'N/A'}`);
    console.log(`  Mensagem: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Sugestões:');
      console.log('  1. Verifique se o DB_HOST está correto');
      console.log('  2. Se estiver usando Supabase, use o Connection Pooler');
      console.log('  3. Verifique se o projeto Supabase está ativo');
      console.log('  4. Teste o DNS: nslookup ' + process.env.DB_HOST);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Sugestões:');
      console.log('  1. Verifique se a porta está correta (5432 ou 6543)');
      console.log('  2. Verifique se o firewall permite conexões');
      console.log('  3. Se estiver usando Supabase, use Connection Pooler (porta 6543)');
    } else if (error.code === '28P01' || error.message.includes('password')) {
      console.log('\n💡 Sugestões:');
      console.log('  1. Verifique se DB_USER e DB_PASSWORD estão corretos');
      console.log('  2. Se estiver usando Supabase Pooler, use: postgres.[PROJECT-REF]');
      console.log('  3. Verifique se a senha não tem caracteres especiais que precisam ser escapados');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Sugestões:');
      console.log('  1. O servidor pode estar sobrecarregado');
      console.log('  2. Verifique sua conexão de internet');
      console.log('  3. Tente novamente em alguns instantes');
    }

    await pool.end();
    process.exit(1);
  }
}

diagnosticarConexao().catch(console.error);

