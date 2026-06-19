/**
 * SEED COMPLETO DE DEMONSTRAÇÃO — Banco DEMO (Supabase tbbnswuqsqhulserwtcc)
 * ============================================================================
 * Gera massa de dados realista para o ambiente de demonstração do SISAM:
 *   - 2 escolas NOVAS dedicadas (codigo 'SEED-ESC-*')
 *   - Fundamental 1º–9º Ano (9 séries), 2 turmas/série (Manhã/Tarde), ~22 alunos/turma
 *   - Anos letivos 2025 E 2026
 *   - Professores (.seed@educanet.app), vínculos professor_turmas
 *   - notas_escolares (4 bimestres × disciplinas) com ~25% de recuperação
 *   - frequencia_bimestral (4 bimestres)
 *   - SISAM completo: avaliações 2025, questões, sisam_series_participantes,
 *     resultados_provas (por questão) e resultados_consolidados (por aluno)
 *
 * IDEMPOTENTE: tudo é marcado por prefixos identificáveis e o script limpa
 * SOMENTE o que casa com esses marcadores no início. NÃO toca em DEMO-ESC-01
 * nem em qualquer dado sem marcador.
 *
 * Marcadores:
 *   escolas.codigo      → 'SEED-ESC-%'
 *   turmas.codigo       → 'SEED-%'
 *   alunos.codigo       → 'SEED-%'
 *   usuarios (prof)     → email LIKE '%.seed@educanet.app'
 *   questoes.codigo     → 'SEED-Q-%'
 *
 * Conexão: lê DB_PASSWORD de .env.local; conecta direto em
 *   db.tbbnswuqsqhulserwtcc.supabase.co:5432/postgres (user postgres, SSL).
 *
 * Uso:  node scripts/seed/seed-completo-demo.js
 *       node scripts/seed/seed-completo-demo.js --limpar-apenas
 * ============================================================================
 */
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

// ---------------------------------------------------------------------------
// .env.local loader (mesmo padrão de scripts/diagnostico/inventario-seed.js)
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
const ANOS = ['2025', '2026']
const SERIES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] // número da série
const TURNOS = ['Manhã', 'Tarde'] // 2 turmas por série
const ALUNOS_POR_TURMA = 22
const MEDIA_APROVACAO = 6.0
const SENHA_PADRAO_HASH_FALLBACK = '$2a$10$jXrEpIzc9r4xkwzylZlu.ePLvsDn81sA.TT1/YH2X7u7qsuf6BHWq'
const ESCOLAS_SEED = [
  { codigo: 'SEED-ESC-01', nome: 'Escola Municipal Boa Esperança (Seed Demo)', bairro: 'Centro' },
  { codigo: 'SEED-ESC-02', nome: 'Escola Municipal Rio das Flores (Seed Demo)', bairro: 'São José' },
]

const serieLabel = (n) => `${n}º Ano`
const etapaDe = (n) => (Number(n) <= 5 ? 'anos_iniciais' : 'anos_finais')

// Disciplinas por etapa (subconjunto realista do catálogo existente)
const DISCIPLINAS_INICIAIS = ['LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL']
const DISCIPLINAS_FINAIS = ['LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL', 'ING']

// SISAM: áreas avaliadas por etapa quando configuracao_series tem qtd 0 (fallback)
const FALLBACK_QTD = {
  anos_iniciais: { lp: 14, mat: 14, ch: 0, cn: 0 },
  anos_finais: { lp: 15, mat: 15, ch: 15, cn: 15 },
}

// ---------------------------------------------------------------------------
// Geradores pt-BR
// ---------------------------------------------------------------------------
const PRENOMES_M = ['João', 'Pedro', 'Lucas', 'Gabriel', 'Mateus', 'Rafael', 'Davi', 'Miguel', 'Arthur', 'Heitor', 'Bernardo', 'Théo', 'Enzo', 'Samuel', 'Benício', 'Caleb', 'Ravi', 'Anthony', 'Noah', 'Otávio']
const PRENOMES_F = ['Maria', 'Ana', 'Alice', 'Laura', 'Sophia', 'Helena', 'Valentina', 'Isabella', 'Manuela', 'Júlia', 'Heloísa', 'Lorena', 'Lívia', 'Cecília', 'Eloá', 'Beatriz', 'Yasmin', 'Antonella', 'Maitê', 'Esther']
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Cardoso', 'Mendes']
const RACAS = ['branca', 'preta', 'parda', 'amarela', 'indigena', 'nao_declarada']

