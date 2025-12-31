const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando Vercel automaticamente...\n');
console.log('='.repeat(60));

// Variáveis corretas
const variaveis = {
  'DB_HOST': 'db.cjxejpgtuuqnbczpbdfe.supabase.co',
  'DB_PORT': '5432',
  'DB_NAME': 'postgres',
  'DB_USER': 'postgres',
  'DB_PASSWORD': 'Master@sisam&&',
  'DB_SSL': 'true',
  'JWT_SECRET': '9a6b48526c17f76ff1dc471519ff9c95ab3b576c9571d59863de73a7a69e80a0',
  'NODE_ENV': 'production'
};

// Variáveis antigas para remover
const variaveisAntigas = [
  'USUARIO_DO_BANCO_DE_DADOS',
  'NOME_DO_BANCO_DE_DADOS',
  'SENHA_DO_BANCO_DE_DADOS'
];

function executar(comando, ignorarErro = false) {
  try {
    execSync(comando, { stdio: 'ignore' });
    return true;
  } catch (error) {
    if (!ignorarErro) {
      console.log(`   ⚠️  ${comando.substring(0, 50)}...`);
    }
    return false;
  }
}

function adicionarVariavel(nome, valor) {
  // Criar arquivo temporário com o valor
  const tempFile = path.join(__dirname, `temp_${nome}.txt`);
  fs.writeFileSync(tempFile, valor);
  
  try {
    // Remover se já existir
    executar(`vercel env rm ${nome} production --yes`, true);
    
    // Adicionar usando arquivo
    const comando = process.platform === 'win32' 
      ? `type ${tempFile} | vercel env add ${nome} production`
      : `cat ${tempFile} | vercel env add ${nome} production`;
    
    execSync(comando, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  } finally {
    // Remover arquivo temporário
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

async function main() {
  // 1. Verificar Vercel CLI
  console.log('\n📦 Verificando Vercel CLI...');
  try {
    const versao = execSync('vercel --version', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ ${versao}`);
  } catch (error) {
    console.log('   ❌ Vercel CLI não instalado!');
    console.log('   Execute: npm install -g vercel');
    process.exit(1);
  }
  
  // 2. Verificar login
  console.log('\n🔐 Verificando login...');
  try {
    const usuario = execSync('vercel whoami', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ Logado como: ${usuario}`);
  } catch (error) {
    console.log('   ❌ Não está logado!');
    console.log('   Execute: vercel login');
    process.exit(1);
  }
  
  // 3. Linkar projeto (se necessário)
  console.log('\n🔗 Verificando link do projeto...');
  const vercelDir = path.join(process.cwd(), '.vercel');
  if (!fs.existsSync(vercelDir)) {
    console.log('   ⚠️  Projeto não está linkado');
    console.log('   Tentando linkar automaticamente...');
    console.log('   (Se falhar, execute manualmente: vercel link)');
    
    // Tentar linkar sem interação
    try {
      // Criar arquivo de resposta automática
      const respostas = 'N\nY\nsisam-ssbv\n';
      execSync(`echo ${JSON.stringify(respostas)} | vercel link`, { 
        stdio: 'inherit',
        timeout: 30000 
      });
      console.log('   ✅ Projeto linkado');
    } catch (error) {
      console.log('   ⚠️  Link automático falhou');
      console.log('   Execute manualmente: vercel link');
      console.log('   Depois execute este script novamente');
      process.exit(1);
    }
  } else {
    console.log('   ✅ Projeto já está linkado');
  }
  
  // 4. Remover variáveis antigas
  console.log('\n🗑️  Removendo variáveis antigas...');
  for (const variavel of variaveisAntigas) {
    if (executar(`vercel env rm ${variavel} production --yes`, true)) {
      console.log(`   ✅ ${variavel} removida`);
    }
  }
  
  // 5. Adicionar variáveis corretas
  console.log('\n➕ Adicionando variáveis corretas...');
  let sucessos = 0;
  let erros = 0;
  
  for (const [nome, valor] of Object.entries(variaveis)) {
    console.log(`   Adicionando ${nome}...`);
    if (adicionarVariavel(nome, valor)) {
      console.log(`   ✅ ${nome} adicionada`);
      sucessos++;
    } else {
      console.log(`   ❌ Erro ao adicionar ${nome}`);
      erros++;
    }
  }
  
  // 6. Resumo
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Variáveis adicionadas: ${sucessos}/8`);
  console.log(`   ❌ Erros: ${erros}/8`);
  
  if (erros > 0) {
    console.log('\n⚠️  Algumas variáveis falharam.');
    console.log('   Adicione manualmente no Dashboard do Vercel');
  }
  
  // 7. Listar variáveis
  console.log('\n📋 Variáveis configuradas em Production:');
  try {
    execSync('vercel env ls production', { stdio: 'inherit' });
  } catch (error) {
    console.log('   ⚠️  Erro ao listar variáveis');
  }
  
  // 8. Fazer redeploy
  if (sucessos > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('\n🚀 Fazendo redeploy...');
    console.log('   (Isso pode levar ~2 minutos)');
    
    try {
      execSync('vercel --prod --yes', { stdio: 'inherit' });
      console.log('\n🎉 Deploy concluído!');
    } catch (error) {
      console.log('\n⚠️  Erro no deploy automático');
      console.log('   Execute manualmente: vercel --prod --yes');
    }
  }
  
  // 9. Instruções finais
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ CONFIGURAÇÃO CONCLUÍDA!\n');
  console.log('📝 Próximos passos:');
  console.log('   1. Aguarde ~2 minutos para o deploy finalizar');
  console.log('   2. Teste o login:');
  console.log('      npm run testar-login-producao-auto -- https://sisam-ssbv.vercel.app');
  console.log('   3. Se funcionar, está pronto! 🎉\n');
}

main().catch(error => {
  console.error('\n❌ Erro:', error.message);
  process.exit(1);
});

