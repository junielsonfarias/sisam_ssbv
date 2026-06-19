/**
 * Diagnóstico A1 — fila_espera (SOMENTE LEITURA).
 *
 * Confirma a forma real da tabela fila_espera no banco antes de decidir a
 * migration de reconciliação. Não altera nada (só SELECT / catálogo).
 *
 * A senha NÃO é hardcoded: é lida do .env.local (DB_PASSWORD) ou de process.env.
 * Conexão default: o host/porta da DEMO informados pelo usuário; sobrescreva via
 * env (DB_HOST/DB_PORT/DB_NAME/DB_USER) se precisar.
 *
 * Uso (no seu shell, com rede):
 *   node scripts/diagnostico/fila-espera-a1.js
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

// --- carregar .env.local manualmente (sem depender de dotenv) ---
function carregarEnvLocal() {
  const envPath = path.join(__dirname, '..', '..', '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const out = {}
  for (const linha of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[m[1]] = val
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

if (!cfg.password) {
  console.error('ERRO: senha não encontrada. Defina DB_PASSWORD no .env.local ou no ambiente.')
  process.exit(1)
}

const QUERIES = [
  ['1. Estrutura real da tabela fila_espera', `
    SELECT column_name, is_nullable, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'fila_espera'
    ORDER BY ordinal_position;`],
  ['2. CHECK constraints (existe CHECK de status?)', `
    SELECT con.conname, pg_get_constraintdef(con.oid) AS definicao
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'fila_espera' AND con.contype = 'c';`],
  ['2b. Demais constraints (UNIQUE / FK / PK)', `
    SELECT con.contype, con.conname, pg_get_constraintdef(con.oid) AS definicao
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'fila_espera'
    ORDER BY con.contype;`],
  ['3. Volume por cenario (decide a migracao de dados)', `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE aluno_id IS NULL) AS publicas_sem_aluno,
      COUNT(*) FILTER (WHERE aluno_id IS NOT NULL) AS internas_com_aluno,
      COUNT(*) FILTER (WHERE status IN ('aprovado','rejeitado')) AS status_publico,
      COUNT(*) FILTER (WHERE status IN ('convocado','desistente')) AS status_interno,
      COUNT(*) FILTER (WHERE status NOT IN ('aguardando','convocado','matriculado','desistente','aprovado','rejeitado')) AS status_inesperado
    FROM fila_espera;`],
  ['4. Distribuicao de status', `
    SELECT status, COUNT(*) AS qtd,
           COUNT(*) FILTER (WHERE aluno_id IS NULL) AS sem_aluno_id
    FROM fila_espera
    GROUP BY status
    ORDER BY qtd DESC;`],
]

async function main() {
  const pool = new Pool(cfg)
  console.log(`Conectando em ${cfg.host}:${cfg.port}/${cfg.database} (user ${cfg.user})...\n`)
  const client = await pool.connect()
  try {
    for (const [titulo, sql] of QUERIES) {
      console.log(`\n== ${titulo} ==`)
      try {
        const r = await client.query(sql)
        console.table(r.rows)
      } catch (e) {
        console.error(`  (falha nesta query: ${e.message})`)
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1) })
