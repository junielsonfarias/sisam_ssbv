import { Pool, QueryResult, PoolClient } from 'pg';

let pool: Pool | null = null;
let poolConfig: {
  host?: string;
  database?: string;
  user?: string;
  port?: number;
} | null = null;

// Fila de queries para controlar concorrência
let queryQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
  queryFn: () => Promise<any>;
}> = [];
let activeQueries = 0;
const MAX_CONCURRENT_QUERIES = 15; // Maximo de queries paralelas (ajustado para 50 usuarios)

// Estado de saúde da conexão
let lastHealthCheck: number = 0;
let isHealthy: boolean = true;
let consecutiveFailures: number = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 segundos
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Detecta o modo de conexão do Supabase
 * - Transaction Mode (porta 6543): Permite MUITAS conexões, ideal para serverless
 * - Session Mode (porta 5432): Limitado a pool_size (~15-20)
 */
function detectSupabaseMode(host: string, port: number): {
  isSupabase: boolean;
  isTransactionMode: boolean;
  recommendedMax: number;
} {
  const isSupabase = host?.includes('supabase.co') ||
                     host?.includes('pooler.supabase.com') ||
                     host?.includes('aws-0-');

  // Porta 6543 = Transaction Mode (recomendado para serverless)
  // Porta 5432 = Session Mode (limitado)
  const isTransactionMode = port === 6543;

  // Recomendacoes de pool baseadas no modo
  // Para 50 usuarios simultaneos, precisamos de conexoes suficientes
  let recommendedMax = 10;
  if (isSupabase) {
    if (isTransactionMode) {
      // Transaction Mode: pode ter MUITAS conexoes
      // Para 50 usuarios simultaneos, usar 25-30 conexoes no pool
      recommendedMax = 25;
    } else {
      // Session Mode: MUITO limitado - apenas 15-20 conexoes no total do Supabase
      // Com 50 usuarios, PRECISA usar Transaction Mode (porta 6543)
      // Manter em 8 para evitar erro MaxClientsInSessionMode
      recommendedMax = 8;
      console.error('');
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  AVISO CRITICO: Session Mode nao suporta 50 usuarios!        ║');
      console.error('║  Altere DB_PORT para 6543 para usar Transaction Mode         ║');
      console.error('╚══════════════════════════════════════════════════════════════╝');
      console.error('');
    }
  }

  return { isSupabase, isTransactionMode, recommendedMax };
}

