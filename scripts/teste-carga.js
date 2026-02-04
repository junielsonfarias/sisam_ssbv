// Script de teste de carga para SISAM
// Uso: node scripts/teste-carga.js [10|15|stress|completo]
// Variáveis de ambiente:
//   TEST_URL - URL do servidor (default: http://localhost:3000)
//   AUTH_COOKIE - Cookie de autenticação (auth_token=...)

const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const AUTH_COOKIE = process.env.AUTH_COOKIE || '';

// Configurações de cenários de teste
const CONFIG = {
  USUARIOS_10: { usuarios: 10, duracao: 60000, rampup: 10000 },
  USUARIOS_15: { usuarios: 15, duracao: 60000, rampup: 15000 },
  USUARIOS_20: { usuarios: 20, duracao: 60000, rampup: 20000 },
  STRESS: { usuarios: 15, duracao: 120000, rampup: 15000 }
};

// Endpoints para teste (ordenados por criticidade)
const ENDPOINTS = [
  { path: '/api/admin/dashboard-rapido', peso: 3, nome: 'Dashboard' },
  { path: '/api/admin/graficos', peso: 2, nome: 'Gráficos' },
  { path: '/api/admin/estatisticas', peso: 2, nome: 'Estatísticas' },
  { path: '/api/admin/alunos?pagina=1&limite=50', peso: 2, nome: 'Lista Alunos' },
  { path: '/api/auth/verificar', peso: 1, nome: 'Verificar Auth' },
  { path: '/api/health', peso: 1, nome: 'Health Check' }
];

// Criar lista ponderada de endpoints
function criarListaPonderada() {
  const lista = [];
  ENDPOINTS.forEach(ep => {
    for (let i = 0; i < ep.peso; i++) {
      lista.push(ep);
    }
  });
  return lista;
}

const ENDPOINTS_PONDERADOS = criarListaPonderada();

// Métricas globais
let metricas = {
  totalRequisicoes: 0,
  sucesso: 0,
  falhas: 0,
  tempos: [],
  erros: {},
  porEndpoint: {},
  porSegundo: {}
};

// Cores para terminal
const cores = {
  reset: '\x1b[0m',
  verde: '\x1b[32m',
  vermelho: '\x1b[31m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
  ciano: '\x1b[36m',
  negrito: '\x1b[1m'
};

function log(cor, mensagem) {
  console.log(`${cor}${mensagem}${cores.reset}`);
}

async function fazerRequisicao(endpoint) {
  const inicio = Date.now();

  return new Promise((resolve) => {
    const url = new URL(endpoint.path, BASE_URL);
    const cliente = url.protocol === 'https:' ? https : http;

    const opcoes = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Cookie': AUTH_COOKIE,
        'Accept': 'application/json',
        'User-Agent': 'SISAM-LoadTest/1.0'
      },
      timeout: 30000
    };

    const req = cliente.request(opcoes, (res) => {
      let dados = '';
      res.on('data', chunk => dados += chunk);
      res.on('end', () => {
        const tempo = Date.now() - inicio;
        resolve({
          sucesso: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode,
          tempo,
          endpoint: endpoint.path,
          nome: endpoint.nome,
          tamanho: dados.length
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        sucesso: false,
        erro: err.code || err.message,
        tempo: Date.now() - inicio,
        endpoint: endpoint.path,
        nome: endpoint.nome
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        sucesso: false,
        erro: 'TIMEOUT',
        tempo: 30000,
        endpoint: endpoint.path,
        nome: endpoint.nome
      });
    });

    req.end();
  });
}

