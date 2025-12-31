const { execSync } = require('child_process');

console.log('🔧 Corrigindo Variáveis de Ambiente na Vercel\n');

// Valores corretos baseados no projeto Supabase atual
const projectRef = 'uosydcxfrbnhhasbyhqr';
const dbHostDireto = `db.${projectRef}.supabase.co`;
const dbHostPooler = `aws-0-us-east-1.pooler.supabase.com`; // Tentar esta região primeiro

console.log('📋 Valores que serão configurados:');
console.log(`   DB_HOST (direto): ${dbHostDireto}`);
console.log(`   DB_PORT: 5432 (conexão direta)`);
console.log(`   DB_NAME: postgres (corrigido de "sisam")`);
console.log(`   DB_USER: postgres`);
console.log(`   DB_PASSWORD: [mantido atual]`);
console.log(`   JWT_SECRET: [mantido atual]`);
console.log(`   NODE_ENV: production\n`);

console.log('⚠️  IMPORTANTE:');
console.log('   - DB_NAME será alterado de "sisam" para "postgres"');
console.log('   - Usando conexão direta primeiro (porta 5432)');
console.log('   - Se funcionar, podemos tentar o pooler depois\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function corrigir() {
  const confirmar = await question('Deseja continuar? (s/n): ');
  rl.close();
  
  if (confirmar.toLowerCase() !== 's' && confirmar.toLowerCase() !== 'sim') {
    console.log('\n❌ Correção cancelada.');
    return;
  }

  console.log('\n🚀 Corrigindo variáveis...\n');

  try {
    // Remover e reconfigurar DB_HOST
    console.log('   Corrigindo DB_HOST...');
    try {
      execSync(`vercel env rm DB_HOST production --yes`, { stdio: 'pipe' });
    } catch (e) {}
    
    const fs = require('fs');
    const tempFile = 'temp_db_host.txt';
    fs.writeFileSync(tempFile, dbHostDireto);
    execSync(`type ${tempFile} | vercel env add DB_HOST production`, { stdio: 'pipe', shell: true });
    fs.unlinkSync(tempFile);
    console.log('   ✅ DB_HOST atualizado');

    // Corrigir DB_PORT para 5432 (conexão direta)
    console.log('   Corrigindo DB_PORT...');
    try {
      execSync(`vercel env rm DB_PORT production --yes`, { stdio: 'pipe' });
    } catch (e) {}
    
    const tempPort = 'temp_db_port.txt';
    fs.writeFileSync(tempPort, '5432');
    execSync(`type ${tempPort} | vercel env add DB_PORT production`, { stdio: 'pipe', shell: true });
    fs.unlinkSync(tempPort);
    console.log('   ✅ DB_PORT atualizado');

    // Corrigir DB_NAME para postgres
    console.log('   Corrigindo DB_NAME...');
    try {
      execSync(`vercel env rm DB_NAME production --yes`, { stdio: 'pipe' });
    } catch (e) {}
    
    const tempName = 'temp_db_name.txt';
    fs.writeFileSync(tempName, 'postgres');
    execSync(`type ${tempName} | vercel env add DB_NAME production`, { stdio: 'pipe', shell: true });
    fs.unlinkSync(tempName);
    console.log('   ✅ DB_NAME atualizado (sisam → postgres)');

    // Corrigir DB_USER para postgres (sem o .project-ref para conexão direta)
    console.log('   Corrigindo DB_USER...');
    try {
      execSync(`vercel env rm DB_USER production --yes`, { stdio: 'pipe' });
    } catch (e) {}
    
    const tempUser = 'temp_db_user.txt';
    fs.writeFileSync(tempUser, 'postgres');
    execSync(`type ${tempUser} | vercel env add DB_USER production`, { stdio: 'pipe', shell: true });
    fs.unlinkSync(tempUser);
    console.log('   ✅ DB_USER atualizado');

    console.log('\n✅ Variáveis corrigidas!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Faça um redeploy: vercel --prod');
    console.log('   2. Verifique: https://sisam-ssbv-junielsonfarias.vercel.app/api/init');
    console.log('   3. Se funcionar, podemos tentar configurar o pooler depois\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.log('\n💡 Configure manualmente em:');
    console.log('   https://vercel.com/junielson-farias-projects/sisam-ssbv/settings/environment-variables\n');
  }
}

corrigir().catch(console.error);

