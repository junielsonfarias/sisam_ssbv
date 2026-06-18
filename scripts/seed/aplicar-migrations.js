/**
 * APLICAR TODAS AS MIGRATIONS num banco vazio (ex.: novo projeto Supabase de demo).
 * ---------------------------------------------------------------------------
 * Aplica o schema consolidado (supabase/migrations/*.sql) + todas as deltas
 * (database/migrations/*.sql) em PASSES ITERATIVOS: tenta aplicar todos os
 * arquivos repetidamente; a cada passe, arquivos que dependiam de outros já
 * aplicados passam a funcionar. Para quando um passe não aplica nada novo.
 * Como as migrations são idempotentes (IF NOT EXISTS), reaplicar é seguro.
 *
 * ⚠️ Use SOMENTE em um banco de DEMONSTRAÇÃO/vazio. Reqer DB_* no ambiente.
 * Uso: `node scripts/seed/aplicar-migrations.js`
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const ROOT = path.join(__dirname, '..', '..')
const isSupabase = (process.env.DB_HOST || '').includes('supabase')
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: (process.env.DB_SSL === 'true' || isSupabase) ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 20000,
})

function listSql(dir) {
  const full = path.join(ROOT, dir)
  if (!fs.existsSync(full)) return []
  return fs.readdirSync(full).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(full, f))
}

const CORE = ['usuarios', 'polos', 'escolas', 'turmas', 'alunos', 'periodos_letivos',
  'disciplinas_escolares', 'professor_turmas', 'responsaveis_alunos', 'notas_escolares', 'frequencia_bimestral', 'anos_letivos']

async function main() {
  // Base consolidada primeiro, depois as deltas.
  const base = listSql('supabase/migrations')
  const deltas = listSql('database/migrations')
  let pending = [...base, ...deltas]
  console.log(`📦 ${pending.length} arquivos SQL (${base.length} base + ${deltas.length} deltas)`)

  const c = await pool.connect()
  try {
    await c.query('SELECT 1')
    let passe = 0
    const erros = {}
    while (pending.length > 0) {
      passe++
      const aindaFalha = []
      let aplicados = 0
      for (const file of pending) {
        const sql = fs.readFileSync(file, 'utf8')
        try {
          await c.query(sql)
          aplicados++
        } catch (e) {
          erros[path.basename(file)] = e.message
          aindaFalha.push(file)
        }
      }
      console.log(`  passe ${passe}: aplicados ${aplicados}, pendentes ${aindaFalha.length}`)
      if (aplicados === 0) { pending = aindaFalha; break }
      pending = aindaFalha
    }

    if (pending.length > 0) {
      console.log(`\n⚠️  ${pending.length} arquivo(s) não aplicados (provavelmente fixes/data não aplicáveis a banco novo):`)
      for (const f of pending) console.log(`   - ${path.basename(f)}: ${String(erros[path.basename(f)]).slice(0, 120)}`)
    }

    // Verificação das tabelas core
    const r = await c.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`, [CORE])
    const have = r.rows.map((x) => x.table_name)
    const faltando = CORE.filter((t) => !have.includes(t))
    console.log(`\n📋 Tabelas core: ${have.length}/${CORE.length} presentes.`)
    if (faltando.length) console.log(`   ❌ FALTAM: ${faltando.join(', ')}`)
    else console.log('   ✅ Todas as tabelas core existem.')

    const tot = await c.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`)
    console.log(`\n🎉 Schema aplicado. Total de tabelas no public: ${tot.rows[0].n}`)
  } catch (e) {
    console.error('❌ Erro fatal:', e.message)
    process.exitCode = 1
  } finally {
    c.release()
    await pool.end()
  }
}

main()
