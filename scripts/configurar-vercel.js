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

async function configurarVercel() {
  console.log('🔧 Configuração de Variáveis de Ambiente na Vercel\n');
  console.log('Este script irá configurar as variáveis de ambiente necessárias para o SISAM na Vercel.\n');

  // Informações do projeto atual
  console.log('📋 Informações do Projeto Supabase:');
  console.log('   Project URL: https://uosydcxfrbnhhasbyhqr.supabase.co');
  console.log('   Project REF: uosydcxfrbnhhasbyhqr\n');

  // Solicitar informações
  console.log('Por favor, forneça as seguintes informações:\n');

  const dbHost = await question('DB_HOST (hostname do Connection Pooler, ex: aws-0-us-east-1.pooler.supabase.com): ');
  const dbPort = await question('DB_PORT (6543 para pooler ou 5432 para direto) [6543]: ') || '6543';
  const dbName = await question('DB_NAME [postgres]: ') || 'postgres';
  const dbUser = await question(`DB_USER (ex: postgres.uosydcxfrbnhhasbyhqr para pooler ou postgres para direto): `);
  const dbPassword = await question('DB_PASSWORD (senha do Supabase): ');
  
  // Gerar JWT_SECRET se não fornecido
  const jwtSecret = await question('JWT_SECRET (pressione Enter para gerar automaticamente): ');
  const finalJwtSecret = jwtSecret || crypto.randomBytes(32).toString('hex');

  console.log('\n📝 Variáveis que serão configuradas:');
  console.log(`   DB_HOST=${dbHost}`);
  console.log(`   DB_PORT=${dbPort}`);
  console.log(`   DB_NAME=${dbName}`);
  console.log(`   DB_USER=${dbUser}`);
  console.log(`   DB_PASSWORD=*** (oculto)`);
  console.log(`   JWT_SECRET=${finalJwtSecret.substring(0, 20)}...`);
  console.log(`   NODE_ENV=production\n`);

  const confirmar = await question('Deseja continuar? (s/n): ');
  
  if (confirmar.toLowerCase() !== 's' && confirmar.toLowerCase() !== 'sim') {
    console.log('\n❌ Configuração cancelada.');
    rl.close();
    return;
  }

  console.log('\n🚀 Configurando variáveis na Vercel...\n');

  try {
    // Configurar cada variável
    const variaveis = [
      { key: 'DB_HOST', value: dbHost },
      { key: 'DB_PORT', value: dbPort },
      { key: 'DB_NAME', value: dbName },
      { key: 'DB_USER', value: dbUser },
      { key: 'DB_PASSWORD', value: dbPassword },
      { key: 'JWT_SECRET', value: finalJwtSecret },
      { key: 'NODE_ENV', value: 'production' }
    ];

    for (const variavel of variaveis) {
      console.log(`   Configurando ${variavel.key}...`);
      try {
        execSync(
          `vercel env add ${variavel.key} production <<< "${variavel.value}"`,
          { stdio: 'pipe', encoding: 'utf8' }
        );
        console.log(`   ✅ ${variavel.key} configurado`);
      } catch (error) {
        // Tentar método alternativo
        try {
          execSync(
            `echo "${variavel.value}" | vercel env add ${variavel.key} production`,
            { stdio: 'pipe', encoding: 'utf8' }
          );
          console.log(`   ✅ ${variavel.key} configurado`);
        } catch (error2) {
          console.log(`   ⚠️  Erro ao configurar ${variavel.key}. Configure manualmente na Vercel.`);
          console.log(`      Comando: vercel env add ${variavel.key} production`);
        }
      }
    }

    console.log('\n✅ Variáveis configuradas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Faça um redeploy na Vercel: vercel --prod');
    console.log('   2. Verifique o status: https://sisam-ssbv-junielsonfarias.vercel.app/api/init');
    console.log('   3. Teste o login: https://sisam-ssbv-junielsonfarias.vercel.app/login');
    console.log('      (use as credenciais padrão do sistema)\n');

  } catch (error) {
    console.error('\n❌ Erro ao configurar variáveis:', error.message);
    console.log('\n💡 Dica: Configure manualmente na Vercel:');
    console.log('   1. Acesse: https://vercel.com/junielson-farias-projects/sisam-ssbv/settings/environment-variables');
    console.log('   2. Adicione cada variável marcando para "Production"');
  }

  rl.close();
}

configurarVercel().catch(console.error);

