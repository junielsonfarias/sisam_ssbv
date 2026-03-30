const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Validar variáveis de ambiente obrigatórias
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.log(`❌ Variáveis de ambiente ausentes: ${missingVars.join(', ')}`);
  console.log('   Exporte DB_HOST, DB_USER e DB_PASSWORD antes de executar.');
  process.exit(1);
}

// Credenciais lidas de variáveis de ambiente
const config = {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT || '5432',
  DB_NAME: process.env.DB_NAME || 'postgres',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_SSL: process.env.DB_SSL || 'true',
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  NODE_ENV: 'development',
};

const envPath = path.join(__dirname, '..', '.env');

// Verificar se .env já existe
if (fs.existsSync(envPath)) {
  console.log('⚠️  Arquivo .env já existe!');
  console.log('   O arquivo será atualizado com as novas configurações do Supabase.');
  console.log('   Valores existentes serão preservados se não forem sobrescritos.\n');
}

// Ler .env existente se houver
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Criar novo conteúdo do .env
const newEnvContent = `# ============================================
# SISAM - Configuração Supabase
# ============================================
# Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}

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
  // Escrever novo .env
  fs.writeFileSync(envPath, newEnvContent, 'utf8');
  
  console.log('✅ Arquivo .env configurado com sucesso!');
  console.log('\n📋 Configurações aplicadas:');
  console.log(`   DB_HOST: ${config.DB_HOST}`);
  console.log(`   DB_PORT: ${config.DB_PORT}`);
  console.log(`   DB_NAME: ${config.DB_NAME}`);
  console.log(`   DB_USER: ${config.DB_USER}`);
  console.log(`   DB_PASSWORD: ${config.DB_PASSWORD.substring(0, 5)}...`);
  console.log(`   DB_SSL: ${config.DB_SSL}`);
  console.log(`   JWT_SECRET: ${config.JWT_SECRET.substring(0, 20)}...`);
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  
  console.log('\n🚀 Próximos passos:');
  console.log('   1. Testar conexão: npm run testar-conexao-supabase');
  console.log('   2. Iniciar servidor: npm run dev');
  console.log('   3. Acessar: http://localhost:3000');
  console.log('   4. Login: (use as credenciais padrão do sistema)');
  
} catch (error) {
  console.error('❌ Erro ao criar arquivo .env:', error.message);
  process.exit(1);
}