function registrarMetrica(resultado) {
  const segundo = Math.floor(Date.now() / 1000);

  metricas.totalRequisicoes++;
  metricas.tempos.push(resultado.tempo);

  // Por segundo
  if (!metricas.porSegundo[segundo]) {
    metricas.porSegundo[segundo] = { sucesso: 0, falhas: 0 };
  }

  // Por endpoint
  if (!metricas.porEndpoint[resultado.endpoint]) {
    metricas.porEndpoint[resultado.endpoint] = {
      sucesso: 0,
      falhas: 0,
      tempos: [],
      nome: resultado.nome
    };
  }

  if (resultado.sucesso) {
    metricas.sucesso++;
    metricas.porSegundo[segundo].sucesso++;
    metricas.porEndpoint[resultado.endpoint].sucesso++;
  } else {
    metricas.falhas++;
    metricas.porSegundo[segundo].falhas++;
    metricas.porEndpoint[resultado.endpoint].falhas++;
    const erroKey = resultado.erro || `HTTP_${resultado.status}`;
    metricas.erros[erroKey] = (metricas.erros[erroKey] || 0) + 1;
  }

  metricas.porEndpoint[resultado.endpoint].tempos.push(resultado.tempo);
}

async function usuarioSimulado(id, duracao, onProgresso) {
  const inicio = Date.now();
  let requisicoes = 0;

  while (Date.now() - inicio < duracao) {
    // Selecionar endpoint aleatório (ponderado)
    const endpoint = ENDPOINTS_PONDERADOS[Math.floor(Math.random() * ENDPOINTS_PONDERADOS.length)];
    const resultado = await fazerRequisicao(endpoint);

    registrarMetrica(resultado);
    requisicoes++;

    if (onProgresso) {
      onProgresso(id, requisicoes, resultado);
    }

    // Intervalo entre requisições (simula comportamento real de usuário)
    // 500ms a 1500ms entre ações
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
  }

  return { id, requisicoes };
}

function calcularPercentil(array, percentil) {
  if (array.length === 0) return 0;
  const sorted = [...array].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * percentil / 100);
  return sorted[Math.min(index, sorted.length - 1)];
}

