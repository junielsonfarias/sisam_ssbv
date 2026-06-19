/**
 * SEED DE SITUAÇÕES VARIADAS — Banco DEMO (Supabase tbbnswuqsqhulserwtcc)
 * ============================================================================
 * Enriquece os ALUNOS DO SEED (escolas codigo 'SEED-ESC-%' / alunos
 * codigo 'SEED-%') com situações realistas e variadas, para exercitar os
 * dashboards e relatórios do SISAM:
 *
 *   - bolsa_familia / beneficiario_bolsa_familia (+ nis fake) em 85% dos alunos
 *   - pcd / tipo_deficiencia em ~8% (faz o KPI "Alunos PCD" sair de 0)
 *   - situacao por ano:
 *       2026 (corrente): maioria 'cursando' + transferido / abandono / remanejado
 *       2025 (encerrado): aprovado / reprovado / transferido / abandono
 *   - historico_situacao coerente para cada mudança (situacao_anterior='cursando',
 *     data dentro do ano, observacao curta SEM PII, tipo_movimentacao)
 *   - transferências dentro_municipio (escola_destino_id real) e
 *     fora_municipio (escola_destino_nome livre) -> KPI "Transferências"
 *   - rematrícula (tipo_movimentacao='entrada') dos transferidos dentro_municipio
 *     com turma compatível no destino -> espelha lib/services/matriculas e fecha
 *     o saldo de transferências (os sem turma no destino ficam "em trânsito")
 *   - frequência rebaixada (<75%) para abandonos + ~10% dos cursando -> faixa
 *     "<75%" da Distribuição de Frequência e relatórios de infrequência
 *
 * ESCOPO: SOMENTE alunos do seed. NÃO toca em DEMO-ESC-01 nem em qualquer
 * outro dado sem o marcador 'SEED-'.
 *
 * IDEMPOTENTE (re-rodável): no início, RESETA o estado dos alunos seed para o
 * baseline (situacao='cursando', ativo=true, turma restaurada, pcd=false,
 * tipo_deficiencia=null, bolsa_familia=false, beneficiario_bolsa_familia=false,
 * nis=null) e APAGA todo o historico_situacao desses alunos, depois reaplica.
 *
 * DETERMINÍSTICO: PRNG com seed fixa -> mesma distribuição a cada execução.
 *
 * TRANSACIONAL: tudo dentro de BEGIN/COMMIT; ROLLBACK em erro.
 *
 * Conexão: idêntica a scripts/seed/seed-completo-demo.js — lê DB_PASSWORD de
 * .env.local e conecta direto em db.tbbnswuqsqhulserwtcc.supabase.co:5432.
 *
 * Uso:  node scripts/seed/seed-situacoes-demo.js
 *       node scripts/seed/seed-situacoes-demo.js --reset-apenas
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
// PRNG determinístico (mesma implementação do seed-completo-demo.js)
// ---------------------------------------------------------------------------
let _rng = 987654321
function rnd() {
  _rng = (_rng * 1103515245 + 12345) & 0x7fffffff
  return _rng / 0x7fffffff
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1))

// NIS fake de 11 dígitos (string) — não é um NIS válido (PIS), apenas formato.
function nisFake() {
  let s = ''
  for (let i = 0; i < 11; i++) s += String(randint(0, 9))
  return s
}

const TIPOS_DEFICIENCIA = [
  'Deficiência intelectual', 'Deficiência física', 'Deficiência visual',
  'Deficiência auditiva', 'TEA', 'Deficiência múltipla', 'Surdez', 'Baixa visão',
]

// Observações curtas e SEM PII (LGPD)
const OBS_TRANSF_DENTRO = 'Transferência para outra unidade da rede municipal.'
const OBS_TRANSF_FORA = 'Transferência para rede de outro município.'
const OBS_ABANDONO = 'Situação de abandono registrada após infrequência prolongada.'
const OBS_REMANEJADO = 'Remanejamento de turma por adequação pedagógica.'
const OBS_APROVADO = 'Aprovado ao final do ano letivo.'
const OBS_REPROVADO = 'Reprovado ao final do ano letivo.'

// Escolas de destino "fora do município" (texto livre)
const ESCOLAS_FORA = [
  'EE Prof. Maria Lima - Belém/PA',
  'Colégio Santa Rosa - Castanhal/PA',
  'EMEF Tancredo Neves - Ananindeua/PA',
  'Escola Nova Esperança - Marabá/PA',
  'Instituto Educar - Santarém/PA',
]

// ---------------------------------------------------------------------------
// Inserção em lote (multi-row) — divide em chunks p/ não estourar params
// ---------------------------------------------------------------------------
async function bulkInsert(client, table, columns, rows) {
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
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${values.join(',')}`
    const res = await client.query(sql, params)
    total += res.rowCount
  }
  return total
}

// Atualização em lote: UPDATE ... FROM (VALUES ...) — aplica por id
async function bulkUpdateById(client, sqlFn, rows, perChunk = 800) {
  let total = 0
  for (let i = 0; i < rows.length; i += perChunk) {
    const slice = rows.slice(i, i + perChunk)
    const { sql, params } = sqlFn(slice)
    const res = await client.query(sql, params)
    total += res.rowCount
  }
  return total
}

// ---------------------------------------------------------------------------
// RESET idempotente (somente alunos seed)
// ---------------------------------------------------------------------------
async function resetar(client, alunoIds) {
  console.log('\n== RESET de baseline (apenas alunos seed) ==')
  if (alunoIds.length === 0) {
    console.log('  Nenhum aluno seed encontrado. Nada a resetar.')
    return
  }
  // 1) Apaga histórico de situação desses alunos
  const hs = await client.query(
    `DELETE FROM historico_situacao WHERE aluno_id = ANY($1)`, [alunoIds])
  console.log(`  - historico_situacao removidos: ${hs.rowCount}`)

  // 2) Restaura situacao/ativo/turma + zera PCD/bolsa.
  //    turma_id é restaurada a partir da turma cujo (escola_id, serie, ano_letivo)
  //    bate com o aluno (transferido/abandono podem ter zerado turma_id em
  //    execuções anteriores). Restaura a 1ª turma compatível (determinístico
  //    por codigo) — suficiente para o aluno voltar a contar como 'cursando'.
  const upd = await client.query(
    `UPDATE alunos a SET
        situacao = 'cursando',
        ativo = true,
        pcd = false,
        tipo_deficiencia = NULL,
        bolsa_familia = false,
        beneficiario_bolsa_familia = false,
        nis = NULL,
        turma_id = COALESCE(a.turma_id, (
          SELECT t.id FROM turmas t
          WHERE t.escola_id = a.escola_id
            AND t.serie = a.serie
            AND t.ano_letivo = a.ano_letivo
          ORDER BY t.codigo
          LIMIT 1
        )),
        atualizado_em = CURRENT_TIMESTAMP
     WHERE a.id = ANY($1)`, [alunoIds])
  console.log(`  - alunos resetados ao baseline: ${upd.rowCount}`)
  console.log('  Reset concluído.')
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  const resetApenas = process.argv.includes('--reset-apenas')
  const pool = new Pool(cfg)
  const client = await pool.connect()
  console.log(`Conectado a ${cfg.host}:${cfg.port}/${cfg.database} (user ${cfg.user})`)

  try {
    // ---- Carrega alunos seed + escolas seed (ordenado p/ determinismo) ----
    const escSeed = (await client.query(
      `SELECT id, codigo, nome FROM escolas WHERE codigo LIKE 'SEED-ESC-%' ORDER BY codigo`)).rows
    if (escSeed.length === 0) throw new Error('Nenhuma escola seed (SEED-ESC-%) encontrada. Rode seed-completo-demo.js antes.')
    const escIds = escSeed.map((r) => r.id)

    // Escola adicional real para destino de transferência dentro do município.
    const demoEsc = (await client.query(
      `SELECT id, nome FROM escolas WHERE codigo = 'DEMO-ESC-01' LIMIT 1`)).rows[0]

    // Escolas candidatas a DESTINO (dentro do município): as 2 seed + DEMO-ESC-01
    const escolasDestino = escSeed.map((r) => ({ id: r.id, nome: r.nome }))
    if (demoEsc) escolasDestino.push({ id: demoEsc.id, nome: demoEsc.nome })

    const alunos = (await client.query(
      `SELECT a.id, a.escola_id, a.ano_letivo, a.serie
       FROM alunos a
       WHERE a.escola_id = ANY($1) AND a.codigo LIKE 'SEED-%'
       ORDER BY a.codigo`, [escIds])).rows
    console.log(`\nAlunos seed carregados: ${alunos.length}`)
    if (alunos.length === 0) throw new Error('Nenhum aluno seed encontrado.')
    const alunoIds = alunos.map((a) => a.id)

    // ---- RESET (fora da transação principal de reaplicação, mas atômico) ----
    await client.query('BEGIN')
    await resetar(client, alunoIds)
    if (resetApenas) {
      await client.query('COMMIT')
      console.log('\n--reset-apenas: encerrando após reset.')
      return
    }

    // =======================================================================
    // PLANEJAMENTO determinístico das situações
    // =======================================================================
    // Mapa nome da escola por id (para escola_origem_nome)
    const nomeEscola = {}
    for (const r of escSeed) nomeEscola[r.id] = r.nome

    const updBolsaTrue = []   // ids com bolsa
    const updBolsaFalse = []  // ids sem bolsa
    const updPcd = []         // {id, tipo}
    const updSituacao = []    // {id, situacao, ativo, zeraTurma}
    const historico = []      // linhas historico_situacao
    const freqAjustes = []    // {aluno_id, motivo} -> rebaixar frequência

    // Conjunto dos que NÃO podem virar inativos (mantêm ativo=true) para
    // garantir KPI PCD (pcdQuery exige a.ativo=true). PCD só será sorteado
    // entre alunos que terminam com ativo=true.
    for (const a of alunos) {
      const r = rnd() // sorteio principal de bolsa família (85%)
      if (r < 0.85) updBolsaTrue.push(a.id)
      else updBolsaFalse.push(a.id)
    }

    // ---- Situações por ano ----
    // Para cada aluno, sorteia a situação conforme o ano.
    // Mantém registro do estado "ativo" final para o sorteio de PCD.
    const ativoFinal = {} // aluno_id -> bool

    for (const a of alunos) {
      const ano = a.ano_letivo
      const escolaAtualNome = nomeEscola[a.escola_id] || null
      const r = rnd()
      let situacao = 'cursando'
      let ativo = true
      let zeraTurma = false
      let hist = null // objeto a empurrar em historico

      // datas coerentes com o ano
      const dataTransf = `${ano}-${String(randint(3, 9)).padStart(2, '0')}-${String(randint(1, 28)).padStart(2, '0')}`
      const dataFim = `${ano}-12-${String(randint(5, 20)).padStart(2, '0')}`

      if (ano === '2026') {
        // maioria cursando; 4% transferido; 3% abandono; 2% remanejado
        if (r < 0.04) {
          situacao = 'transferido'; ativo = false; zeraTurma = true
          const dentro = rnd() < 0.5
          if (dentro) {
            // destino: outra escola real (diferente da atual)
            const candidatos = escolasDestino.filter((d) => d.id !== a.escola_id)
            const dest = candidatos.length ? candidatos[Math.floor(rnd() * candidatos.length)] : escolasDestino[0]
            hist = {
              situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS_TRANSF_DENTRO,
              tipo_transferencia: 'dentro_municipio', tipo_movimentacao: 'saida',
              escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
              escola_destino_id: dest.id, escola_destino_nome: dest.nome,
            }
          } else {
            hist = {
              situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS_TRANSF_FORA,
              tipo_transferencia: 'fora_municipio', tipo_movimentacao: 'saida',
              escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
              escola_destino_id: null, escola_destino_nome: pick(ESCOLAS_FORA),
            }
          }
        } else if (r < 0.07) {
          situacao = 'abandono'; ativo = false
          hist = {
            situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS_ABANDONO,
            tipo_transferencia: null, tipo_movimentacao: null,
            escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
            escola_destino_id: null, escola_destino_nome: null,
          }
          freqAjustes.push({ aluno_id: a.id, motivo: 'abandono' })
        } else if (r < 0.09) {
          situacao = 'remanejado'; ativo = true
          hist = {
            situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS_REMANEJADO,
            tipo_transferencia: null, tipo_movimentacao: null,
            escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
            escola_destino_id: null, escola_destino_nome: null,
          }
        } else {
          situacao = 'cursando'; ativo = true
        }
      } else {
        // 2025 encerrado: ~75% aprovado, ~12% reprovado, ~5% transferido,
        // ~3% abandono, resto cursando
        if (r < 0.75) {
          situacao = 'aprovado'; ativo = true
          hist = {
            situacao, situacao_anterior: 'cursando', data: dataFim, observacao: OBS_APROVADO,
            tipo_transferencia: null, tipo_movimentacao: null,
            escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
            escola_destino_id: null, escola_destino_nome: null,
          }
        } else if (r < 0.87) {
          situacao = 'reprovado'; ativo = true
          hist = {
            situacao, situacao_anterior: 'cursando', data: dataFim, observacao: OBS_REPROVADO,
            tipo_transferencia: null, tipo_movimentacao: null,
            escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
            escola_destino_id: null, escola_destino_nome: null,
          }
        } else if (r < 0.92) {
          situacao = 'transferido'; ativo = false; zeraTurma = true
          const dentro = rnd() < 0.5
          if (dentro) {
            const candidatos = escolasDestino.filter((d) => d.id !== a.escola_id)
            const dest = candidatos.length ? candidatos[Math.floor(rnd() * candidatos.length)] : escolasDestino[0]
            hist = {
              situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS_TRANSF_DENTRO,
              tipo_transferencia: 'dentro_municipio', tipo_movimentacao: 'saida',
              escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
              escola_destino_id: dest.id, escola_destino_nome: dest.nome,
            }
          } else {
            hist = {
              situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS_TRANSF_FORA,
              tipo_transferencia: 'fora_municipio', tipo_movimentacao: 'saida',
              escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
              escola_destino_id: null, escola_destino_nome: pick(ESCOLAS_FORA),
            }
          }
        } else if (r < 0.95) {
          situacao = 'abandono'; ativo = false
          hist = {
            situacao, situacao_anterior: 'cursando', data: dataTransf, observacao: OBS_ABANDONO,
            tipo_transferencia: null, tipo_movimentacao: null,
            escola_origem_id: a.escola_id, escola_origem_nome: escolaAtualNome,
            escola_destino_id: null, escola_destino_nome: null,
          }
          freqAjustes.push({ aluno_id: a.id, motivo: 'abandono' })
        } else {
          situacao = 'cursando'; ativo = true
        }
      }

      ativoFinal[a.id] = ativo
      if (situacao !== 'cursando' || !ativo) {
        updSituacao.push({ id: a.id, situacao, ativo, zeraTurma })
      }
      if (hist) {
        historico.push({
          id: uuidv4(), aluno_id: a.id, ...hist,
          registrado_por: null,
        })
      }
    }

    // ---- PCD (~8%) — só entre alunos que terminam ativo=true ----
    const ativosFinais = alunos.filter((a) => ativoFinal[a.id])
    for (const a of ativosFinais) {
      if (rnd() < 0.08) updPcd.push({ id: a.id, tipo: pick(TIPOS_DEFICIENCIA) })
    }

    // ---- Infrequência: abandonos (já em freqAjustes) + ~10% dos cursando ----
    // Cursando final = ativo=true E situacao não setada para outra coisa.
    const setSituacaoMod = new Set(updSituacao.map((u) => u.id))
    const cursandoFinais = alunos.filter((a) => ativoFinal[a.id] && !setSituacaoMod.has(a.id))
    // remanejados continuam ativos/cursando-like? Não: remanejado tem situacao
    // própria; a faixa de frequência filtra apenas situacao='cursando'/NULL.
    // Portanto só rebaixamos quem fica realmente 'cursando'.
    const cursandoPuro = cursandoFinais // estes mantêm situacao='cursando'
    const jaInfreq = new Set(freqAjustes.map((f) => f.aluno_id))
    for (const a of cursandoPuro) {
      if (!jaInfreq.has(a.id) && rnd() < 0.10) {
        freqAjustes.push({ aluno_id: a.id, motivo: 'infrequencia' })
        jaInfreq.add(a.id)
      }
    }

    console.log('\n== Plano gerado ==')
    console.log(`  bolsa_familia=true : ${updBolsaTrue.length}  | false: ${updBolsaFalse.length}`)
    console.log(`  pcd=true           : ${updPcd.length}`)
    console.log(`  mudanças situacao  : ${updSituacao.length}`)
    console.log(`  historico_situacao : ${historico.length}`)
    console.log(`  alunos infrequentes: ${freqAjustes.length} (abandono + cursando<75%)`)

    // =======================================================================
    // APLICAÇÃO
    // =======================================================================

    // 1) Bolsa família = true (+ nis)
    if (updBolsaTrue.length) {
      const rows = updBolsaTrue.map((id) => ({ id, nis: nisFake() }))
      await bulkUpdateById(client, (slice) => {
        const vals = []
        const params = []
        let p = 0
        for (const r of slice) { vals.push(`($${++p}::uuid, $${++p}::varchar)`); params.push(r.id, r.nis) }
        return {
          sql: `UPDATE alunos a SET bolsa_familia = true, beneficiario_bolsa_familia = true, nis = v.nis,
                       atualizado_em = CURRENT_TIMESTAMP
                FROM (VALUES ${vals.join(',')}) AS v(id, nis)
                WHERE a.id = v.id`,
          params,
        }
      }, rows)
    }
    // (os 15% false já vieram do reset — bolsa_familia=false, nis=null)

    // 2) PCD = true
    if (updPcd.length) {
      await bulkUpdateById(client, (slice) => {
        const vals = []
        const params = []
        let p = 0
        for (const r of slice) { vals.push(`($${++p}::uuid, $${++p}::varchar)`); params.push(r.id, r.tipo) }
        return {
          sql: `UPDATE alunos a SET pcd = true, tipo_deficiencia = v.tipo, atualizado_em = CURRENT_TIMESTAMP
                FROM (VALUES ${vals.join(',')}) AS v(id, tipo)
                WHERE a.id = v.id`,
          params,
        }
      }, updPcd)
    }

    // 3) Situação dos alunos (transferido/abandono/remanejado/aprovado/reprovado)
    if (updSituacao.length) {
      await bulkUpdateById(client, (slice) => {
        const vals = []
        const params = []
        let p = 0
        for (const r of slice) {
          vals.push(`($${++p}::uuid, $${++p}::varchar, $${++p}::boolean, $${++p}::boolean)`)
          params.push(r.id, r.situacao, r.ativo, r.zeraTurma)
        }
        return {
          sql: `UPDATE alunos a SET
                   situacao = v.situacao,
                   ativo = v.ativo,
                   turma_id = CASE WHEN v.zera_turma THEN NULL ELSE a.turma_id END,
                   atualizado_em = CURRENT_TIMESTAMP
                FROM (VALUES ${vals.join(',')}) AS v(id, situacao, ativo, zera_turma)
                WHERE a.id = v.id`,
          params,
        }
      }, updSituacao)
    }

    // 4) historico_situacao
    if (historico.length) {
      await bulkInsert(client, 'historico_situacao',
        ['id', 'aluno_id', 'situacao', 'situacao_anterior', 'data', 'observacao', 'registrado_por',
         'tipo_transferencia', 'escola_destino_id', 'escola_destino_nome', 'escola_origem_id',
         'escola_origem_nome', 'tipo_movimentacao'], historico)
    }

    // 5) Infrequência: rebaixa frequencia_bimestral.
    //    A faixa <75% do dashboard usa AVG(percentual_frequencia) por aluno
    //    sobre os 4 bimestres. Rebaixamos os 2 ÚLTIMOS bimestres fortemente
    //    (frequência despencando) para a MÉDIA do aluno cair abaixo de 75.
    //    Mantém dias_letivos; ajusta faltas/presencas coerentemente.
    let regFreqAtualizados = 0
    if (freqAjustes.length) {
      const ids = freqAjustes.map((f) => f.aluno_id)
      const abandonoIds = new Set(freqAjustes.filter((f) => f.motivo === 'abandono').map((f) => f.aluno_id))
      // Carrega os registros de frequência desses alunos, ordenados por bimestre.
      const fbRows = (await client.query(
        `SELECT fb.id, fb.aluno_id, fb.dias_letivos, p.numero AS bimestre
         FROM frequencia_bimestral fb
         JOIN periodos_letivos p ON p.id = fb.periodo_id
         WHERE fb.aluno_id = ANY($1)
         ORDER BY fb.aluno_id, p.numero`, [ids])).rows

      const updates = []
      for (const fb of fbRows) {
        const dias = fb.dias_letivos || 50
        const abandono = abandonoIds.has(fb.aluno_id)
        let perc
        if (abandono) {
          // abandono: frequência despenca nos bimestres finais (3º e 4º ~ 20-45%),
          // razoável nos primeiros (60-78%).
          if (fb.bimestre <= 2) perc = randint(58, 78)
          else perc = randint(15, 45)
        } else {
          // infrequência crônica: 3º e 4º bem baixos para puxar a média < 75
          if (fb.bimestre <= 2) perc = randint(62, 80)
          else perc = randint(40, 66)
        }
        const presencas = Math.round((perc / 100) * dias)
        const faltas = dias - presencas
        const fj = Math.min(faltas, randint(0, 3))
        updates.push({ id: fb.id, presencas, faltas, fj, perc })
      }

      regFreqAtualizados = await bulkUpdateById(client, (slice) => {
        const vals = []
        const params = []
        let p = 0
        for (const r of slice) {
          vals.push(`($${++p}::uuid, $${++p}::int, $${++p}::int, $${++p}::int, $${++p}::numeric)`)
          params.push(r.id, r.presencas, r.faltas, r.fj, r.perc)
        }
        return {
          sql: `UPDATE frequencia_bimestral fb SET
                   presencas = v.presencas,
                   faltas = v.faltas,
                   faltas_justificadas = v.fj,
                   percentual_frequencia = v.perc,
                   atualizado_em = CURRENT_TIMESTAMP
                FROM (VALUES ${vals.join(',')}) AS v(id, presencas, faltas, fj, perc)
                WHERE fb.id = v.id`,
          params,
        }
      }, updates)
    }
    console.log(`  registros de frequência rebaixados: ${regFreqAtualizados}`)

    // 6) Rematrícula (ENTRADA) dos transferidos DENTRO do município que têm
    //    turma compatível no destino. Sem isso o painel só registra 'saida' e o
    //    saldo de transferências nunca fecha. Espelha o caminho real de
    //    lib/services/matriculas/matricula.ts: move escola_id p/ o destino,
    //    situacao='cursando', e grava historico 'entrada' com escola_origem_id =
    //    escola destino (a DONA do movimento, como o painel lê em GET
    //    /transferencias). Os sem turma compatível ficam "em trânsito".
    const remat = await client.query(
      `WITH ult_saida AS (
         SELECT DISTINCT ON (hs.aluno_id)
           hs.aluno_id, hs.escola_destino_id, hs.registrado_por, hs.data AS data_saida
         FROM historico_situacao hs
         JOIN alunos a ON a.id = hs.aluno_id
         JOIN escolas e ON e.id = a.escola_id
         WHERE hs.tipo_movimentacao = 'saida'
           AND hs.tipo_transferencia = 'dentro_municipio'
           AND a.situacao = 'transferido'
           AND a.codigo LIKE 'SEED-%'
           AND e.codigo LIKE 'SEED-ESC-%'
         ORDER BY hs.aluno_id, hs.data DESC, hs.criado_em DESC
       ),
       elegiveis AS (
         SELECT us.aluno_id, us.escola_destino_id, us.registrado_por, us.data_saida,
                (SELECT t.id FROM turmas t
                   WHERE t.escola_id = us.escola_destino_id AND t.ativo = true
                     AND t.serie = a.serie AND t.ano_letivo = a.ano_letivo
                   ORDER BY t.codigo LIMIT 1) AS turma_destino
         FROM ult_saida us
         JOIN alunos a ON a.id = us.aluno_id
       ),
       validos AS (SELECT * FROM elegiveis WHERE turma_destino IS NOT NULL),
       upd AS (
         UPDATE alunos a SET
           escola_id = v.escola_destino_id,
           turma_id  = v.turma_destino,
           situacao  = 'cursando',
           ativo     = true,
           atualizado_em = CURRENT_TIMESTAMP
         FROM validos v
         WHERE a.id = v.aluno_id
         RETURNING a.id
       ),
       ins AS (
         INSERT INTO historico_situacao
           (id, aluno_id, situacao, situacao_anterior, data, observacao,
            registrado_por, tipo_movimentacao, escola_origem_id)
         SELECT gen_random_uuid(), v.aluno_id, 'cursando', 'transferido',
                LEAST(v.data_saida + INTERVAL '7 days', CURRENT_DATE)::date,
                'Rematrícula via sistema (seed demo)', v.registrado_por,
                'entrada', v.escola_destino_id
         FROM validos v
         RETURNING aluno_id
       )
       SELECT (SELECT COUNT(*) FROM ins)  AS entradas,
              (SELECT COUNT(*) FROM upd)  AS movidos,
              (SELECT COUNT(*) FROM elegiveis WHERE turma_destino IS NULL) AS em_transito`
    )
    const r6 = remat.rows[0]
    console.log(`  rematrículas (entrada) geradas: ${r6.entradas} | movidos: ${r6.movidos} | em trânsito (sem turma no destino): ${r6.em_transito}`)

    await client.query('COMMIT')
    console.log('\n== COMMIT OK ==')

    // =======================================================================
    // VERIFICAÇÃO (somente alunos seed)
    // =======================================================================
    console.log('\n== CONTAGENS FINAIS (alunos seed) ==')

    const porSituacao = await client.query(
      `SELECT a.ano_letivo, a.situacao, COUNT(*) n
       FROM alunos a JOIN escolas e ON e.id = a.escola_id
       WHERE e.codigo LIKE 'SEED-ESC-%' AND a.codigo LIKE 'SEED-%'
       GROUP BY a.ano_letivo, a.situacao
       ORDER BY a.ano_letivo, a.situacao`)
    console.log('\n-- Situação por ano --')
    console.table(porSituacao.rows)

    const transf = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE hs.tipo_movimentacao = 'saida') saidas,
         COUNT(*) FILTER (WHERE hs.tipo_transferencia = 'dentro_municipio') dentro_municipio,
         COUNT(*) FILTER (WHERE hs.tipo_transferencia = 'fora_municipio') fora_municipio,
         COUNT(*) total_historico
       FROM historico_situacao hs
       JOIN alunos a ON a.id = hs.aluno_id
       JOIN escolas e ON e.id = a.escola_id
       WHERE e.codigo LIKE 'SEED-ESC-%' AND a.codigo LIKE 'SEED-%'`)
    console.log('\n-- Transferências / histórico --')
    console.table(transf.rows)

    // Transferências do jeito que o dashboard-gestor conta (por ano do aluno)
    const transfPorAno = await client.query(
      `SELECT a.ano_letivo,
         COUNT(*) FILTER (WHERE hs.tipo_transferencia = 'dentro_municipio') dentro,
         COUNT(*) FILTER (WHERE hs.tipo_transferencia = 'fora_municipio') fora
       FROM historico_situacao hs
       JOIN alunos a ON a.id = hs.aluno_id
       JOIN escolas e ON e.id = a.escola_id
       WHERE e.codigo LIKE 'SEED-ESC-%' AND a.codigo LIKE 'SEED-%' AND hs.tipo_movimentacao IS NOT NULL
       GROUP BY a.ano_letivo ORDER BY a.ano_letivo`)
    console.log('\n-- Transferências por ano (como o KPI lê) --')
    console.table(transfPorAno.rows)

    const pcdBolsa = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE a.pcd = true) pcd,
         COUNT(*) FILTER (WHERE a.pcd = true AND a.ativo = true) pcd_ativos,
         COUNT(*) FILTER (WHERE a.bolsa_familia = true) bolsa,
         COUNT(*) FILTER (WHERE a.beneficiario_bolsa_familia = true) beneficiario,
         COUNT(*) FILTER (WHERE a.nis IS NOT NULL) com_nis,
         COUNT(*) total,
         ROUND(100.0 * COUNT(*) FILTER (WHERE a.bolsa_familia = true) / COUNT(*), 1) pct_bolsa
       FROM alunos a JOIN escolas e ON e.id = a.escola_id
       WHERE e.codigo LIKE 'SEED-ESC-%' AND a.codigo LIKE 'SEED-%'`)
    console.log('\n-- PCD / Bolsa família --')
    console.table(pcdBolsa.rows)

    // PCD por ano (KPI é por ano_letivo)
    const pcdPorAno = await client.query(
      `SELECT a.ano_letivo, COUNT(*) FILTER (WHERE a.pcd = true AND a.ativo = true) pcd_ativos
       FROM alunos a JOIN escolas e ON e.id = a.escola_id
       WHERE e.codigo LIKE 'SEED-ESC-%' AND a.codigo LIKE 'SEED-%'
       GROUP BY a.ano_letivo ORDER BY a.ano_letivo`)
    console.log('\n-- PCD ativos por ano (como o KPI lê) --')
    console.table(pcdPorAno.rows)

    // Infrequência: por registro e por aluno (média anual <75 entre cursando)
    const infreqReg = await client.query(
      `SELECT a.ano_letivo, COUNT(*) registros_abaixo_75
       FROM frequencia_bimestral fb
       JOIN alunos a ON a.id = fb.aluno_id
       JOIN escolas e ON e.id = a.escola_id
       WHERE e.codigo LIKE 'SEED-ESC-%' AND a.codigo LIKE 'SEED-%' AND fb.percentual_frequencia < 75
       GROUP BY a.ano_letivo ORDER BY a.ano_letivo`)
    console.log('\n-- Registros de frequência < 75% por ano --')
    console.table(infreqReg.rows)

    const infreqAluno = await client.query(
      `SELECT ano_letivo, COUNT(*) alunos_media_abaixo_75 FROM (
         SELECT a.ano_letivo, fb.aluno_id, AVG(fb.percentual_frequencia) media
         FROM frequencia_bimestral fb
         JOIN alunos a ON a.id = fb.aluno_id
         JOIN escolas e ON e.id = a.escola_id
         WHERE e.codigo LIKE 'SEED-ESC-%' AND a.codigo LIKE 'SEED-%'
           AND (a.situacao = 'cursando' OR a.situacao IS NULL)
         GROUP BY a.ano_letivo, fb.aluno_id
         HAVING AVG(fb.percentual_frequencia) < 75
       ) q GROUP BY ano_letivo ORDER BY ano_letivo`)
    console.log('\n-- Alunos CURSANDO com média anual de frequência < 75% (faixa do dashboard) --')
    console.table(infreqAluno.rows)

    console.log('\nScript: scripts/seed/seed-situacoes-demo.js')
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
