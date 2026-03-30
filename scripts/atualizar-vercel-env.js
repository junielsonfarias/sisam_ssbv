const { execSync } = require('child_process');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function atualizarVercelEnv() {
  console.log('🔧 Atualização de Variáveis de Ambiente na Vercel\n');
  console.log('Este script irá atualizar as variáveis de ambiente com os valores corretos do Supabase.\n');

  // Informações do projeto Supabase atual
  const projectRef = 'uosydcxfrbnhhasbyhqr';
  
  console.log('📋 Informações do Projeto Supabase:');
  console.log(`   Project REF: ${projectRef}`);
  console.log(`   Direct Host: db.${projectRef}.supabase.co`);
  console.log(`   Pooler Host: aws-0-[REGION].pooler.supabase.com (você precisa descobrir a região)\n`);

  console.log('Por favor, forneça as seguintes informações:\n');

  const usarPooler = await question('Usar Connection Pooler? (s/n) [s]: ') || 's';
  
  let dbHost, dbPort, dbUser;
  
  if (usarPooler.toLowerCase() === 's' || usarPooler.toLowerCase() === 'sim') {
    const regiao = await question('Região do Supabase (ex: us-east-1, sa-east-1) [us-east-1]: ') || 'us-east-1';
    dbHost = `aws-0-${regiao}.pooler.supabase.com`;
    dbPort = '6543';
    dbUser = `postgres.${projectRef}`;
    console.log(`\n✅ Configuração do Pooler:`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   Port: ${dbPort}`);
    console.log(`   User: ${dbUser}\n`);
  } else {
    dbHost = `db.${projectRef}.supabase.co`;
    dbPort = '5432';
    dbUser = 'postgres';
    console.log(`\n✅ Configuração Direta:`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   Port: ${dbPort}`);
    console.log(`   User: ${dbUser}\n`);
  }

  const dbName = await question('DB_NAME [postgres]: ') || 'postgres';
  const dbPassword = await question('DB_PASSWORD (senha do Supabase): ');
  
  // Gerar JWT_SECRET se necessário
  const gerarJwt = await question('Gerar novo JWT_SECRET? (s/n) [n]: ') || 'n';
  let jwtSecret;
  
  if (gerarJwt.toLowerCase() === 's' || gerarJwt.toLowerCase() === 'sim') {
    jwtSecret = crypto.randomBytes(32).toString('hex');
    console.log(`\n✅ Novo JWT_SECRET gerado: ${jwtSecret.substring(0, 20)}...\n`);
  } else {
    jwtSecret = await question('JWT_SECRET (pressione Enter para manter o atual): ') || null;
  }

  console.log('\n📝 Variáveis que serão atualizadas:');
  console.log(`   DB_HOST=${dbHost}`);
  console.log(`   DB_PORT=${dbPort}`);
  console.log(`   DB_NAME=${dbName}`);
  console.log(`   DB_USER=${dbUser}`);
  console.log(`   DB_PASSWORD=*** (oculto)`);
  if (jwtSecret) {
    console.log(`   JWT_SECRET=${jwtSecret.substring(0, 20)}...`);
  } else {
    console.log(`   JWT_SECRET=(mantido atual)`);
  }
  console.log(`   NODE_ENV=production\n`);

  const confirmar = await question('Deseja continuar? (s/n): ');
  
  if (confirmar.toLowerCase() !== 's' && confirmar.toLowerCase() !== 'sim') {
    console.log('\n❌ Atualização cancelada.');
    rl.close();
    return;
  }

  console.log('\n🚀 Atualizando variáveis na Vercel...\n');

  try {
    // Remover variáveis antigas e adicionar novas
    const variaveis = [
      { key: 'DB_HOST', value: dbHost },
      { key: 'DB_PORT', value: dbPort },
      { key: 'DB_NAME', value: dbName },
      { key: 'DB_USER', value: dbUser },
      { key: 'DB_PASSWORD', value: dbPassword }
    ];

    if (jwtSecret) {
      variaveis.push({ key: 'JWT_SECRET', value: jwtSecret });
    }

    variaveis.push({ key: 'NODE_ENV', value: 'production' });

    for (const variavel of variaveis) {
      console.log(`   Atualizando ${variavel.key}...`);
      try {
        // Remover variável antiga de todos os ambientes
        try {
          execSync(`vercel env rm ${variavel.key} production --yes`, { stdio: 'pipe' });
        } catch (e) {
          // Ignorar se não existir
        }
        
        // Adicionar nova variável
        // Usar método alternativo com arquivo temporário
        const fs = require('fs');
        const tempFile = `temp_${variavel.key}.txt`;
        fs.writeFileSync(tempFile, variavel.value);
        
        try {
          execSync(
            `type ${tempFile} | vercel env add ${variavel.key} production`,
            { stdio: 'pipe', shell: true }
          );
          console.log(`   ✅ ${variavel.key} atualizado`);
        } catch (error) {
          console.log(`   ⚠️  Erro ao atualizar ${variavel.key}. Configure manualmente.`);
          console.log(`      Valor: ${variavel.key === 'DB_PASSWORD' ? '***' : variavel.value}`);
        }
        
        fs.unlinkSync(tempFile);
      } catch (error) {
        console.log(`   ⚠️  Erro ao atualizar ${variavel.key}: ${error.message}`);
      }
    }

    console.log('\n✅ Variáveis atualizadas!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Faça um redeploy: vercel --prod');
    console.log('   2. Verifique: https://sisam-ssbv-junielsonfarias.vercel.app/api/init');
    console.log('   3. Teste login: https://sisam-ssbv-junielsonfarias.vercel.app/login');
    console.log('      (use as credenciais padrão do sistema)\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.log('\n💡 Configure manualmente em:');
    console.log('   https://vercel.com/junielson-farias-projects/sisam-ssbv/settings/environment-variables\n');
  }

  rl.close();
}

atualizarVercelEnv().catch(console.error);

