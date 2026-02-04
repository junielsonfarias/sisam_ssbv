// Script de monitoramento em tempo real do pool de conexões SISAM
// Uso: node scripts/monitorar-pool.js
// Variáveis de ambiente:
//   TEST_URL - URL do servidor (default: http://localhost:3000)
//   INTERVALO - Intervalo de coleta em ms (default: 2000)

const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const INTERVALO = parseInt(process.env.INTERVALO) || 2000;

// Cores para terminal
const cores = {
  reset: '\x1b[0m',
  verde: '\x1b[32m',
  vermelho: '\x1b[31m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
  ciano: '\x1b[36m',
  negrito: '\x1b[1m',
  dim: '\x1b[2m'
};

// Histórico de métricas
const historico = {
  tempos: [],
  status: [],
  maxHistorico: 30 // Últimos 30 pontos
};

function log(cor, mensagem) {
  console.log(`${cor}${mensagem}${cores.reset}`);
}

async function buscarHealth() {
  const inicio = Date.now();

  return new Promise((resolve) => {
    const url = new URL('/api/health', BASE_URL);
    const cliente = url.protocol === 'https:' ? https : http;

    const opcoes = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      timeout: 10000
    };

    const req = cliente.request(opcoes, (res) => {
      let dados = '';
      res.on('data', chunk => dados += chunk);
      res.on('end', () => {
        const tempo = Date.now() - inicio;
        try {
          const json = JSON.parse(dados);
          resolve({
            sucesso: res.statusCode === 200,
            status: res.statusCode,
            tempo,
            dados: json
          });
        } catch {
          resolve({
            sucesso: false,
            status: res.statusCode,
            tempo,
            erro: 'JSON inválido'
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        sucesso: false,
        erro: err.code || err.message,
        tempo: Date.now() - inicio
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        sucesso: false,
        erro: 'TIMEOUT',
        tempo: 10000
      });
    });

    req.end();
  });
}

function criarBarra(valor, maximo, largura = 20, caracter = '█') {
  const preenchido = Math.round((valor / maximo) * largura);
  const vazio = largura - preenchido;
  const barra = caracter.repeat(preenchido) + '░'.repeat(vazio);

  // Cor baseada na porcentagem
  const porcentagem = valor / maximo;
  let cor = cores.verde;
  if (porcentagem > 0.8) cor = cores.vermelho;
  else if (porcentagem > 0.6) cor = cores.amarelo;

  return `${cor}${barra}${cores.reset}`;
}

function criarMiniGrafico(valores, largura = 30) {
  if (valores.length === 0) return '';

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min || 1;

  const caracteres = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  // Pegar últimos N valores
  const ultimos = valores.slice(-largura);

  return ultimos.map(v => {
    const normalizado = (v - min) / range;
    const index = Math.min(Math.floor(normalizado * caracteres.length), caracteres.length - 1);

    // Cor baseada no valor
    let cor = cores.verde;
    if (v > 2000) cor = cores.vermelho;
    else if (v > 1000) cor = cores.amarelo;

    return `${cor}${caracteres[index]}${cores.reset}`;
  }).join('');
}

function limparTela() {
  // Move cursor para início e limpa
  process.stdout.write('\x1B[2J\x1B[0f');
}

function formatarTempo(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function exibirMonitoramento() {
  const resultado = await buscarHealth();

  // Atualizar histórico
  historico.tempos.push(resultado.tempo);
  historico.status.push(resultado.sucesso ? 1 : 0);

  // Manter tamanho do histórico
  if (historico.tempos.length > historico.maxHistorico) {
    historico.tempos.shift();
    historico.status.shift();
  }

  // Calcular estatísticas
  const mediaLatencia = historico.tempos.reduce((a, b) => a + b, 0) / historico.tempos.length;
  const taxaSucesso = (historico.status.reduce((a, b) => a + b, 0) / historico.status.length) * 100;

  // Limpar e redesenhar
  limparTela();

  const agora = new Date().toLocaleTimeString('pt-BR');

  log(cores.negrito + cores.ciano, '╔═══════════════════════════════════════════════════════════════════╗');
  log(cores.negrito + cores.ciano, '║          MONITORAMENTO DO POOL - SISAM                            ║');
  log(cores.negrito + cores.ciano, '╚═══════════════════════════════════════════════════════════════════╝');

  console.log(`\n  ${cores.dim}Atualizado: ${agora} | URL: ${BASE_URL}${cores.reset}`);
  console.log(`  ${cores.dim}Pressione Ctrl+C para sair${cores.reset}\n`);

  if (!resultado.sucesso) {
    log(cores.vermelho, `  ✗ ERRO: ${resultado.erro || `HTTP ${resultado.status}`}`);
    log(cores.vermelho, `    Tempo: ${formatarTempo(resultado.tempo)}`);
    return;
  }

  const dados = resultado.dados;

  // Status geral
  const statusCor = dados.status === 'healthy' ? cores.verde : cores.vermelho;
  console.log(`  ${cores.negrito}Status:${cores.reset} ${statusCor}${dados.status?.toUpperCase() || 'DESCONHECIDO'}${cores.reset}`);
  console.log(`  ${cores.negrito}Versão:${cores.reset} ${dados.version || 'N/A'}`);

  // Banco de dados
  if (dados.database) {
    const db = dados.database;
    console.log(`\n  ${cores.negrito}Banco de Dados:${cores.reset}`);

    const dbStatus = db.connected ? cores.verde + '✓ Conectado' : cores.vermelho + '✗ Desconectado';
    console.log(`    Status: ${dbStatus}${cores.reset}`);

    if (db.latency !== undefined) {
      const latenciaCor = db.latency < 100 ? cores.verde : db.latency < 500 ? cores.amarelo : cores.vermelho;
      console.log(`    Latência: ${latenciaCor}${db.latency}ms${cores.reset}`);
    }

    if (db.mode) {
      console.log(`    Modo: ${db.mode}`);
    }
  }

  // Pool de conexões
  if (dados.pool || dados.connectionPool) {
    const pool = dados.pool || dados.connectionPool;
    console.log(`\n  ${cores.negrito}Pool de Conexões:${cores.reset}`);

    const ativas = pool.active || pool.used || 0;
    const total = pool.total || pool.max || pool.size || 8;
    const disponiveis = pool.idle || pool.available || (total - ativas);

    console.log(`    Ativas:     ${criarBarra(ativas, total)} ${ativas}/${total}`);
    console.log(`    Disponíveis: ${criarBarra(disponiveis, total)} ${disponiveis}/${total}`);

    if (pool.waiting !== undefined) {
      const esperaCor = pool.waiting > 0 ? cores.amarelo : cores.verde;
      console.log(`    Aguardando: ${esperaCor}${pool.waiting}${cores.reset}`);
    }
  }

  // Métricas de queries
  if (dados.queries || dados.queryMetrics) {
    const queries = dados.queries || dados.queryMetrics;
    console.log(`\n  ${cores.negrito}Queries:${cores.reset}`);

    if (queries.active !== undefined) {
      const maxQueries = queries.max || 15;
      console.log(`    Em execução: ${criarBarra(queries.active, maxQueries)} ${queries.active}/${maxQueries}`);
    }

    if (queries.queued !== undefined) {
      const filaCor = queries.queued > 5 ? cores.vermelho : queries.queued > 0 ? cores.amarelo : cores.verde;
      console.log(`    Na fila:     ${filaCor}${queries.queued}${cores.reset}`);
    }
  }

  // Rate limiting
  if (dados.rateLimit || dados.rateLimiting) {
    const rate = dados.rateLimit || dados.rateLimiting;
    console.log(`\n  ${cores.negrito}Rate Limiting:${cores.reset}`);

    if (rate.read) {
      const readUsed = rate.read.used || 0;
      const readMax = rate.read.limit || 100;
      console.log(`    READ:  ${criarBarra(readUsed, readMax)} ${readUsed}/${readMax} req/min`);
    }

    if (rate.write) {
      const writeUsed = rate.write.used || 0;
      const writeMax = rate.write.limit || 30;
      console.log(`    WRITE: ${criarBarra(writeUsed, writeMax)} ${writeUsed}/${writeMax} req/min`);
    }
  }

  // Cache
  if (dados.cache) {
    console.log(`\n  ${cores.negrito}Cache:${cores.reset}`);

    if (dados.cache.hitRate !== undefined) {
      const hitRate = dados.cache.hitRate;
      const hitCor = hitRate > 80 ? cores.verde : hitRate > 50 ? cores.amarelo : cores.vermelho;
      console.log(`    Hit Rate: ${hitCor}${hitRate.toFixed(1)}%${cores.reset}`);
    }

    if (dados.cache.size !== undefined) {
      console.log(`    Entradas: ${dados.cache.size}`);
    }
  }

  // Gráfico de latência
  console.log(`\n  ${cores.negrito}Latência (últimas ${historico.maxHistorico} amostras):${cores.reset}`);
  console.log(`    ${criarMiniGrafico(historico.tempos)}`);
  console.log(`    ${cores.dim}Min: ${Math.min(...historico.tempos)}ms | Média: ${Math.round(mediaLatencia)}ms | Max: ${Math.max(...historico.tempos)}ms${cores.reset}`);

  // Taxa de sucesso
  const taxaCor = taxaSucesso === 100 ? cores.verde : taxaSucesso >= 90 ? cores.amarelo : cores.vermelho;
  console.log(`\n  ${cores.negrito}Taxa de Sucesso:${cores.reset} ${taxaCor}${taxaSucesso.toFixed(1)}%${cores.reset} (últimas ${historico.status.length} verificações)`);

  // Alertas
  const alertas = [];

  if (dados.pool) {
    const pool = dados.pool;
    const utilizacao = (pool.active || pool.used || 0) / (pool.total || pool.max || 8);
    if (utilizacao > 0.8) {
      alertas.push('Pool de conexões em uso elevado (>80%)');
    }
  }

  if (resultado.tempo > 2000) {
    alertas.push(`Latência alta: ${formatarTempo(resultado.tempo)}`);
  }

  if (taxaSucesso < 95) {
    alertas.push(`Taxa de sucesso baixa: ${taxaSucesso.toFixed(1)}%`);
  }

  if (alertas.length > 0) {
    console.log(`\n  ${cores.negrito}${cores.vermelho}⚠ ALERTAS:${cores.reset}`);
    alertas.forEach(alerta => {
      log(cores.amarelo, `    • ${alerta}`);
    });
  }

  // Próxima atualização
  console.log(`\n  ${cores.dim}Próxima atualização em ${INTERVALO / 1000}s...${cores.reset}`);
}

async function iniciar() {
  log(cores.ciano, '\nIniciando monitoramento do pool de conexões...');
  log(cores.dim, `URL: ${BASE_URL}`);
  log(cores.dim, `Intervalo: ${INTERVALO}ms`);
  log(cores.dim, 'Pressione Ctrl+C para sair\n');

  // Verificar conexão inicial
  const teste = await buscarHealth();
  if (!teste.sucesso) {
    log(cores.vermelho, `✗ Não foi possível conectar ao servidor: ${teste.erro || `HTTP ${teste.status}`}`);
    log(cores.amarelo, 'Verifique se o servidor está rodando e tente novamente.');
    process.exit(1);
  }

  log(cores.verde, `✓ Conectado ao servidor (${teste.tempo}ms)`);

  // Loop de monitoramento
  const intervalo = setInterval(async () => {
    try {
      await exibirMonitoramento();
    } catch (err) {
      log(cores.vermelho, `Erro no monitoramento: ${err.message}`);
    }
  }, INTERVALO);

  // Primeira execução imediata
  await exibirMonitoramento();

  // Tratamento de saída
  process.on('SIGINT', () => {
    clearInterval(intervalo);
    console.log('\n');
    log(cores.ciano, 'Monitoramento encerrado.');

    // Resumo final
    if (historico.tempos.length > 0) {
      const media = historico.tempos.reduce((a, b) => a + b, 0) / historico.tempos.length;
      const taxa = (historico.status.reduce((a, b) => a + b, 0) / historico.status.length) * 100;

      console.log(`\n${cores.negrito}Resumo da sessão:${cores.reset}`);
      console.log(`  Amostras: ${historico.tempos.length}`);
      console.log(`  Latência média: ${Math.round(media)}ms`);
      console.log(`  Taxa de sucesso: ${taxa.toFixed(1)}%`);
    }

    process.exit(0);
  });
}

// Verificar argumentos
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${cores.negrito}Monitoramento do Pool de Conexões - SISAM${cores.reset}

Uso: node scripts/monitorar-pool.js [opções]

Variáveis de ambiente:
  TEST_URL    URL do servidor (default: http://localhost:3000)
  INTERVALO   Intervalo de coleta em ms (default: 2000)

Exemplos:
  node scripts/monitorar-pool.js
  TEST_URL=https://sisam.vercel.app node scripts/monitorar-pool.js
  INTERVALO=5000 node scripts/monitorar-pool.js

O script monitora em tempo real:
  - Status do servidor
  - Pool de conexões do banco de dados
  - Queries em execução
  - Rate limiting
  - Cache
  - Latência das requisições

Pressione Ctrl+C para encerrar e ver o resumo da sessão.
  `);
  process.exit(0);
}

iniciar().catch(err => {
  log(cores.vermelho, `Erro fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
