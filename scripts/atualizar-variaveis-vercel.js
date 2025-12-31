const { execSync } = require('child_process');

console.log('🚀 Atualizando variáveis de ambiente no Vercel via CLI...\n');
console.log('📋 Este script irá:');
console.log('   1. Remover variáveis com nomes incorretos');
console.log('   2. Adicionar/atualizar variáveis com nomes corretos');
console.log('   3. Fazer redeploy automático\n');

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
const variaveisParaRemover = [
  'USUARIO_DO_BANCO_DE_DADOS',
  'NOME_DO_BANCO_DE_DADOS',
  'SENHA_DO_BANCO_DE_DADOS'
];

function executar(comando, ignorarErro = false) {
  try {
    console.log(`\n🔄 Executando: ${comando.substring(0, 80)}...`);
    const resultado = execSync(comando, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('   ✅ Sucesso');
    return resultado;
  } catch (error) {
    if (ignorarErro) {
      console.log('   ⚠️  Variável não existe (ignorando)');
      return null;
    } else {
      console.log('   ❌ Erro:', error.message);
      throw error;
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  
  // Passo 1: Verificar se Vercel CLI está instalado
  console.log('\n📦 Passo 1: Verificando Vercel CLI...');
  try {
    const versao = execSync('vercel --version', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ Vercel CLI ${versao} instalado`);
  } catch (error) {
    console.log('   ❌ Vercel CLI não está instalado!');
    console.log('\n💡 Instale com: npm install -g vercel');
    console.log('   Depois execute este script novamente.\n');
    process.exit(1);
  }
  
  // Passo 2: Verificar login
  console.log('\n🔐 Passo 2: Verificando login no Vercel...');
  try {
    execSync('vercel whoami', { encoding: 'utf-8', stdio: 'ignore' });
    console.log('   ✅ Você está logado no Vercel');
  } catch (error) {
    console.log('   ❌ Você não está logado!');
    console.log('\n💡 Execute: vercel login');
    console.log('   Depois execute este script novamente.\n');
    process.exit(1);
  }
  
  // Passo 3: Verificar se projeto está linkado
  console.log('\n🔗 Passo 3: Verificando link do projeto...');
  try {
    executar('vercel link --yes');
  } catch (error) {
    console.log('   ⚠️  Erro ao linkar projeto');
    console.log('   Continuando mesmo assim...');
  }
  
  // Passo 4: Remover variáveis antigas
  console.log('\n🗑️  Passo 4: Removendo variáveis com nomes incorretos...');
  for (const variavel of variaveisParaRemover) {
    executar(`vercel env rm ${variavel} production --yes`, true);
  }
  
  // Passo 5: Adicionar/atualizar variáveis corretas
  console.log('\n➕ Passo 5: Adicionando variáveis corretas...');
  let sucessos = 0;
  let erros = 0;
  
  for (const [nome, valor] of Object.entries(variaveis)) {
    try {
      // Tentar remover se já existir
      executar(`vercel env rm ${nome} production --yes`, true);
      
      // Adicionar a variável
      // Para variáveis com caracteres especiais, usar arquivo temporário
      const fs = require('fs');
      const tempFile = `temp_env_${nome}.txt`;
      fs.writeFileSync(tempFile, valor);
      
      try {
        executar(`vercel env add ${nome} production < ${tempFile}`);
        sucessos++;
      } finally {
        // Remover arquivo temporário
        fs.unlinkSync(tempFile);
      }
    } catch (error) {
      console.log(`   ❌ Erro ao adicionar ${nome}`);
      erros++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Variáveis adicionadas: ${sucessos}`);
  console.log(`   ❌ Erros: ${erros}`);
  
  if (erros > 0) {
    console.log('\n⚠️  Algumas variáveis falharam.');
    console.log('   Você pode adicioná-las manualmente no Vercel Dashboard.');
    console.log('   Veja: docs/INSTRUCOES_VERCEL_MANUAL.md\n');
  }
  
  // Passo 6: Fazer redeploy
  if (sucessos > 0) {
    console.log('\n🚀 Passo 6: Fazendo redeploy para aplicar mudanças...');
    try {
      console.log('   ⚠️  Isso pode levar ~2 minutos...');
      executar('vercel --prod --yes');
      console.log('\n🎉 Deploy concluído com sucesso!');
    } catch (error) {
      console.log('\n⚠️  Erro no deploy automático.');
      console.log('   Faça o deploy manualmente:');
      console.log('   vercel --prod --yes\n');
    }
  }
  
  // Passo 7: Testar
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ CONFIGURAÇÃO CONCLUÍDA!');
  console.log('\n📝 Próximos passos:');
  console.log('   1. Aguarde ~2 minutos para o deploy finalizar');
  console.log('   2. Teste o login em produção:');
  console.log('      npm run testar-login-producao-auto -- https://sisam-ssbv.vercel.app');
  console.log('   3. Se funcionar, está pronto! 🎉\n');
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  console.error('\nPara configurar manualmente, veja:');
  console.error('docs/INSTRUCOES_VERCEL_MANUAL.md\n');
  process.exit(1);
});

