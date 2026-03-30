const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ler credenciais do .env
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

function executarComando(comando) {
  try {
    console.log(`\n🔄 Executando: ${comando.substring(0, 100)}...`);
    execSync(comando, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ Erro ao executar comando: ${error.message}`);
    return false;
  }
}

async function atualizarVercel() {
  console.log('🚀 Atualizando variáveis de ambiente no Vercel...\n');
  
  // Ler variáveis do .env
  const env = lerEnv();
  
  console.log('📋 Credenciais encontradas no .env:');
  console.log('   DB_HOST:', env.DB_HOST || 'NÃO DEFINIDO');
  console.log('   DB_PORT:', env.DB_PORT || 'NÃO DEFINIDO');
  console.log('   DB_NAME:', env.DB_NAME || 'NÃO DEFINIDO');
  console.log('   DB_USER:', env.DB_USER || 'NÃO DEFINIDO');
  console.log('   DB_PASSWORD:', env.DB_PASSWORD ? '***' : 'NÃO DEFINIDO');
  console.log('   JWT_SECRET:', env.JWT_SECRET ? '***' : 'NÃO DEFINIDO');
  console.log('   NODE_ENV:', env.NODE_ENV || 'NÃO DEFINIDO');
  
  // Validar credenciais
  const credenciaisObrigatorias = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
  const credenciaisFaltando = credenciaisObrigatorias.filter(key => !env[key]);
  
  if (credenciaisFaltando.length > 0) {
    console.error('\n❌ Credenciais faltando no .env:');
    credenciaisFaltando.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Configure estas variáveis no arquivo .env antes de continuar.');
    process.exit(1);
  }
  
  // Validar se é o banco correto
  if (!env.DB_HOST.includes('supabase')) {
    console.error(`\n⚠️  ATENÇÃO: O DB_HOST não parece ser um host Supabase!`);
    console.error(`   Encontrado: ${env.DB_HOST}`);
    console.error('\n💡 Atualize o .env com o host correto antes de continuar.');
    process.exit(1);
  }
  
  console.log('\n✅ Todas as credenciais necessárias estão presentes!\n');
  
  // Verificar se Vercel CLI está instalado
  try {
    execSync('vercel --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Vercel CLI não está instalado!');
    console.error('\n💡 Instale com: npm install -g vercel');
    process.exit(1);
  }
  
  console.log('📦 Vercel CLI encontrado!\n');
  
  // Link do projeto (se necessário)
  console.log('🔗 Verificando link do projeto...');
  try {
    execSync('vercel link --yes', { stdio: 'inherit' });
  } catch (error) {
    console.error('⚠️  Erro ao fazer link do projeto. Continuando...');
  }
  
  console.log('\n📝 Atualizando variáveis de ambiente no Vercel (Production)...\n');
  
  // Atualizar cada variável
  const variaveis = [
    { nome: 'DB_HOST', valor: env.DB_HOST, descricao: 'Host do Supabase' },
    { nome: 'DB_PORT', valor: env.DB_PORT, descricao: 'Porta do Supabase' },
    { nome: 'DB_NAME', valor: env.DB_NAME, descricao: 'Nome do banco' },
    { nome: 'DB_USER', valor: env.DB_USER, descricao: 'Usuário do banco' },
    { nome: 'DB_PASSWORD', valor: env.DB_PASSWORD, descricao: 'Senha do banco' },
    { nome: 'JWT_SECRET', valor: env.JWT_SECRET, descricao: 'Secret do JWT' },
    { nome: 'NODE_ENV', valor: 'production', descricao: 'Ambiente' },
    { nome: 'DB_SSL', valor: 'true', descricao: 'SSL habilitado' },
  ];
  
  let sucessos = 0;
  let erros = 0;
  
  for (const variavel of variaveis) {
    console.log(`\n➡️  ${variavel.nome}: ${variavel.descricao}`);
    
    const valorExibir = ['DB_PASSWORD', 'JWT_SECRET'].includes(variavel.nome) 
      ? '***' 
      : variavel.valor;
    console.log(`   Valor: ${valorExibir}`);
    
    // Remover variável antiga (se existir)
    try {
      execSync(`vercel env rm ${variavel.nome} production --yes`, { stdio: 'ignore' });
    } catch (error) {
      // Ignorar se não existir
    }
    
    // Adicionar nova variável
    const comando = `vercel env add ${variavel.nome} production`;
    const sucesso = executarComando(`echo ${variavel.valor} | ${comando}`);
    
    if (sucesso) {
      console.log(`   ✅ ${variavel.nome} atualizada`);
      sucessos++;
    } else {
      console.log(`   ❌ Erro ao atualizar ${variavel.nome}`);
      erros++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Variáveis atualizadas: ${sucessos}`);
  if (erros > 0) {
    console.log(`❌ Erros: ${erros}`);
  }
  
  console.log('\n📦 Fazendo deploy para aplicar as mudanças...\n');
  const deployOk = executarComando('vercel --prod');
  
  if (deployOk) {
    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!\n');
    console.log('✅ Variáveis de ambiente atualizadas no Vercel');
    console.log('✅ Deploy em produção realizado');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Aguarde o deploy finalizar (~2 minutos)');
    console.log('   2. Acesse sua aplicação no Vercel');
    console.log('   3. Teste o login com as credenciais padrão do sistema');
    console.log('   4. Verifique se a logo aparece corretamente');
    console.log('\n🔍 Para verificar as variáveis configuradas:');
    console.log('   vercel env ls production');
  } else {
    console.log('\n⚠️  Houve problemas durante o deploy.');
    console.log('   Tente fazer o deploy manualmente:');
    console.log('   vercel --prod');
  }
}

atualizarVercel().catch(error => {
  console.error('\n❌ Erro:', error.message);
  process.exit(1);
});