function createPool(): Pool {
  // Validar variáveis de ambiente obrigatórias
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  // Validação básica
  if (!host) {
    throw new Error('DB_HOST não está configurado');
  }
  if (!database) {
    throw new Error('DB_NAME não está configurado');
  }
  if (!user) {
    throw new Error('DB_USER não está configurado');
  }
  if (!password) {
    throw new Error('DB_PASSWORD não está configurado');
  }

  const { isSupabase, isTransactionMode, recommendedMax } = detectSupabaseMode(host, port);

  // Log de diagnóstico
  console.log('=== Configuração de Conexão ===');
  console.log(`Host: ${host}`);
  console.log(`Porta: ${port}`);
  console.log(`Supabase: ${isSupabase ? 'Sim' : 'Não'}`);
  console.log(`Modo: ${isTransactionMode ? 'Transaction (otimizado)' : 'Session (limitado)'}`);
  console.log(`Pool máximo: ${recommendedMax}`);

  if (isSupabase && !isTransactionMode) {
    console.warn('⚠️  AVISO: Usando Session Mode no Supabase!');
    console.warn('   Para melhor performance com 50+ usuários, use Transaction Mode:');
    console.warn('   - Altere DB_PORT para 6543');
    console.warn('   - Use o endpoint pooler.supabase.com');
  }

  // Configuracao SSL: sempre usar para Supabase, producao ou quando DB_SSL=true
  // IMPORTANTE: Em producao, rejectUnauthorized deve ser true para seguranca
  // Apenas use false se tiver problemas com certificados e entender os riscos
  const shouldUseSSL = process.env.NODE_ENV === 'production' ||
                       process.env.DB_SSL === 'true' ||
                       isSupabase;

  const sslConfig = shouldUseSSL
    ? {
        // Em producao com Supabase, usar true para validar certificados
        // Se tiver problemas, configure DB_SSL_REJECT_UNAUTHORIZED=false
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      }
    : false;

  const config: any = {
    host: host,
    port: port,
    database: database,
    user: user,
    password: password,
    // Pool otimizado para modo detectado
    max: recommendedMax,
    min: 0, // Não manter conexões idle (importante para serverless)
    idleTimeoutMillis: isSupabase ? 10000 : 30000,
    connectionTimeoutMillis: isTransactionMode ? 10000 : 20000,
    ssl: sslConfig,
    // Opções para serverless/Vercel
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };

  // Configurações especiais para Vercel + Supabase
  if (process.env.NODE_ENV === 'production' && isSupabase) {
    // Forçar IPv4 primeiro (mais confiável na Vercel)
    config.family = 4;

    // Timeouts otimizados
    config.query_timeout = 30000;
    config.statement_timeout = 30000;
  }

  // Log das configurações (sem senha) para debug
  console.log('Configurando pool PostgreSQL:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: !!sslConfig,
    isSupabase,
    nodeEnv: process.env.NODE_ENV,
    family: config.family || 'auto',
  });

  const newPool = new Pool(config);

  // Tratamento de erros de conexão
  newPool.on('error', (err: any) => {
    const errorCode = err?.code;
    const errorMessage = err?.message || '';
    
    console.error('Erro inesperado no pool de conexões:', {
      code: errorCode || 'UNKNOWN',
      message: errorMessage,
      host: config.host,
    });
    
    // Tratamento específico para MaxClientsInSessionMode
    if (errorMessage.includes('MaxClientsInSessionMode') || errorMessage.includes('max clients reached')) {
      console.warn('⚠️ MaxClientsInSessionMode detectado - muitas conexões simultâneas');
      console.warn('Reduzindo pool e aguardando liberação de conexões...');
      // Não resetar o pool imediatamente, apenas logar o problema
      // O retry logic no query wrapper lidará com isso
    }
    
    // Se for erro de conexão, resetar pool para forçar recriação
    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
      console.log('Erro de conexão detectado, pool será recriado na próxima requisição');
      pool = null;
      poolConfig = null;
    }
  });

  // Armazenar configuração atual para comparação futura
  poolConfig = {
    host,
    database,
    user,
    port: port || 5432,
  };

  return newPool;
}

// Criar pool de forma lazy (apenas quando necessário)
function getPool(): Pool {
  const currentHost = process.env.DB_HOST;
  const currentDatabase = process.env.DB_NAME;
  const currentUser = process.env.DB_USER;
  const currentPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432;
  
  // Verificar se as variáveis de ambiente básicas estão configuradas antes de tentar criar o pool
  if (!currentHost || !currentDatabase || !currentUser || !process.env.DB_PASSWORD) {
    const missingVars = []
    if (!currentHost) missingVars.push('DB_HOST')
    if (!currentDatabase) missingVars.push('DB_NAME')
    if (!currentUser) missingVars.push('DB_USER')
    if (!process.env.DB_PASSWORD) missingVars.push('DB_PASSWORD')
    
    const errorMsg = `Variáveis de ambiente não configuradas: ${missingVars.join(', ')}`
    console.error('Erro de configuração:', errorMsg)
    throw new Error(errorMsg)
  }
  
  // Verificar se o pool existe e se as configurações mudaram
  if (pool && poolConfig) {
    const configChanged = 
      poolConfig.host !== currentHost ||
      poolConfig.database !== currentDatabase ||
      poolConfig.user !== currentUser ||
      poolConfig.port !== currentPort;
    
    if (configChanged) {
      console.log('Configuração do banco mudou, recriando pool...');
      pool.end().catch(console.error);
      pool = null;
      poolConfig = null;
    }
  }
  
  if (!pool) {
    console.log('Criando novo pool PostgreSQL...');
    try {
      pool = createPool();
    } catch (error: any) {
      console.error('Erro ao criar pool PostgreSQL:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      // Resetar pool para permitir nova tentativa
      pool = null;
      poolConfig = null;
      throw error;
    }
  }
  
  return pool;
}

// Função para resetar o pool (útil para testes ou mudanças de configuração)
export function resetPool() {
  if (pool) {
    pool.end().catch(console.error);
    pool = null;
    poolConfig = null;
  }
}

// Função para testar conexão
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const testPool = getPool();
    await testPool.query('SELECT 1');
    consecutiveFailures = 0;
    isHealthy = true;
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao testar conexão:', {
      code: error.code,
      message: error.message,
      host: process.env.DB_HOST,
    });

    consecutiveFailures++;
    isHealthy = false;

    // Resetar pool em caso de erro
    resetPool();

    return {
      success: false,
      error: error.message || 'Erro desconhecido ao conectar ao banco de dados',
    };
  }
}

