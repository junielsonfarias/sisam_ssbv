const fs = require('fs');
const path = require('path');

function lerEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return env;
}

function verificarEnv() {
  console.log('🔍 Verificando configuração do .env...\n');
  
  const env = lerEnv();
  const projectRef = 'cjxejpgtuuqnbczpbdfe';
  
  console.log('📋 Configuração atual:');
  console.log('   DB_HOST:', env.DB_HOST || 'NÃO DEFINIDO');
  console.log('   DB_PORT:', env.DB_PORT || 'NÃO DEFINIDO');
  console.log('   DB_NAME:', env.DB_NAME || 'NÃO DEFINIDO');
  console.log('   DB_USER:', env.DB_USER || 'NÃO DEFINIDO');
  console.log('   DB_PASSWORD:', env.DB_PASSWORD ? '***' : 'NÃO DEFINIDO');
  console.log('   JWT_SECRET:', env.JWT_SECRET ? '***' : 'NÃO DEFINIDO');
  console.log('   NODE_ENV:', env.NODE_ENV || 'NÃO DEFINIDO');
  
  console.log('\n🎯 Projeto correto:');
  console.log('   Project URL: https://cjxejpgtuuqnbczpbdfe.supabase.co');
  console.log('   Project Ref:', projectRef);
  
  // Validações
  let erros = [];
  let avisos = [];
  
  // Verificar host
  if (!env.DB_HOST) {
    erros.push('DB_HOST não está definido');
  } else if (!env.DB_HOST.includes(projectRef)) {
    erros.push(`DB_HOST não é do projeto correto (${projectRef})`);
    avisos.push(`Host esperado: db.${projectRef}.supabase.co`);
    avisos.push(`Host encontrado: ${env.DB_HOST}`);
  } else {
    console.log('\n   ✅ DB_HOST está correto');
  }
  
  // Verificar porta
  if (!env.DB_PORT) {
    erros.push('DB_PORT não está definido');
  } else if (env.DB_PORT !== '5432' && env.DB_PORT !== '6543') {
    avisos.push(`Porta incomum: ${env.DB_PORT} (esperado: 5432 ou 6543)`);
  } else {
    console.log('   ✅ DB_PORT está configurado');
  }
  
  // Verificar nome do banco
  if (!env.DB_NAME) {
    erros.push('DB_NAME não está definido');
  } else if (env.DB_NAME !== 'postgres') {
    avisos.push(`Nome do banco: ${env.DB_NAME} (Supabase usa 'postgres' por padrão)`);
  } else {
    console.log('   ✅ DB_NAME está correto');
  }
  
  // Verificar usuário
  if (!env.DB_USER) {
    erros.push('DB_USER não está definido');
  } else if (!env.DB_USER.includes('postgres')) {
    avisos.push(`DB_USER pode estar incorreto: ${env.DB_USER}`);
  } else {
    console.log('   ✅ DB_USER está configurado');
  }
  
  // Verificar senha
  if (!env.DB_PASSWORD) {
    erros.push('DB_PASSWORD não está definido');
  } else {
    console.log('   ✅ DB_PASSWORD está configurado');
  }
  
  // Verificar JWT
  if (!env.JWT_SECRET) {
    erros.push('JWT_SECRET não está definido');
  } else if (env.JWT_SECRET.length < 32) {
    avisos.push('JWT_SECRET muito curto (mínimo 32 caracteres)');
  } else {
    console.log('   ✅ JWT_SECRET está configurado');
  }
  
  // Resumo
  console.log('\n' + '='.repeat(60));
  
  if (erros.length > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:');
    erros.forEach(erro => console.log(`   - ${erro}`));
  }
  
  if (avisos.length > 0) {
    console.log('\n⚠️  AVISOS:');
    avisos.forEach(aviso => console.log(`   - ${aviso}`));
  }
  
  if (erros.length === 0 && avisos.length === 0) {
    console.log('\n✅ Configuração está CORRETA!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Execute: npm run atualizar-vercel-producao');
    console.log('   2. Aguarde o deploy finalizar');
    console.log('   3. Teste o login em produção');
    return true;
  } else if (erros.length === 0) {
    console.log('\n⚠️  Configuração tem alguns avisos, mas pode funcionar.');
    console.log('\n📝 Você pode prosseguir com:');
    console.log('   npm run atualizar-vercel-producao');
    return true;
  } else {
    console.log('\n❌ Corrija os erros antes de prosseguir!');
    console.log('\n💡 Para configurar automaticamente:');
    console.log('   npm run configurar-env-producao');
    return false;
  }
}

try {
  verificarEnv();
} catch (error) {
  console.error('❌ Erro ao verificar .env:', error.message);
  process.exit(1);
}

