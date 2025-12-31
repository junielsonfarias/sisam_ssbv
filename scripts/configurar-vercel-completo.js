const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function executar(comando, mostrarOutput = true) {
  try {
    console.log(`\n🔄 ${comando}`);
    const resultado = execSync(comando, { 
      encoding: 'utf-8',
      stdio: mostrarOutput ? 'inherit' : 'pipe'
    });
    return { sucesso: true, resultado };
  } catch (error) {
    return { sucesso: false, erro: error.message };
  }
}

async function main() {
  console.log('🚀 Configuração Completa do Vercel\n');
  console.log('='.repeat(60));
  
  // Verificar Vercel CLI
  console.log('\n📦 Verificando Vercel CLI...');
  const versao = executar('vercel --version', false);
  if (!versao.sucesso) {
    console.log('❌ Vercel CLI não instalado!');
    console.log('Execute: npm install -g vercel');
    process.exit(1);
  }
  console.log('✅ Vercel CLI instalado');
  
  // Verificar login
  console.log('\n🔐 Verificando login...');
  const whoami = executar('vercel whoami', false);
  if (!whoami.sucesso) {
    console.log('❌ Você não está logado!');
    console.log('\n🔑 Fazendo login...');
    const login = executar('vercel login');
    if (!login.sucesso) {
      console.log('❌ Falha no login');
      process.exit(1);
    }
  }
  console.log('✅ Logado no Vercel');
  
  // Verificar se já está linkado
  const vercelDir = path.join(process.cwd(), '.vercel');
  const projectFile = path.join(vercelDir, 'project.json');
  
  if (fs.existsSync(projectFile)) {
    console.log('\n✅ Projeto já está linkado');
    const projectData = JSON.parse(fs.readFileSync(projectFile, 'utf-8'));
    console.log(`   Projeto: ${projectData.projectId}`);
    console.log(`   Org: ${projectData.orgId}`);
  } else {
    console.log('\n🔗 Projeto não está linkado');
    console.log('\n📝 Vamos linkar ao projeto existente no Vercel');
    console.log('   Quando perguntado:');
    console.log('   1. "Set up and deploy?" → Digite: N');
    console.log('   2. "Link to existing project?" → Digite: Y');
    console.log('   3. "What\'s your project\'s name?" → Digite: sisam-ssbv');
    console.log('\n⚠️  Pressione ENTER para continuar...');
    await pergunta('');
    
    // Linkar projeto interativamente
    console.log('\n🔗 Linkando projeto...\n');
    try {
      execSync('vercel link', { stdio: 'inherit' });
      console.log('\n✅ Projeto linkado com sucesso!');
    } catch (error) {
      console.log('\n❌ Erro ao linkar projeto');
      console.log('Tente manualmente: vercel link');
      process.exit(1);
    }
  }
  
  // Perguntar se quer continuar
  console.log('\n' + '='.repeat(60));
  const continuar = await pergunta('\n❓ Deseja atualizar as variáveis de ambiente agora? (S/n): ');
  if (continuar.toLowerCase() === 'n') {
    console.log('\n👋 Configuração cancelada');
    rl.close();
    process.exit(0);
  }
  
  // Listar variáveis atuais
  console.log('\n📋 Variáveis atuais em Production:');
  executar('vercel env ls production');
  
  // Perguntar confirmação
  console.log('\n' + '='.repeat(60));
  const confirmar = await pergunta('\n❓ Remover variáveis antigas e adicionar corretas? (S/n): ');
  if (confirmar.toLowerCase() === 'n') {
    console.log('\n👋 Atualização cancelada');
    rl.close();
    process.exit(0);
  }
  
  // Remover variáveis antigas
  console.log('\n🗑️  Removendo variáveis antigas...');
  const variaveisAntigas = [
    'USUARIO_DO_BANCO_DE_DADOS',
    'NOME_DO_BANCO_DE_DADOS',
    'SENHA_DO_BANCO_DE_DADOS'
  ];
  
  for (const variavel of variaveisAntigas) {
    console.log(`   Removendo ${variavel}...`);
    executar(`vercel env rm ${variavel} production --yes`, false);
  }
  
  // Adicionar variáveis corretas
  console.log('\n➕ Adicionando variáveis corretas...');
  console.log('   (Você precisará digitar os valores quando solicitado)\n');
  
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
  
  let sucessos = 0;
  let erros = 0;
  
  for (const [nome, valor] of Object.entries(variaveis)) {
    console.log(`\n📝 Adicionando: ${nome}`);
    console.log(`   Valor: ${['DB_PASSWORD', 'JWT_SECRET'].includes(nome) ? '***' : valor}`);
    
    // Remover se já existir
    executar(`vercel env rm ${nome} production --yes`, false);
    
    // Adicionar usando spawn para poder enviar input
    try {
      const proc = spawn('vercel', ['env', 'add', nome, 'production'], {
        stdio: ['pipe', 'inherit', 'inherit']
      });
      
      // Enviar o valor
      proc.stdin.write(valor + '\n');
      proc.stdin.end();
      
      await new Promise((resolve, reject) => {
        proc.on('close', (code) => {
          if (code === 0) {
            console.log(`   ✅ ${nome} adicionada`);
            sucessos++;
            resolve();
          } else {
            console.log(`   ❌ Erro ao adicionar ${nome}`);
            erros++;
            resolve();
          }
        });
        proc.on('error', reject);
      });
    } catch (error) {
      console.log(`   ❌ Erro ao adicionar ${nome}: ${error.message}`);
      erros++;
    }
  }
  
  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumo:');
  console.log(`   ✅ Variáveis adicionadas: ${sucessos}/8`);
  console.log(`   ❌ Erros: ${erros}/8`);
  
  if (erros > 0) {
    console.log('\n⚠️  Algumas variáveis falharam.');
    console.log('   Você pode adicioná-las manualmente no Dashboard:');
    console.log('   https://vercel.com/dashboard → sisam-ssbv → Settings → Environment Variables');
  }
  
  // Fazer redeploy
  if (sucessos > 0) {
    console.log('\n' + '='.repeat(60));
    const redeploy = await pergunta('\n❓ Fazer redeploy agora? (S/n): ');
    if (redeploy.toLowerCase() !== 'n') {
      console.log('\n🚀 Fazendo redeploy...');
      console.log('   (Isso pode levar ~2 minutos)');
      const deploy = executar('vercel --prod --yes');
      if (deploy.sucesso) {
        console.log('\n🎉 Deploy concluído!');
      } else {
        console.log('\n⚠️  Erro no deploy. Execute manualmente:');
        console.log('   vercel --prod --yes');
      }
    }
  }
  
  // Instruções finais
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ CONFIGURAÇÃO CONCLUÍDA!\n');
  console.log('📝 Próximos passos:');
  console.log('   1. Aguarde ~2 minutos (se fez redeploy)');
  console.log('   2. Teste o login:');
  console.log('      npm run testar-login-producao-auto -- https://sisam-ssbv.vercel.app');
  console.log('   3. Se funcionar, está pronto! 🎉\n');
  
  rl.close();
}

main().catch(error => {
  console.error('\n❌ Erro:', error.message);
  rl.close();
  process.exit(1);
});

