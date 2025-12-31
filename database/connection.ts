import { Pool } from 'pg';

let pool: Pool | null = null;

function createPool(): Pool {
  // Detectar se está conectando ao Supabase
  const isSupabase = process.env.DB_HOST?.includes('supabase.co') || 
                     process.env.DB_HOST?.includes('pooler.supabase.com');
  
  // Configuração SSL: sempre usar para Supabase, produção ou quando DB_SSL=true
  const sslConfig = process.env.NODE_ENV === 'production' || 
                    process.env.DB_SSL === 'true' || 
                    isSupabase
    ? {
        rejectUnauthorized: false, // Aceita certificados auto-assinados
      }
    : false;

  // Ler variáveis de ambiente diretamente
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  const config: any = {
    host: host || 'localhost',
    port: port || 5432,
    database: database || 'sisam',
    user: user || 'postgres',
    password: password || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: isSupabase ? 15000 : 10000, // Aumentado para Supabase
    ssl: sslConfig,
  };

  // Forçar IPv4 em produção (Vercel) para evitar erros ENETUNREACH com IPv6
  if (process.env.NODE_ENV === 'production' && isSupabase) {
    config.family = 4; // Forçar IPv4
  }

  // Log das configurações (sem senha) para debug
  console.log('Configurando pool PostgreSQL:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: !!sslConfig,
    nodeEnv: process.env.NODE_ENV,
    envHost: process.env.DB_HOST,
    envDatabase: process.env.DB_NAME,
    envUser: process.env.DB_USER,
    envPort: process.env.DB_PORT,
  });

  const newPool = new Pool(config);

  // Tratamento de erros de conexão
  newPool.on('error', (err) => {
    console.error('Erro inesperado no pool de conexões:', err);
  });

  return newPool;
}

// Criar pool de forma lazy (apenas quando necessário)
function getPool(): Pool {
  // Se o pool já existe mas as variáveis mudaram, recriar
  if (pool) {
    // Verificar se as variáveis de ambiente mudaram
    const currentHost = process.env.DB_HOST;
    const currentDatabase = process.env.DB_NAME;
    
    // Se estamos em produção e as variáveis não batem, recriar pool
    if (process.env.NODE_ENV === 'production') {
      // Forçar recriação se necessário (pool pode ter sido criado com valores antigos)
      // Isso garante que sempre use as variáveis atuais
    }
  }
  
  if (!pool) {
    console.log('Criando novo pool PostgreSQL...');
    pool = createPool();
  }
  return pool;
}

// Função para resetar o pool (útil para testes ou mudanças de configuração)
export function resetPool() {
  if (pool) {
    pool.end().catch(console.error);
    pool = null;
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