let _rng = 123456789
function rnd() { // PRNG determinístico (seed reproduzível)
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
  // idade típica ≈ 5 + série; calcula ano de nascimento
  const idade = 5 + Number(serieNum) + randint(-1, 1)
  const anoNasc = Number(ano) - idade
  const mes = String(randint(1, 12)).padStart(2, '0')
  const dia = String(randint(1, 28)).padStart(2, '0')
  return `${anoNasc}-${mes}-${dia}`
}

// ---------------------------------------------------------------------------
// Inserção em lote (multi-row) — divide em chunks p/ não estourar params
// ---------------------------------------------------------------------------
async function bulkInsert(client, table, columns, rows, { chunkRows } = {}) {
  if (rows.length === 0) return 0
  const maxParams = 60000 // bem abaixo do limite de 65535 do protocolo
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
// LIMPEZA idempotente (somente marcadores) — ordem inversa de dependência
// ---------------------------------------------------------------------------
async function limpar(client) {
  console.log('\n== LIMPEZA de seed anterior (apenas marcadores) ==')
  // Conjunto de ids de escolas seed
  const escSeed = await client.query(`SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%'`)
  const escIds = escSeed.rows.map((r) => r.id)
  if (escIds.length === 0) {
    console.log('  Nenhuma escola seed encontrada. Limpando apenas questões/participantes/avaliações marcadas.')
  }

  const steps = []
  if (escIds.length) {
    // Tudo que referencia escolas seed (resultados, notas, freq) via escola_id
    steps.push(['resultados_provas', `DELETE FROM resultados_provas WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['resultados_consolidados', `DELETE FROM resultados_consolidados WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['resultados_producao', `DELETE FROM resultados_producao WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['notas_escolares', `DELETE FROM notas_escolares WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['frequencia_bimestral', `DELETE FROM frequencia_bimestral WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['frequencia_diaria', `DELETE FROM frequencia_diaria WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['conselho_classe_alunos', `DELETE FROM conselho_classe_alunos WHERE conselho_id IN (SELECT id FROM conselho_classe WHERE escola_id = ANY($1))`, [escIds]])
    steps.push(['conselho_classe', `DELETE FROM conselho_classe WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['professor_turmas', `DELETE FROM professor_turmas WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = ANY($1))`, [escIds]])
    steps.push(['alunos', `DELETE FROM alunos WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['turmas', `DELETE FROM turmas WHERE escola_id = ANY($1)`, [escIds]])
    steps.push(['series_escola', `DELETE FROM series_escola WHERE escola_id = ANY($1)`, [escIds]])
  }
  // Marcadores que não dependem de escola
  steps.push(['usuarios (prof seed)', `DELETE FROM usuarios WHERE email LIKE '%.seed@educanet.app'`, []])
  steps.push(['questoes (seed)', `DELETE FROM resultados_provas WHERE questao_codigo LIKE 'SEED-Q-%'`, []]) // defensivo p/ órfãos
  steps.push(['questoes', `DELETE FROM questoes WHERE codigo LIKE 'SEED-Q-%'`, []])
  if (escIds.length) steps.push(['escolas', `DELETE FROM escolas WHERE id = ANY($1)`, [escIds]])

  for (const [label, sql, params] of steps) {
    try {
      const r = await client.query(sql, params)
      if (r.rowCount) console.log(`  - ${label}: ${r.rowCount} removidos`)
    } catch (err) {
      // Tabela pode não existir (ex.: resultados_producao / frequencia_diaria) — defensivo
      console.log(`  - ${label}: pulado (${err.message})`)
    }
  }
  console.log('  Limpeza concluída.')
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
    // ---- Dados de referência existentes ----
    const polo = (await client.query(`SELECT polo_id FROM escolas WHERE codigo = 'DEMO-ESC-01' LIMIT 1`)).rows[0]
    if (!polo) throw new Error('Não encontrei DEMO-ESC-01 para herdar o polo_id')
    const poloId = polo.polo_id
    console.log(`polo_id herdado de DEMO-ESC-01: ${poloId}`)

    const senhaHash = (await client.query(`SELECT senha FROM usuarios LIMIT 1`)).rows[0]?.senha || SENHA_PADRAO_HASH_FALLBACK

    const disc = (await client.query(`SELECT id, codigo FROM disciplinas_escolares WHERE ativo`)).rows
    const discByCod = {}
    for (const d of disc) discByCod[d.codigo] = d.id

    const periodos = (await client.query(`SELECT id, numero, ano_letivo FROM periodos_letivos WHERE tipo_periodo='bimestre' ORDER BY ano_letivo, numero`)).rows
    const periodoMap = {} // ano -> [4 ids ordenados]
    for (const a of ANOS) periodoMap[a] = periodos.filter((p) => p.ano_letivo === a).sort((x, y) => x.numero - y.numero).map((p) => p.id)
    for (const a of ANOS) if (periodoMap[a].length < 4) throw new Error(`Faltam períodos do ano ${a}`)

    const cfgSeries = {}
    for (const r of (await client.query(`SELECT * FROM configuracao_series`)).rows) cfgSeries[r.serie] = r

    // ---- LIMPEZA ----
    await limpar(client)
    if (limparApenas) { console.log('\n--limpar-apenas: encerrando após limpeza.'); return }

    await client.query('BEGIN')

    // -----------------------------------------------------------------------
    // 1) ESCOLAS
    // -----------------------------------------------------------------------
    const escolas = ESCOLAS_SEED.map((es) => ({
      id: uuidv4(), codigo: es.codigo, nome: es.nome, polo_id: poloId, ativo: true,
      endereco: `Rua das Demonstrações, ${randint(10, 999)}`, bairro: es.bairro,
      etapas_ensino: '{ensino_fundamental}', municipio: 'São Sebastião da Boa Vista', uf: 'PA',
    }))
    await bulkInsert(client, 'escolas',
      ['id', 'codigo', 'nome', 'polo_id', 'ativo', 'endereco', 'bairro', 'etapas_ensino', 'municipio', 'uf'], escolas)
    console.log(`\nEscolas: ${escolas.length}`)

    // -----------------------------------------------------------------------
    // 2) SERIES_ESCOLA (por escola × série × ano)
    // -----------------------------------------------------------------------
    const seriesEscola = []
    for (const esc of escolas) for (const ano of ANOS) for (const s of SERIES) {
      seriesEscola.push({ id: uuidv4(), escola_id: esc.id, serie: serieLabel(s), ano_letivo: ano, ativo: true })
    }
    await bulkInsert(client, 'series_escola', ['id', 'escola_id', 'serie', 'ano_letivo', 'ativo'], seriesEscola)
    console.log(`series_escola: ${seriesEscola.length}`)

    // -----------------------------------------------------------------------
    // 3) TURMAS (escola × série × turno × ano)
    // -----------------------------------------------------------------------
    const turmas = []
    for (const esc of escolas) {
      const escNum = esc.codigo.slice(-2)
      for (const ano of ANOS) for (const s of SERIES) {
        let idxTurno = 0
        for (const turno of TURNOS) {
          const letra = idxTurno === 0 ? 'A' : 'B'
          idxTurno++
          turmas.push({
            id: uuidv4(),
            codigo: `SEED-${escNum}-${ano}-${s}${letra}`,
            nome: `${serieLabel(s)} "${letra}" - ${turno}`,
            escola_id: esc.id, serie: serieLabel(s), ano_letivo: ano, ativo: true,
            capacidade_maxima: 35, turno, etapa_ensino: etapaDe(s),
            serie_numero: s, modalidade: 'regular', tipo_atendimento: 'escolarizacao',
          })
        }
      }
    }
    await bulkInsert(client, 'turmas',
      ['id', 'codigo', 'nome', 'escola_id', 'serie', 'ano_letivo', 'ativo', 'capacidade_maxima', 'turno', 'etapa_ensino', 'serie_numero', 'modalidade', 'tipo_atendimento'], turmas)
    console.log(`turmas: ${turmas.length}`)

    // -----------------------------------------------------------------------
    // 4) PROFESSORES (.seed@educanet.app) — 1 por turma como regente/polivalente
    //    + alguns por disciplina nos anos finais
    // -----------------------------------------------------------------------
    const professores = []
    const profPorEscola = {} // escola_id -> [profIds]
    let profSeq = 0
    for (const esc of escolas) {
      profPorEscola[esc.id] = []
      const n = 30 // pool de professores por escola
      for (let i = 0; i < n; i++) {
        const { nome } = nomePessoa()
        profSeq++
        const id = uuidv4()
        professores.push({
          id, nome: `Prof. ${nome}`, email: `prof${String(profSeq).padStart(4, '0')}.seed@educanet.app`,
          senha: senhaHash, tipo_usuario: 'professor', polo_id: poloId, escola_id: esc.id, ativo: true,
        })
        profPorEscola[esc.id].push(id)
      }
    }
    await bulkInsert(client, 'usuarios',
      ['id', 'nome', 'email', 'senha', 'tipo_usuario', 'polo_id', 'escola_id', 'ativo'], professores)
    console.log(`professores (usuarios .seed): ${professores.length}`)

    // -----------------------------------------------------------------------
    // 5) PROFESSOR_TURMAS — respeita índices únicos parciais:
    //    polivalente: 1 por (turma, ano); disciplina: 1 por (turma, disciplina, ano)
    //    Anos iniciais → 1 polivalente. Anos finais → vínculos por disciplina.
    // -----------------------------------------------------------------------
    const profTurmas = []
    for (const t of turmas) {
      const pool = profPorEscola[t.escola_id]
      if (etapaDe(t.serie_numero) === 'anos_iniciais') {
        profTurmas.push({
          id: uuidv4(), professor_id: pick(pool), turma_id: t.id, disciplina_id: null,
          tipo_vinculo: 'polivalente', ano_letivo: t.ano_letivo, ativo: true,
        })
      } else {
        for (const cod of DISCIPLINAS_FINAIS) {
          profTurmas.push({
            id: uuidv4(), professor_id: pick(pool), turma_id: t.id, disciplina_id: discByCod[cod],
            tipo_vinculo: 'disciplina', ano_letivo: t.ano_letivo, ativo: true,
          })
        }
      }
    }
    await bulkInsert(client, 'professor_turmas',
      ['id', 'professor_id', 'turma_id', 'disciplina_id', 'tipo_vinculo', 'ano_letivo', 'ativo'], profTurmas)
    console.log(`professor_turmas: ${profTurmas.length}`)

    // -----------------------------------------------------------------------
    // 6) ALUNOS (~22 por turma)
    // -----------------------------------------------------------------------
    const alunos = []
    let alunoSeq = 0
    for (const t of turmas) {
      for (let i = 0; i < ALUNOS_POR_TURMA; i++) {
        alunoSeq++
        const { nome: nomeBase, genero } = nomePessoa()
        // Índice único UNIQUE(upper(trim(nome)), escola_id, ano_letivo): garante
        // unicidade embutindo o sequencial como sufixo discreto no nome.
        const nome = `${nomeBase} ${String(alunoSeq).padStart(5, '0')}`
        const mae = nomePessoa().nome
        alunos.push({
          id: uuidv4(), codigo: `SEED-${String(alunoSeq).padStart(6, '0')}`, nome,
          escola_id: t.escola_id, turma_id: t.id, serie: t.serie, ano_letivo: t.ano_letivo,
          ativo: true, situacao: 'cursando', data_nascimento: dataNascimento(t.serie_numero, t.ano_letivo),
          genero, raca_cor: pick(RACAS), nome_mae: mae, responsavel: mae,
          telefone_responsavel: `(91) 9${randint(8000, 9999)}-${randint(1000, 9999)}`,
          data_matricula: `${t.ano_letivo}-02-${String(randint(1, 15)).padStart(2, '0')}`,
          serie_numero: t.serie_numero, modalidade: 'regular',
        })
      }
    }
    await bulkInsert(client, 'alunos',
      ['id', 'codigo', 'nome', 'escola_id', 'turma_id', 'serie', 'ano_letivo', 'ativo', 'situacao', 'data_nascimento', 'genero', 'raca_cor', 'nome_mae', 'responsavel', 'telefone_responsavel', 'data_matricula', 'serie_numero', 'modalidade'], alunos)
    console.log(`alunos: ${alunos.length}`)

    // Index aluno por turma para reuso
    const alunosPorTurma = {}
    for (const a of alunos) (alunosPorTurma[a.turma_id] ||= []).push(a)

    // -----------------------------------------------------------------------
    // 7) NOTAS_ESCOLARES (aluno × disciplina × 4 bimestres)
    //    ~25% abaixo da média → recuperação; nota_final = max(nota, recup)
    // -----------------------------------------------------------------------
    const notas = []
    for (const t of turmas) {
      const codDisc = etapaDe(t.serie_numero) === 'anos_iniciais' ? DISCIPLINAS_INICIAIS : DISCIPLINAS_FINAIS
      const pers = periodoMap[t.ano_letivo]
      for (const a of alunosPorTurma[t.id]) {
        for (const cod of codDisc) {
          const discId = discByCod[cod]
          for (let b = 0; b < 4; b++) {
            const nota = Math.round((3 + rnd() * 7) * 10) / 10 // 3.0 .. 10.0
            let notaRec = null, notaFinal = nota
            if (nota < MEDIA_APROVACAO && rnd() < 0.7) {
              notaRec = Math.round((4 + rnd() * 4) * 10) / 10 // 4.0 .. 8.0
              notaFinal = Math.max(nota, notaRec)
            }
            notas.push({
              id: uuidv4(), aluno_id: a.id, disciplina_id: discId, periodo_id: pers[b],
              escola_id: t.escola_id, ano_letivo: t.ano_letivo,
              nota, nota_recuperacao: notaRec, nota_final: Math.round(notaFinal * 10) / 10,
              faltas: randint(0, 8), turma_id: t.id, registrado_por: null,
            })
          }
        }
      }
    }
    const nNotas = await bulkInsert(client, 'notas_escolares',
      ['id', 'aluno_id', 'disciplina_id', 'periodo_id', 'escola_id', 'ano_letivo', 'nota', 'nota_recuperacao', 'nota_final', 'faltas', 'turma_id', 'registrado_por'], notas)
    console.log(`notas_escolares: ${nNotas}`)

    // -----------------------------------------------------------------------
    // 8) FREQUENCIA_BIMESTRAL (aluno × 4 bimestres) — UNIQUE(aluno_id, periodo_id)
    // -----------------------------------------------------------------------
    const freq = []
    for (const t of turmas) {
      const pers = periodoMap[t.ano_letivo]
      for (const a of alunosPorTurma[t.id]) {
        for (let b = 0; b < 4; b++) {
          const dias = 50
          const faltas = randint(0, 12)
          const fj = Math.min(faltas, randint(0, 4))
          const presencas = dias - faltas
          const perc = Math.round((presencas / dias) * 1000) / 10
          freq.push({
            id: uuidv4(), aluno_id: a.id, periodo_id: pers[b], turma_id: t.id, escola_id: t.escola_id,
            ano_letivo: t.ano_letivo, dias_letivos: dias, presencas, faltas, faltas_justificadas: fj,
            percentual_frequencia: perc, registrado_por: null, metodo: 'manual',
          })
        }
      }
    }
    const nFreq = await bulkInsert(client, 'frequencia_bimestral',
      ['id', 'aluno_id', 'periodo_id', 'turma_id', 'escola_id', 'ano_letivo', 'dias_letivos', 'presencas', 'faltas', 'faltas_justificadas', 'percentual_frequencia', 'registrado_por', 'metodo'], freq)
    console.log(`frequencia_bimestral: ${nFreq}`)

    // =======================================================================
    // SISAM
    // =======================================================================

    // 9) AVALIAÇÕES 2025 (UNIQUE(ano_letivo, tipo)); 2026 já existem
    const avalRows = (await client.query(`SELECT id, ano_letivo, tipo FROM avaliacoes`)).rows
    const avalMap = {} // `${ano}|${tipo}` -> id
    for (const r of avalRows) avalMap[`${r.ano_letivo}|${r.tipo}`] = r.id
    const novasAval = []
    for (const ano of ANOS) {
      for (const [tipo, ordem, nome] of [['diagnostica', 1, `Avaliação Diagnóstica ${ano}`], ['final', 2, `Avaliação Final ${ano}`]]) {
        if (!avalMap[`${ano}|${tipo}`]) {
          const id = uuidv4()
          novasAval.push({ id, nome, ano_letivo: ano, tipo, ordem, ativo: true })
          avalMap[`${ano}|${tipo}`] = id
        }
      }
    }
    if (novasAval.length) {
      await bulkInsert(client, 'avaliacoes', ['id', 'nome', 'ano_letivo', 'tipo', 'ordem', 'ativo'], novasAval)
    }
    console.log(`\navaliacoes criadas: ${novasAval.length} (total esperado: 4 = 2 anos × 2 tipos)`)

    // 10) sisam_series_participantes (UNIQUE(ano_letivo, serie)) — todas as séries
    const participantes = []
    for (const ano of ANOS) for (const s of SERIES) {
      participantes.push({ id: uuidv4(), ano_letivo: ano, serie: serieLabel(s), ativo: true })
    }
    // upsert defensivo (algumas podem já existir de outras fontes)
    let nPart = 0
    for (const p of participantes) {
      const r = await client.query(
        `INSERT INTO sisam_series_participantes (id, ano_letivo, serie, ativo) VALUES ($1,$2,$3,true)
         ON CONFLICT (ano_letivo, serie) DO NOTHING`, [p.id, p.ano_letivo, p.serie])
      nPart += r.rowCount
    }
    console.log(`sisam_series_participantes inseridos: ${nPart}`)

    // 11) QUESTÕES — por série × avaliação(ano|tipo) × área(LP/MAT/CH/CN)
    //     codigo único 'SEED-Q-<ano>-<tipo>-<serie>-<AREA><n>'
    //     (questao_codigo precisa ser distinto entre avaliações p/ índices únicos)
    const AREAS = [
      { key: 'lp', area: 'Linguagens', disc: 'Língua Portuguesa', qcol: 'qtd_questoes_lp', flag: 'avalia_lp' },
      { key: 'mat', area: 'Matemática', disc: 'Matemática', qcol: 'qtd_questoes_mat', flag: 'avalia_mat' },
      { key: 'ch', area: 'Ciências Humanas', disc: 'Ciências Humanas', qcol: 'qtd_questoes_ch', flag: 'avalia_ch' },
      { key: 'cn', area: 'Ciências da Natureza', disc: 'Ciências da Natureza', qcol: 'qtd_questoes_cn', flag: 'avalia_cn' },
    ]
    const GAB = ['A', 'B', 'C', 'D', 'E']

    // Estrutura: questoesPorChave[`${ano}|${tipo}|${serie}`] = { lp:[{codigo,gabarito}], mat:[...], ... }
    const questoes = []
    const questoesPorChave = {}
    for (const ano of ANOS) {
      for (const tipo of ['diagnostica', 'final']) {
        for (const s of SERIES) {
          const cs = cfgSeries[s] || {}
          const etapa = etapaDe(s)
          const chave = `${ano}|${tipo}|${s}`
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
              const codigo = `SEED-Q-${ano}-${tipo === 'diagnostica' ? 'D' : 'F'}-${s}-${A.key.toUpperCase()}${q}`
              const gab = GAB[Math.floor(rnd() * 5)]
              questoes.push({
                id: uuidv4(), codigo, descricao: `Questão ${q} de ${A.disc} (${serieLabel(s)})`,
                disciplina: A.disc, area_conhecimento: A.area, gabarito: gab,
                serie_aplicavel: serieLabel(s), tipo_questao: 'objetiva', numero_questao: numero,
              })
              questoesPorChave[chave][A.key].push({ codigo, gabarito: gab, area: A.area, disc: A.disc })
            }
          }
        }
      }
    }
    const nQ = await bulkInsert(client, 'questoes',
      ['id', 'codigo', 'descricao', 'disciplina', 'area_conhecimento', 'gabarito', 'serie_aplicavel', 'tipo_questao', 'numero_questao'], questoes)
    console.log(`questoes: ${nQ}`)

    // Mapa codigo->id de questões (para resultados_provas.questao_id)
    const qIdByCod = {}
    for (const q of questoes) qIdByCod[q.codigo] = q.id

    // 12) RESULTADOS_PROVAS + 13) RESULTADOS_CONSOLIDADOS
    //     Para cada aluno (de cada turma) × cada avaliação do seu ano:
    //       - responde cada questão da sua série (acerto ~ habilidade do aluno)
    //       - consolida acertos/notas por área
    const respProvas = []
    const consolidados = []
    let totalRespostas = 0

    for (const t of turmas) {
      const ano = t.ano_letivo
      const s = t.serie_numero
      const etapa = etapaDe(s)
      for (const a of alunosPorTurma[t.id]) {
        const habilidade = 0.45 + rnd() * 0.45 // prob. base de acerto deste aluno
        for (const tipo of ['diagnostica', 'final']) {
          const avaliacaoId = avalMap[`${ano}|${tipo}`]
          const chave = `${ano}|${tipo}|${s}`
          const qpc = questoesPorChave[chave]
          if (!qpc) continue
          // ganho de aprendizagem na avaliação final
          const probAcerto = Math.min(0.97, habilidade + (tipo === 'final' ? 0.08 : 0))
          const acertos = { lp: 0, mat: 0, ch: 0, cn: 0 }
          const totalPorArea = { lp: 0, mat: 0, ch: 0, cn: 0 }
          for (const key of ['lp', 'mat', 'ch', 'cn']) {
            for (const q of qpc[key]) {
              totalPorArea[key]++
              const acertou = rnd() < probAcerto
              if (acertou) acertos[key]++
              // resposta: se acertou → gabarito; senão uma alternativa diferente
              let resposta = q.gabarito
              if (!acertou) {
                do { resposta = GAB[Math.floor(rnd() * 5)] } while (resposta === q.gabarito)
              }
              respProvas.push({
                id: uuidv4(), escola_id: t.escola_id, aluno_id: a.id, aluno_codigo: a.codigo, aluno_nome: a.nome,
                turma_id: t.id, questao_id: qIdByCod[q.codigo], questao_codigo: q.codigo,
                resposta_aluno: resposta, acertou, nota: null, ano_letivo: ano, serie: t.serie,
                disciplina: q.disc, area_conhecimento: q.area, presenca: 'P', avaliacao_id: avaliacaoId,
              })
            }
          }
          // Consolidado por aluno×avaliação
          const notaArea = (key) => totalPorArea[key] > 0 ? Math.round((acertos[key] / totalPorArea[key]) * 100) / 10 : null
          const nlp = notaArea('lp'), nmat = notaArea('mat'), nch = notaArea('ch'), ncn = notaArea('cn')
          const notasValidas = [nlp, nmat, nch, ncn].filter((x) => x !== null)
          const media = notasValidas.length ? Math.round((notasValidas.reduce((x, y) => x + y, 0) / notasValidas.length) * 10) / 10 : null
          const totalResp = totalPorArea.lp + totalPorArea.mat + totalPorArea.ch + totalPorArea.cn
          let nivel = null
          if (media !== null) nivel = media >= 8 ? 'Avançado' : media >= 6 ? 'Adequado' : media >= 4 ? 'Básico' : 'Abaixo do Básico'
          consolidados.push({
            id: uuidv4(), aluno_id: a.id, escola_id: t.escola_id, turma_id: t.id, ano_letivo: ano, serie: t.serie,
            presenca: 'P',
            total_acertos_lp: acertos.lp, total_acertos_ch: acertos.ch, total_acertos_mat: acertos.mat, total_acertos_cn: acertos.cn,
            nota_lp: nlp, nota_ch: nch, nota_mat: nmat, nota_cn: ncn, media_aluno: media, nota_producao: null,
            nivel_aprendizagem: nivel, total_questoes_respondidas: totalResp, total_questoes_esperadas: totalResp,
            avaliacao_id: avaliacaoId, serie_numero: s,
          })
        }
      }
      // flush incremental de resultados_provas p/ não acumular memória demais
      if (respProvas.length > 40000) {
        totalRespostas += await bulkInsert(client, 'resultados_provas',
          ['id', 'escola_id', 'aluno_id', 'aluno_codigo', 'aluno_nome', 'turma_id', 'questao_id', 'questao_codigo', 'resposta_aluno', 'acertou', 'nota', 'ano_letivo', 'serie', 'disciplina', 'area_conhecimento', 'presenca', 'avaliacao_id'], respProvas)
        respProvas.length = 0
      }
    }
    if (respProvas.length) {
      totalRespostas += await bulkInsert(client, 'resultados_provas',
        ['id', 'escola_id', 'aluno_id', 'aluno_codigo', 'aluno_nome', 'turma_id', 'questao_id', 'questao_codigo', 'resposta_aluno', 'acertou', 'nota', 'ano_letivo', 'serie', 'disciplina', 'area_conhecimento', 'presenca', 'avaliacao_id'], respProvas)
    }
    console.log(`resultados_provas: ${totalRespostas}`)

    const nCons = await bulkInsert(client, 'resultados_consolidados',
      ['id', 'aluno_id', 'escola_id', 'turma_id', 'ano_letivo', 'serie', 'presenca', 'total_acertos_lp', 'total_acertos_ch', 'total_acertos_mat', 'total_acertos_cn', 'nota_lp', 'nota_ch', 'nota_mat', 'nota_cn', 'media_aluno', 'nota_producao', 'nivel_aprendizagem', 'total_questoes_respondidas', 'total_questoes_esperadas', 'avaliacao_id', 'serie_numero'], consolidados)
    console.log(`resultados_consolidados: ${nCons}`)

    await client.query('COMMIT')
    console.log('\n== COMMIT OK ==')

    // -----------------------------------------------------------------------
    // VERIFICAÇÃO DE CONTAGENS (apenas marcadores)
    // -----------------------------------------------------------------------
    console.log('\n== CONTAGENS FINAIS (seed) ==')
    const verif = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT
        (SELECT count(*) FROM escolas WHERE codigo LIKE 'SEED-ESC-%') escolas,
        (SELECT count(*) FROM series_escola WHERE escola_id IN (SELECT id FROM esc)) series_escola,
        (SELECT count(*) FROM turmas WHERE escola_id IN (SELECT id FROM esc)) turmas,
        (SELECT count(*) FROM usuarios WHERE email LIKE '%.seed@educanet.app') professores,
        (SELECT count(*) FROM professor_turmas WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id IN (SELECT id FROM esc))) professor_turmas,
        (SELECT count(*) FROM alunos WHERE escola_id IN (SELECT id FROM esc)) alunos,
        (SELECT count(*) FROM notas_escolares WHERE escola_id IN (SELECT id FROM esc)) notas,
        (SELECT count(*) FROM frequencia_bimestral WHERE escola_id IN (SELECT id FROM esc)) freq,
        (SELECT count(*) FROM questoes WHERE codigo LIKE 'SEED-Q-%') questoes,
        (SELECT count(*) FROM resultados_provas WHERE escola_id IN (SELECT id FROM esc)) resultados_provas,
        (SELECT count(*) FROM resultados_consolidados WHERE escola_id IN (SELECT id FROM esc)) resultados_consolidados
    `)
    console.table(verif.rows)

    const porAno = await client.query(`
      WITH esc AS (SELECT id FROM escolas WHERE codigo LIKE 'SEED-ESC-%')
      SELECT 'alunos' t, ano_letivo, count(*) n FROM alunos WHERE escola_id IN (SELECT id FROM esc) GROUP BY ano_letivo
      UNION ALL SELECT 'turmas', ano_letivo, count(*) FROM turmas WHERE escola_id IN (SELECT id FROM esc) GROUP BY ano_letivo
      UNION ALL SELECT 'resultados_provas', ano_letivo, count(*) FROM resultados_provas WHERE escola_id IN (SELECT id FROM esc) GROUP BY ano_letivo
      UNION ALL SELECT 'resultados_consolidados', ano_letivo, count(*) FROM resultados_consolidados WHERE escola_id IN (SELECT id FROM esc) GROUP BY ano_letivo
      ORDER BY t, ano_letivo
    `)
    console.log('\n== Por ano letivo ==')
    console.table(porAno.rows)
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
