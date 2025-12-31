import { Pool } from 'pg';

let pool: Pool | null = null;

function createPool(): Pool {
  // Configuração SSL para produção
  const sslConfig = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' 
    ? {
        rejectUnauthorized: false, // Aceita certificados auto-assinados
      }
    : false;

  // Ler variáveis de ambiente diretamente (não usar valores padrão para produção)
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  // Em produção, exigir todas as variáveis
  if (process.env.NODE_ENV === 'production') {
    if (!host || !port || !database || !user || !password) {
      throw new Error(
        `Variáveis de ambiente do banco não configuradas. ` +
        `Faltando: ${!host ? 'DB_HOST ' : ''}${!port ? 'DB_PORT ' : ''}${!database ? 'DB_NAME ' : ''}${!user ? 'DB_USER ' : ''}${!password ? 'DB_PASSWORD' : ''}`
      );
    }
  }

  const config = {
    host: host || 'localhost',
    port: port || 5432,
    database: database || 'sisam',
    user: user || 'postgres',
    password: password || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: sslConfig,
  };

  // Log das configurações (sem senha) para debug
  console.log('Configurando pool PostgreSQL:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: !!sslConfig,
    nodeEnv: process.env.NODE_ENV,
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
  if (!pool) {
    pool = createPool();
  }
  return pool;
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

