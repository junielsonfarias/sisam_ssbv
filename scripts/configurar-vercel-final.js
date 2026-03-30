const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando Vercel automaticamente...\n');
console.log('='.repeat(60));

// IMPORTANTE: Preencha com seus valores reais via variáveis de ambiente ou edite antes de executar
// NUNCA commite credenciais reais neste arquivo
const variaveis = {
  'DB_HOST': process.env.DB_HOST || 'PREENCHA_DB_HOST',
  'DB_PORT': process.env.DB_PORT || '5432',
  'DB_NAME': process.env.DB_NAME || 'postgres',
  'DB_USER': process.env.DB_USER || 'PREENCHA_DB_USER',
  'DB_PASSWORD': process.env.DB_PASSWORD || 'PREENCHA_DB_PASSWORD',
  'DB_SSL': 'true',
  'JWT_SECRET': process.env.JWT_SECRET || 'PREENCHA_JWT_SECRET',
  'NODE_ENV': 'production'
};

// Validar que nenhuma variável tem placeholder
const placeholders = Object.entries(variaveis).filter(([, v]) => v.startsWith('PREENCHA_'));
if (placeholders.length > 0) {
  console.error('❌ Configure as variáveis de ambiente antes de executar:');
  placeholders.forEach(([k]) => console.error(`   ${k}`));
  console.error('\n   Exemplo: DB_HOST=seu-host DB_PASSWORD=sua-senha node scripts/configurar-vercel-final.js');
  process.exit(1);
}

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
      console.log(`   ⚠️  Erro (ignorando)`);
    }
    return false;
  }
}

function adicionarVariavel(nome, valor) {
  return new Promise((resolve) => {
    // Remover se já existir
    executar(`vercel env rm ${nome} production --yes`, true);
    
    // Usar spawn para poder enviar o valor via stdin
    const proc = spawn('vercel', ['env', 'add', nome, 'production'], {
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true
    });
    
    // Enviar o valor
    proc.stdin.write(valor + '\n');
    proc.stdin.end();
    
    proc.on('close', (code) => {
      resolve(code === 0);
    });
    
    proc.on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  // 1. Verificar Vercel CLI
  console.log('\n📦 Verificando Vercel CLI...');
  try {
    const versao = execSync('vercel --version', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ ${versao}`);
  } catch (error) {
    console.log('   ❌ Vercel CLI não instalado!');
    process.exit(1);
  }
  
  // 2. Verificar login
  console.log('\n🔐 Verificando login...');
  try {
    const usuario = execSync('vercel whoami', { encoding: 'utf-8' }).trim();
    console.log(`   ✅ Logado como: ${usuario}`);
  } catch (error) {
    console.log('   ❌ Não está logado! Execute: vercel login');
    process.exit(1);
  }
  
  // 3. Criar/verificar link do projeto
  console.log('\n🔗 Configurando link do projeto...');
  const vercelDir = path.join(process.cwd(), '.vercel');
  
  // Criar diretório .vercel se não existir
  if (!fs.existsSync(vercelDir)) {
    fs.mkdirSync(vercelDir, { recursive: true });
  }
  
  // Tentar obter informações do projeto via API do Vercel
  // Como alternativa, vamos usar o nome do projeto diretamente
  console.log('   Usando projeto: sisam-ssbv');
  
  // 4. Remover variáveis antigas
  console.log('\n🗑️  Removendo variáveis antigas...');
  for (const variavel of variaveisAntigas) {
    executar(`vercel env rm ${variavel} production --yes`, true);
  }
  console.log('   ✅ Variáveis antigas removidas (se existiam)');
  
  // 5. Adicionar variáveis corretas usando --scope e --project
  console.log('\n➕ Adicionando variáveis corretas...');
  console.log('   (Isso pode levar alguns minutos)\n');
  
  let sucessos = 0;
  let erros = 0;
  
  // Primeiro, tentar obter o projectId
  let projectId = null;
  try {
    // Listar projetos para encontrar o ID
    const projetos = execSync('vercel ls --json', { encoding: 'utf-8' });
    const lista = JSON.parse(projetos);
    const projeto = lista.find(p => p.name === 'sisam-ssbv');
    if (projeto) {
      projectId = projeto.id;
      console.log(`   ✅ Projeto encontrado: ${projectId}`);
    }
  } catch (error) {
    console.log('   ⚠️  Não foi possível obter projectId automaticamente');
  }
  
  for (const [nome, valor] of Object.entries(variaveis)) {
    process.stdout.write(`   Adicionando ${nome}... `);
    
    // Tentar adicionar com projectId se disponível
    let sucesso = false;
    if (projectId) {
      try {
        executar(`vercel env rm ${nome} production --yes`, true);
        const proc = spawn('vercel', ['env', 'add', nome, 'production', '--project', projectId], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });
        
        proc.stdin.write(valor + '\n');
        proc.stdin.end();
        
        await new Promise((resolve) => {
          proc.on('close', (code) => {
            sucesso = code === 0;
            resolve();
          });
        });
      } catch (error) {
        sucesso = false;
      }
    }
    
    // Se falhou com projectId, tentar método normal
    if (!sucesso) {
      sucesso = await adicionarVariavel(nome, valor);
    }
    
    if (sucesso) {
      console.log('✅');
      sucessos++;
    } else {
      console.log('❌');
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
    console.log('   Adicione manualmente no Dashboard do Vercel:');
    console.log('   https://vercel.com/dashboard → sisam-ssbv → Settings → Environment Variables');
    console.log('\n   Ou execute os comandos manualmente:');
    console.log('   vercel env add DB_HOST production');
    console.log('   (Quando pedir, cole o valor correspondente)');
  }
  
  // 7. Listar variáveis
  if (sucessos > 0) {
    console.log('\n📋 Variáveis configuradas em Production:');
    try {
      execSync('vercel env ls production', { stdio: 'inherit' });
    } catch (error) {
      console.log('   ⚠️  Erro ao listar variáveis');
    }
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
  
  if (erros === 8) {
    console.log('⚠️  NENHUMA variável foi adicionada automaticamente.');
    console.log('\n📝 SOLUÇÃO: Configure manualmente no Dashboard:');
    console.log('   1. Acesse: https://vercel.com/dashboard');
    console.log('   2. Clique no projeto: sisam-ssbv');
    console.log('   3. Vá em: Settings → Environment Variables');
    console.log('   4. Adicione as 8 variáveis conforme:');
    console.log('      docs/CORRIGIR_VARIAVEIS_VERCEL_DASHBOARD.md');
  } else {
    console.log('📝 Próximos passos:');
    console.log('   1. Aguarde ~2 minutos para o deploy finalizar');
    console.log('   2. Teste o login:');
    console.log('      npm run testar-login-producao-auto -- https://sisam-ssbv.vercel.app');
    console.log('   3. Se funcionar, está pronto! 🎉');
  }
  console.log('');
}

main().catch(error => {
  console.error('\n❌ Erro:', error.message);
  process.exit(1);
});

