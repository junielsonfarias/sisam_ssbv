const https = require('https');

async function testarDNS() {
  const url = 'https://sisam-ssbv.vercel.app/api/test-dns';
  
  console.log('🔍 Testando resolução DNS em produção...\n');
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
          
          console.log('📊 RESULTADO DO TESTE DE DNS:\n');
          console.log(`Timestamp: ${result.timestamp}`);
          console.log(`Environment: ${result.environment}`);
          console.log(`Platform: ${result.platform}`);
          console.log(`Node Version: ${result.nodeVersion}\n`);
          
          console.log('─'.repeat(70));
          
          result.tests.forEach((test, index) => {
            console.log(`\n${index + 1}. Host: ${test.host}`);
            
            if (test.success) {
              console.log('   Status: ✅ Resolveu');
              
              if (Array.isArray(test.ipv4) && test.ipv4.length > 0) {
                console.log(`   IPv4: ${test.ipv4.join(', ')}`);
              } else if (test.ipv4 === 'not found') {
                console.log('   IPv4: ❌ Não encontrado');
              }
              
              if (Array.isArray(test.ipv6) && test.ipv6.length > 0) {
                console.log(`   IPv6: ${test.ipv6.join(', ')}`);
              } else if (test.ipv6 === 'not found') {
                console.log('   IPv6: ❌ Não encontrado');
              }
              
              if (Array.isArray(test.all) && test.all.length > 0) {
                console.log(`   Todos: ${test.all.join(', ')}`);
              }
            } else {
              console.log('   Status: ❌ Falhou');
              console.log(`   Erro: ${test.error}`);
              if (test.code) {
                console.log(`   Código: ${test.code}`);
              }
            }
          });
          
          console.log('\n' + '─'.repeat(70));
          
          // Análise
          const supabaseTest = result.tests.find(t => t.host.includes('cjxejpgtuuqnbczpbdfe'));
          
          if (supabaseTest) {
            console.log('\n📋 ANÁLISE DO HOST SUPABASE:\n');
            
            if (!supabaseTest.success) {
              console.log('❌ O Vercel NÃO consegue resolver o DNS do Supabase!');
              console.log('\n🔴 PROBLEMA CRÍTICO:');
              console.log('   O ambiente Vercel não consegue fazer lookup DNS deste host.');
              console.log('\n💡 SOLUÇÕES POSSÍVEIS:');
              console.log('   1. Usar outro provedor de banco (Vercel Postgres, Neon, etc)');
              console.log('   2. Usar um proxy/tunnel para acessar o Supabase');
              console.log('   3. Contatar suporte do Vercel sobre problemas de DNS');
              console.log('   4. Migrar para outro host (Netlify, Railway, Render)');
            } else {
              const temIPv4 = Array.isArray(supabaseTest.ipv4) && supabaseTest.ipv4.length > 0;
              const temIPv6 = Array.isArray(supabaseTest.ipv6) && supabaseTest.ipv6.length > 0;
              
              if (temIPv4) {
                console.log('✅ O Vercel consegue resolver para IPv4!');
                console.log(`   IP: ${supabaseTest.ipv4.join(', ')}`);
                console.log('\n💚 ISSO DEVE FUNCIONAR!');
              } else if (temIPv6) {
                console.log('⚠️  O Vercel só consegue resolver para IPv6!');
                console.log(`   IP: ${supabaseTest.ipv6.join(', ')}`);
                console.log('\n⚠️  O Vercel pode ter problemas com IPv6-only.');
              } else {
                console.log('❓ Resolução DNS estranha - verificar manualmente.');
              }
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
testarDNS()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro no teste:', error.message);
    process.exit(1);
  });

