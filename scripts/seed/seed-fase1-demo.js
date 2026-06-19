/**
 * SEED FASE 1 — EXPANSÃO DA DEMO — Banco DEMO (Supabase tbbnswuqsqhulserwtcc)
 * ============================================================================
 * Expande a massa de demonstração do SISAM com:
 *
 *   (A) ANO LETIVO 2024 para as 4 escolas seed (as 2 já existentes A/B
 *       'SEED-ESC-01'/'02' + as 2 novas C/D criadas aqui). 2024 é ano
 *       ENCERRADO → situação de fim de ano (aprovado/reprovado/transferido/
 *       abandono) + historico_situacao coerente.
 *
 *   (B) 2º POLO ('SEED-POLO') + 2 ESCOLAS PRÓPRIAS ('SEED-ESC-03'/'04')
 *       com dados completos para 2024, 2025 E 2026 — permite comparar polos.
 *       Bolsa família ~85% e ~8% PCD nesses alunos (espelha seed-situacoes).
 *
 * Para cada (escola × ano) gera, no padrão de seed-completo-demo.js:
 *   series_escola, turmas (2/série, Manhã/Tarde), alunos (~18/turma, pt-BR),
 *   professor_turmas, notas_escolares (4 bim), frequencia_bimestral (4 bim),
 *   conselho_classe + conselho_classe_alunos (4º bim) e SISAM
 *   (resultados_provas + resultados_consolidados + resultados_producao)
 *   SOMENTE nas séries avaliadas {2,3,5,6,7,8,9} — NÃO gera SISAM p/ 1º e 4º.
 *   Notas/frequência/conselho valem para TODAS as séries (1º–9º).
 *
 * EVOLUÇÃO PLAUSÍVEL: a habilidade-base por série cresce ano a ano
 * (2024 < 2025 < 2026), de modo que as médias por série/escola evoluam de
 * forma realista (ganho de aprendizagem) para a tela de Evolução fazer sentido.
 *
 * MARCADORES (idempotência):
 *   polo novo           → polos.codigo = 'SEED-POLO' (nome 'SEED-POLO - ...')
 *   escolas C/D         → escolas.codigo IN ('SEED-ESC-03','SEED-ESC-04')
 *   escolas A/B/C/D     → escolas.codigo LIKE 'SEED-ESC-%'
 *   turmas / alunos     → codigo LIKE 'SEED-%'
 *   professores         → usuarios.email LIKE '%.seed@educanet.app'
 *   questões 2024       → questoes.codigo LIKE 'SEED-Q-2024-%'
 *   avaliacoes 2024     → avaliacoes.ano_letivo = '2024'
 *   periodos 2024       → periodos_letivos.ano_letivo='2024' (criados, NÃO apagados)
 *
 * LIMPEZA (no início, SÓ o que ESTA fase cria; ordem de dependência):
 *   - Tudo das escolas C/D (todos os anos) + o polo novo.
 *   - APENAS o ano 2024 dos dependentes das escolas A/B (filtrando ano_letivo
 *     / período 2024). NUNCA toca 2025/2026 das escolas A/B.
 *   - avaliacoes 2024 + questoes 'SEED-Q-2024-%'.
 *   - periodos_letivos 2024: criados idempotentemente (ON CONFLICT), NÃO removidos.
 *
 * Conexão: lê DB_PASSWORD de .env.local; conecta direto em
 *   db.tbbnswuqsqhulserwtcc.supabase.co:5432/postgres (user postgres, SSL).
 *
 * Uso:  node scripts/seed/seed-fase1-demo.js
 *       node scripts/seed/seed-fase1-demo.js --limpar-apenas
 * ============================================================================
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const { v4: uuidv4 } = require('uuid')

// ---------------------------------------------------------------------------
// .env.local loader (mesmo padrão de scripts/seed/seed-completo-demo.js)
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

// ---------------------------------------------------------------------------
// Parâmetros de escala
// ---------------------------------------------------------------------------
const SERIES = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const SERIES_SISAM = new Set(['2', '3', '5', '6', '7', '8', '9']) // SISAM só aqui
const TURNOS = ['Manhã', 'Tarde']
const ALUNOS_POR_TURMA = 18
const MEDIA_APROVACAO = 6.0
const SENHA_PADRAO_HASH_FALLBACK = '$2a$10$jXrEpIzc9r4xkwzylZlu.ePLvsDn81sA.TT1/YH2X7u7qsuf6BHWq'

// Polo novo + escolas C/D (criados por ESTA fase)
const POLO_NOVO = { codigo: 'SEED-POLO', nome: 'SEED-POLO - Vale do Demo' }
const ESCOLAS_CD = [
  { codigo: 'SEED-ESC-03', nome: 'Escola Municipal Serra Verde (Seed Polo 2)', bairro: 'Vila Nova' },
  { codigo: 'SEED-ESC-04', nome: 'Escola Municipal Cachoeira Grande (Seed Polo 2)', bairro: 'Bela Vista' },
]
// Escolas A/B já existem (polo DEMO); aqui recebem APENAS o ano 2024.
const COD_ESCOLAS_AB = ['SEED-ESC-01', 'SEED-ESC-02']

const serieLabel = (n) => `${n}º Ano`
const etapaDe = (n) => (Number(n) <= 5 ? 'anos_iniciais' : 'anos_finais')

const DISCIPLINAS_INICIAIS = ['LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL']
const DISCIPLINAS_FINAIS = ['LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL', 'ING']

// Quantidade de questões SISAM por etapa/área (fallback quando cfg vem 0)
const FALLBACK_QTD = {
  anos_iniciais: { lp: 14, mat: 14, ch: 0, cn: 0 },
  anos_finais: { lp: 15, mat: 15, ch: 15, cn: 15 },
}

// Fator de evolução de aprendizagem por ano (sobe ano a ano)
const FATOR_ANO = { '2024': 0.0, '2025': 0.05, '2026': 0.10 }

// ---------------------------------------------------------------------------
// Geradores pt-BR (mesmos pools do seed-completo)
// ---------------------------------------------------------------------------
const PRENOMES_M = ['João', 'Pedro', 'Lucas', 'Gabriel', 'Mateus', 'Rafael', 'Davi', 'Miguel', 'Arthur', 'Heitor', 'Bernardo', 'Théo', 'Enzo', 'Samuel', 'Benício', 'Caleb', 'Ravi', 'Anthony', 'Noah', 'Otávio']
const PRENOMES_F = ['Maria', 'Ana', 'Alice', 'Laura', 'Sophia', 'Helena', 'Valentina', 'Isabella', 'Manuela', 'Júlia', 'Heloísa', 'Lorena', 'Lívia', 'Cecília', 'Eloá', 'Beatriz', 'Yasmin', 'Antonella', 'Maitê', 'Esther']
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Cardoso', 'Mendes']
const RACAS = ['branca', 'preta', 'parda', 'amarela', 'indigena', 'nao_declarada']
const TIPOS_DEFICIENCIA = ['Deficiência intelectual', 'Deficiência física', 'Deficiência visual', 'Deficiência auditiva', 'TEA', 'Deficiência múltipla', 'Surdez', 'Baixa visão']

// Observações curtas SEM PII (LGPD)
const OBS = {
  aprovado: 'Aprovado ao final do ano letivo.',
  reprovado: 'Reprovado ao final do ano letivo.',
  transfDentro: 'Transferência para outra unidade da rede municipal.',
  transfFora: 'Transferência para rede de outro município.',
  abandono: 'Situação de abandono registrada após infrequência prolongada.',
}
const ESCOLAS_FORA = [
  'EE Prof. Maria Lima - Belém/PA', 'Colégio Santa Rosa - Castanhal/PA',
  'EMEF Tancredo Neves - Ananindeua/PA', 'Escola Nova Esperança - Marabá/PA',
  'Instituto Educar - Santarém/PA',
]

let _rng = 246813579 // seed própria desta fase (determinística)
function rnd() {
  _rng = (_rng * 1103515245 + 12345) & 0x7fffffff
  return _rng / 0x7fffffff
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1))
function nomePessoa() {
  const f = rnd() < 0.5
  const pre = f ? pick(PRENOMES_F) : pick(PRENOMES_M)
  return { nome: `${pre} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`, genero: f ? 'feminino' : 'masculino' }
}
function dataNascimento(serieNum, ano) {
  const idade = 5 + Number(serieNum) + randint(-1, 1)
  const anoNasc = Number(ano) - idade
  const mes = String(randint(1, 12)).padStart(2, '0')
  const dia = String(randint(1, 28)).padStart(2, '0')
  return `${anoNasc}-${mes}-${dia}`
}
function nisFake() {
  let s = ''
  for (let i = 0; i < 11; i++) s += String(randint(0, 9))
  return s
}

// ---------------------------------------------------------------------------
// Inserção em lote (multi-row) — divide em chunks p/ não estourar params
// ---------------------------------------------------------------------------
async function bulkInsert(client, table, columns, rows, { chunkRows } = {}) {
  if (rows.length === 0) return 0
  const maxParams = 60000
  const perChunkByParams = Math.max(1, Math.floor(maxParams / columns.length))
  const chunk = Math.min(chunkRows || 1000, perChunkByParams)
  let total = 0
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk)
    const values = []
    const params = []
    let p = 0
    for (const r of slice) {
      const ph = columns.map(() => `$${++p}`)
      values.push(`(${ph.join(',')})`)
      for (const c of columns) params.push(r[c] === undefined ? null : r[c])
    }
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${values.join(',')}`
    const res = await client.query(sql, params)
    total += res.rowCount
  }
  return total
}

// ---------------------------------------------------------------------------
// LIMPEZA idempotente — SÓ o que ESTA fase cria, em ordem de dependência.
//  - Escolas C/D (todos os anos) + polo novo.
//  - Ano 2024 dos dependentes das escolas A/B (filtrando ano_letivo / período 2024).
//  - avaliacoes 2024 + questoes SEED-Q-2024-%. (periodos 2024 NÃO são removidos.)
// ---------------------------------------------------------------------------
async function limpar(client) {
  console.log('\n== LIMPEZA Fase 1 (só o que esta fase cria) ==')

  // ids das escolas C/D e A/B
  const escCD = (await client.query(`SELECT id FROM escolas WHERE codigo = ANY($1)`, [ESCOLAS_CD.map((x) => x.codigo)])).rows.map((r) => r.id)
  const escAB = (await client.query(`SELECT id FROM escolas WHERE codigo = ANY($1)`, [COD_ESCOLAS_AB])).rows.map((r) => r.id)

  // ids dos períodos 2024 (bimestre) — usados para limpar conselho/freq por período
  const per2024 = (await client.query(`SELECT id FROM periodos_letivos WHERE ano_letivo='2024' AND tipo_periodo='bimestre'`)).rows.map((r) => r.id)

  const steps = []

  // ---- (1) Escolas C/D: apagar TUDO (todos os anos) ----
  if (escCD.length) {
    steps.push(['CD resultados_provas', `DELETE FROM resultados_provas WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD resultados_consolidados', `DELETE FROM resultados_consolidados WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD resultados_producao', `DELETE FROM resultados_producao WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD notas_escolares', `DELETE FROM notas_escolares WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD frequencia_bimestral', `DELETE FROM frequencia_bimestral WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD frequencia_diaria', `DELETE FROM frequencia_diaria WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD conselho_classe_alunos', `DELETE FROM conselho_classe_alunos WHERE conselho_id IN (SELECT id FROM conselho_classe WHERE escola_id = ANY($1))`, [escCD]])
    steps.push(['CD conselho_classe', `DELETE FROM conselho_classe WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD historico_situacao', `DELETE FROM historico_situacao WHERE aluno_id IN (SELECT id FROM alunos WHERE escola_id = ANY($1))`, [escCD]])
    steps.push(['CD professor_turmas', `DELETE FROM professor_turmas WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = ANY($1))`, [escCD]])
    steps.push(['CD alunos', `DELETE FROM alunos WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD turmas', `DELETE FROM turmas WHERE escola_id = ANY($1)`, [escCD]])
    steps.push(['CD series_escola', `DELETE FROM series_escola WHERE escola_id = ANY($1)`, [escCD]])
  }
  // Professores da Fase 1: prefixo 'prof-f1-' é marcador EXCLUSIVO desta fase
  // (o seed-completo usa 'prof0001.seed@...', sem o '-f1-'). Remove TODOS —
  // tanto os das escolas C/D quanto os criados nas escolas A/B p/ o ano 2024.
  // É seguro pois seus vínculos professor_turmas já foram removidos acima
  // (C/D inteiros + A/B 2024). Evita colisão em usuarios_email_key na reinserção.
  steps.push(['usuarios (prof Fase 1)', `DELETE FROM usuarios WHERE email LIKE 'prof-f1-%.seed@educanet.app'`, []])

  // ---- (2) Escolas A/B: apagar SÓ o ano 2024 ----
  if (escAB.length) {
    steps.push(['AB resultados_provas 2024', `DELETE FROM resultados_provas WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
    steps.push(['AB resultados_consolidados 2024', `DELETE FROM resultados_consolidados WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
    steps.push(['AB resultados_producao 2024', `DELETE FROM resultados_producao WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
    steps.push(['AB notas_escolares 2024', `DELETE FROM notas_escolares WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
    steps.push(['AB frequencia_bimestral 2024', `DELETE FROM frequencia_bimestral WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
    steps.push(['AB frequencia_diaria 2024', `DELETE FROM frequencia_diaria WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
    if (per2024.length) {
      steps.push(['AB conselho_classe_alunos 2024', `DELETE FROM conselho_classe_alunos WHERE conselho_id IN (SELECT id FROM conselho_classe WHERE escola_id = ANY($1) AND periodo_id = ANY($2))`, [escAB, per2024]])
      steps.push(['AB conselho_classe 2024', `DELETE FROM conselho_classe WHERE escola_id = ANY($1) AND periodo_id = ANY($2)`, [escAB, per2024]])
    }
    steps.push(['AB historico_situacao 2024', `DELETE FROM historico_situacao WHERE aluno_id IN (SELECT id FROM alunos WHERE escola_id = ANY($1) AND ano_letivo='2024')`, [escAB]])
    steps.push(['AB professor_turmas 2024', `DELETE FROM professor_turmas WHERE ano_letivo='2024' AND turma_id IN (SELECT id FROM turmas WHERE escola_id = ANY($1) AND ano_letivo='2024')`, [escAB]])
    steps.push(['AB alunos 2024', `DELETE FROM alunos WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
    steps.push(['AB turmas 2024', `DELETE FROM turmas WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
    steps.push(['AB series_escola 2024', `DELETE FROM series_escola WHERE escola_id = ANY($1) AND ano_letivo='2024'`, [escAB]])
  }

  // ---- (3) Marcadores 2024 que não dependem de escola ----
  steps.push(['questoes 2024 (órfãs)', `DELETE FROM resultados_provas WHERE questao_codigo LIKE 'SEED-Q-2024-%'`, []]) // defensivo
  steps.push(['questoes SEED-Q-2024', `DELETE FROM questoes WHERE codigo LIKE 'SEED-Q-2024-%'`, []])

  // ---- (4) Escolas C/D e polo novo (por último) ----
  if (escCD.length) steps.push(['escolas C/D', `DELETE FROM escolas WHERE id = ANY($1)`, [escCD]])
  steps.push(['polo novo', `DELETE FROM polos WHERE codigo = $1`, [POLO_NOVO.codigo]])

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

// ---------------------------------------------------------------------------
// Garante os 4 bimestres de 2024 em periodos_letivos (idempotente)
//   UNIQUE(tipo, numero, ano_letivo). Espelha as datas/nome de 2025.
// ---------------------------------------------------------------------------
async function garantirPeriodos2024(client) {
  const defs = [
    { numero: 1, nome: '1º Bimestre', ini: '2024-02-05', fim: '2024-04-18' },
    { numero: 2, nome: '2º Bimestre', ini: '2024-04-22', fim: '2024-07-05' },
    { numero: 3, nome: '3º Bimestre', ini: '2024-07-22', fim: '2024-10-04' },
    { numero: 4, nome: '4º Bimestre', ini: '2024-10-07', fim: '2024-12-19' },
  ]
  let criados = 0
  for (const d of defs) {
    const r = await client.query(
      `INSERT INTO periodos_letivos (id, nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo, dias_letivos, tipo_periodo)
       VALUES ($1,$2,'bimestre',$3,'2024',$4,$5,false,50,'bimestre')
       ON CONFLICT (tipo, numero, ano_letivo) DO NOTHING`,
      [uuidv4(), d.nome, d.numero, d.ini, d.fim])
    criados += r.rowCount
  }
  console.log(`periodos_letivos 2024: ${criados} criados (4 esperados se ainda não existiam)`)
  return (await client.query(
    `SELECT id, numero FROM periodos_letivos WHERE ano_letivo='2024' AND tipo_periodo='bimestre' ORDER BY numero`)).rows.map((r) => r.id)
}

// ---------------------------------------------------------------------------
// Gera todo o conteúdo (series_escola..conselho..SISAM) para um conjunto de
// (escola, ano). Recebe escolas [{id, codigo}] e a lista de anos a gerar.
// Retorna acumuladores para inserir em lote no chamador.
// ---------------------------------------------------------------------------
function buildConteudo(ctx, escolas, anos) {
  const {
    discByCod, periodoMap, cfgSeries, itensProducao, avalMap, senhaHash, poloIdPorEscola,
    questoesPorChave, questoesAll, qIdByCod, seqRef,
  } = ctx

  const seriesEscola = []
  const turmas = []
  const professores = []
  const profTurmas = []
  const alunos = []
  const profPorEscola = {}

  // 1) SERIES_ESCOLA + 2) TURMAS + 4) PROFESSORES + 5) PROFESSOR_TURMAS + 6) ALUNOS
  for (const esc of escolas) {
    profPorEscola[esc.id] = []
    const poloId = poloIdPorEscola[esc.id]
    // pool de professores por escola (criados 1x; reaproveitados em todos os anos)
    const nProf = 24
    for (let i = 0; i < nProf; i++) {
      const { nome } = nomePessoa()
      seqRef.prof++
      const id = uuidv4()
      professores.push({
        id, nome: `Prof. ${nome}`, email: `prof-f1-${String(seqRef.prof).padStart(4, '0')}.seed@educanet.app`,
        senha: senhaHash, tipo_usuario: 'professor', polo_id: poloId, escola_id: esc.id, ativo: true,
      })
      profPorEscola[esc.id].push(id)
    }

    for (const ano of anos) {
      for (const s of SERIES) {
        seriesEscola.push({ id: uuidv4(), escola_id: esc.id, serie: serieLabel(s), ano_letivo: ano, ativo: true })
      }
      const escNum = esc.codigo.slice(-2)
      for (const s of SERIES) {
        let idxTurno = 0
        for (const turno of TURNOS) {
          const letra = idxTurno === 0 ? 'A' : 'B'
          idxTurno++
          const turmaId = uuidv4()
          turmas.push({
            id: turmaId,
            codigo: `SEED-${escNum}-${ano}-${s}${letra}`,
            nome: `${serieLabel(s)} "${letra}" - ${turno}`,
            escola_id: esc.id, serie: serieLabel(s), ano_letivo: ano, ativo: true,
            capacidade_maxima: 35, turno, etapa_ensino: etapaDe(s),
            serie_numero: s, modalidade: 'regular', tipo_atendimento: 'escolarizacao',
            _polo: poloId,
          })
          // professor_turmas
          const poolP = profPorEscola[esc.id]
          if (etapaDe(s) === 'anos_iniciais') {
            profTurmas.push({
              id: uuidv4(), professor_id: pick(poolP), turma_id: turmaId, disciplina_id: null,
              tipo_vinculo: 'polivalente', ano_letivo: ano, ativo: true,
            })
          } else {
            for (const cod of DISCIPLINAS_FINAIS) {
              profTurmas.push({
                id: uuidv4(), professor_id: pick(poolP), turma_id: turmaId, disciplina_id: discByCod[cod],
                tipo_vinculo: 'disciplina', ano_letivo: ano, ativo: true,
              })
            }
          }
          // alunos da turma
          for (let i = 0; i < ALUNOS_POR_TURMA; i++) {
            seqRef.aluno++
            const { nome: nomeBase, genero } = nomePessoa()
            const nome = `${nomeBase} F1-${String(seqRef.aluno).padStart(6, '0')}`
            const mae = nomePessoa().nome
            alunos.push({
              id: uuidv4(), codigo: `SEED-F1-${String(seqRef.aluno).padStart(6, '0')}`, nome,
              escola_id: esc.id, turma_id: turmaId, serie: serieLabel(s), ano_letivo: ano,
              ativo: true, situacao: 'cursando', data_nascimento: dataNascimento(s, ano),
              genero, raca_cor: pick(RACAS), nome_mae: mae, responsavel: mae,
              telefone_responsavel: `(91) 9${randint(8000, 9999)}-${randint(1000, 9999)}`,
              data_matricula: `${ano}-02-${String(randint(1, 15)).padStart(2, '0')}`,
              serie_numero: s, modalidade: 'regular',
              // socioeconômico (espelha seed-situacoes: ~85% bolsa, ~8% PCD)
              _bolsa: rnd() < 0.85,
              _serie: s, _turno: turno, _polo: poloId,
            })
          }
        }
      }
    }
  }

  return { seriesEscola, turmas, professores, profTurmas, alunos, profPorEscola }
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
    // ---- Referências existentes ----
    const poloDemo = (await client.query(`SELECT polo_id FROM escolas WHERE codigo = 'DEMO-ESC-01' LIMIT 1`)).rows[0]
    if (!poloDemo) throw new Error('Não encontrei DEMO-ESC-01 para herdar o polo_id')
    const poloDemoId = poloDemo.polo_id

    const senhaHash = (await client.query(`SELECT senha FROM usuarios LIMIT 1`)).rows[0]?.senha || SENHA_PADRAO_HASH_FALLBACK

    const disc = (await client.query(`SELECT id, codigo FROM disciplinas_escolares WHERE ativo`)).rows
    const discByCod = {}
    for (const d of disc) discByCod[d.codigo] = d.id

    const cfgSeries = {}
    for (const r of (await client.query(`SELECT * FROM configuracao_series`)).rows) cfgSeries[r.serie] = r

    const itensProducao = (await client.query(`SELECT id, ordem FROM itens_producao WHERE ativo ORDER BY ordem`)).rows

    // ---- LIMPEZA ----
    await limpar(client)
    if (limparApenas) { console.log('\n--limpar-apenas: encerrando após limpeza.'); return }

    await client.query('BEGIN')

    // ---- Períodos 2024 (cria se faltar) + mapa de períodos por ano ----
    const per2024 = await garantirPeriodos2024(client)
    const periodos = (await client.query(`SELECT id, numero, ano_letivo FROM periodos_letivos WHERE tipo_periodo='bimestre'`)).rows
    const periodoMap = {}
    for (const ano of ['2024', '2025', '2026']) {
      periodoMap[ano] = periodos.filter((p) => p.ano_letivo === ano).sort((a, b) => a.numero - b.numero).map((p) => p.id)
    }
    if (periodoMap['2024'].length < 4) throw new Error('Faltam períodos 2024 após garantir')

    // ---- Avaliações 2024 (UNIQUE(ano_letivo, tipo)); 2025/2026 já existem ----
    const avalRows = (await client.query(`SELECT id, ano_letivo, tipo FROM avaliacoes`)).rows
    const avalMap = {}
    for (const r of avalRows) avalMap[`${r.ano_letivo}|${r.tipo}`] = r.id
    let avalCriadas = 0
    for (const [tipo, ordem, nome] of [['diagnostica', 1, 'Avaliação Diagnóstica 2024'], ['final', 2, 'Avaliação Final 2024']]) {
      if (!avalMap[`2024|${tipo}`]) {
        const id = uuidv4()
        await client.query(
          `INSERT INTO avaliacoes (id, nome, ano_letivo, tipo, ordem, ativo) VALUES ($1,$2,'2024',$3,$4,true)
           ON CONFLICT (ano_letivo, tipo) DO NOTHING`, [id, nome, tipo, ordem])
        avalMap[`2024|${tipo}`] = id
        avalCriadas++
      }
    }
    console.log(`avaliacoes 2024: ${avalCriadas} criadas`)

    // ---- sisam_series_participantes para 2024 (só séries avaliadas) ----
    let nPart = 0
    for (const s of SERIES) {
      if (!SERIES_SISAM.has(s)) continue
      const r = await client.query(
        `INSERT INTO sisam_series_participantes (id, ano_letivo, serie, ativo) VALUES ($1,'2024',$2,true)
         ON CONFLICT (ano_letivo, serie) DO NOTHING`, [uuidv4(), serieLabel(s)])
      nPart += r.rowCount
    }
    console.log(`sisam_series_participantes 2024: ${nPart} inseridos`)

    // ---- QUESTÕES 2024 (por série avaliada × tipo × área); codigo SEED-Q-2024-... ----
    const AREAS = [
      { key: 'lp', area: 'Linguagens', disc: 'Língua Portuguesa', qcol: 'qtd_questoes_lp', flag: 'avalia_lp' },
      { key: 'mat', area: 'Matemática', disc: 'Matemática', qcol: 'qtd_questoes_mat', flag: 'avalia_mat' },
      { key: 'ch', area: 'Ciências Humanas', disc: 'Ciências Humanas', qcol: 'qtd_questoes_ch', flag: 'avalia_ch' },
      { key: 'cn', area: 'Ciências da Natureza', disc: 'Ciências da Natureza', qcol: 'qtd_questoes_cn', flag: 'avalia_cn' },
    ]
    const GAB = ['A', 'B', 'C', 'D', 'E']
    const questoesAll = []
    const questoesPorChave = {} // `${tipo}|${serie}` -> {lp:[],mat:[],ch:[],cn:[]}
    for (const tipo of ['diagnostica', 'final']) {
      for (const s of SERIES) {
        if (!SERIES_SISAM.has(s)) continue
        const cs = cfgSeries[s] || {}
        const etapa = etapaDe(s)
        const chave = `${tipo}|${s}`
        questoesPorChave[chave] = { lp: [], mat: [], ch: [], cn: [] }
        let numero = 0
        for (const A of AREAS) {
          const avalia = cs[A.flag] !== false && (cs[A.flag] === true || ['lp', 'mat'].includes(A.key) || etapa === 'anos_finais')
          if (!avalia) continue
          let qtd = cs[A.qcol] || 0
          if (qtd === 0) qtd = FALLBACK_QTD[etapa][A.key] || 0
          if (qtd === 0) continue
          for (let q = 1; q <= qtd; q++) {
            numero++
            const codigo = `SEED-Q-2024-${tipo === 'diagnostica' ? 'D' : 'F'}-${s}-${A.key.toUpperCase()}${q}`
            const gab = GAB[Math.floor(rnd() * 5)]
            questoesAll.push({
              id: uuidv4(), codigo, descricao: `Questão ${q} de ${A.disc} (${serieLabel(s)})`,
              disciplina: A.disc, area_conhecimento: A.area, gabarito: gab,
              serie_aplicavel: serieLabel(s), tipo_questao: 'objetiva', numero_questao: numero,
            })
            questoesPorChave[chave][A.key].push({ codigo, gabarito: gab, area: A.area, disc: A.disc })
          }
        }
      }
    }
    const nQ = await bulkInsert(client, 'questoes',
      ['id', 'codigo', 'descricao', 'disciplina', 'area_conhecimento', 'gabarito', 'serie_aplicavel', 'tipo_questao', 'numero_questao'], questoesAll)
    console.log(`\nquestoes 2024: ${nQ}`)
    const qIdByCod = {}
    for (const q of questoesAll) qIdByCod[q.codigo] = q.id

    // ---- Questões existentes 2025/2026 (geradas pelo seed-completo) p/ reuso
    //      nas escolas C/D. Mapa: `${ano}|${tipo}|${serie}` -> {lp,mat,ch,cn:[{id,codigo,gabarito,area,disc}]}
    //      Os alunos C/D são novos (ids novos) → sem conflito no UNIQUE
    //      (aluno_id, questao_codigo, ano_letivo) de resultados_provas. ----
    const AREA_KEY = { 'Linguagens': 'lp', 'Matemática': 'mat', 'Ciências Humanas': 'ch', 'Ciências da Natureza': 'cn' }
    const qpcExist = {}
    const qExistRows = (await client.query(
      `SELECT id, codigo, gabarito, area_conhecimento, disciplina, serie_aplicavel
       FROM questoes WHERE codigo LIKE 'SEED-Q-2025-%' OR codigo LIKE 'SEED-Q-2026-%'`)).rows
    for (const q of qExistRows) {
      // codigo: SEED-Q-<ano>-<D|F>-<serie>-<AREA><n>
      const parts = q.codigo.split('-')
      const ano = parts[2]
      const tipo = parts[3] === 'D' ? 'diagnostica' : 'final'
      const serie = parts[4]
      const key = `${ano}|${tipo}|${serie}`
      const akey = AREA_KEY[q.area_conhecimento]
      if (!akey) continue
      const slot = (qpcExist[key] ||= { lp: [], mat: [], ch: [], cn: [] })
      slot[akey].push({ id: q.id, codigo: q.codigo, gabarito: q.gabarito, area: q.area_conhecimento, disc: q.disciplina })
    }

    // ---- Resolver escolas-alvo ----
    // (A) escolas A/B existentes — só ano 2024
    const escAB = (await client.query(`SELECT id, codigo FROM escolas WHERE codigo = ANY($1) ORDER BY codigo`, [COD_ESCOLAS_AB])).rows
    // (B) criar polo novo + escolas C/D
    const poloNovoId = uuidv4()
    await client.query(
      `INSERT INTO polos (id, nome, codigo, descricao, ativo) VALUES ($1,$2,$3,$4,true)`,
      [poloNovoId, POLO_NOVO.nome, POLO_NOVO.codigo, 'Polo de demonstração 2 (seed Fase 1)'])
    console.log(`polo novo: ${POLO_NOVO.nome} (${POLO_NOVO.codigo})`)

    const escCD = ESCOLAS_CD.map((es) => ({
      id: uuidv4(), codigo: es.codigo, nome: es.nome, polo_id: poloNovoId, ativo: true,
      endereco: `Rua das Demonstrações, ${randint(10, 999)}`, bairro: es.bairro,
      etapas_ensino: '{ensino_fundamental}', municipio: 'São Sebastião da Boa Vista', uf: 'PA',
    }))
    await bulkInsert(client, 'escolas',
      ['id', 'codigo', 'nome', 'polo_id', 'ativo', 'endereco', 'bairro', 'etapas_ensino', 'municipio', 'uf'], escCD)
    console.log(`escolas novas (C/D): ${escCD.length}`)

    // mapa escola -> polo
    const poloIdPorEscola = {}
    for (const e2 of escAB) poloIdPorEscola[e2.id] = poloDemoId
    for (const e2 of escCD) poloIdPorEscola[e2.id] = poloNovoId

    // ---- Build de estrutura (escolas A/B só 2024; C/D 2024+2025+2026) ----
    const seqRef = { prof: 0, aluno: 0 }
    const ctx = { discByCod, periodoMap, cfgSeries, itensProducao, avalMap, senhaHash, poloIdPorEscola, questoesPorChave, questoesAll, qIdByCod, seqRef, qpcExist }

    const partAB = buildConteudo(ctx, escAB.map((r) => ({ id: r.id, codigo: r.codigo })), ['2024'])
    const partCD = buildConteudo(ctx, escCD.map((r) => ({ id: r.id, codigo: r.codigo })), ['2024', '2025', '2026'])

    // merge
    const seriesEscola = [...partAB.seriesEscola, ...partCD.seriesEscola]
    const turmas = [...partAB.turmas, ...partCD.turmas]
    const professores = [...partAB.professores, ...partCD.professores]
    const profTurmas = [...partAB.profTurmas, ...partCD.profTurmas]
    const alunos = [...partAB.alunos, ...partCD.alunos]

    await bulkInsert(client, 'series_escola', ['id', 'escola_id', 'serie', 'ano_letivo', 'ativo'], seriesEscola)
    console.log(`series_escola: ${seriesEscola.length}`)
    await bulkInsert(client, 'turmas',
      ['id', 'codigo', 'nome', 'escola_id', 'serie', 'ano_letivo', 'ativo', 'capacidade_maxima', 'turno', 'etapa_ensino', 'serie_numero', 'modalidade', 'tipo_atendimento'], turmas)
    console.log(`turmas: ${turmas.length}`)
    await bulkInsert(client, 'usuarios',
      ['id', 'nome', 'email', 'senha', 'tipo_usuario', 'polo_id', 'escola_id', 'ativo'], professores)
    console.log(`professores (usuarios .seed): ${professores.length}`)
    await bulkInsert(client, 'professor_turmas',
      ['id', 'professor_id', 'turma_id', 'disciplina_id', 'tipo_vinculo', 'ano_letivo', 'ativo'], profTurmas)
    console.log(`professor_turmas: ${profTurmas.length}`)
    await bulkInsert(client, 'alunos',
      ['id', 'codigo', 'nome', 'escola_id', 'turma_id', 'serie', 'ano_letivo', 'ativo', 'situacao', 'data_nascimento', 'genero', 'raca_cor', 'nome_mae', 'responsavel', 'telefone_responsavel', 'data_matricula', 'serie_numero', 'modalidade', 'bolsa_familia', 'beneficiario_bolsa_familia', 'nis', 'pcd', 'tipo_deficiencia'],
      alunos.map((a) => ({
        ...a,
        bolsa_familia: a._bolsa, beneficiario_bolsa_familia: a._bolsa, nis: a._bolsa ? nisFake() : null,
        pcd: false, tipo_deficiencia: null,
      })))
    console.log(`alunos: ${alunos.length}`)

    // index aluno por turma
    const alunosPorTurma = {}
    for (const a of alunos) (alunosPorTurma[a.turma_id] ||= []).push(a)

    // =======================================================================
    // NOTAS / FREQUÊNCIA (todas as séries) + SISAM (só séries avaliadas)
    // =======================================================================
    const notas = []
    const freq = []
    const respProvas = []
    const consolidados = []
    const producaoRows = []
    let totalRespostas = 0

    for (const t of turmas) {
      const ano = t.ano_letivo
      const s = t.serie_numero
      const etapa = etapaDe(s)
      const pers = periodoMap[ano]
      const codDisc = etapa === 'anos_iniciais' ? DISCIPLINAS_INICIAIS : DISCIPLINAS_FINAIS
      // bônus de evolução por ano embutido nas notas escolares também
      const bonusAno = FATOR_ANO[ano] * 10 // até +1.0 ponto em 2026

      for (const a of alunosPorTurma[t.id]) {
        // ---- notas_escolares ----
        for (const cod of codDisc) {
          const discId = discByCod[cod]
          for (let b = 0; b < 4; b++) {
            let nota = Math.round((3 + rnd() * 6 + bonusAno) * 10) / 10
            nota = Math.min(10, Math.max(0, nota))
            let notaRec = null, notaFinal = nota
            if (nota < MEDIA_APROVACAO && rnd() < 0.7) {
              notaRec = Math.round((4 + rnd() * 4) * 10) / 10
              notaFinal = Math.max(nota, notaRec)
            }
            notas.push({
              id: uuidv4(), aluno_id: a.id, disciplina_id: discId, periodo_id: pers[b],
              escola_id: t.escola_id, ano_letivo: ano,
              nota, nota_recuperacao: notaRec, nota_final: Math.round(notaFinal * 10) / 10,
              faltas: randint(0, 8), turma_id: t.id, registrado_por: null,
            })
          }
        }
        // ---- frequencia_bimestral ----
        for (let b = 0; b < 4; b++) {
          const dias = 50
          const faltas = randint(0, 12)
          const fj = Math.min(faltas, randint(0, 4))
          const presencas = dias - faltas
          const perc = Math.round((presencas / dias) * 1000) / 10
          freq.push({
            id: uuidv4(), aluno_id: a.id, periodo_id: pers[b], turma_id: t.id, escola_id: t.escola_id,
            ano_letivo: ano, dias_letivos: dias, presencas, faltas, faltas_justificadas: fj,
            percentual_frequencia: perc, registrado_por: null, metodo: 'manual',
          })
        }

        // ---- SISAM (somente séries avaliadas) ----
        if (!SERIES_SISAM.has(s)) continue
        const habilidade = 0.42 + rnd() * 0.42 + FATOR_ANO[ano] // evolução ano a ano
        for (const tipo of ['diagnostica', 'final']) {
          const avaliacaoId = avalMap[`${ano}|${tipo}`]
          if (!avaliacaoId) continue
          // questões: 2024 usa o banco SEED-Q-2024; 2025/2026 reusam as questões já no banco
          let qpc
          if (ano === '2024') {
            qpc = questoesPorChave[`${tipo}|${s}`]
          } else {
            // 2025/2026: reusa as questões SEED-Q-<ano> já existentes no banco
            qpc = ctx.qpcExist[`${ano}|${tipo}|${s}`]
          }
          if (!qpc) continue
          const probAcerto = Math.min(0.97, habilidade + (tipo === 'final' ? 0.08 : 0))
          const acertos = { lp: 0, mat: 0, ch: 0, cn: 0 }
          const totalPorArea = { lp: 0, mat: 0, ch: 0, cn: 0 }
          for (const key of ['lp', 'mat', 'ch', 'cn']) {
            for (const q of qpc[key]) {
              totalPorArea[key]++
              const acertou = rnd() < probAcerto
              if (acertou) acertos[key]++
              let resposta = q.gabarito
              if (!acertou) { do { resposta = GAB[Math.floor(rnd() * 5)] } while (resposta === q.gabarito) }
              respProvas.push({
                id: uuidv4(), escola_id: t.escola_id, aluno_id: a.id, aluno_codigo: a.codigo, aluno_nome: a.nome,
                turma_id: t.id, questao_id: q.id || qIdByCod[q.codigo], questao_codigo: q.codigo,
                resposta_aluno: resposta, acertou, nota: null, ano_letivo: ano, serie: t.serie,
                disciplina: q.disc, area_conhecimento: q.area, presenca: 'P', avaliacao_id: avaliacaoId,
              })
            }
          }
          const notaArea = (k) => totalPorArea[k] > 0 ? Math.round((acertos[k] / totalPorArea[k]) * 100) / 10 : null
          const nlp = notaArea('lp'), nmat = notaArea('mat'), nch = notaArea('ch'), ncn = notaArea('cn')
          const notasValidas = [nlp, nmat, nch, ncn].filter((x) => x !== null)
          const media = notasValidas.length ? Math.round((notasValidas.reduce((x, y) => x + y, 0) / notasValidas.length) * 10) / 10 : null
          const totalResp = totalPorArea.lp + totalPorArea.mat + totalPorArea.ch + totalPorArea.cn
          let nivel = null
          if (media !== null) nivel = media >= 8 ? 'Avançado' : media >= 6 ? 'Adequado' : media >= 4 ? 'Básico' : 'Abaixo do Básico'
          // produção textual
          const itemNotas = []
          const itemCols = {}
          if (itensProducao.length) {
            const baseEscrita = 4 + rnd() * 4 + FATOR_ANO[ano] * 10
            let idxItem = 0
            for (const item of itensProducao) {
              const np = Math.max(0, Math.min(10, Math.round((baseEscrita + (rnd() * 2 - 1)) * 10) / 10))
              itemNotas.push(np)
              idxItem++
              if (idxItem <= 8) itemCols[`item_producao_${idxItem}`] = np
              producaoRows.push({
                id: uuidv4(), aluno_id: a.id, escola_id: t.escola_id, turma_id: t.id,
                item_producao_id: item.id, ano_letivo: ano, serie: t.serie,
                data_avaliacao: `${ano}-10-15`, nota: np, observacao: null, avaliacao_id: avaliacaoId,
              })
            }
          }
          const notaProducao = itemNotas.length ? Math.round((itemNotas.reduce((x, y) => x + y, 0) / itemNotas.length) * 10) / 10 : null
          consolidados.push({
            id: uuidv4(), aluno_id: a.id, escola_id: t.escola_id, turma_id: t.id, ano_letivo: ano, serie: t.serie,
            presenca: 'P',
            total_acertos_lp: acertos.lp, total_acertos_ch: acertos.ch, total_acertos_mat: acertos.mat, total_acertos_cn: acertos.cn,
            nota_lp: nlp, nota_ch: nch, nota_mat: nmat, nota_cn: ncn, media_aluno: media, nota_producao: notaProducao,
            nivel_aprendizagem: nivel, total_questoes_respondidas: totalResp, total_questoes_esperadas: totalResp,
            avaliacao_id: avaliacaoId, serie_numero: s, ...itemCols,
          })
        }
      }
      // flush incremental de resultados_provas
      if (respProvas.length > 40000) {
        totalRespostas += await bulkInsert(client, 'resultados_provas',
          ['id', 'escola_id', 'aluno_id', 'aluno_codigo', 'aluno_nome', 'turma_id', 'questao_id', 'questao_codigo', 'resposta_aluno', 'acertou', 'nota', 'ano_letivo', 'serie', 'disciplina', 'area_conhecimento', 'presenca', 'avaliacao_id'], respProvas)
        respProvas.length = 0
      }
    }

    // INSERTS de notas/freq
    const nNotas = await bulkInsert(client, 'notas_escolares',
      ['id', 'aluno_id', 'disciplina_id', 'periodo_id', 'escola_id', 'ano_letivo', 'nota', 'nota_recuperacao', 'nota_final', 'faltas', 'turma_id', 'registrado_por'], notas)
    console.log(`notas_escolares: ${nNotas}`)
    const nFreq = await bulkInsert(client, 'frequencia_bimestral',
      ['id', 'aluno_id', 'periodo_id', 'turma_id', 'escola_id', 'ano_letivo', 'dias_letivos', 'presencas', 'faltas', 'faltas_justificadas', 'percentual_frequencia', 'registrado_por', 'metodo'], freq)
    console.log(`frequencia_bimestral: ${nFreq}`)

    if (respProvas.length) {
      totalRespostas += await bulkInsert(client, 'resultados_provas',
        ['id', 'escola_id', 'aluno_id', 'aluno_codigo', 'aluno_nome', 'turma_id', 'questao_id', 'questao_codigo', 'resposta_aluno', 'acertou', 'nota', 'ano_letivo', 'serie', 'disciplina', 'area_conhecimento', 'presenca', 'avaliacao_id'], respProvas)
    }
    console.log(`resultados_provas: ${totalRespostas}`)
    const nCons = await bulkInsert(client, 'resultados_consolidados',
      ['id', 'aluno_id', 'escola_id', 'turma_id', 'ano_letivo', 'serie', 'presenca', 'total_acertos_lp', 'total_acertos_ch', 'total_acertos_mat', 'total_acertos_cn', 'nota_lp', 'nota_ch', 'nota_mat', 'nota_cn', 'media_aluno', 'nota_producao', 'nivel_aprendizagem', 'total_questoes_respondidas', 'total_questoes_esperadas', 'avaliacao_id', 'serie_numero', 'item_producao_1', 'item_producao_2', 'item_producao_3', 'item_producao_4', 'item_producao_5', 'item_producao_6', 'item_producao_7', 'item_producao_8'], consolidados)
    console.log(`resultados_consolidados: ${nCons}`)
    const nProd = await bulkInsert(client, 'resultados_producao',
      ['id', 'aluno_id', 'escola_id', 'turma_id', 'item_producao_id', 'ano_letivo', 'serie', 'data_avaliacao', 'nota', 'observacao', 'avaliacao_id'], producaoRows)
    console.log(`resultados_producao: ${nProd}`)

    // =======================================================================
    // CONSELHO DE CLASSE (1/turma, 4º bim) + parecer por aluno
    // =======================================================================
    const conselhos = []
    const conselhoAlunos = []
    const medias4 = {}
    const periodo4 = {}
    for (const ano of ['2024', '2025', '2026']) periodo4[ano] = periodoMap[ano][3]
    for (const n of notas) {
      if (n.periodo_id !== periodo4[n.ano_letivo]) continue
      const m = (medias4[n.aluno_id] ||= { soma: 0, n: 0 })
      m.soma += Number(n.nota_final); m.n++
    }
    const freq4 = {}
    for (const f of freq) {
      if (f.periodo_id !== periodo4[f.ano_letivo]) continue
      freq4[f.aluno_id] = Number(f.percentual_frequencia)
    }
    const ATAS = [
      'Reunião do conselho de classe final. Análise de aprovação por turma.',
      'Conselho final: deliberação sobre rendimento e frequência da turma.',
      'Reunião deliberativa de encerramento do ano letivo.',
    ]
    for (const t of turmas) {
      const conselhoId = uuidv4()
      conselhos.push({
        id: conselhoId, turma_id: t.id, periodo_id: periodo4[t.ano_letivo], escola_id: t.escola_id,
        ano_letivo: t.ano_letivo, data_reuniao: `${t.ano_letivo}-12-${String(randint(5, 18)).padStart(2, '0')}`,
        ata_geral: pick(ATAS), registrado_por: null,
      })
      for (const a of alunosPorTurma[t.id]) {
        const mm = medias4[a.id]
        const media = mm && mm.n ? mm.soma / mm.n : null
        const fr = freq4[a.id]
        let parecer, obs
        if (media != null && media >= MEDIA_APROVACAO && (fr == null || fr >= 75)) {
          parecer = 'aprovado'; obs = 'Aprovado por média e frequência.'
        } else if (fr != null && fr < 60) {
          parecer = 'reprovado'; obs = 'Reprovado por frequência insuficiente.'
        } else if (media != null && media < MEDIA_APROVACAO) {
          if (rnd() < 0.7) { parecer = 'conselho'; obs = 'Encaminhado ao conselho de classe.' }
          else { parecer = 'reprovado'; obs = 'Reprovado por rendimento.' }
        } else { parecer = 'aprovado'; obs = 'Aprovado.' }
        conselhoAlunos.push({ id: uuidv4(), conselho_id: conselhoId, aluno_id: a.id, parecer, observacao: obs })
      }
    }
    const nCC = await bulkInsert(client, 'conselho_classe',
      ['id', 'turma_id', 'periodo_id', 'escola_id', 'ano_letivo', 'data_reuniao', 'ata_geral', 'registrado_por'], conselhos)
    const nCCA = await bulkInsert(client, 'conselho_classe_alunos',
      ['id', 'conselho_id', 'aluno_id', 'parecer', 'observacao'], conselhoAlunos)
    console.log(`conselho_classe: ${nCC} | conselho_classe_alunos: ${nCCA}`)

    // =======================================================================
    // SITUAÇÃO DE FIM DE ANO
    //   2024 (todas as escolas): ENCERRADO → aprovado ~75% / reprovado ~12% /
    //        transferido ~5% / abandono ~3% / resto cursando + historico_situacao.
    //   2026 das escolas C/D: maioria cursando (ano corrente) com poucas saídas.
    //   2025 das escolas C/D: ENCERRADO (mesma distribuição de 2024).
    //   PCD ~8% entre alunos que terminam ativos.
    // =======================================================================
    const nomeEscolaPorId = {}
    for (const r of [...escAB, ...escCD]) nomeEscolaPorId[r.id] = r.nome
    const escolasDestino = [...escAB, ...escCD].map((r) => ({ id: r.id, nome: r.nome }))
    const demoEsc = (await client.query(`SELECT id, nome FROM escolas WHERE codigo='DEMO-ESC-01' LIMIT 1`)).rows[0]
    if (demoEsc) escolasDestino.push({ id: demoEsc.id, nome: demoEsc.nome })

    const updSituacao = [] // {id, situacao, ativo, zeraTurma}
    const historico = []
    const ativoFinal = {}

    for (const a of alunos) {
      const ano = a.ano_letivo
      const nomeEsc = nomeEscolaPorId[a.escola_id] || null
      const r = rnd()
      let situacao = 'cursando', ativo = true, zeraTurma = false, hist = null
      const dataTransf = `${ano}-${String(randint(3, 9)).padStart(2, '0')}-${String(randint(1, 28)).padStart(2, '0')}`
      const dataFim = `${ano}-12-${String(randint(5, 20)).padStart(2, '0')}`
      const anoEncerrado = ano === '2024' || ano === '2025'

      if (!anoEncerrado) {
        // 2026 corrente (só escolas C/D): poucas saídas
        if (r < 0.04) {
          situacao = 'transferido'; ativo = false; zeraTurma = true
          const dentro = rnd() < 0.5
          if (dentro) {
            const cand = escolasDestino.filter((d) => d.id !== a.escola_id)
            const dest = cand[Math.floor(rnd() * cand.length)]
            hist = { situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS.transfDentro, tipo_transferencia: 'dentro_municipio', tipo_movimentacao: 'saida', escola_origem_id: a.escola_id, escola_origem_nome: nomeEsc, escola_destino_id: dest.id, escola_destino_nome: dest.nome }
          } else {
            hist = { situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS.transfFora, tipo_transferencia: 'fora_municipio', tipo_movimentacao: 'saida', escola_origem_id: a.escola_id, escola_origem_nome: nomeEsc, escola_destino_id: null, escola_destino_nome: pick(ESCOLAS_FORA) }
          }
        } else if (r < 0.07) {
          situacao = 'abandono'; ativo = false
          hist = { situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS.abandono, tipo_transferencia: null, tipo_movimentacao: null, escola_origem_id: a.escola_id, escola_origem_nome: nomeEsc, escola_destino_id: null, escola_destino_nome: null }
        }
      } else {
        // ano encerrado: 75% aprovado / 12% reprovado / 5% transf / 3% aband / resto cursando
        if (r < 0.75) {
          situacao = 'aprovado'; ativo = true
          hist = { situacao, situacao_anterior: 'cursando', data: dataFim, observacao: OBS.aprovado, tipo_transferencia: null, tipo_movimentacao: null, escola_origem_id: a.escola_id, escola_origem_nome: nomeEsc, escola_destino_id: null, escola_destino_nome: null }
        } else if (r < 0.87) {
          situacao = 'reprovado'; ativo = true
          hist = { situacao, situacao_anterior: 'cursando', data: dataFim, observacao: OBS.reprovado, tipo_transferencia: null, tipo_movimentacao: null, escola_origem_id: a.escola_id, escola_origem_nome: nomeEsc, escola_destino_id: null, escola_destino_nome: null }
        } else if (r < 0.92) {
          situacao = 'transferido'; ativo = false; zeraTurma = true
          const dentro = rnd() < 0.5
          if (dentro) {
            const cand = escolasDestino.filter((d) => d.id !== a.escola_id)
            const dest = cand[Math.floor(rnd() * cand.length)]
            hist = { situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS.transfDentro, tipo_transferencia: 'dentro_municipio', tipo_movimentacao: 'saida', escola_origem_id: a.escola_id, escola_origem_nome: nomeEsc, escola_destino_id: dest.id, escola_destino_nome: dest.nome }
          } else {
            hist = { situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS.transfFora, tipo_transferencia: 'fora_municipio', tipo_movimentacao: 'saida', escola_origem_id: a.escola_id, escola_origem_nome: nomeEsc, escola_destino_id: null, escola_destino_nome: pick(ESCOLAS_FORA) }
          }
        } else if (r < 0.95) {
          situacao = 'abandono'; ativo = false
          hist = { situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS.abandono, tipo_transferencia: null, tipo_movimentacao: null, escola_origem_id: a.escola_id, escola_origem_nome: nomeEsc, escola_destino_id: null, escola_destino_nome: null }
        }
      }
      ativoFinal[a.id] = ativo
      if (situacao !== 'cursando' || !ativo) updSituacao.push({ id: a.id, situacao, ativo, zeraTurma })
      if (hist) historico.push({ id: uuidv4(), aluno_id: a.id, ...hist, registrado_por: null })
    }

    // PCD (~8%) entre alunos que terminam ativos
    const updPcd = []
    for (const a of alunos) {
      if (ativoFinal[a.id] && rnd() < 0.08) updPcd.push({ id: a.id, tipo: pick(TIPOS_DEFICIENCIA) })
    }

    // Aplicar situação (UPDATE ... FROM VALUES por chunk)
    if (updSituacao.length) {
      const perChunk = 800
      for (let i = 0; i < updSituacao.length; i += perChunk) {
        const slice = updSituacao.slice(i, i + perChunk)
        const vals = []; const params = []; let p = 0
        for (const u of slice) {
          vals.push(`($${++p}::uuid, $${++p}::varchar, $${++p}::boolean, $${++p}::boolean)`)
          params.push(u.id, u.situacao, u.ativo, u.zeraTurma)
        }
        await client.query(
          `UPDATE alunos a SET situacao=v.situacao, ativo=v.ativo,
              turma_id = CASE WHEN v.zera THEN NULL ELSE a.turma_id END,
              atualizado_em = CURRENT_TIMESTAMP
           FROM (VALUES ${vals.join(',')}) AS v(id, situacao, ativo, zera) WHERE a.id = v.id`, params)
      }
    }
    if (updPcd.length) {
      const perChunk = 800
      for (let i = 0; i < updPcd.length; i += perChunk) {
        const slice = updPcd.slice(i, i + perChunk)
        const vals = []; const params = []; let p = 0
        for (const u of slice) { vals.push(`($${++p}::uuid, $${++p}::varchar)`); params.push(u.id, u.tipo) }
        await client.query(
          `UPDATE alunos a SET pcd=true, tipo_deficiencia=v.tipo, atualizado_em=CURRENT_TIMESTAMP
           FROM (VALUES ${vals.join(',')}) AS v(id, tipo) WHERE a.id = v.id`, params)
      }
    }
    const nHist = await bulkInsert(client, 'historico_situacao',
      ['id', 'aluno_id', 'situacao', 'situacao_anterior', 'data', 'observacao', 'registrado_por', 'tipo_transferencia', 'escola_destino_id', 'escola_destino_nome', 'escola_origem_id', 'escola_origem_nome', 'tipo_movimentacao'], historico)
    console.log(`situacao alterada: ${updSituacao.length} | pcd: ${updPcd.length} | historico_situacao: ${nHist}`)

    await client.query('COMMIT')
    console.log('\n== COMMIT OK ==')

    // =======================================================================
    // VERIFICAÇÃO
    // =======================================================================
    console.log('\n== Por ANO LETIVO (escolas seed SEED-ESC-%) ==')
    const porAno = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT ano_letivo,
        (SELECT count(*) FROM turmas t WHERE t.escola_id IN (SELECT id FROM esc) AND t.ano_letivo=x.ano_letivo) turmas,
        (SELECT count(*) FROM alunos a WHERE a.escola_id IN (SELECT id FROM esc) AND a.ano_letivo=x.ano_letivo) alunos,
        (SELECT count(*) FROM notas_escolares n WHERE n.escola_id IN (SELECT id FROM esc) AND n.ano_letivo=x.ano_letivo) notas,
        (SELECT count(*) FROM frequencia_bimestral f WHERE f.escola_id IN (SELECT id FROM esc) AND f.ano_letivo=x.ano_letivo) freq,
        (SELECT count(*) FROM resultados_consolidados rc WHERE rc.escola_id IN (SELECT id FROM esc) AND rc.ano_letivo=x.ano_letivo) consolidados
      FROM (SELECT DISTINCT ano_letivo FROM alunos WHERE escola_id IN (SELECT id FROM esc)) x
      ORDER BY ano_letivo`)
    console.table(porAno.rows)

    console.log('\n== Por POLO / ESCOLA ==')
    const porEscola = await client.query(`
      SELECT p.nome polo, e.codigo, e.nome escola, a.ano_letivo,
        count(DISTINCT t.id) turmas, count(DISTINCT a.id) alunos
      FROM escolas e
      JOIN polos p ON p.id = e.polo_id
      LEFT JOIN turmas t ON t.escola_id = e.id
      LEFT JOIN alunos a ON a.escola_id = e.id AND a.ano_letivo = t.ano_letivo
      WHERE e.codigo LIKE 'SEED-ESC-%'
      GROUP BY p.nome, e.codigo, e.nome, a.ano_letivo
      ORDER BY p.nome, e.codigo, a.ano_letivo`)
    console.table(porEscola.rows)

    console.log('\n== EVOLUÇÃO de médias por ano (consolidados, escolas seed) ==')
    const evol = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT ano_letivo, ROUND(AVG(media_aluno)::numeric,2) media_sisam, count(*) n
      FROM resultados_consolidados WHERE escola_id IN (SELECT id FROM esc)
      GROUP BY ano_letivo ORDER BY ano_letivo`)
    console.table(evol.rows)

    console.log('\n== Situação de fim de ano (escolas seed Fase 1, alunos SEED-F1-) ==')
    const sit = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT ano_letivo, situacao, count(*) n FROM alunos
      WHERE escola_id IN (SELECT id FROM esc) AND codigo LIKE 'SEED-F1-%'
      GROUP BY ano_letivo, situacao ORDER BY ano_letivo, situacao`)
    console.table(sit.rows)

    console.log('\n== Professores por polo ==')
    const profs = await client.query(`
      SELECT p.nome polo, count(*) professores
      FROM usuarios u JOIN polos p ON p.id = u.polo_id
      WHERE u.email LIKE 'prof-f1-%.seed@educanet.app'
      GROUP BY p.nome ORDER BY p.nome`)
    console.table(profs.rows)

    console.log('\nScript: scripts/seed/seed-fase1-demo.js')
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
