/**
 * resultados_*.aluno_id NOT NULL — pré-check e aplicação (A1 anterior / Cluster E).
 *
 * Modos:
 *   node scripts/diagnostico/resultados-aluno-id.js check   (default, SOMENTE LEITURA)
 *   node scripts/diagnostico/resultados-aluno-id.js apply   (aplica a migration)
 *
 * Lê a senha do .env.local (não hardcoded). A migration tem seu próprio BEGIN/COMMIT
 * e é defensiva (DELETE só de aluno_id IS NULL — linhas órfãs/ilegíveis).
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

function carregarEnvLocal() {
  const p = path.join(__dirname, '..', '..', '.env.local')
  if (!fs.existsSync(p)) return {}
  const out = {}
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
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

const modo = (process.argv[2] || 'check').toLowerCase()

const CHECK_SQL = `
  SELECT 'resultados_provas' AS tabela,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE aluno_id IS NULL) AS orfaos_aluno_null
  FROM resultados_provas
  UNION ALL
  SELECT 'resultados_consolidados', COUNT(*), COUNT(*) FILTER (WHERE aluno_id IS NULL)
  FROM resultados_consolidados
  UNION ALL
  SELECT 'resultados_producao', COUNT(*), COUNT(*) FILTER (WHERE aluno_id IS NULL)
  FROM resultados_producao;`

async function main() {
  const pool = new Pool(cfg)
  const client = await pool.connect()
  client.on('notice', (n) => console.log('NOTICE:', n.message))
  console.log(`[${modo}] ${cfg.host}:${cfg.port}/${cfg.database}\n`)
  try {
    console.log('== Pré-check: linhas com aluno_id IS NULL (seriam DELETADAS) ==')
    const chk = await client.query(CHECK_SQL)
    console.table(chk.rows)

    if (modo === 'apply') {
      const sqlPath = path.join(__dirname, '..', '..', 'database', 'migrations', 'resultados-aluno-id-not-null.sql')
      console.log(`\n== Aplicando ${path.basename(sqlPath)} ==`)
      await client.query(fs.readFileSync(sqlPath, 'utf8'))
      console.log('✅ Migration aplicada (commit).')
      const v = await client.query(`
        SELECT
          (SELECT is_nullable FROM information_schema.columns WHERE table_name='resultados_provas' AND column_name='aluno_id') AS provas_aluno_nullable,
          (SELECT is_nullable FROM information_schema.columns WHERE table_name='resultados_consolidados' AND column_name='aluno_id') AS consolidados_aluno_nullable,
          (SELECT is_nullable FROM information_schema.columns WHERE table_name='resultados_producao' AND column_name='aluno_id') AS producao_aluno_nullable`)
      console.table(v.rows)
    } else {
      console.log('\n(modo check — nada foi alterado. Para aplicar: node scripts/diagnostico/resultados-aluno-id.js apply)')
    }
  } catch (e) {
    console.error('\n❌ Erro (rollback se em transação):', e.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}
main().catch((e) => { console.error('Erro:', e.message); process.exit(1) })
