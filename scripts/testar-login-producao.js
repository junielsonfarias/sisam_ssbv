const https = require('https');
const http = require('http');

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

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testarProducao() {
  console.log('🔍 Testando login em produção...\n');
  
  // Solicitar URL de produção
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const pergunta = (query) => new Promise((resolve) => rl.question(query, resolve));

  let urlProducao = await pergunta('Digite a URL de produção (ex: https://seu-app.vercel.app): ');
  
  if (!urlProducao) {
    console.log('❌ URL não fornecida. Usando URL padrão de exemplo.');
    urlProducao = 'https://sisam-ssbv.vercel.app';
  }
  
  // Remover barra final se houver
  urlProducao = urlProducao.replace(/\/$/, '');
  
  console.log(`\n🌐 Testando: ${urlProducao}\n`);
  console.log('='.repeat(60));
  
  // Teste 1: Health Check (verificar se a API está online)
  console.log('\n📡 Teste 1: Verificando se a API está online...');
  try {
    const healthResponse = await fazerRequisicao(`${urlProducao}/api/health`);
    console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.status === 200) {
      console.log('   ✅ API está online');
      if (healthResponse.data) {
        console.log('\n   Detalhes do Health Check:');
        console.log('   -', JSON.stringify(healthResponse.data, null, 2).split('\n').join('\n   '));
        
        if (healthResponse.data.checks?.database === 'ok') {
          console.log('\n   ✅ Conexão com banco de dados: OK');
        } else if (healthResponse.data.checks?.database === 'error') {
          console.log('\n   ❌ Conexão com banco de dados: ERRO');
          if (healthResponse.data.database_error) {
            console.log('   Erro:', healthResponse.data.database_error.message);
            console.log('   Código:', healthResponse.data.database_error.code);
          }
        }
      }
    } else {
      console.log(`   ⚠️  API respondeu com status ${healthResponse.status}`);
      if (healthResponse.data) {
        console.log('   Resposta:', JSON.stringify(healthResponse.data));
      }
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    console.log('   A API pode não estar acessível ou a URL está incorreta.');
  }
  
  // Teste 2: Personalização (verificar se consegue ler do banco)
  console.log('\n📷 Teste 2: Verificando personalização (leitura do banco)...');
  try {
    const personalizacaoResponse = await fazerRequisicao(`${urlProducao}/api/admin/personalizacao`);
    console.log(`   Status: ${personalizacaoResponse.status} ${personalizacaoResponse.statusText}`);
    
    if (personalizacaoResponse.status === 200) {
      console.log('   ✅ API de personalização funcionando');
      if (personalizacaoResponse.data) {
        console.log('\n   Configuração encontrada:');
        console.log('   - Título:', personalizacaoResponse.data.login_titulo || 'Não definido');
        console.log('   - Subtítulo:', personalizacaoResponse.data.login_subtitulo || 'Não definido');
        console.log('   - Logo:', personalizacaoResponse.data.login_imagem_url ? 
          (personalizacaoResponse.data.login_imagem_url.length > 100 ? 
            `Base64 (${(personalizacaoResponse.data.login_imagem_url.length / 1024).toFixed(0)} KB)` : 
            personalizacaoResponse.data.login_imagem_url) 
          : 'Não configurada');
        console.log('\n   ✅ Banco de dados está acessível e retornando dados');
      }
    } else {
      console.log(`   ⚠️  API respondeu com status ${personalizacaoResponse.status}`);
      if (personalizacaoResponse.data) {
        console.log('   Erro:', JSON.stringify(personalizacaoResponse.data));
      }
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  
  // Teste 3: Login
  console.log('\n🔐 Teste 3: Testando login com credenciais...');
  console.log('   Email: admin@sisam.com');
  console.log('   Senha: admin123');
  
  try {
    const loginResponse = await fazerRequisicao(`${urlProducao}/api/auth/login`, {
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
      console.log('   ✅ LOGIN BEM-SUCEDIDO!');
      if (loginResponse.data && loginResponse.data.usuario) {
        console.log('\n   Dados do usuário:');
        console.log('   - ID:', loginResponse.data.usuario.id);
        console.log('   - Nome:', loginResponse.data.usuario.nome);
        console.log('   - Email:', loginResponse.data.usuario.email);
        console.log('   - Tipo:', loginResponse.data.usuario.tipo_usuario);
        console.log('   - Ativo:', loginResponse.data.usuario.ativo ? 'Sim' : 'Não');
        
        if (loginResponse.data.token) {
          console.log('\n   ✅ Token JWT gerado com sucesso');
          console.log('   Token:', loginResponse.data.token.substring(0, 50) + '...');
        }
      }
    } else {
      console.log('   ❌ LOGIN FALHOU!');
      if (loginResponse.data) {
        console.log('\n   Erro retornado:');
        console.log('   - Mensagem:', loginResponse.data.mensagem || 'Não especificado');
        if (loginResponse.data.erro) {
          console.log('   - Código:', loginResponse.data.erro);
        }
        if (loginResponse.data.detalhes) {
          console.log('   - Detalhes:', loginResponse.data.detalhes);
        }
        
        // Análise do erro
        console.log('\n   📊 Análise do erro:');
        if (loginResponse.data.erro === 'DB_ERROR' || 
            loginResponse.data.erro === 'DB_CONNECTION_REFUSED' ||
            loginResponse.data.erro === 'DB_HOST_NOT_FOUND' ||
            loginResponse.data.erro === 'DB_NETWORK_ERROR') {
          console.log('   ⚠️  PROBLEMA DE CONEXÃO COM O BANCO DE DADOS');
          console.log('\n   Possíveis causas:');
          console.log('   1. Variáveis de ambiente não estão configuradas no Vercel');
          console.log('   2. DB_HOST incorreto');
          console.log('   3. DB_USER ou DB_PASSWORD incorretos');
          console.log('   4. Banco de dados está pausado no Supabase');
          console.log('\n   Soluções:');
          console.log('   - Verifique as variáveis no Vercel Dashboard');
          console.log('   - Veja: docs/INSTRUCOES_VERCEL_MANUAL.md');
        } else if (loginResponse.data.mensagem?.includes('Email ou senha inválidos')) {
          console.log('   ⚠️  CREDENCIAIS INCORRETAS');
          console.log('   Mas isso significa que o banco está acessível!');
          console.log('   ✅ A conexão com o banco está funcionando');
        }
      } else if (loginResponse.rawData) {
        console.log('\n   Resposta não-JSON recebida:');
        console.log('   ', loginResponse.rawData.substring(0, 200));
      }
    }
  } catch (error) {
    console.log(`   ❌ Erro na requisição: ${error.message}`);
  }
  
  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMO DO TESTE\n');
  
  console.log('Para resolver problemas:');
  console.log('1. Se a API não está online:');
  console.log('   - Verifique se o deploy no Vercel foi bem-sucedido');
  console.log('   - Acesse: https://vercel.com/dashboard');
  console.log('');
  console.log('2. Se há erro de conexão com banco:');
  console.log('   - Configure as variáveis de ambiente no Vercel');
  console.log('   - Veja: docs/INSTRUCOES_VERCEL_MANUAL.md');
  console.log('   - Variáveis necessárias: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL');
  console.log('');
  console.log('3. Se o login falha com credenciais incorretas:');
  console.log('   - Execute: npm run seed-supabase');
  console.log('   - Isso recriará o usuário admin com a senha correta');
  console.log('');
  console.log('4. Para mais ajuda:');
  console.log('   - docs/SOLUCAO_LOGIN_LOGO.md');
  console.log('   - docs/CORRIGIR_VERCEL_PROJETO.md');
  
  rl.close();
}

testarProducao().catch(error => {
  console.error('\n❌ Erro:', error.message);
  process.exit(1);
});