/**
 * Verifica a saúde da conexão e reconecta se necessário
 */
async function healthCheck(): Promise<boolean> {
  const now = Date.now();

  // Se verificou recentemente e está saudável, pular
  if (isHealthy && (now - lastHealthCheck) < HEALTH_CHECK_INTERVAL) {
    return true;
  }

  lastHealthCheck = now;

  try {
    const poolInstance = getPool();
    await poolInstance.query('SELECT 1');
    consecutiveFailures = 0;
    isHealthy = true;
    return true;
  } catch (error: any) {
    consecutiveFailures++;
    console.warn(`[HealthCheck] Falha ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}:`, error.message);

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error('[HealthCheck] Muitas falhas consecutivas, recriando pool...');
      isHealthy = false;
      resetPool();
    }

    return false;
  }
}

/**
 * Verifica se o erro é recuperável (pode tentar reconectar)
 */
function isRecoverableError(error: any): boolean {
  const errorMessage = error?.message || '';
  const errorCode = error?.code || '';

  const recoverableMessages = [
    'MaxClientsInSessionMode',
    'max clients reached',
    'too many clients',
    'Connection terminated',
    'connection terminated',
    'Client has encountered a connection error',
    'Connection refused',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'socket hang up',
    'read ECONNRESET',
    'write ECONNRESET',
    'terminating connection due to administrator command',
    'sorry, too many clients already',
    'the database system is starting up',
    'the database system is shutting down',
  ];

  return recoverableMessages.some(msg =>
    errorMessage.includes(msg) || errorCode.includes(msg)
  );
}

/**
 * Aguarda um tempo antes de tentar novamente
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função helper para retry com backoff exponencial e reconexão automática
async function queryWithRetry(
  poolInstance: Pool,
  queryText: string,
  params?: any[],
  maxRetries: number = 4
): Promise<QueryResult<any>> {
  let lastError: any;
  let currentPool = poolInstance;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await currentPool.query(queryText, params);

      // Query bem-sucedida, resetar contadores de falha
      if (attempt > 0) {
        console.log(`[Query] Sucesso após ${attempt + 1} tentativas`);
      }
      consecutiveFailures = 0;
      isHealthy = true;

      return result;
    } catch (error: any) {
      lastError = error;
      consecutiveFailures++;

      const isRecoverable = isRecoverableError(error);
      const errorMsg = error.message?.substring(0, 100) || 'Erro desconhecido';

      console.warn(`[Query] Erro (tentativa ${attempt + 1}/${maxRetries}): ${errorMsg}`);

      // Se for erro recuperável, tentar novamente
      if (isRecoverable && attempt < maxRetries - 1) {
        // Backoff exponencial: 300ms, 600ms, 1200ms, 2400ms
        const waitTime = Math.min(300 * Math.pow(2, attempt), 3000);
        console.warn(`[Query] Aguardando ${waitTime}ms antes de tentar novamente...`);
        await delay(waitTime);

        // Se muitas falhas, recriar pool
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.warn('[Query] Recriando pool após múltiplas falhas...');
          resetPool();
          currentPool = getPool();
        }

        continue;
      }

      // Se não for recuperável ou esgotou tentativas, lançar erro
      if (!isRecoverable) {
        console.error('[Query] Erro não recuperável:', errorMsg);
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Processa a fila de queries respeitando o limite de concorrência
 */
async function processQueryQueue(): Promise<void> {
  while (queryQueue.length > 0 && activeQueries < MAX_CONCURRENT_QUERIES) {
    const item = queryQueue.shift();
    if (!item) break;

    activeQueries++;
    item.queryFn()
      .then(result => {
        activeQueries--;
        item.resolve(result);
        processQueryQueue();
      })
      .catch(error => {
        activeQueries--;
        item.reject(error);
        processQueryQueue();
      });
  }
}

/**
 * Executa query com controle de concorrência
 */
