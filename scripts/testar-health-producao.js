const https = require('https');

async function testarHealth() {
  const url = 'https://sisam-ssbv.vercel.app/api/health';
  
  console.log('🏥 Testando API de Health...\n');
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
          
          console.log('📊 RESULTADO DO HEALTH CHECK:\n');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.status === 'ok') {
            console.log('\n✅ SISTEMA SAUDÁVEL!');
          } else {
            console.log('\n❌ SISTEMA COM PROBLEMAS!');
            
            if (result.database_error) {
              console.log('\n🔴 ERRO NO BANCO DE DADOS:');
              console.log(`   Código: ${result.database_error.code}`);
              console.log(`   Mensagem: ${result.database_error.message}`);
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
testarHealth()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no teste:', error.message);
    process.exit(1);
  });

