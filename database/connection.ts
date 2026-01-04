import { Pool } from 'pg';

let pool: Pool | null = null;
let poolConfig: {
  host?: string;
  database?: string;
  user?: string;
  port?: number;
} | null = null;

function createPool(): Pool {
  // Detectar se está conectando ao Supabase
  const isSupabase = process.env.DB_HOST?.includes('supabase.co') || 
                     process.env.DB_HOST?.includes('pooler.supabase.com') ||
                     process.env.DB_HOST?.includes('aws-0-');
  
  // Validar variáveis de ambiente obrigatórias
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined;
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

  // Configuração SSL: sempre usar para Supabase, produção ou quando DB_SSL=true
  const sslConfig = process.env.NODE_ENV === 'production' || 
                    process.env.DB_SSL === 'true' || 
                    isSupabase
    ? {
        rejectUnauthorized: false, // Aceita certificados auto-assinados
      }
    : false;

  const config: any = {
    host: host,
    port: port || 5432,
    database: database,
    user: user,
    password: password,
    // Reduzido para evitar MaxClientsInSessionMode em Supabase/Neon
    max: isSupabase ? 5 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: isSupabase ? 30000 : 10000,
    ssl: sslConfig,
    // Opções adicionais para melhorar conectividade
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };

  // Configurações especiais para Vercel + Supabase
  if (process.env.NODE_ENV === 'production' && isSupabase) {
    // Forçar IPv4 primeiro (mais confiável na Vercel)
    config.family = 4; // 4 = IPv4 apenas
    
    // Aumentar timeouts para dar tempo de resolver DNS
    config.connectionTimeoutMillis = 30000;
    config.query_timeout = 60000;
    config.statement_timeout = 60000;
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
    console.error('Erro inesperado no pool de conexões:', {
      code: err?.code || 'UNKNOWN',
      message: err?.message || 'Erro desconhecido',
      host: config.host,
    });
    
    // Se for erro de conexão, resetar pool para forçar recriação
    const errorCode = err?.code;
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
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao testar conexão:', {
      code: error.code,
      message: error.message,
      host: process.env.DB_HOST,
    });
    
    // Resetar pool em caso de erro
    resetPool();
    
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao conectar ao banco de dados',
    };
  }
}

// Criar wrapper que mantém compatibilidade com código existente
// mas garante lazy initialization
const poolWrapper = {
  query: (...args: Parameters<Pool['query']>) => getPool().query(...args),
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