async function queuedQuery(
  pool: Pool,
  queryText: string,
  params?: any[]
): Promise<QueryResult<any>> {
  return new Promise((resolve, reject) => {
    queryQueue.push({
      resolve,
      reject,
      queryFn: () => queryWithRetry(pool, queryText, params)
    });
    processQueryQueue();
  });
}

/**
 * Executa múltiplas queries em lotes controlados
 * Útil para o dashboard que precisa executar muitas queries
 */
export async function batchQueries<T>(
  queries: Array<{ sql: string; params?: any[] }>,
  batchSize: number = 4
): Promise<T[]> {
  const results: T[] = [];
  const poolInstance = getPool();

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(q => queryWithRetry(poolInstance, q.sql, q.params))
    );
    results.push(...batchResults.map(r => r as unknown as T));

    // Pequena pausa entre batches para liberar conexões
    if (i + batchSize < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return results;
}

/**
 * Executa queries em série (uma de cada vez)
 * Use quando precisa garantir ordem ou evitar sobrecarga
 */
export async function serialQueries<T>(
  queries: Array<{ sql: string; params?: any[] }>
): Promise<T[]> {
  const results: T[] = [];
  const poolInstance = getPool();

  for (const query of queries) {
    const result = await queryWithRetry(poolInstance, query.sql, query.params);
    results.push(result as unknown as T);
  }

  return results;
}

/**
 * Retorna informações sobre o estado atual do pool
 */
export function getPoolStats(): {
  total: number;
  idle: number;
  waiting: number;
  activeQueries: number;
  queuedQueries: number;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastHealthCheck: string;
} {
  const poolInstance = pool;
  return {
    total: poolInstance?.totalCount || 0,
    idle: poolInstance?.idleCount || 0,
    waiting: poolInstance?.waitingCount || 0,
    activeQueries,
    queuedQueries: queryQueue.length,
    isHealthy,
    consecutiveFailures,
    lastHealthCheck: lastHealthCheck ? new Date(lastHealthCheck).toISOString() : 'never'
  };
}

/**
 * Força uma verificação de saúde da conexão
 */
export async function forceHealthCheck(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const poolInstance = getPool();
    await poolInstance.query('SELECT 1');
    const latency = Date.now() - start;

    consecutiveFailures = 0;
    isHealthy = true;
    lastHealthCheck = Date.now();

    return { healthy: true, latency };
  } catch (error: any) {
    const latency = Date.now() - start;
    consecutiveFailures++;
    isHealthy = false;

    return {
      healthy: false,
      latency,
      error: error.message
    };
  }
}

/**
 * Pré-aquece o pool criando uma conexão inicial
 */
export async function warmupPool(): Promise<boolean> {
  try {
    console.log('[Pool] Iniciando warmup...');
    const poolInstance = getPool();
    await poolInstance.query('SELECT 1');
    console.log('[Pool] Warmup concluído com sucesso');
    isHealthy = true;
    consecutiveFailures = 0;
    return true;
  } catch (error: any) {
    console.error('[Pool] Erro no warmup:', error.message);
    return false;
  }
}

// Criar wrapper que mantém compatibilidade com código existente
// mas garante lazy initialization e retry automático
const poolWrapper = {
  query: async (...args: Parameters<Pool['query']>) => {
    const pool = getPool();
    const [queryText, params] = args;
    
    // Se for string (query), usar retry logic
    if (typeof queryText === 'string') {
      return queryWithRetry(pool, queryText, params);
    }
    
    // Caso contrário, usar query normal
    return pool.query(...args);
  },
  connect: (...args: Parameters<Pool['connect']>) => getPool().connect(...args),
  end: (...args: Parameters<Pool['end']>) => getPool().end(...args),
  on: (...args: Parameters<Pool['on']>) => getPool().on(...args),
  once: (...args: Parameters<Pool['once']>) => getPool().once(...args),
  removeListener: (...args: Parameters<Pool['removeListener']>) => getPool().removeListener(...args),
  removeAllListeners: (...args: Parameters<Pool['removeAllListeners']>) => getPool().removeAllListeners(...args),
  emit: (...args: Parameters<Pool['emit']>) => getPool().emit(...args),
  get totalCount() { return getPool().totalCount; },
  get idleCount() { return getPool().idleCount; },
  get waitingCount() { return getPool().waitingCount; },
} as Pool;

export default poolWrapper;

