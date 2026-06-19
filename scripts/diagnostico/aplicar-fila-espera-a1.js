/**
 * Aplica a migration separar-fila-espera-publica.sql na DEMO (A1).
 * Lê a senha do .env.local (não hardcoded). A migration já contém BEGIN/COMMIT
 * e blocos DO com RAISE NOTICE — capturamos os notices e abortamos no 1o erro.
 *
 * Uso: node scripts/diagnostico/aplicar-fila-espera-a1.js
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

function carregarEnvLocal() {
  const envPath = path.join(__dirname, '..', '..', '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const out = {}
  for (const linha of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

const env = carregarEnvLocal()
const cfg = {
  host: process.env.DB_HOST || 'db.tbbnswuqsqhulserwtcc.supabase.co',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
}
if (!cfg.password) { console.error('ERRO: senha não encontrada (.env.local DB_PASSWORD).'); process.exit(1) }

const sqlPath = path.join(__dirname, '..', '..', 'database', 'migrations', 'separar-fila-espera-publica.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

async function main() {
  const pool = new Pool(cfg)
  const client = await pool.connect()
  client.on('notice', (n) => console.log('NOTICE:', n.message))
  console.log(`Aplicando ${path.basename(sqlPath)} em ${cfg.host}:${cfg.port}/${cfg.database}...\n`)
  try {
    await client.query(sql) // a migration tem seu próprio BEGIN/COMMIT
    console.log('\n✅ Migration aplicada com sucesso (commit).')
    // Verificação independente pós-aplicação
    const v = await client.query(`
      SELECT
        (SELECT is_nullable FROM information_schema.columns WHERE table_name='fila_espera' AND column_name='aluno_id') AS fe_aluno_nullable,
        (SELECT is_nullable FROM information_schema.columns WHERE table_name='fila_espera' AND column_name='turma_id') AS fe_turma_nullable,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='fila_espera_publica') AS tem_publica,
        EXISTS(SELECT 1 FROM pg_constraint WHERE conname='fila_espera_status_check') AS tem_check`)
    console.table(v.rows)
  } catch (e) {
    console.error('\n❌ Falhou (rollback automático da transação):', e.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}
main().catch((e) => { console.error('Erro:', e.message); process.exit(1) })
