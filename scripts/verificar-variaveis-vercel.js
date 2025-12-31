const https = require('https');

async function verificarVariaveisVercel() {
  const url = 'https://sisam-ssbv.vercel.app/api/debug-env';
  
  console.log('🔍 Verificando variáveis de ambiente em produção...\n');
  console.log(`URL: ${url}\n`);

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log('📊 RESULTADO DA VERIFICAÇÃO:\n');
          console.log(`Timestamp: ${result.timestamp}`);
          console.log(`Node ENV: ${result.nodeEnv}\n`);
          
          console.log('🔐 VARIÁVEIS DE AMBIENTE:');
          console.log('─'.repeat(60));
          
          for (const [key, info] of Object.entries(result.variables)) {
            const status = info.exists && (info.value !== 'VAZIO' || info.hasValue) ? '✅' : '❌';
            console.log(`${status} ${key}:`);
            
            if (info.raw) {
              console.log(`   Raw: ${info.raw}`);
            }
            if (info.value && info.value !== 'VAZIO') {
              console.log(`   Valor: ${info.value}`);
            }
            if (info.length !== undefined) {
              console.log(`   Tamanho: ${info.length} caracteres`);
            }
            if (info.hasValue !== undefined) {
              console.log(`   Tem valor: ${info.hasValue ? 'Sim' : 'Não'}`);
            }
            console.log('');
          }
          
          console.log('─'.repeat(60));
          console.log('\n📋 TODAS AS CHAVES DE ENV DISPONÍVEIS:');
          console.log(result.allEnvKeys.join(', '));
          
          // Verificar se todas as variáveis necessárias existem
          const necessarias = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
          const faltando = necessarias.filter(key => {
            const varInfo = result.variables[key];
            return !varInfo || !varInfo.exists || varInfo.value === 'VAZIO';
          });
          
          if (faltando.length > 0) {
            console.log('\n⚠️  VARIÁVEIS FALTANDO OU VAZIAS:');
            faltando.forEach(key => console.log(`   - ${key}`));
            console.log('\n📝 AÇÃO NECESSÁRIA:');
            console.log('   1. Vá para: https://vercel.com/junielsonfarias/sisam-ssbv/settings/environment-variables');
            console.log('   2. Verifique se cada variável está configurada EXATAMENTE como abaixo:');
            console.log('');
            console.log('   DB_HOST=db.cjxejpgtuuqnbczpbdfe.supabase.co');
            console.log('   DB_PORT=5432');
            console.log('   DB_NAME=postgres');
            console.log('   DB_USER=postgres');
            console.log('   DB_PASSWORD=Master@sisam&&');
            console.log('   DB_SSL=true');
            console.log('   JWT_SECRET=sisam2024_producao_jwt_secret_key_super_secure_random_string_2024');
            console.log('   NODE_ENV=production');
            console.log('');
            console.log('   3. Certifique-se de que TODAS estão marcadas para "Production"');
            console.log('   4. Após corrigir, faça Redeploy');
          } else {
            console.log('\n✅ TODAS AS VARIÁVEIS NECESSÁRIAS ESTÃO CONFIGURADAS!');
            
            // Verificar se os valores parecem corretos
            if (result.variables.DB_HOST.raw && !result.variables.DB_HOST.raw.includes('supabase.co')) {
              console.log('\n⚠️  ATENÇÃO: DB_HOST não parece ser um host Supabase válido!');
              console.log(`   Valor atual: ${result.variables.DB_HOST.raw}`);
              console.log(`   Valor esperado: db.cjxejpgtuuqnbczpbdfe.supabase.co`);
            }
          }
          
          resolve(result);
        } catch (error) {
          console.error('❌ Erro ao parsear resposta:', error.message);
          console.log('Resposta recebida:', data);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Erro ao fazer requisição:', error.message);
      reject(error);
    });
  });
}

// Executar
verificarVariaveisVercel()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na verificação:', error.message);
    process.exit(1);
  });

