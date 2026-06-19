/**
 * SEED EXTRAS (INCREMENTAL) — Banco DEMO (Supabase tbbnswuqsqhulserwtcc)
 * ============================================================================
 * Completa as 3 partes que ficaram fora do seed-completo-demo.js, SEM re-rodar
 * o seed inteiro (~18 min). Lê as entidades já marcadas como seed e insere
 * SOMENTE as novas partes, em lote:
 *
 *   1) conselho_classe + conselho_classe_alunos
 *        - 1 conselho por turma seed, no 4º bimestre (período final) do ano
 *        - 1 linha por aluno da turma, com parecer COERENTE cruzando a média
 *          das notas_escolares do 4º bimestre + a frequência do mesmo período
 *        - UNIQUE(turma_id, periodo_id) e UNIQUE(conselho_id, aluno_id) respeitados
 *
 *   2) resultados_producao + nota_producao/item_producao_N no consolidado
 *        - produção textual (8 itens reais de itens_producao) por aluno×avaliação
 *          para alunos que JÁ têm resultados_consolidados (participantes SISAM)
 *        - UNIQUE(aluno_id, item_producao_id, avaliacao_id) respeitado
 *        - consolidado recebe item_producao_1..8 e nota_producao (média dos itens)
 *
 *   3) series_disciplinas
 *        - É um catálogo GLOBAL (serie_id -> series_escolares), NÃO ligado às
 *          escolas seed. Já vem 100% povoado no banco. Este script só GARANTE
 *          (idempotente, sem duplicar) a grade do fundamental; na prática não
 *          insere nada se já completo. Ver relatório.
 *
 * IDEMPOTENTE: no início limpa APENAS as linhas dessas tabelas que pertencem
 * ao seed (via JOIN com escolas SEED-ESC-%). Nunca apaga dado sem marcador.
 * series_disciplinas usa ON CONFLICT DO NOTHING (não remove nada do catálogo).
 *
 * Conexão: lê DB_PASSWORD/DB_HOST de .env.local (mesmo padrão de
 *   scripts/seed/seed-completo-demo.js).
 *
 * Uso:  node scripts/seed/seed-extras-demo.js
 *       node scripts/seed/seed-extras-demo.js --limpar-apenas
 * ============================================================================
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const { v4: uuidv4 } = require('uuid')

// ---------------------------------------------------------------------------
// .env.local loader (idêntico ao seed-completo-demo.js)
// ---------------------------------------------------------------------------
function env() {
  const p = path.join(__dirname, '..', '..', '.env.local')
  if (!fs.existsSync(p)) return {}
  const o = {}
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1)
    o[m[1]] = v
  }
  return o
}
const e = env()
const cfg = {
  host: process.env.DB_HOST || 'db.tbbnswuqsqhulserwtcc.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DB_PASSWORD || e.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 0,
  query_timeout: 0,
}

const ANOS = ['2025', '2026']
const MEDIA_APROVACAO = 6.0
const FREQ_MINIMA = 75.0

// PRNG determinístico (mesma semente do seed completo p/ coerência)
let _rng = 987654321
function rnd() {
  _rng = (_rng * 1103515245 + 12345) & 0x7fffffff
  return _rng / 0x7fffffff
}
const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1))

// Disciplinas do fundamental por etapa (para garantia idempotente de series_disciplinas)
const DISC_INICIAIS = ['LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL']
const DISC_FINAIS = ['LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL', 'ING']

// ---------------------------------------------------------------------------
// Inserção em lote (multi-row) — copiada do seed completo
// ---------------------------------------------------------------------------
async function bulkInsert(client, table, columns, rows, { onConflict } = {}) {
  if (rows.length === 0) return 0
  const maxParams = 60000
  const perChunk = Math.max(1, Math.floor(maxParams / columns.length))
  let total = 0
  for (let i = 0; i < rows.length; i += perChunk) {
    const slice = rows.slice(i, i + perChunk)
    const values = []
    const params = []
    let p = 0
    for (const r of slice) {
      const ph = columns.map(() => `$${++p}`)
      values.push(`(${ph.join(',')})`)
      for (const c of columns) params.push(r[c] === undefined ? null : r[c])
    }
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${values.join(',')}` + (onConflict ? ` ${onConflict}` : '')
    const res = await client.query(sql, params)
    total += res.rowCount
  }
  return total
}

// ---------------------------------------------------------------------------
// LIMPEZA idempotente (somente marcadores seed)
// ---------------------------------------------------------------------------
async function limpar(client) {
  console.log('\n== LIMPEZA das 3 partes (apenas marcadores seed) ==')
  const escSeed = await client.query(`SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%'`)
  const escIds = escSeed.rows.map((r) => r.id)
  if (!escIds.length) { console.log('  Nenhuma escola seed. Nada a limpar.'); return [] }

  const steps = [
    ['conselho_classe_alunos', `DELETE FROM conselho_classe_alunos WHERE conselho_id IN (SELECT id FROM conselho_classe WHERE escola_id = ANY($1))`],
    ['conselho_classe', `DELETE FROM conselho_classe WHERE escola_id = ANY($1)`],
    ['resultados_producao', `DELETE FROM resultados_producao WHERE escola_id = ANY($1)`],
  ]
  for (const [label, sql] of steps) {
    try {
      const r = await client.query(sql, [escIds])
      if (r.rowCount) console.log(`  - ${label}: ${r.rowCount} removidos`)
    } catch (err) {
      console.log(`  - ${label}: pulado (${err.message})`)
    }
  }
  // reverte nota_producao/itens no consolidado seed (deixados pelo run anterior deste script)
  try {
    const r = await client.query(
      `UPDATE resultados_consolidados
         SET nota_producao=NULL, item_producao_1=NULL, item_producao_2=NULL, item_producao_3=NULL,
             item_producao_4=NULL, item_producao_5=NULL, item_producao_6=NULL, item_producao_7=NULL, item_producao_8=NULL
       WHERE escola_id = ANY($1) AND nota_producao IS NOT NULL`, [escIds])
    if (r.rowCount) console.log(`  - resultados_consolidados (reset produção): ${r.rowCount} linhas`)
  } catch (err) { console.log(`  - reset consolidado: pulado (${err.message})`) }

  console.log('  Limpeza concluída.')
  return escIds
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  const limparApenas = process.argv.includes('--limpar-apenas')
  const pool = new Pool(cfg)
  const client = await pool.connect()
  console.log(`Conectado a ${cfg.host}:${cfg.port}/${cfg.database} (user ${cfg.user})`)

  try {
    await limpar(client)
    if (limparApenas) { console.log('\n--limpar-apenas: encerrando.'); return }

    // ---- Referências ----
    const escIds = (await client.query(`SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%'`)).rows.map((r) => r.id)
    if (!escIds.length) throw new Error('Nenhuma escola SEED-ESC-% encontrada. Rode o seed-completo-demo.js primeiro.')

    // Períodos (bimestres) por ano -> 4º bimestre = período final
    const periodos = (await client.query(
      `SELECT id, numero, ano_letivo FROM periodos_letivos WHERE tipo_periodo='bimestre' ORDER BY ano_letivo, numero`)).rows
    const periodoFinal = {} // ano -> id do 4º bimestre
    for (const a of ANOS) {
      const lista = periodos.filter((p) => p.ano_letivo === a).sort((x, y) => x.numero - y.numero)
      if (lista.length < 4) throw new Error(`Faltam bimestres do ano ${a}`)
      periodoFinal[a] = lista[3].id
    }

    // Avaliações ano|tipo -> id
    const avalRows = (await client.query(`SELECT id, ano_letivo, tipo FROM avaliacoes`)).rows
    const avalMap = {}
    for (const r of avalRows) avalMap[`${r.ano_letivo}|${r.tipo}`] = r.id

    // Itens de produção (8 reais)
    const itens = (await client.query(`SELECT id, ordem FROM itens_producao WHERE ativo ORDER BY ordem`)).rows
    if (!itens.length) throw new Error('Nenhum item de produção ativo em itens_producao.')

    // Turmas seed
    const turmas = (await client.query(
      `SELECT id, escola_id, ano_letivo, serie FROM turmas WHERE escola_id = ANY($1)`, [escIds])).rows

    await client.query('BEGIN')

    // =====================================================================
    // PARTE 1 — CONSELHO DE CLASSE (1 por turma, 4º bimestre) + alunos
    // =====================================================================
    // Médias do 4º bimestre por aluno (nota_final média entre disciplinas)
    const mediasRows = (await client.query(
      `SELECT n.aluno_id, AVG(n.nota_final)::numeric(5,2) AS media
         FROM notas_escolares n
         JOIN turmas t ON t.id = n.turma_id
        WHERE n.escola_id = ANY($1)
          AND n.periodo_id IN (SELECT id FROM periodos_letivos WHERE tipo_periodo='bimestre' AND numero=4)
        GROUP BY n.aluno_id`, [escIds])).rows
    const mediaPorAluno = {}
    for (const r of mediasRows) mediaPorAluno[r.aluno_id] = Number(r.media)

    // Frequência do 4º bimestre por aluno
    const freqRows = (await client.query(
      `SELECT aluno_id, percentual_frequencia FROM frequencia_bimestral
        WHERE escola_id = ANY($1)
          AND periodo_id IN (SELECT id FROM periodos_letivos WHERE tipo_periodo='bimestre' AND numero=4)`, [escIds])).rows
    const freqPorAluno = {}
    for (const r of freqRows) freqPorAluno[r.aluno_id] = Number(r.percentual_frequencia)

    // Alunos por turma
    const alunosRows = (await client.query(
      `SELECT id, turma_id FROM alunos WHERE escola_id = ANY($1)`, [escIds])).rows
    const alunosPorTurma = {}
    for (const a of alunosRows) (alunosPorTurma[a.turma_id] ||= []).push(a.id)

    const conselhos = []
    const conselhoAlunos = []
    const ATAS = [
      'Reunião do conselho de classe final. Análise de aprovação por turma.',
      'Conselho final: deliberação sobre rendimento e frequência da turma.',
      'Reunião deliberativa de encerramento do ano letivo.',
    ]
    let aprovados = 0, conselho = 0, reprovados = 0
    for (const t of turmas) {
      const conselhoId = uuidv4()
      const dataReuniao = `${t.ano_letivo}-12-${String(randint(5, 18)).padStart(2, '0')}`
      conselhos.push({
        id: conselhoId, turma_id: t.id, periodo_id: periodoFinal[t.ano_letivo], escola_id: t.escola_id,
        ano_letivo: t.ano_letivo, data_reuniao: dataReuniao,
        ata_geral: ATAS[Math.floor(rnd() * ATAS.length)], registrado_por: null,
      })
      for (const alunoId of (alunosPorTurma[t.id] || [])) {
        const media = mediaPorAluno[alunoId]
        const freq = freqPorAluno[alunoId]
        let parecer, obs
        if (media != null && media >= MEDIA_APROVACAO && (freq == null || freq >= FREQ_MINIMA)) {
          parecer = 'aprovado'; obs = 'Aprovado por média e frequência.'
          aprovados++
        } else if (freq != null && freq < 60) {
          parecer = 'reprovado'; obs = 'Reprovado por frequência insuficiente.'
          reprovados++
        } else if (media != null && media < MEDIA_APROVACAO) {
          // maioria vai a conselho; uma fração é reprovada
          if (rnd() < 0.7) { parecer = 'conselho'; obs = 'Encaminhado ao conselho de classe.'; conselho++ }
          else { parecer = 'reprovado'; obs = 'Reprovado por rendimento.'; reprovados++ }
        } else {
          parecer = 'aprovado'; obs = 'Aprovado.'
          aprovados++
        }
        conselhoAlunos.push({ id: uuidv4(), conselho_id: conselhoId, aluno_id: alunoId, parecer, observacao: obs })
      }
    }
    const nConselho = await bulkInsert(client, 'conselho_classe',
      ['id', 'turma_id', 'periodo_id', 'escola_id', 'ano_letivo', 'data_reuniao', 'ata_geral', 'registrado_por'], conselhos)
    const nConselhoAl = await bulkInsert(client, 'conselho_classe_alunos',
      ['id', 'conselho_id', 'aluno_id', 'parecer', 'observacao'], conselhoAlunos)
    console.log(`\nPARTE 1 — conselho_classe: ${nConselho} | conselho_classe_alunos: ${nConselhoAl}`)
    console.log(`  pareceres → aprovado=${aprovados} conselho=${conselho} reprovado=${reprovados}`)

    // =====================================================================
    // PARTE 2 — RESULTADOS_PRODUCAO + nota_producao no consolidado
    // =====================================================================
    // Alunos participantes SISAM = têm consolidado. (aluno_id, ano, serie, turma, escola, avaliacao)
    const consRows = (await client.query(
      `SELECT id, aluno_id, escola_id, turma_id, ano_letivo, serie, avaliacao_id
         FROM resultados_consolidados WHERE escola_id = ANY($1)`, [escIds])).rows

    const producao = []
    const consUpdates = [] // {id, nota_producao, item_producao_1..8}
    for (const c of consRows) {
      // habilidade de escrita do aluno nesta avaliação
      const base = 4 + rnd() * 5 // 4.0 .. 9.0
      const itensNotas = []
      for (const item of itens) {
        // varia em torno da base por critério
        let nota = base + (rnd() * 2 - 1) // ±1
        nota = Math.max(0, Math.min(10, Math.round(nota * 10) / 10))
        itensNotas.push(nota)
        producao.push({
          id: uuidv4(), aluno_id: c.aluno_id, escola_id: c.escola_id, turma_id: c.turma_id,
          item_producao_id: item.id, ano_letivo: c.ano_letivo, serie: c.serie,
          data_avaliacao: `${c.ano_letivo}-10-15`, nota,
          observacao: null, avaliacao_id: c.avaliacao_id,
        })
      }
      const mediaProd = Math.round((itensNotas.reduce((a, b) => a + b, 0) / itensNotas.length) * 10) / 10
      consUpdates.push({
        id: c.id, nota_producao: mediaProd,
        i1: itensNotas[0], i2: itensNotas[1], i3: itensNotas[2], i4: itensNotas[3],
        i5: itensNotas[4], i6: itensNotas[5], i7: itensNotas[6], i8: itensNotas[7],
      })
    }
    const nProd = await bulkInsert(client, 'resultados_producao',
      ['id', 'aluno_id', 'escola_id', 'turma_id', 'item_producao_id', 'ano_letivo', 'serie', 'data_avaliacao', 'nota', 'observacao', 'avaliacao_id'],
      producao)
    console.log(`\nPARTE 2 — resultados_producao: ${nProd}`)

    // Atualiza consolidado em lote via VALUES + UPDATE FROM
    let nConsUpd = 0
    const chunk = 2000
    for (let i = 0; i < consUpdates.length; i += chunk) {
      const slice = consUpdates.slice(i, i + chunk)
      const vals = []
      const params = []
      let p = 0
      for (const u of slice) {
        vals.push(`($${++p}::uuid,$${++p}::numeric,$${++p}::numeric,$${++p}::numeric,$${++p}::numeric,$${++p}::numeric,$${++p}::numeric,$${++p}::numeric,$${++p}::numeric,$${++p}::numeric)`)
        params.push(u.id, u.nota_producao, u.i1, u.i2, u.i3, u.i4, u.i5, u.i6, u.i7, u.i8)
      }
      const sql = `
        UPDATE resultados_consolidados rc SET
          nota_producao = v.np, item_producao_1=v.i1, item_producao_2=v.i2, item_producao_3=v.i3,
          item_producao_4=v.i4, item_producao_5=v.i5, item_producao_6=v.i6, item_producao_7=v.i7, item_producao_8=v.i8
        FROM (VALUES ${vals.join(',')}) AS v(id, np, i1, i2, i3, i4, i5, i6, i7, i8)
        WHERE rc.id = v.id`
      const r = await client.query(sql, params)
      nConsUpd += r.rowCount
    }
    console.log(`  resultados_consolidados atualizados (nota_producao + itens): ${nConsUpd}`)

    // =====================================================================
    // PARTE 3 — SERIES_DISCIPLINAS (catálogo global; garantia idempotente)
    // =====================================================================
    const seriesEsc = (await client.query(
      `SELECT id, codigo, etapa FROM series_escolares WHERE etapa LIKE 'fundamental_%'`)).rows
    const discRows = (await client.query(`SELECT id, codigo FROM disciplinas_escolares WHERE ativo`)).rows
    const discByCod = {}
    for (const d of discRows) discByCod[d.codigo] = d.id

    const vinculos = []
    for (const s of seriesEsc) {
      const codigos = s.etapa === 'fundamental_anos_finais' ? DISC_FINAIS : DISC_INICIAIS
      for (const cod of codigos) {
        const did = discByCod[cod]
        if (!did) continue
        vinculos.push({
          id: uuidv4(), serie_id: s.id, disciplina_id: did,
          obrigatoria: true, carga_horaria_semanal: 4, ativo: true,
        })
      }
    }
    const nVinc = await bulkInsert(client, 'series_disciplinas',
      ['id', 'serie_id', 'disciplina_id', 'obrigatoria', 'carga_horaria_semanal', 'ativo'],
      vinculos, { onConflict: 'ON CONFLICT (serie_id, disciplina_id) DO NOTHING' })
    console.log(`\nPARTE 3 — series_disciplinas inseridos (apenas faltantes): ${nVinc} (catálogo já estava completo se 0)`)

    await client.query('COMMIT')
    console.log('\n== COMMIT OK ==')

    // ---- VERIFICAÇÃO ----
    const verif = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT
        (SELECT count(*) FROM conselho_classe WHERE escola_id IN (SELECT id FROM esc)) conselho_classe,
        (SELECT count(*) FROM conselho_classe_alunos cca
           JOIN conselho_classe cc ON cc.id=cca.conselho_id
          WHERE cc.escola_id IN (SELECT id FROM esc)) conselho_classe_alunos,
        (SELECT count(*) FROM resultados_producao WHERE escola_id IN (SELECT id FROM esc)) resultados_producao,
        (SELECT count(*) FROM resultados_consolidados WHERE escola_id IN (SELECT id FROM esc) AND nota_producao IS NOT NULL) consolidados_com_producao,
        (SELECT count(*) FROM series_disciplinas) series_disciplinas_total
    `)
    console.log('\n== CONTAGENS FINAIS (seed) ==')
    console.table(verif.rows)

    const pareceres = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT cca.parecer, count(*) n
        FROM conselho_classe_alunos cca
        JOIN conselho_classe cc ON cc.id=cca.conselho_id
       WHERE cc.escola_id IN (SELECT id FROM esc)
       GROUP BY cca.parecer ORDER BY n DESC`)
    console.log('\n== Pareceres do conselho ==')
    console.table(pareceres.rows)
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) {}
    console.error('\nERRO — ROLLBACK executado:', err.message)
    console.error(err.stack)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((x) => { console.error('Erro fatal:', x.message); process.exit(1) })