function formatarTempo(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function imprimirResultados(config, duracaoReal) {
  const temposOrdenados = metricas.tempos.sort((a, b) => a - b);
  const p50 = calcularPercentil(metricas.tempos, 50);
  const p95 = calcularPercentil(metricas.tempos, 95);
  const p99 = calcularPercentil(metricas.tempos, 99);
  const media = metricas.tempos.length > 0
    ? metricas.tempos.reduce((a, b) => a + b, 0) / metricas.tempos.length
    : 0;
  const minimo = temposOrdenados[0] || 0;
  const maximo = temposOrdenados[temposOrdenados.length - 1] || 0;

  console.log('\n');
  log(cores.negrito + cores.ciano, '╔════════════════════════════════════════════════════════════╗');
  log(cores.negrito + cores.ciano, '║                    RESULTADOS DO TESTE                      ║');
  log(cores.negrito + cores.ciano, '╚════════════════════════════════════════════════════════════╝');

  console.log(`\n${cores.negrito}Configuração:${cores.reset}`);
  console.log(`  Usuários: ${config.usuarios}`);
  console.log(`  Duração real: ${duracaoReal.toFixed(1)}s`);
  console.log(`  URL: ${BASE_URL}`);

  console.log(`\n${cores.negrito}Requisições:${cores.reset}`);
  console.log(`  Total: ${metricas.totalRequisicoes}`);
  const taxaSucesso = metricas.totalRequisicoes > 0
    ? (metricas.sucesso / metricas.totalRequisicoes * 100)
    : 0;
  const corTaxa = taxaSucesso >= 95 ? cores.verde : taxaSucesso >= 90 ? cores.amarelo : cores.vermelho;
  console.log(`  Sucesso: ${corTaxa}${metricas.sucesso} (${taxaSucesso.toFixed(1)}%)${cores.reset}`);
  console.log(`  Falhas: ${metricas.falhas > 0 ? cores.vermelho : ''}${metricas.falhas} (${(100 - taxaSucesso).toFixed(1)}%)${cores.reset}`);
  console.log(`  Throughput: ${(metricas.totalRequisicoes / duracaoReal).toFixed(2)} req/s`);

  console.log(`\n${cores.negrito}Latência:${cores.reset}`);
  console.log(`  Mínimo: ${formatarTempo(minimo)}`);
  console.log(`  Média:  ${formatarTempo(Math.round(media))}`);
  const corP50 = p50 < 1000 ? cores.verde : p50 < 2000 ? cores.amarelo : cores.vermelho;
  console.log(`  P50:    ${corP50}${formatarTempo(p50)}${cores.reset}`);
  const corP95 = p95 < 2000 ? cores.verde : p95 < 5000 ? cores.amarelo : cores.vermelho;
  console.log(`  P95:    ${corP95}${formatarTempo(p95)}${cores.reset}`);
  const corP99 = p99 < 5000 ? cores.verde : p99 < 10000 ? cores.amarelo : cores.vermelho;
  console.log(`  P99:    ${corP99}${formatarTempo(p99)}${cores.reset}`);
  console.log(`  Máximo: ${formatarTempo(maximo)}`);

  if (Object.keys(metricas.erros).length > 0) {
    console.log(`\n${cores.negrito}${cores.vermelho}Erros:${cores.reset}`);
    Object.entries(metricas.erros)
      .sort((a, b) => b[1] - a[1])
      .forEach(([erro, count]) => {
        console.log(`  ${cores.vermelho}${erro}: ${count}${cores.reset}`);
      });
  }

  console.log(`\n${cores.negrito}Por Endpoint:${cores.reset}`);
  Object.entries(metricas.porEndpoint)
    .sort((a, b) => (b[1].sucesso + b[1].falhas) - (a[1].sucesso + a[1].falhas))
    .forEach(([endpoint, stats]) => {
      const total = stats.sucesso + stats.falhas;
      const taxa = total > 0 ? (stats.sucesso / total * 100) : 0;
      const mediaEndpoint = stats.tempos.length > 0
        ? stats.tempos.reduce((a, b) => a + b, 0) / stats.tempos.length
        : 0;
      const p95Endpoint = calcularPercentil(stats.tempos, 95);

      const corTaxaEndpoint = taxa >= 95 ? cores.verde : taxa >= 90 ? cores.amarelo : cores.vermelho;
      console.log(`  ${cores.azul}${stats.nome}${cores.reset} (${endpoint})`);
      console.log(`    Requisições: ${total} | Sucesso: ${corTaxaEndpoint}${taxa.toFixed(1)}%${cores.reset}`);
      console.log(`    Média: ${formatarTempo(Math.round(mediaEndpoint))} | P95: ${formatarTempo(p95Endpoint)}`);
    });

  // Diagnóstico
  console.log('\n');
  log(cores.negrito + cores.ciano, '╔════════════════════════════════════════════════════════════╗');
  log(cores.negrito + cores.ciano, '║                      DIAGNÓSTICO                            ║');
  log(cores.negrito + cores.ciano, '╚════════════════════════════════════════════════════════════╝');

  let diagnostico = '';
  let recomendacoes = [];

  if (taxaSucesso >= 99 && p95 < 2000) {
    log(cores.verde + cores.negrito, '\n✓ SISTEMA ESTÁVEL');
    diagnostico = 'O sistema suporta esta carga sem problemas significativos.';
  } else if (taxaSucesso >= 95 && p95 < 5000) {
    log(cores.amarelo + cores.negrito, '\n⚠ SISTEMA COM LEVE DEGRADAÇÃO');
    diagnostico = 'O sistema funciona mas apresenta latência elevada em alguns momentos.';
    recomendacoes.push('Considere otimizar queries mais lentas');
    recomendacoes.push('Aumente o cache do dashboard');
  } else if (taxaSucesso >= 90) {
    log(cores.amarelo + cores.negrito, '\n⚠ SISTEMA SOB STRESS');
    diagnostico = 'O sistema está no limite da capacidade.';
    recomendacoes.push('Aumente MAX_CONCURRENT_QUERIES para 20');
    recomendacoes.push('Considere migrar para Transaction Mode (porta 6543)');
    recomendacoes.push('Revise queries com REGEXP_REPLACE');
  } else {
    log(cores.vermelho + cores.negrito, '\n✗ SISTEMA INSTÁVEL/TRAVANDO');
    diagnostico = 'A carga atual excede a capacidade do sistema.';
    recomendacoes.push('URGENTE: Migre para Transaction Mode (porta 6543)');
    recomendacoes.push('Aumente MAX_CONCURRENT_QUERIES para 25');
    recomendacoes.push('Implemente cache Redis');
    recomendacoes.push('Adicione índices nas queries mais pesadas');
  }

  console.log(diagnostico);

  if (recomendacoes.length > 0) {
    console.log(`\n${cores.negrito}Recomendações:${cores.reset}`);
    recomendacoes.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }

  // Análise de tendência por segundo
  const segundos = Object.keys(metricas.porSegundo).sort();
  if (segundos.length > 5) {
    const primeiros = segundos.slice(0, 5);
    const ultimos = segundos.slice(-5);

    const taxaInicio = primeiros.reduce((acc, s) => {
      const d = metricas.porSegundo[s];
      return acc + d.sucesso / (d.sucesso + d.falhas);
    }, 0) / primeiros.length * 100;

    const taxaFim = ultimos.reduce((acc, s) => {
      const d = metricas.porSegundo[s];
      return acc + d.sucesso / (d.sucesso + d.falhas);
    }, 0) / ultimos.length * 100;

    const degradacao = taxaInicio - taxaFim;

    console.log(`\n${cores.negrito}Tendência:${cores.reset}`);
    console.log(`  Taxa início: ${taxaInicio.toFixed(1)}%`);
    console.log(`  Taxa fim: ${taxaFim.toFixed(1)}%`);
    if (degradacao > 5) {
      log(cores.vermelho, `  ⚠ Degradação de ${degradacao.toFixed(1)}% durante o teste`);
    } else if (degradacao < -5) {
      log(cores.verde, `  ✓ Melhoria de ${Math.abs(degradacao).toFixed(1)}% durante o teste (warm-up)`);
    } else {
      log(cores.verde, `  ✓ Performance estável durante o teste`);
    }
  }

  return { taxaSucesso, p95, media, reqPorSegundo: metricas.totalRequisicoes / duracaoReal };
}

async function executarTeste(config) {
  console.log('\n');
  log(cores.negrito + cores.ciano, '╔════════════════════════════════════════════════════════════╗');
  log(cores.negrito + cores.ciano, `║     TESTE DE CARGA: ${config.usuarios} USUÁRIOS SIMULTÂNEOS              ║`);
  log(cores.negrito + cores.ciano, '╚════════════════════════════════════════════════════════════╝');

  console.log(`\nConfiguração:`);
  console.log(`  Duração: ${config.duracao / 1000}s`);
  console.log(`  Ramp-up: ${config.rampup / 1000}s (${(config.usuarios / (config.rampup / 1000)).toFixed(1)} usuários/s)`);
  console.log(`  Endpoints: ${ENDPOINTS.length} (${ENDPOINTS_PONDERADOS.length} ponderados)`);

  // Reset métricas
  metricas = {
    totalRequisicoes: 0,
    sucesso: 0,
    falhas: 0,
    tempos: [],
    erros: {},
    porEndpoint: {},
    porSegundo: {}
  };

  const inicio = Date.now();
  const promessas = [];
  const usuariosAtivos = new Set();

  // Callback para progresso
  const onProgresso = (id, reqs, resultado) => {
    // Atualizar linha de status (a cada 10 requisições)
    if (reqs % 10 === 0) {
      const taxa = metricas.totalRequisicoes > 0
        ? (metricas.sucesso / metricas.totalRequisicoes * 100).toFixed(1)
        : '100.0';
      process.stdout.write(`\r  Progresso: ${metricas.totalRequisicoes} reqs | ${taxa}% sucesso | ${usuariosAtivos.size} usuários ativos    `);
    }
  };

  console.log(`\nIniciando usuários...`);

  // Ramp-up: adiciona usuários gradualmente
  const intervaloRampup = config.rampup / config.usuarios;

  for (let i = 0; i < config.usuarios; i++) {
    await new Promise(r => setTimeout(r, intervaloRampup));
    usuariosAtivos.add(i + 1);
    log(cores.azul, `  Usuário ${i + 1}/${config.usuarios} iniciado`);

    const usuarioId = i + 1;
    promessas.push(
      usuarioSimulado(usuarioId, config.duracao, onProgresso)
        .then(resultado => {
          usuariosAtivos.delete(usuarioId);
          return resultado;
        })
    );
  }

  console.log(`\n${cores.verde}Todos os ${config.usuarios} usuários ativos!${cores.reset}`);
  console.log(`Aguardando conclusão do teste...\n`);

  const resultadosUsuarios = await Promise.all(promessas);

  const duracaoReal = (Date.now() - inicio) / 1000;

  // Limpar linha de progresso
  process.stdout.write('\r' + ' '.repeat(80) + '\r');

  // Estatísticas dos usuários
  const totalReqsUsuarios = resultadosUsuarios.reduce((acc, u) => acc + u.requisicoes, 0);
  const mediaReqsUsuario = totalReqsUsuarios / resultadosUsuarios.length;

  console.log(`\nRequisições por usuário:`);
  console.log(`  Total: ${totalReqsUsuarios}`);
  console.log(`  Média: ${mediaReqsUsuario.toFixed(1)} req/usuário`);

  return imprimirResultados(config, duracaoReal);
}

async function verificarConexao() {
  console.log(`\nVerificando conexão com ${BASE_URL}...`);

  try {
    const resultado = await fazerRequisicao({ path: '/api/health', nome: 'Health Check' });

    if (resultado.sucesso) {
      log(cores.verde, `✓ Servidor acessível (${resultado.tempo}ms)`);
      return true;
    } else {
      log(cores.vermelho, `✗ Servidor respondeu com erro: ${resultado.status || resultado.erro}`);
      return false;
    }
  } catch (err) {
    log(cores.vermelho, `✗ Não foi possível conectar: ${err.message}`);
    return false;
  }
}

async function main() {
  const cenario = process.argv[2] || '10';

  log(cores.negrito + cores.ciano, '╔════════════════════════════════════════════════════════════╗');
  log(cores.negrito + cores.ciano, '║              TESTE DE CARGA - SISAM                         ║');
  log(cores.negrito + cores.ciano, '╚════════════════════════════════════════════════════════════╝');

  console.log(`\nConfiguração do ambiente:`);
  console.log(`  URL: ${BASE_URL}`);
  console.log(`  Auth: ${AUTH_COOKIE ? cores.verde + 'Configurado' + cores.reset : cores.amarelo + 'NÃO CONFIGURADO' + cores.reset}`);

  if (!AUTH_COOKIE) {
    log(cores.amarelo, '\n⚠ AVISO: AUTH_COOKIE não configurado!');
    console.log('  Para autenticar, execute:');
    console.log('    Windows: set AUTH_COOKIE=auth_token=SEU_TOKEN');
    console.log('    Linux/Mac: export AUTH_COOKIE="auth_token=SEU_TOKEN"');
    console.log('  Continuando sem autenticação...\n');
  }

  // Verificar conexão
  const conectado = await verificarConexao();
  if (!conectado) {
    log(cores.vermelho, '\n✗ Não foi possível conectar ao servidor. Verifique se está rodando.');
    process.exit(1);
  }

  let resultado;

  switch (cenario) {
    case '10':
      resultado = await executarTeste(CONFIG.USUARIOS_10);
      break;

    case '15':
      resultado = await executarTeste(CONFIG.USUARIOS_15);
      break;

    case '20':
      resultado = await executarTeste(CONFIG.USUARIOS_20);
      break;

    case 'stress':
      console.log('\nExecutando teste de stress (10 → 15 usuários)...');
      await executarTeste(CONFIG.USUARIOS_10);
      console.log('\n\n--- Aumentando carga para 15 usuários ---\n');
      resultado = await executarTeste(CONFIG.USUARIOS_15);
      break;

    case 'completo':
      console.log('\nExecutando suíte completa de testes...');
      const r10 = await executarTeste(CONFIG.USUARIOS_10);
      console.log('\n');
      const r15 = await executarTeste(CONFIG.USUARIOS_15);

      console.log('\n');
      log(cores.negrito + cores.ciano, '╔════════════════════════════════════════════════════════════╗');
      log(cores.negrito + cores.ciano, '║                  COMPARATIVO FINAL                          ║');
      log(cores.negrito + cores.ciano, '╚════════════════════════════════════════════════════════════╝');

      console.log(`\n${cores.negrito}10 Usuários:${cores.reset}`);
      console.log(`  Taxa de sucesso: ${r10.taxaSucesso.toFixed(1)}%`);
      console.log(`  P95: ${formatarTempo(r10.p95)}`);
      console.log(`  Throughput: ${r10.reqPorSegundo.toFixed(2)} req/s`);

      console.log(`\n${cores.negrito}15 Usuários:${cores.reset}`);
      console.log(`  Taxa de sucesso: ${r15.taxaSucesso.toFixed(1)}%`);
      console.log(`  P95: ${formatarTempo(r15.p95)}`);
      console.log(`  Throughput: ${r15.reqPorSegundo.toFixed(2)} req/s`);

      const degradacaoP95 = r10.p95 > 0 ? ((r15.p95 - r10.p95) / r10.p95 * 100) : 0;
      const degradacaoTaxa = r10.taxaSucesso - r15.taxaSucesso;

      console.log(`\n${cores.negrito}Impacto do aumento de carga:${cores.reset}`);

      if (degradacaoP95 > 0) {
        const corDeg = degradacaoP95 > 50 ? cores.vermelho : degradacaoP95 > 20 ? cores.amarelo : cores.verde;
        console.log(`  Aumento de latência (P95): ${corDeg}+${degradacaoP95.toFixed(1)}%${cores.reset}`);
      } else {
        console.log(`  Variação de latência (P95): ${cores.verde}${degradacaoP95.toFixed(1)}%${cores.reset}`);
      }

      if (degradacaoTaxa > 0) {
        const corTaxa = degradacaoTaxa > 5 ? cores.vermelho : degradacaoTaxa > 2 ? cores.amarelo : cores.verde;
        console.log(`  Queda na taxa de sucesso: ${corTaxa}-${degradacaoTaxa.toFixed(1)}%${cores.reset}`);
      } else {
        console.log(`  Variação na taxa de sucesso: ${cores.verde}${(-degradacaoTaxa).toFixed(1)}%${cores.reset}`);
      }

      // Diagnóstico final
      console.log(`\n${cores.negrito}Conclusão:${cores.reset}`);
      if (degradacaoP95 < 30 && degradacaoTaxa < 3) {
        log(cores.verde, '✓ O sistema escala bem de 10 para 15 usuários');
      } else if (degradacaoP95 < 100 && degradacaoTaxa < 10) {
        log(cores.amarelo, '⚠ O sistema apresenta degradação moderada com 15 usuários');
      } else {
        log(cores.vermelho, '✗ O sistema não suporta bem 15 usuários simultâneos');
      }
      break;

    default:
      console.log(`\n${cores.negrito}Uso:${cores.reset} node scripts/teste-carga.js [cenário]\n`);
      console.log('Cenários disponíveis:');
      console.log('  10       - Teste com 10 usuários simultâneos (60s)');
      console.log('  15       - Teste com 15 usuários simultâneos (60s)');
      console.log('  20       - Teste com 20 usuários simultâneos (60s)');
      console.log('  stress   - Teste sequencial: 10 usuários, depois 15');
      console.log('  completo - Suíte completa com comparativo final');
      console.log('\nExemplo:');
      console.log('  node scripts/teste-carga.js completo');
      process.exit(0);
  }
}

main().catch(err => {
  log(cores.vermelho, `\n✗ Erro fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
