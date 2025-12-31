const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Credenciais do Supabase para PRODUÇÃO (Connection Pooler)
const configProducao = {
  DB_HOST: 'aws-0-us-east-1.pooler.supabase.com',
  DB_PORT: '6543',
  DB_NAME: 'postgres',
  DB_USER: 'postgres.cjxejpgtuuqnbczpbdfe', // IMPORTANTE: com project ref para pooler
  DB_PASSWORD: 'Master@sisam&&',
  DB_SSL: 'true',
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  NODE_ENV: 'production',
};

// Credenciais do Supabase para DESENVOLVIMENTO (Direct Connection)
const configDesenvolvimento = {
  DB_HOST: 'db.cjxejpgtuuqnbczpbdfe.supabase.co',
  DB_PORT: '5432',
  DB_NAME: 'postgres',
  DB_USER: 'postgres', // Sem project ref para conexão direta
  DB_PASSWORD: 'Master@sisam&&',
  DB_SSL: 'true',
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  NODE_ENV: 'development',
};

const envProducaoPath = path.join(__dirname, '..', '.env');
const envLocalPath = path.join(__dirname, '..', '.env.local');

// Função para criar arquivo .env
function criarEnv(arquivo, config, tipo) {
  const envContent = `# ============================================
# SISAM - Configuração ${tipo}
# ============================================
# Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}
# ⚠️  NÃO COMMITAR ESTE ARQUIVO NO GIT!

# Supabase - Configuração do Banco de Dados
DB_HOST=${config.DB_HOST}
DB_PORT=${config.DB_PORT}
DB_NAME=${config.DB_NAME}
DB_USER=${config.DB_USER}
DB_PASSWORD=${config.DB_PASSWORD}
DB_SSL=${config.DB_SSL}

# JWT Secret (gerado automaticamente)
JWT_SECRET=${config.JWT_SECRET}

# Ambiente
NODE_ENV=${config.NODE_ENV}
`;

  try {
    // Verificar se arquivo já existe
    if (fs.existsSync(arquivo)) {
      console.log(`⚠️  Arquivo ${path.basename(arquivo)} já existe!`);
      console.log(`   O arquivo será atualizado com as novas configurações.\n`);
    }

    fs.writeFileSync(arquivo, envContent, 'utf8');
    
    console.log(`✅ Arquivo ${path.basename(arquivo)} configurado com sucesso!`);
    console.log(`\n📋 Configurações aplicadas (${tipo}):`);
    console.log(`   DB_HOST: ${config.DB_HOST}`);
    console.log(`   DB_PORT: ${config.DB_PORT}`);
    console.log(`   DB_NAME: ${config.DB_NAME}`);
    console.log(`   DB_USER: ${config.DB_USER}`);
    console.log(`   DB_PASSWORD: ${config.DB_PASSWORD.substring(0, 5)}...`);
    console.log(`   DB_SSL: ${config.DB_SSL}`);
    console.log(`   JWT_SECRET: ${config.JWT_SECRET.substring(0, 20)}...`);
    console.log(`   NODE_ENV: ${config.NODE_ENV}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Erro ao criar arquivo ${path.basename(arquivo)}:`, error.message);
    return false;
  }
}

// Criar ambos os arquivos
console.log('🔧 Configurando arquivos .env para SISAM...\n');

const prodOk = criarEnv(envProducaoPath, configProducao, 'PRODUÇÃO (Vercel)');
const devOk = criarEnv(envLocalPath, configDesenvolvimento, 'DESENVOLVIMENTO (Local)');

console.log('\n' + '='.repeat(60));
if (prodOk && devOk) {
  console.log('✅ Ambos os arquivos foram configurados com sucesso!');
  console.log('\n📝 Arquivos criados:');
  console.log(`   - .env (Produção - Connection Pooler)`);
  console.log(`   - .env.local (Desenvolvimento - Direct Connection)`);
  console.log('\n🚀 Próximos passos:');
  console.log('   1. Para desenvolvimento: npm run dev');
  console.log('   2. Para produção: Configure as mesmas variáveis na Vercel');
  console.log('   3. Teste a conexão: npm run testar-conexao-supabase');
} else {
  console.log('❌ Alguns arquivos não puderam ser criados.');
  process.exit(1);
}

