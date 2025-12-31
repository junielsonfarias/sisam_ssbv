const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

// Valores padrão para desenvolvimento local
const defaultEnv = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'sisam',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  JWT_SECRET: 'sua-chave-secreta-aqui-altere-em-producao-' + Date.now(),
};

function fixEnv() {
  let envContent = '';
  let envExists = false;

  // Ler arquivo .env existente se houver
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    envExists = true;
    console.log('📄 Arquivo .env encontrado. Verificando configurações...\n');
  } else {
    console.log('📄 Criando novo arquivo .env...\n');
  }

  // Parsear variáveis existentes
  const existingVars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        existingVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  // Verificar e corrigir valores
  let needsUpdate = false;
  const newEnvVars = { ...defaultEnv };

  Object.keys(defaultEnv).forEach(key => {
    const existingValue = existingVars[key];
    
    if (!existingValue || existingValue.includes('seu-') || existingValue.includes('sua-')) {
      console.log(`⚠️  ${key}: Valor inválido ou placeholder encontrado`);
      console.log(`   Atualizando para: ${key}=${defaultEnv[key]}\n`);
      needsUpdate = true;
    } else {
      newEnvVars[key] = existingValue;
      console.log(`✅ ${key}: ${existingValue}`);
    }
  });

  // Adicionar variáveis que não existem
  Object.keys(existingVars).forEach(key => {
    if (!defaultEnv.hasOwnProperty(key)) {
      newEnvVars[key] = existingVars[key];
      console.log(`ℹ️  ${key}: ${existingVars[key]} (mantido)`);
    }
  });

  if (needsUpdate || !envExists) {
    // Criar novo conteúdo do .env
    let newEnvContent = `# Configurações do Banco de Dados PostgreSQL
DB_HOST=${newEnvVars.DB_HOST}
DB_PORT=${newEnvVars.DB_PORT}
DB_NAME=${newEnvVars.DB_NAME}
DB_USER=${newEnvVars.DB_USER}
DB_PASSWORD=${newEnvVars.DB_PASSWORD}

# Chave secreta para JWT (altere em produção!)
JWT_SECRET=${newEnvVars.JWT_SECRET}

# Ambiente
NODE_ENV=development
`;

    // Adicionar outras variáveis que não estão no padrão
    Object.keys(newEnvVars).forEach(key => {
      if (!defaultEnv.hasOwnProperty(key) && key !== 'NODE_ENV') {
        newEnvContent += `\n${key}=${newEnvVars[key]}`;
      }
    });

    fs.writeFileSync(envPath, newEnvContent, 'utf8');
    console.log('\n✅ Arquivo .env atualizado com sucesso!');
    console.log('\n📝 IMPORTANTE:');
    console.log('   - Verifique se as credenciais do PostgreSQL estão corretas');
    console.log('   - Altere o JWT_SECRET em produção');
    console.log('   - Reinicie o servidor (npm run dev) após as alterações\n');
  } else {
    console.log('\n✅ Todas as variáveis de ambiente estão configuradas corretamente!\n');
  }
}

fixEnv();

