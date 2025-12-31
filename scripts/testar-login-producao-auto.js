const https = require('https');
const http = require('http');

// URL padrão do Vercel
const URL_PRODUCAO = process.argv[2] || 'https://sisam-ssbv-junielsonfarias.vercel.app';

// Função para fazer requisição HTTP/HTTPS
function fazerRequisicao(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 15000, // 15 segundos
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout: A requisição demorou mais de 15 segundos'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testarProducao() {
  console.log('🔍 Testando login em produção...\n');
  console.log(`🌐 URL: ${URL_PRODUCAO}\n`);
  console.log('='.repeat(60));
  
  let resultados = {
    apiOnline: false,
    bancoConectado: false,
    personalizacaoOk: false,
    loginOk: false,
    erros: []
  };
  
  // Teste 1: Health Check
  console.log('\n📡 Teste 1: Verificando se a API está online...');
  try {
    const healthResponse = await fazerRequisicao(`${URL_PRODUCAO}/api/health`);
    console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.status === 200) {
      console.log('   ✅ API está online');
      resultados.apiOnline = true;
      
      if (healthResponse.data) {
        console.log('\n   📊 Detalhes do Health Check:');
        
        if (healthResponse.data.checks?.database === 'ok') {
          console.log('   ✅ Conexão com banco de dados: OK');
          resultados.bancoConectado = true;
        } else if (healthResponse.data.checks?.database === 'error') {
          console.log('   ❌ Conexão com banco de dados: ERRO');
          if (healthResponse.data.database_error) {
            const erro = `${healthResponse.data.database_error.code}: ${healthResponse.data.database_error.message}`;
            console.log('   Erro:', erro);
            resultados.erros.push(erro);
          }
        }
        
        if (healthResponse.data.checks?.jwt === 'ok') {
          console.log('   ✅ JWT_SECRET configurado');
        } else {
          console.log('   ⚠️  JWT_SECRET não configurado ou inválido');
        }
        
        if (healthResponse.data.config) {
          console.log('\n   📋 Variáveis de Ambiente:');
          Object.entries(healthResponse.data.config).forEach(([key, value]) => {
            console.log(`   - ${key}: ${value ? '✅ Configurado' : '❌ Não configurado'}`);
          });
        }
      }
    } else if (healthResponse.status === 404) {
      console.log('   ⚠️  Rota /api/health não encontrada');
      console.log('   Isso é normal se a rota não existir, mas a API pode estar online');
      resultados.apiOnline = true; // Considerar como online mesmo assim
    } else {
      console.log(`   ⚠️  API respondeu com status ${healthResponse.status}`);
      resultados.erros.push(`Health check retornou ${healthResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    resultados.erros.push(`Health check falhou: ${error.message}`);
    console.log('   A API pode não estar acessível ou a URL está incorreta.');
  }
  
  // Teste 2: Personalização
  console.log('\n📷 Teste 2: Verificando personalização (leitura do banco)...');
  try {
    const personalizacaoResponse = await fazerRequisicao(`${URL_PRODUCAO}/api/admin/personalizacao`);
    console.log(`   Status: ${personalizacaoResponse.status} ${personalizacaoResponse.statusText}`);
    
    if (personalizacaoResponse.status === 200) {
      console.log('   ✅ API de personalização funcionando');
      resultados.personalizacaoOk = true;
      
      if (personalizacaoResponse.data) {
        console.log('\n   Configuração encontrada:');
        console.log('   - Título:', personalizacaoResponse.data.login_titulo || 'Padrão');
        console.log('   - Subtítulo:', personalizacaoResponse.data.login_subtitulo || 'Padrão');
        
        if (personalizacaoResponse.data.login_imagem_url) {
          const tamanho = personalizacaoResponse.data.login_imagem_url.length;
          console.log('   - Logo:', tamanho > 100 ? 
            `Base64 (${(tamanho / 1024).toFixed(0)} KB)` : 
            personalizacaoResponse.data.login_imagem_url);
        } else {
          console.log('   - Logo: Não configurada');
        }
        
        console.log('\n   ✅ Banco de dados está acessível e retornando dados');
        resultados.bancoConectado = true;
      }
    } else {
      console.log(`   ⚠️  API respondeu com status ${personalizacaoResponse.status}`);
      if (personalizacaoResponse.data) {
        const erro = JSON.stringify(personalizacaoResponse.data);
        console.log('   Erro:', erro);
        resultados.erros.push(`Personalização: ${erro}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    resultados.erros.push(`Personalização falhou: ${error.message}`);
  }
  
  // Teste 3: Login
  console.log('\n🔐 Teste 3: Testando login com credenciais...');
  console.log('   Email: admin@sisam.com');
  console.log('   Senha: admin123');
  
  try {
    const loginResponse = await fazerRequisicao(`${URL_PRODUCAO}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        email: 'admin@sisam.com',
        senha: 'admin123'
      }
    });
    
    console.log(`\n   Status: ${loginResponse.status} ${loginResponse.statusText}`);
    
    if (loginResponse.status === 200) {
      console.log('   ✅✅✅ LOGIN BEM-SUCEDIDO! ✅✅✅');
      resultados.loginOk = true;
      
      if (loginResponse.data && loginResponse.data.usuario) {
        console.log('\n   👤 Dados do usuário:');
        console.log('   - ID:', loginResponse.data.usuario.id);
        console.log('   - Nome:', loginResponse.data.usuario.nome);
        console.log('   - Email:', loginResponse.data.usuario.email);
        console.log('   - Tipo:', loginResponse.data.usuario.tipo_usuario);
        console.log('   - Ativo:', loginResponse.data.usuario.ativo ? 'Sim' : 'Não');
        
        if (loginResponse.data.token) {
          console.log('\n   🔑 Token JWT gerado com sucesso');
          console.log('   Token:', loginResponse.data.token.substring(0, 50) + '...');
        }
      }
    } else {
      console.log('   ❌ LOGIN FALHOU!');
      
      if (loginResponse.data) {
        console.log('\n   ⚠️  Erro retornado:');
        console.log('   - Mensagem:', loginResponse.data.mensagem || 'Não especificado');
        if (loginResponse.data.erro) {
          console.log('   - Código:', loginResponse.data.erro);
          resultados.erros.push(`Login: ${loginResponse.data.erro}`);
        }
        if (loginResponse.data.detalhes) {
          console.log('   - Detalhes:', loginResponse.data.detalhes);
          resultados.erros.push(`Login detalhes: ${loginResponse.data.detalhes}`);
        }
        
        // Análise do erro
        console.log('\n   📊 Análise do erro:');
        const codigoErro = loginResponse.data.erro || '';
        
        if (['DB_ERROR', 'DB_CONNECTION_REFUSED', 'DB_HOST_NOT_FOUND', 'DB_NETWORK_ERROR', 'DB_AUTH_ERROR'].includes(codigoErro)) {
          console.log('   🔴 PROBLEMA DE CONEXÃO COM O BANCO DE DADOS');
          console.log('\n   Possíveis causas:');
          console.log('   1. Variáveis de ambiente não configuradas no Vercel');
          console.log('   2. DB_HOST incorreto');
          console.log('   3. DB_USER ou DB_PASSWORD incorretos');
          console.log('   4. Banco de dados pausado no Supabase');
          console.log('\n   ✅ Soluções:');
          console.log('   - Configure as variáveis no Vercel Dashboard');
          console.log('   - Veja: docs/INSTRUCOES_VERCEL_MANUAL.md');
        } else if (loginResponse.data.mensagem?.includes('Email ou senha inválidos')) {
          console.log('   🟡 CREDENCIAIS INCORRETAS');
          console.log('   ✅ MAS a conexão com o banco está funcionando!');
          resultados.bancoConectado = true;
          console.log('\n   Solução:');
          console.log('   Execute: npm run seed-supabase');
        } else if (codigoErro === 'JWT_NOT_CONFIGURED') {
          console.log('   🔴 JWT_SECRET NÃO CONFIGURADO');
          console.log('\n   Solução:');
          console.log('   Adicione a variável JWT_SECRET no Vercel');
        }
      } else if (loginResponse.rawData) {
        console.log('\n   Resposta não-JSON:');
        console.log('   ', loginResponse.rawData.substring(0, 300));
        resultados.erros.push('Resposta não-JSON recebida');
      }
    }
  } catch (error) {
    console.log(`   ❌ Erro na requisição: ${error.message}`);
    resultados.erros.push(`Login falhou: ${error.message}`);
  }
  
  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMO FINAL\n');
  
  console.log('Status dos Testes:');
  console.log(`${resultados.apiOnline ? '✅' : '❌'} API Online`);
  console.log(`${resultados.bancoConectado ? '✅' : '❌'} Banco de Dados Conectado`);
  console.log(`${resultados.personalizacaoOk ? '✅' : '❌'} Personalização Funcionando`);
  console.log(`${resultados.loginOk ? '✅' : '❌'} Login Funcionando`);
  
  if (resultados.loginOk) {
    console.log('\n🎉🎉🎉 TUDO FUNCIONANDO PERFEITAMENTE! 🎉🎉🎉');
    console.log('\n✅ O sistema está pronto para uso em produção!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Acesse:', URL_PRODUCAO);
    console.log('   2. Faça login com: admin@sisam.com / admin123');
    console.log('   3. Altere a senha padrão do administrador');
    console.log('   4. Comece a usar o sistema!');
  } else {
    console.log('\n⚠️  Há problemas que precisam ser resolvidos:\n');
    
    if (!resultados.apiOnline) {
      console.log('🔴 1. API não está acessível');
      console.log('   Soluções:');
      console.log('   - Verifique se o deploy foi bem-sucedido no Vercel');
      console.log('   - Acesse: https://vercel.com/dashboard');
      console.log('   - Veja os logs do último deploy');
      console.log('');
    }
    
    if (!resultados.bancoConectado) {
      console.log('🔴 2. Banco de dados não está conectado');
      console.log('   Soluções:');
      console.log('   - Configure as variáveis de ambiente no Vercel:');
      console.log('     DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL');
      console.log('   - Veja: docs/INSTRUCOES_VERCEL_MANUAL.md');
      console.log('   - Execute: npm run verificar-env-correto');
      console.log('');
    }
    
    if (resultados.bancoConectado && !resultados.loginOk) {
      console.log('🟡 3. Banco conectado mas login não funciona');
      console.log('   Possíveis causas:');
      console.log('   - JWT_SECRET não configurado');
      console.log('   - Senha do usuário admin incorreta');
      console.log('   - Usuário admin não existe no banco');
      console.log('');
      console.log('   Soluções:');
      console.log('   - Adicione JWT_SECRET no Vercel');
      console.log('   - Execute: npm run seed-supabase');
      console.log('');
    }
    
    if (resultados.erros.length > 0) {
      console.log('📋 Erros encontrados:');
      resultados.erros.forEach((erro, i) => {
        console.log(`   ${i + 1}. ${erro}`);
      });
      console.log('');
    }
    
    console.log('📚 Documentação de ajuda:');
    console.log('   - docs/INSTRUCOES_VERCEL_MANUAL.md');
    console.log('   - docs/SOLUCAO_LOGIN_LOGO.md');
    console.log('   - docs/CORRIGIR_VERCEL_PROJETO.md');
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Retornar código de saída apropriado
  process.exit(resultados.loginOk ? 0 : 1);
}

// Executar
console.log('💡 Dica: Você pode especificar uma URL personalizada:');
console.log('   npm run testar-login-producao-auto -- https://sua-url.vercel.app\n');

testarProducao().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  process.exit(1);
});

