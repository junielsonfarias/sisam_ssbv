/**
 * SEED FASE 2 — COMPLETUDE DA DEMO — Banco DEMO (Supabase tbbnswuqsqhulserwtcc)
 * ============================================================================
 * Preenche as LACUNAS de completude da massa de demonstração, aplicada a TODOS
 * os dados seed (escolas `SEED-ESC-%`, que englobam os alunos `SEED-%` incluindo
 * os criados na Fase 1). Não cria escolas/turmas/alunos novos — apenas enriquece
 * o que já existe. Escopo estritamente seed; nunca toca dado sem marcador.
 *
 * MARCADOR DE ESCOPO (idempotência):
 *   escolas seed     → escolas.codigo LIKE 'SEED-ESC-%'  (todas as turmas/alunos
 *                      dessas escolas têm codigo LIKE 'SEED-%')
 *   responsáveis     → usuarios.email LIKE '%.resp.seed@educanet.app'
 *                      (marcador EXCLUSIVO desta fase; vínculos em
 *                       responsaveis_alunos vêm desses usuários)
 *
 * O QUE POPULA (na ordem da tarefa):
 *  (1) NÍVEIS SISAM por disciplina (UPDATE em resultados_consolidados seed):
 *      preenche nivel_lp / nivel_mat / nivel_prod / nivel_aluno replicando
 *      FIELMENTE a regra do projeto (lib/config-series/niveis.ts +
 *      lib/services/importacao/process.ts):
 *        - Só para ANOS INICIAIS (séries 2,3,5) — exatamente como o import faz.
 *          Anos finais (6-9) ficam NULL por design do sistema.
 *        - nivel_lp/nivel_mat = calcularNivelPorAcertos(total_acertos, serie, disc)
 *        - nivel_prod = converterNivelProducao(nivel_aprendizagem) com fallback
 *          calcularNivelPorNota(nota_producao)
 *        - nivel_aluno = média (N1..N4) dos três
 *  (2) metas_escola: meta por (escola seed × ano_letivo × indicador) para os 4
 *      indicadores válidos {frequencia, media_sisam, aprovacao, evasao},
 *      plausível e levemente acima do realizado (UPSERT no UNIQUE).
 *  (3) PORTAL DO RESPONSÁVEL: 1 usuário tipo 'responsavel' por aluno seed ATIVO,
 *      com vínculo aprovado em responsaveis_alunos (tabela canônica usada pelo
 *      portal — /api/responsavel/filhos). Login: senha 'Educanet@2026'.
 *  (4) AEE: para cada aluno seed pcd=true → 1 linha em alunos_aee (tipos_deficiencia
 *      coerente com tipo_deficiencia), 1 aee_planos_individuais e ~2 aee_atendimentos.
 *      Cria 1 sala de recursos por escola seed.
 *  (5) ATIVIDADE PEDAGÓGICA (volume MODERADO, só ano corrente 2026):
 *      diario_classe, comunicados_turma, tarefas_turma e frequencia_diaria.
 *
 * LIMPEZA (no início, SÓ o que ESTA fase cria; ordem de dependência):
 *   - responsaveis_alunos + usuarios dos responsáveis seed (email %.resp.seed@).
 *   - alunos_aee / aee_atendimentos / aee_planos_individuais / aee_salas_recursos
 *     das escolas seed.
 *   - diario_classe / comunicados_turma / tarefas_turma / frequencia_diaria das
 *     turmas/escolas seed (apenas as criadas aqui: ano 2026 + marcadores de data).
 *   - Os níveis (item 1) são UPDATE idempotente (recalculados; reexecutar converge).
 *   - metas_escola seed: UPSERT idempotente.
 *
 * Conexão: lê DB_PASSWORD de .env.local; conecta direto em
 *   db.tbbnswuqsqhulserwtcc.supabase.co:5432/postgres (user postgres, SSL).
 *
 * Uso:  node scripts/seed/seed-fase2-demo.js
 *       node scripts/seed/seed-fase2-demo.js --limpar-apenas
 * ============================================================================
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const { v4: uuidv4 } = require('uuid')

// ---------------------------------------------------------------------------
// .env.local loader (mesmo padrão de scripts/seed/seed-fase1-demo.js)
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

// Hash bcrypt de 'Educanet@2026' (mesmo das credenciais demo *.demo@educanet.app,
// já validado no banco). Login do responsável usa este hash.
const SENHA_EDUCANET2026_HASH = '$2a$10$jXrEpIzc9r4xkwzylZlu.ePLvsDn81sA.TT1/YH2X7u7qsuf6BHWq'

const ANO_CORRENTE = '2026'

// ---------------------------------------------------------------------------
// RNG determinístico (seed própria desta fase)
// ---------------------------------------------------------------------------
let _rng = 975312468
function rnd() {
  _rng = (_rng * 1103515245 + 12345) & 0x7fffffff
  return _rng / 0x7fffffff
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1))

// ---------------------------------------------------------------------------
// Geradores pt-BR para responsáveis (sem PII real)
// ---------------------------------------------------------------------------
const PRENOMES_M = ['José', 'Antônio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Luiz', 'Marcos', 'Raimundo', 'Sebastião', 'Manoel', 'Jorge', 'Roberto', 'Edson', 'Geraldo']
const PRENOMES_F = ['Maria', 'Ana', 'Francisca', 'Antônia', 'Adriana', 'Juliana', 'Márcia', 'Fernanda', 'Patrícia', 'Rosa', 'Sandra', 'Lúcia', 'Vera', 'Cláudia', 'Raimunda']
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Gomes']

// CPF fake ÚNICO e determinístico: prefixo '99' (inexistente no banco) + sequência
// de 9 dígitos. Garante unicidade no índice parcial idx_usuarios_cpf_unique
// (UNIQUE em cpf WHERE cpf IS NOT NULL). Não é CPF válido — apenas dado de demo.
function cpfFakeSeq(seq) {
  return '99' + String(seq).padStart(9, '0')
}

// ---------------------------------------------------------------------------
// Regra de NÍVEIS — replica lib/config-series/niveis.ts (N1..N4)
// ---------------------------------------------------------------------------
function extrairNumeroSerie(serie) {
  if (!serie) return null
  const m = String(serie).match(/(\d+)/)
  return m ? m[1] : null
}
function isAnosIniciais(serie) {
  const n = extrairNumeroSerie(serie)
  return n === '2' || n === '3' || n === '5'
}
// calcularNivelPorAcertos(acertos, serie, 'LP'|'MAT')
function calcularNivelPorAcertos(acertos, serie, disciplina) {
  if (acertos === null || acertos === undefined || acertos <= 0) return null
  const numeroSerie = extrairNumeroSerie(serie)
  if (!numeroSerie) return null
  if (numeroSerie === '2' || numeroSerie === '3') {
    if (acertos >= 1 && acertos <= 3) return 'N1'
    if (acertos >= 4 && acertos <= 7) return 'N2'
    if (acertos >= 8 && acertos <= 11) return 'N3'
    if (acertos >= 12) return 'N4'
  }
  if (numeroSerie === '5') {
    if (disciplina === 'LP') {
      if (acertos >= 1 && acertos <= 3) return 'N1'
      if (acertos >= 4 && acertos <= 7) return 'N2'
      if (acertos >= 8 && acertos <= 11) return 'N3'
      if (acertos >= 12) return 'N4'
    }
    if (disciplina === 'MAT') {
      if (acertos >= 1 && acertos <= 5) return 'N1'
      if (acertos >= 6 && acertos <= 10) return 'N2'
      if (acertos >= 11 && acertos <= 15) return 'N3'
      if (acertos >= 16) return 'N4'
    }
  }
  return null
}
function converterNivelProducao(nivelAtual) {
  if (!nivelAtual) return null
  const n = String(nivelAtual).toUpperCase().trim()
  const map = {
    'INSUFICIENTE': 'N1', 'BÁSICO': 'N2', 'BASICO': 'N2', 'ADEQUADO': 'N3',
    'AVANÇADO': 'N4', 'AVANCADO': 'N4', 'N1': 'N1', 'N2': 'N2', 'N3': 'N3', 'N4': 'N4',
  }
  return map[n] || null
}
function calcularNivelPorNota(nota) {
  if (nota === null || nota === undefined || nota <= 0) return null
  if (nota < 3) return 'N1'
  if (nota < 5) return 'N2'
  if (nota < 7.5) return 'N3'
  return 'N4'
}
function nivelParaValor(nivel) {
  if (!nivel) return null
  return { N1: 1, N2: 2, N3: 3, N4: 4 }[String(nivel).toUpperCase().trim()] || null
}
function valorParaNivel(valor) {
  if (valor === null || valor === undefined) return null
  const v = Math.max(1, Math.min(4, Math.round(valor)))
  return { 1: 'N1', 2: 'N2', 3: 'N3', 4: 'N4' }[v] || null
}
function calcularNivelAluno(nivelLp, nivelMat, nivelProd) {
  const vals = [nivelParaValor(nivelLp), nivelParaValor(nivelMat), nivelParaValor(nivelProd)]
    .filter((v) => v !== null && v !== undefined)
  if (vals.length === 0) return null
  return valorParaNivel(vals.reduce((a, b) => a + b, 0) / vals.length)
}

// ---------------------------------------------------------------------------
// Inserção em lote (multi-row) — divide em chunks p/ não estourar params
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
    let sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${values.join(',')}`
    if (onConflict) sql += ` ${onConflict}`
    const res = await client.query(sql, params)
    total += res.rowCount
  }
  return total
}

// ---------------------------------------------------------------------------
// LIMPEZA idempotente — SÓ o que ESTA fase cria.
// ---------------------------------------------------------------------------
async function limpar(client) {
  console.log('\n== LIMPEZA Fase 2 (só o que esta fase cria) ==')
  const escSeed = (await client.query(`SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%'`)).rows.map((r) => r.id)
  const steps = []

  // Responsáveis seed (vínculos primeiro, depois usuários — FK CASCADE existe mas
  // somos explícitos para deixar claro o escopo).
  steps.push(['responsaveis_alunos (resp seed)',
    `DELETE FROM responsaveis_alunos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE '%.resp.seed@educanet.app')`, []])
  steps.push(['usuarios (responsáveis seed)',
    `DELETE FROM usuarios WHERE email LIKE '%.resp.seed@educanet.app'`, []])

  if (escSeed.length) {
    // AEE (atendimentos -> planos -> alunos_aee -> salas)
    steps.push(['aee_atendimentos (seed)',
      `DELETE FROM aee_atendimentos WHERE aluno_id IN (SELECT id FROM alunos WHERE escola_id = ANY($1))`, [escSeed]])
    steps.push(['aee_planos_individuais (seed)',
      `DELETE FROM aee_planos_individuais WHERE aluno_id IN (SELECT id FROM alunos WHERE escola_id = ANY($1))`, [escSeed]])
    steps.push(['alunos_aee (seed)',
      `DELETE FROM alunos_aee WHERE aluno_id IN (SELECT id FROM alunos WHERE escola_id = ANY($1))`, [escSeed]])
    steps.push(['aee_salas_recursos (seed)',
      `DELETE FROM aee_salas_recursos WHERE escola_id = ANY($1)`, [escSeed]])

    // Atividade pedagógica (ano corrente) — turmas das escolas seed
    steps.push(['diario_classe (seed)',
      `DELETE FROM diario_classe WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = ANY($1))`, [escSeed]])
    steps.push(['comunicados_turma (seed)',
      `DELETE FROM comunicados_turma WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = ANY($1))`, [escSeed]])
    steps.push(['frequencia_diaria (seed)',
      `DELETE FROM frequencia_diaria WHERE escola_id = ANY($1)`, [escSeed]])
    // tarefas_turma: remove só as desta fase (marcador no título 'SEED-F2:')
    steps.push(['tarefas_turma (seed Fase 2)',
      `DELETE FROM tarefas_turma WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = ANY($1)) AND titulo LIKE 'SEED-F2:%'`, [escSeed]])
    // metas_escola: serão re-UPSERTadas; limpamos para refletir exatamente esta fase
    steps.push(['metas_escola (seed)',
      `DELETE FROM metas_escola WHERE escola_id = ANY($1)`, [escSeed]])
  }

  for (const [label, sql, params] of steps) {
    try {
      const r = await client.query(sql, params)
      if (r.rowCount) console.log(`  - ${label}: ${r.rowCount} removidos`)
    } catch (err) {
      console.log(`  - ${label}: pulado (${err.message})`)
    }
  }
  console.log('  Limpeza concluída.')
}

// ===========================================================================
// MAIN
// ===========================================================================
async function main() {
  const limparApenas = process.argv.includes('--limpar-apenas')
  const pool = new Pool(cfg)
  const client = await pool.connect()
  console.log(`Conectado a ${cfg.host}:${cfg.port}/${cfg.database} (user ${cfg.user})`)

  try {
    await limpar(client)
    if (limparApenas) { console.log('\n--limpar-apenas: encerrando após limpeza.'); return }

    // ----- Referências -----
    const escSeed = (await client.query(
      `SELECT id, codigo, nome, polo_id FROM escolas WHERE codigo LIKE 'SEED-ESC-%' ORDER BY codigo`)).rows
    const escSeedIds = escSeed.map((r) => r.id)
    if (escSeedIds.length === 0) throw new Error('Nenhuma escola SEED-ESC-% encontrada. Rode a Fase 1 antes.')

    await client.query('BEGIN')

    // =======================================================================
    // (1) NÍVEIS SISAM por disciplina — UPDATE em resultados_consolidados seed
    //     Replica process.ts: só anos iniciais (2,3,5).
    // =======================================================================
    console.log('\n== (1) Níveis SISAM por disciplina (resultados_consolidados seed) ==')
    const consRows = (await client.query(
      `SELECT id, serie, serie_numero, total_acertos_lp, total_acertos_mat,
              nivel_aprendizagem, nota_producao
       FROM resultados_consolidados
       WHERE escola_id = ANY($1)`, [escSeedIds])).rows

    const updNiveis = [] // {id, nivel_lp, nivel_mat, nivel_prod, nivel_aluno}
    for (const r of consRows) {
      const serie = r.serie || r.serie_numero
      if (!isAnosIniciais(serie)) {
        // Anos finais: o sistema mantém NULL. Garantir consistência (no-op se já null).
        updNiveis.push({ id: r.id, nivel_lp: null, nivel_mat: null, nivel_prod: null, nivel_aluno: null })
        continue
      }
      const nivelLp = calcularNivelPorAcertos(Number(r.total_acertos_lp), serie, 'LP')
      const nivelMat = calcularNivelPorAcertos(Number(r.total_acertos_mat), serie, 'MAT')
      let nivelProd = converterNivelProducao(r.nivel_aprendizagem)
      if (!nivelProd && r.nota_producao !== null && Number(r.nota_producao) > 0) {
        nivelProd = calcularNivelPorNota(Number(r.nota_producao))
      }
      const nivelAluno = calcularNivelAluno(nivelLp, nivelMat, nivelProd)
      updNiveis.push({ id: r.id, nivel_lp: nivelLp, nivel_mat: nivelMat, nivel_prod: nivelProd, nivel_aluno: nivelAluno })
    }
    // aplicar UPDATE ... FROM VALUES em chunks
    let nNiveis = 0
    const chunkN = 1000
    for (let i = 0; i < updNiveis.length; i += chunkN) {
      const slice = updNiveis.slice(i, i + chunkN)
      const vals = []; const params = []; let p = 0
      for (const u of slice) {
        vals.push(`($${++p}::uuid, $${++p}::varchar, $${++p}::varchar, $${++p}::varchar, $${++p}::varchar)`)
        params.push(u.id, u.nivel_lp, u.nivel_mat, u.nivel_prod, u.nivel_aluno)
      }
      const res = await client.query(
        `UPDATE resultados_consolidados rc
           SET nivel_lp = v.nivel_lp, nivel_mat = v.nivel_mat,
               nivel_prod = v.nivel_prod, nivel_aluno = v.nivel_aluno,
               atualizado_em = CURRENT_TIMESTAMP
         FROM (VALUES ${vals.join(',')}) AS v(id, nivel_lp, nivel_mat, nivel_prod, nivel_aluno)
         WHERE rc.id = v.id`, params)
      nNiveis += res.rowCount
    }
    const aiCount = updNiveis.filter((u) => u.nivel_lp || u.nivel_mat || u.nivel_prod).length
    console.log(`  consolidados processados: ${consRows.length} | atualizados: ${nNiveis} | com nível por disciplina (anos iniciais): ${aiCount}`)

    // =======================================================================
    // (2) metas_escola — 4 indicadores por (escola × ano), levemente acima do
    //     realizado. Escala: frequencia/aprovacao/evasao em %, media_sisam 0-10.
    // =======================================================================
    console.log('\n== (2) metas_escola (escolas seed) ==')
    // realizado por escola×ano para calibrar a meta
    const realizado = {}
    const setReal = (rows, ind) => {
      for (const r of rows) {
        const k = `${r.escola_id}|${r.ano_letivo}`
        ;(realizado[k] ||= {})[ind] = r.valor === null ? null : Number(r.valor)
      }
    }
    setReal((await client.query(
      `SELECT a.escola_id, a.ano_letivo, ROUND(AVG(fb.percentual_frequencia)::numeric,2) valor
       FROM frequencia_bimestral fb JOIN alunos a ON a.id=fb.aluno_id
       WHERE a.escola_id = ANY($1) GROUP BY a.escola_id, a.ano_letivo`, [escSeedIds])).rows, 'frequencia')
    setReal((await client.query(
      `SELECT rc.escola_id, rc.ano_letivo, ROUND(AVG(rc.media_aluno::decimal),2) valor
       FROM resultados_consolidados rc WHERE rc.escola_id = ANY($1) AND rc.presenca IN ('P','p')
       GROUP BY rc.escola_id, rc.ano_letivo`, [escSeedIds])).rows, 'media_sisam')
    setReal((await client.query(
      `SELECT a.escola_id, a.ano_letivo,
              ROUND((COUNT(*) FILTER (WHERE a.situacao='aprovado')::decimal/NULLIF(COUNT(*),0))*100,2) valor
       FROM alunos a WHERE a.escola_id = ANY($1) GROUP BY a.escola_id, a.ano_letivo`, [escSeedIds])).rows, 'aprovacao')
    setReal((await client.query(
      `SELECT a.escola_id, a.ano_letivo,
              ROUND((COUNT(*) FILTER (WHERE a.situacao IN ('transferido','desistente','evadido'))::decimal/NULLIF(COUNT(*),0))*100,2) valor
       FROM alunos a WHERE a.escola_id = ANY($1) GROUP BY a.escola_id, a.ano_letivo`, [escSeedIds])).rows, 'evasao')

    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
    const metas = []
    for (const k of Object.keys(realizado)) {
      const [escola_id, ano_letivo] = k.split('|')
      const r = realizado[k]
      // metas plausíveis: melhorar indicadores positivos, reduzir evasão
      const freq = r.frequencia != null ? clamp(Math.round((r.frequencia + 2) * 10) / 10, 75, 99) : 92
      const sisam = r.media_sisam != null ? clamp(Math.round((r.media_sisam + 0.5) * 10) / 10, 5, 10) : 7
      const aprov = r.aprovacao != null ? clamp(Math.round((r.aprovacao + 5) * 10) / 10, 60, 99) : 85
      const evas = r.evasao != null ? clamp(Math.round(Math.max(0, r.evasao - 1) * 10) / 10, 0, 20) : 4
      metas.push({ escola_id, ano_letivo, indicador: 'frequencia', meta_valor: freq })
      metas.push({ escola_id, ano_letivo, indicador: 'media_sisam', meta_valor: sisam })
      metas.push({ escola_id, ano_letivo, indicador: 'aprovacao', meta_valor: aprov })
      metas.push({ escola_id, ano_letivo, indicador: 'evasao', meta_valor: evas })
    }
    const nMetas = await bulkInsert(client, 'metas_escola',
      ['escola_id', 'ano_letivo', 'indicador', 'meta_valor'], metas,
      { onConflict: 'ON CONFLICT (escola_id, ano_letivo, indicador) DO UPDATE SET meta_valor = EXCLUDED.meta_valor, atualizado_em = now()' })
    console.log(`  metas inseridas/atualizadas: ${nMetas} (${Object.keys(realizado).length} pares escola×ano × 4 indicadores)`)

    // =======================================================================
    // (3) PORTAL DO RESPONSÁVEL — 1 usuário 'responsavel' por aluno seed ATIVO
    //     + vínculo aprovado em responsaveis_alunos (tabela do portal).
    // =======================================================================
    console.log('\n== (3) Responsáveis (1 por aluno seed ativo) ==')
    const alunosAtivos = (await client.query(
      `SELECT id, nome FROM alunos WHERE escola_id = ANY($1) AND ativo = true ORDER BY codigo`, [escSeedIds])).rows
    const usuariosResp = []
    const vinculos = []
    let seqResp = 0
    const TIPOS_VINC = ['mae', 'pai', 'responsavel', 'avos']
    for (const al of alunosAtivos) {
      seqResp++
      const usuarioId = uuidv4()
      const fem = rnd() < 0.7 // maioria mães
      const pre = fem ? pick(PRENOMES_F) : pick(PRENOMES_M)
      const nome = `${pre} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`
      const email = `resp${String(seqResp).padStart(6, '0')}.resp.seed@educanet.app`
      usuariosResp.push({
        id: usuarioId, nome, email, senha: SENHA_EDUCANET2026_HASH,
        tipo_usuario: 'responsavel', ativo: true,
        cpf: cpfFakeSeq(seqResp), telefone: `(91) 9${randint(8000, 9999)}-${randint(1000, 9999)}`,
        acesso_sisam: false,
      })
      vinculos.push({
        id: uuidv4(), usuario_id: usuarioId, aluno_id: al.id,
        tipo_vinculo: fem ? 'mae' : pick(TIPOS_VINC),
        ativo: true, status: 'aprovado', origem: 'admin', principal: true,
      })
    }
    const nUsersResp = await bulkInsert(client, 'usuarios',
      ['id', 'nome', 'email', 'senha', 'tipo_usuario', 'ativo', 'cpf', 'telefone', 'acesso_sisam'], usuariosResp)
    const nVinc = await bulkInsert(client, 'responsaveis_alunos',
      ['id', 'usuario_id', 'aluno_id', 'tipo_vinculo', 'ativo', 'status', 'origem', 'principal'], vinculos)
    console.log(`  usuários responsáveis: ${nUsersResp} | vínculos aprovados: ${nVinc}`)
    // guardar um responsável de teste para o relatório (primeiro aluno ativo)
    const respTeste = usuariosResp.length ? { email: usuariosResp[0].email, aluno: alunosAtivos[0].nome } : null

    // =======================================================================
    // (4) AEE — para alunos seed pcd=true
    // =======================================================================
    console.log('\n== (4) AEE (alunos seed pcd=true) ==')
    // mapeia tipo_deficiencia (texto) -> rótulo padronizado em tipos_deficiencia[]
    const MAP_DEF = {
      'Deficiência intelectual': 'intelectual', 'Deficiência física': 'fisica',
      'Deficiência visual': 'visual', 'Deficiência auditiva': 'auditiva',
      'TEA': 'tea', 'Deficiência múltipla': 'multipla', 'Surdez': 'surdez', 'Baixa visão': 'baixa_visao',
    }
    const AREAS_FOCO_POR_DEF = {
      'intelectual': ['{cognitivo,linguagem}', 'Estimulação cognitiva e funções executivas.'],
      'fisica': ['{motor,acessibilidade}', 'Adaptação motora e acessibilidade do material.'],
      'visual': ['{orientacao,braille}', 'Orientação, mobilidade e recursos de baixa visão/Braille.'],
      'auditiva': ['{linguagem,libras}', 'Desenvolvimento de linguagem e apoio em Libras.'],
      'tea': ['{comunicacao,social}', 'Comunicação funcional e habilidades sociais.'],
      'multipla': ['{cognitivo,motor,comunicacao}', 'Plano multifuncional integrado.'],
      'surdez': ['{libras,linguagem}', 'Comunicação em Libras e letramento.'],
      'baixa_visao': ['{visual,ampliacao}', 'Recursos de ampliação e adaptação visual.'],
    }
    const pcdRows = (await client.query(
      `SELECT id, escola_id, tipo_deficiencia FROM alunos
       WHERE escola_id = ANY($1) AND pcd = true ORDER BY codigo`, [escSeedIds])).rows

    // 1 sala de recursos por escola seed (com 1 professor da escola como responsável)
    const profPorEscola = {}
    for (const row of (await client.query(
      `SELECT DISTINCT ON (escola_id) escola_id, id
       FROM usuarios WHERE tipo_usuario='professor' AND escola_id = ANY($1) ORDER BY escola_id, id`, [escSeedIds])).rows) {
      profPorEscola[row.escola_id] = row.id
    }
    const salas = []
    const salaPorEscola = {}
    for (const esc of escSeed) {
      const salaId = uuidv4()
      salaPorEscola[esc.id] = salaId
      salas.push({
        id: salaId, escola_id: esc.id, nome: `Sala de Recursos Multifuncionais - ${esc.nome.slice(0, 40)}`,
        tipo_sala: 'tipo_i', professor_responsavel_id: profPorEscola[esc.id] || null, capacidade: 20,
        horario_funcionamento: 'Seg a Sex, 8h-12h e 14h-17h', ativa: true,
      })
    }
    const nSalas = await bulkInsert(client, 'aee_salas_recursos',
      ['id', 'escola_id', 'nome', 'tipo_sala', 'professor_responsavel_id', 'capacidade', 'horario_funcionamento', 'ativa'], salas)

    const alunosAee = []
    const planos = []
    const atendimentos = []
    for (const al of pcdRows) {
      const def = MAP_DEF[al.tipo_deficiencia] || 'intelectual'
      const [areas, objetivo] = AREAS_FOCO_POR_DEF[def] || ['{cognitivo}', 'Plano de atendimento individualizado.']
      // alunos_aee (UNIQUE aluno_id)
      alunosAee.push({
        id: uuidv4(), aluno_id: al.id, tipos_deficiencia: `{${def}}`,
        cid_codigos: '{}', laudo_medico: rnd() < 0.7, laudo_data: null,
        observacoes: 'Aluno acompanhado pela sala de recursos (dados de demonstração).',
        necessita_cuidador: def === 'multipla' || (def === 'fisica' && rnd() < 0.4),
        necessita_interprete: def === 'surdez' || def === 'auditiva',
        recursos_especiais: '{}', sala_recursos_id: salaPorEscola[al.escola_id] || null,
        frequencia_aee: pick(['2x_semana', '1x_semana', '3x_semana']),
      })
      // aee_planos_individuais (UNIQUE aluno_id, ano_letivo) — ano corrente
      const planoId = uuidv4()
      planos.push({
        id: planoId, aluno_id: al.id, ano_letivo: ANO_CORRENTE,
        objetivos: objetivo,
        estrategias: 'Atividades adaptadas, recursos multifuncionais e acompanhamento individualizado em sala de recursos.',
        recursos_necessarios: 'Materiais adaptados e tecnologia assistiva conforme a necessidade.',
        areas_foco: areas, periodicidade_horas_semanais: randint(2, 6),
        status: 'ativo', professor_aee_id: profPorEscola[al.escola_id] || null,
        data_inicio: `${ANO_CORRENTE}-02-15`,
      })
      // ~2 atendimentos por plano
      const nAtend = randint(2, 3)
      for (let k = 0; k < nAtend; k++) {
        const mes = String(randint(3, 6)).padStart(2, '0')
        const dia = String(randint(1, 28)).padStart(2, '0')
        atendimentos.push({
          id: uuidv4(), plano_id: planoId, aluno_id: al.id,
          professor_id: profPorEscola[al.escola_id] || null,
          data_atendimento: `${ANO_CORRENTE}-${mes}-${dia}`, duracao_minutos: 50,
          presente: rnd() < 0.9,
          atividades_realizadas: 'Atividades de estimulação conforme plano individual.',
          observacoes: null,
        })
      }
    }
    // professor_id em aee_atendimentos é NOT NULL — descartar os sem professor (defensivo)
    const atendValidos = atendimentos.filter((a) => a.professor_id)
    const planosValidos = planos // professor_aee_id é nullable
    const nAlunosAee = await bulkInsert(client, 'alunos_aee',
      ['id', 'aluno_id', 'tipos_deficiencia', 'cid_codigos', 'laudo_medico', 'laudo_data', 'observacoes',
       'necessita_cuidador', 'necessita_interprete', 'recursos_especiais', 'sala_recursos_id', 'frequencia_aee'], alunosAee)
    const nPlanos = await bulkInsert(client, 'aee_planos_individuais',
      ['id', 'aluno_id', 'ano_letivo', 'objetivos', 'estrategias', 'recursos_necessarios', 'areas_foco',
       'periodicidade_horas_semanais', 'status', 'professor_aee_id', 'data_inicio'], planosValidos)
    const nAtend = await bulkInsert(client, 'aee_atendimentos',
      ['id', 'plano_id', 'aluno_id', 'professor_id', 'data_atendimento', 'duracao_minutos', 'presente',
       'atividades_realizadas', 'observacoes'], atendValidos)
    console.log(`  salas: ${nSalas} | alunos_aee: ${nAlunosAee} | planos: ${nPlanos} | atendimentos: ${nAtend}`)

    // =======================================================================
    // (5) ATIVIDADE PEDAGÓGICA — só ano corrente 2026 (volume moderado)
    // =======================================================================
    console.log(`\n== (5) Atividade pedagógica (ano ${ANO_CORRENTE}, volume moderado) ==`)
    const turmas2026 = (await client.query(
      `SELECT t.id, t.escola_id, t.serie_numero, t.etapa_ensino
       FROM turmas t WHERE t.escola_id = ANY($1) AND t.ano_letivo = $2`, [escSeedIds, ANO_CORRENTE])).rows

    // professor + disciplina por turma (a partir de professor_turmas)
    const ptRows = (await client.query(
      `SELECT pt.turma_id, pt.professor_id, pt.disciplina_id
       FROM professor_turmas pt
       JOIN turmas t ON t.id = pt.turma_id
       WHERE t.escola_id = ANY($1) AND t.ano_letivo = $2 AND pt.ativo = true`, [escSeedIds, ANO_CORRENTE])).rows
    const vincPorTurma = {}
    for (const r of ptRows) (vincPorTurma[r.turma_id] ||= []).push(r)

    // disciplinas (id->nome) para tarefas/comunicados textuais
    const discRows = (await client.query(`SELECT id, codigo, nome FROM disciplinas_escolares`)).rows
    const discNomeById = {}
    for (const d of discRows) discNomeById[d.id] = d.nome

    const CONTEUDOS = [
      'Introdução ao tema e atividades práticas em grupo.',
      'Revisão dos conteúdos do bimestre com exercícios dirigidos.',
      'Leitura compartilhada e interpretação de texto.',
      'Resolução de problemas e correção coletiva.',
      'Atividade prática com material concreto.',
      'Roda de conversa e produção textual.',
      'Estudo dirigido e atividade avaliativa formativa.',
    ]
    const METODOLOGIAS = ['Aula expositiva dialogada', 'Trabalho em grupo', 'Atividade prática', 'Estudo de caso']
    const COMUNICADOS = [
      ['Reunião de pais e mestres', 'Convidamos os responsáveis para a reunião bimestral. Compareçam à escola na data informada.', 'reuniao'],
      ['Entrega de boletins', 'Os boletins do bimestre já estão disponíveis no portal do responsável.', 'aviso'],
      ['Atividade extraclasse', 'Haverá atividade pedagógica externa. Autorização será enviada.', 'aviso'],
      ['Lembrete de material', 'Lembrem os estudantes de trazer o material completo nesta semana.', 'lembrete'],
      ['Feira de ciências', 'A turma participará da feira de ciências. Detalhes em breve.', 'aviso'],
    ]
    const TAREFAS = [
      ['Lista de exercícios', 'Resolver a lista de exercícios das páginas indicadas.', 'atividade'],
      ['Trabalho em grupo', 'Pesquisa em grupo sobre o tema do bimestre.', 'trabalho'],
      ['Leitura do capítulo', 'Leitura e fichamento do capítulo indicado.', 'leitura'],
      ['Avaliação bimestral', 'Estudar para a avaliação do bimestre.', 'prova'],
      ['Pesquisa individual', 'Pesquisa individual com entrega escrita.', 'pesquisa'],
    ]

    const diarios = []
    const comunicados = []
    const tarefas = []
    // datas de aula/entrega distribuídas no ano corrente
    const baseDias = ['03-10', '03-17', '04-07', '04-14', '05-05', '05-12', '06-02']
    for (const t of turmas2026) {
      const vincs = vincPorTurma[t.id] || []
      if (vincs.length === 0) continue
      const isFinais = String(t.etapa_ensino) === 'anos_finais'

      // ---- diario_classe (~6 aulas/turma) ----
      // UNIQUE(professor_id, turma_id, disciplina_id, data_aula). Para iniciais
      // disciplina_id pode ser null (polivalente) → variamos a DATA.
      const nAulas = 6
      for (let i = 0; i < nAulas; i++) {
        const v = isFinais ? vincs[i % vincs.length] : vincs[0]
        const dataAula = `${ANO_CORRENTE}-${baseDias[i % baseDias.length]}`
        diarios.push({
          id: uuidv4(), professor_id: v.professor_id, turma_id: t.id,
          disciplina_id: v.disciplina_id, data_aula: dataAula,
          conteudo: pick(CONTEUDOS), metodologia: pick(METODOLOGIAS),
          observacoes: null, status: 'publicado', publicado_em: new Date().toISOString(),
          quantidade_aulas: 2,
        })
      }

      // ---- comunicados_turma (~3/turma) ----
      const profComunicado = vincs[0].professor_id
      const nCom = 3
      for (let i = 0; i < nCom; i++) {
        const [titulo, msg, tipo] = COMUNICADOS[(i + randint(0, 4)) % COMUNICADOS.length]
        comunicados.push({
          id: uuidv4(), turma_id: t.id, professor_id: profComunicado,
          titulo, mensagem: msg, tipo, ativo: true,
        })
      }

      // ---- tarefas_turma (~4/turma) — marcador 'SEED-F2:' no título ----
      const nTar = 4
      for (let i = 0; i < nTar; i++) {
        const v = isFinais ? vincs[i % vincs.length] : vincs[0]
        const [titulo, desc, tipo] = TAREFAS[(i + randint(0, 4)) % TAREFAS.length]
        const dataEntrega = `${ANO_CORRENTE}-${baseDias[(i + 2) % baseDias.length]}`
        const discNome = v.disciplina_id ? (discNomeById[v.disciplina_id] || null) : null
        tarefas.push({
          id: uuidv4(), turma_id: t.id, professor_id: v.professor_id,
          disciplina: discNome, disciplina_id: v.disciplina_id,
          titulo: `SEED-F2: ${titulo}`, descricao: desc, data_entrega: dataEntrega,
          tipo, ativo: true,
        })
      }
    }
    const nDiarios = await bulkInsert(client, 'diario_classe',
      ['id', 'professor_id', 'turma_id', 'disciplina_id', 'data_aula', 'conteudo', 'metodologia',
       'observacoes', 'status', 'publicado_em', 'quantidade_aulas'], diarios,
      { onConflict: 'ON CONFLICT (professor_id, turma_id, disciplina_id, data_aula) DO NOTHING' })
    const nComun = await bulkInsert(client, 'comunicados_turma',
      ['id', 'turma_id', 'professor_id', 'titulo', 'mensagem', 'tipo', 'ativo'], comunicados)
    const nTar = await bulkInsert(client, 'tarefas_turma',
      ['id', 'turma_id', 'professor_id', 'disciplina', 'disciplina_id', 'titulo', 'descricao', 'data_entrega', 'tipo', 'ativo'], tarefas)
    console.log(`  diario_classe: ${nDiarios} | comunicados_turma: ${nComun} | tarefas_turma: ${nTar}`)

    // ---- frequencia_diaria (5 dias × alunos ativos das turmas 2026) ----
    // UNIQUE(aluno_id, data). 1 registro por aluno por dia.
    const turma2026Ids = turmas2026.map((t) => t.id)
    const alunos2026 = (await client.query(
      `SELECT id, turma_id, escola_id FROM alunos
       WHERE escola_id = ANY($1) AND ano_letivo = $2 AND ativo = true AND turma_id = ANY($3)`,
      [escSeedIds, ANO_CORRENTE, turma2026Ids])).rows
    const DIAS_FREQ = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05']
    const freqDiaria = []
    for (const al of alunos2026) {
      for (const data of DIAS_FREQ) {
        const r = rnd()
        let status = 'presente', horaEntrada = '07:30:00', horaSaida = '11:30:00'
        if (r < 0.08) { status = 'ausente'; horaEntrada = null; horaSaida = null }
        else if (r < 0.12) { status = 'justificado'; horaEntrada = null; horaSaida = null }
        freqDiaria.push({
          id: uuidv4(), aluno_id: al.id, turma_id: al.turma_id, escola_id: al.escola_id,
          data, hora_entrada: horaEntrada, hora_saida: horaSaida,
          metodo: 'manual', status,
          justificativa: status === 'justificado' ? 'Falta justificada pelo responsável.' : null,
        })
      }
    }
    const nFreqD = await bulkInsert(client, 'frequencia_diaria',
      ['id', 'aluno_id', 'turma_id', 'escola_id', 'data', 'hora_entrada', 'hora_saida', 'metodo', 'status', 'justificativa'],
      freqDiaria, { onConflict: 'ON CONFLICT (aluno_id, data) DO NOTHING' })
    console.log(`  frequencia_diaria: ${nFreqD} (${alunos2026.length} alunos × ${DIAS_FREQ.length} dias)`)

    await client.query('COMMIT')
    console.log('\n== COMMIT OK ==')

    // =======================================================================
    // VERIFICAÇÃO (fora da transação)
    // =======================================================================
    console.log('\n== Verificação: níveis por disciplina (consolidados seed, anos iniciais) ==')
    const verNiveis = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT serie_numero,
             count(*) total,
             count(nivel_lp) com_nivel_lp,
             count(nivel_mat) com_nivel_mat,
             count(nivel_prod) com_nivel_prod,
             count(nivel_aluno) com_nivel_aluno
      FROM resultados_consolidados
      WHERE escola_id IN (SELECT id FROM esc) AND serie_numero IN ('2','3','5')
      GROUP BY serie_numero ORDER BY serie_numero`)
    console.table(verNiveis.rows)

    console.log('\n== Distribuição de nivel_aluno (anos iniciais seed) ==')
    const distNivel = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT nivel_aluno, count(*) n FROM resultados_consolidados
      WHERE escola_id IN (SELECT id FROM esc) AND serie_numero IN ('2','3','5')
      GROUP BY nivel_aluno ORDER BY nivel_aluno`)
    console.table(distNivel.rows)

    console.log('\n== metas_escola (amostra por indicador) ==')
    const verMetas = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT ano_letivo, indicador, count(*) n, ROUND(AVG(meta_valor)::numeric,2) media_meta
      FROM metas_escola WHERE escola_id IN (SELECT id FROM esc)
      GROUP BY ano_letivo, indicador ORDER BY ano_letivo, indicador`)
    console.table(verMetas.rows)

    console.log('\n== Responsáveis e vínculos ==')
    const verResp = await client.query(`
      SELECT
        (SELECT count(*) FROM usuarios WHERE email LIKE '%.resp.seed@educanet.app') usuarios_resp,
        (SELECT count(*) FROM responsaveis_alunos ra WHERE ra.usuario_id IN
          (SELECT id FROM usuarios WHERE email LIKE '%.resp.seed@educanet.app')) vinculos,
        (SELECT count(*) FROM responsaveis_alunos ra WHERE ra.status='aprovado' AND ra.usuario_id IN
          (SELECT id FROM usuarios WHERE email LIKE '%.resp.seed@educanet.app')) vinculos_aprovados`)
    console.table(verResp.rows)

    console.log('\n== Login de teste do responsável (simulação da query do portal) ==')
    if (respTeste) {
      const sim = await client.query(`
        SELECT u.email, u.tipo_usuario, count(ra.id) FILTER (WHERE ra.status='aprovado' AND ra.ativo) filhos
        FROM usuarios u
        LEFT JOIN responsaveis_alunos ra ON ra.usuario_id = u.id
        WHERE u.email = $1 AND u.ativo = true
        GROUP BY u.email, u.tipo_usuario`, [respTeste.email])
      console.table(sim.rows)
      console.log(`  >> Responsável de teste: ${respTeste.email} / senha: Educanet@2026 (vê o aluno "${respTeste.aluno}")`)
    }

    console.log('\n== AEE ==')
    const verAee = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT
        (SELECT count(*) FROM aee_salas_recursos WHERE escola_id IN (SELECT id FROM esc)) salas,
        (SELECT count(*) FROM alunos_aee aa JOIN alunos a ON a.id=aa.aluno_id WHERE a.escola_id IN (SELECT id FROM esc)) alunos_aee,
        (SELECT count(*) FROM aee_planos_individuais p JOIN alunos a ON a.id=p.aluno_id WHERE a.escola_id IN (SELECT id FROM esc)) planos,
        (SELECT count(*) FROM aee_atendimentos at JOIN alunos a ON a.id=at.aluno_id WHERE a.escola_id IN (SELECT id FROM esc)) atendimentos`)
    console.table(verAee.rows)

    console.log('\n== Atividade pedagógica (ano corrente) ==')
    const verAtiv = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT
        (SELECT count(*) FROM diario_classe d JOIN turmas t ON t.id=d.turma_id WHERE t.escola_id IN (SELECT id FROM esc)) diario,
        (SELECT count(*) FROM comunicados_turma c JOIN turmas t ON t.id=c.turma_id WHERE t.escola_id IN (SELECT id FROM esc)) comunicados,
        (SELECT count(*) FROM tarefas_turma tr JOIN turmas t ON t.id=tr.turma_id WHERE t.escola_id IN (SELECT id FROM esc)) tarefas,
        (SELECT count(*) FROM frequencia_diaria f WHERE f.escola_id IN (SELECT id FROM esc)) freq_diaria`)
    console.table(verAtiv.rows)

    console.log('\nScript: scripts/seed/seed-fase2-demo.js')
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
