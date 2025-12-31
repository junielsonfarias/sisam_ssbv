const fs = require('fs');
const path = require('path');

const projectRef = 'cjxejpgtuuqnbczpbdfe';

// Configurações corretas para o projeto
const configCorreta = {
  DB_HOST: `db.${projectRef}.supabase.co`,
  DB_PORT: '5432',
  DB_NAME: 'postgres',
  DB_USER: 'postgres',
  DB_SSL: 'true',
  NODE_ENV: 'production'
};

function atualizarEnv(arquivo, isProducao = false) {
  const envPath = path.join(__dirname, '..', arquivo);
  
  if (!fs.existsSync(envPath)) {
    console.log(`⚠️  Arquivo ${arquivo} não existe. Criando...`);
  }
  
  let envContent = '';
  let envObj = {};
  
  // Ler arquivo existente (se houver)
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envObj[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  
  console.log(`\n📝 Atualizando ${arquivo}...`);
  
  // Atualizar com valores corretos
  envObj.DB_HOST = configCorreta.DB_HOST;
  envObj.DB_PORT = configCorreta.DB_PORT;
  envObj.DB_NAME = configCorreta.DB_NAME;
  envObj.DB_USER = configCorreta.DB_USER;
  envObj.DB_SSL = configCorreta.DB_SSL;
  
  if (isProducao) {
    envObj.NODE_ENV = 'production';
  } else {
    envObj.NODE_ENV = 'development';
  }
  
  // Manter DB_PASSWORD e JWT_SECRET se já existirem
  if (!envObj.DB_PASSWORD) {
    console.log('   ⚠️  DB_PASSWORD não encontrado. Você precisará adicioná-lo manualmente.');
    envObj.DB_PASSWORD = 'SUA_SENHA_AQUI';
  }
  
  if (!envObj.JWT_SECRET) {
    console.log('   ⚠️  JWT_SECRET não encontrado. Gerando um novo...');
    envObj.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
  }
  
  // Gerar novo conteúdo
  const novoConteudo = Object.entries(envObj)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Salvar
  fs.writeFileSync(envPath, novoConteudo + '\n', 'utf-8');
  
  console.log(`   ✅ ${arquivo} atualizado`);
  console.log(`   Host: ${envObj.DB_HOST}`);
  console.log(`   Porta: ${envObj.DB_PORT}`);
  console.log(`   Banco: ${envObj.DB_NAME}`);
  console.log(`   Usuário: ${envObj.DB_USER}`);
  console.log(`   Senha: ${envObj.DB_PASSWORD === 'SUA_SENHA_AQUI' ? '⚠️  DEFINA A SENHA' : '***'}`);
  console.log(`   JWT: ${envObj.JWT_SECRET ? '***' : '⚠️  NÃO DEFINIDO'}`);
}

function corrigir() {
  console.log('🔧 Corrigindo configuração para o projeto correto...\n');
  console.log('🎯 Projeto: https://cjxejpgtuuqnbczpbdfe.supabase.co');
  console.log(`📦 Project Ref: ${projectRef}\n`);
  
  // Atualizar .env (produção)
  atualizarEnv('.env', true);
  
  // Atualizar .env.local (desenvolvimento)
  atualizarEnv('.env.local', false);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Arquivos atualizados com sucesso!');
  console.log('\n⚠️  ATENÇÃO: Verifique se a senha está correta!');
  console.log('\n📝 Próximos passos:');
  console.log('   1. Abra o arquivo .env');
  console.log('   2. Verifique se DB_PASSWORD está correto');
  console.log('   3. Execute: npm run testar-conexao-supabase');
  console.log('   4. Se funcionar, execute: npm run atualizar-vercel-producao');
}

try {
  corrigir();
} catch (error) {
  console.error('\n❌ Erro:', error.message);
  process.exit(1);
}

