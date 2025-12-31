import { Pool } from 'pg';

// Configuração SSL para produção
const sslConfig = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' 
  ? {
      rejectUnauthorized: false, // Aceita certificados auto-assinados
    }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Aumentado para produção
  ssl: sslConfig,
});

// Tratamento de erros de conexão
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões:', err);
});

export default pool;

