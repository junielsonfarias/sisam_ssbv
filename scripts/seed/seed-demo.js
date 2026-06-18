/**
 * SEED DE DEMONSTRAÇÃO — SISAM/Educanet
 * ---------------------------------------------------------------------------
 * Popula um banco com dados FICTÍCIOS para o ambiente de demonstração (2026):
 * 1 polo + 1 escola + 3 turmas + 5 usuários (todos os perfis) + alunos + notas
 * + frequência. NÃO é mock: são linhas reais no schema, então o sistema funciona
 * de verdade.
 *
 * IDEMPOTENTE: remove o demo anterior (mesma lógica de database/seeds/remove-demo.sql)
 * e repopula. Marcadores para remoção: polo.codigo='DEMO' e usuários
 * '*.demo@educanet.app'.
 *
 * ⚠️ RODAR SOMENTE contra o banco de DEMONSTRAÇÃO (não a produção real).
 * Uso: definir DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD e `node scripts/seed/seed-demo.js`
 */
const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

const ANO = '2026'
const SENHA_DEMO = 'Educanet@2026'
const POLO_CODIGO = 'DEMO'

const isSupabase = (process.env.DB_HOST || '').includes('supabase')
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: (process.env.DB_SSL === 'true' || isSupabase) ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
})

const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Felipe', 'Gabriela', 'Hugo', 'Isabela', 'João', 'Karina', 'Lucas', 'Marina', 'Nathan', 'Olivia', 'Paulo', 'Quésia', 'Rafael', 'Sara', 'Tiago', 'Vanessa', 'William', 'Yasmin', 'Zeca']
const SOBRENOMES = ['Silva', 'Souza', 'Costa', 'Oliveira', 'Lima', 'Pereira', 'Rodrigues', 'Almeida', 'Nunes', 'Cardoso']

const TURMAS = [
  { codigo: 'DEMO-5A', serie: '5º Ano', serie_numero: '5', tipo_vinculo: 'polivalente' },
  { codigo: 'DEMO-7A', serie: '7º Ano', serie_numero: '7', tipo_vinculo: 'disciplina' },
  { codigo: 'DEMO-9A', serie: '9º Ano', serie_numero: '9', tipo_vinculo: 'disciplina' },
]

const DISCIPLINAS = [
  ['Língua Portuguesa', 'LP', 'Port', 1], ['Matemática', 'MAT', 'Mat', 2], ['Ciências', 'CIE', 'Ciên', 3],
  ['História', 'HIS', 'Hist', 4], ['Geografia', 'GEO', 'Geo', 5], ['Artes', 'ART', 'Art', 6],
  ['Educação Física', 'EDF', 'Ed.Fís', 7], ['Ensino Religioso', 'REL', 'Rel', 8], ['Língua Inglesa', 'ING', 'Ing', 9],
]

const PERIODOS = [
  ['1º Bimestre', 1, '2026-02-02', '2026-04-17'],
  ['2º Bimestre', 2, '2026-04-20', '2026-07-03'],
  ['3º Bimestre', 3, '2026-07-20', '2026-10-02'],
  ['4º Bimestre', 4, '2026-10-05', '2026-12-18'],
]

const REMOVE_DEMO_SQL = `
  DELETE FROM notas_escolares WHERE escola_id IN (SELECT e.id FROM escolas e JOIN polos p ON p.id=e.polo_id WHERE p.codigo='${POLO_CODIGO}');
  DELETE FROM frequencia_bimestral WHERE escola_id IN (SELECT e.id FROM escolas e JOIN polos p ON p.id=e.polo_id WHERE p.codigo='${POLO_CODIGO}');
  DELETE FROM professor_turmas WHERE turma_id IN (SELECT t.id FROM turmas t JOIN escolas e ON e.id=t.escola_id JOIN polos p ON p.id=e.polo_id WHERE p.codigo='${POLO_CODIGO}');
  DELETE FROM responsaveis_alunos WHERE aluno_id IN (SELECT a.id FROM alunos a JOIN escolas e ON e.id=a.escola_id JOIN polos p ON p.id=e.polo_id WHERE p.codigo='${POLO_CODIGO}');
  DELETE FROM alunos WHERE escola_id IN (SELECT e.id FROM escolas e JOIN polos p ON p.id=e.polo_id WHERE p.codigo='${POLO_CODIGO}');
  DELETE FROM turmas WHERE escola_id IN (SELECT e.id FROM escolas e JOIN polos p ON p.id=e.polo_id WHERE p.codigo='${POLO_CODIGO}');
  DELETE FROM escolas WHERE polo_id IN (SELECT id FROM polos WHERE codigo='${POLO_CODIGO}');
  DELETE FROM usuarios WHERE email LIKE '%.demo@educanet.app';
  DELETE FROM polos WHERE codigo='${POLO_CODIGO}';
`

async function main() {
  const c = await pool.connect()
  try {
    console.log('🧹 Removendo dados de demonstração anteriores (se houver)...')
    await c.query(REMOVE_DEMO_SQL)

    // Frequência: descobrir se percentual_frequencia é GENERATED (não inserir nesse caso)
    const gen = await c.query(`SELECT is_generated FROM information_schema.columns WHERE table_name='frequencia_bimestral' AND column_name='percentual_frequencia'`)
    const pctGenerated = gen.rows[0]?.is_generated === 'ALWAYS'

    await c.query('BEGIN')
    const hash = await bcrypt.hash(SENHA_DEMO, 10)

    // Garante que a constraint de tipo_usuario aceita todos os perfis
    // (o replay de migrations pode deixar uma versão antiga sem 'responsavel').
    await c.query(`ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check`)
    await c.query(`ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check
      CHECK (tipo_usuario IN ('administrador','tecnico','polo','escola','professor','editor','publicador','responsavel'))`)

    // 1. Polo
    const polo = (await c.query(
      `INSERT INTO polos (nome, codigo, descricao, ativo) VALUES ('Polo Demonstração', $1, 'Polo fictício do ambiente de demonstração', true) RETURNING id`,
      [POLO_CODIGO])).rows[0].id

    // 2. Escola
    const escola = (await c.query(
      `INSERT INTO escolas (nome, codigo, polo_id, ativo, gestor_escolar_habilitado, municipio, uf)
       VALUES ('Escola Municipal Modelo (Demonstração)', 'DEMO-ESC-01', $1, true, true, 'São Sebastião da Boa Vista', 'PA') RETURNING id`,
      [polo])).rows[0].id

    // 3. Ano letivo 2026 (se não existir)
    await c.query(
      `INSERT INTO anos_letivos (ano, status, data_inicio, data_fim, dias_letivos_total)
       SELECT $1::varchar, 'em_andamento', '2026-02-02'::date, '2026-12-18'::date, 200
       WHERE NOT EXISTS (SELECT 1 FROM anos_letivos WHERE ano = $1::varchar)`, [ANO])

    // 4. Períodos (4 bimestres) — ativa o 2º (ano em andamento)
    const periodoIds = {}
    for (const [nome, numero, ini, fim] of PERIODOS) {
      const ativo = numero === 2
      const r = await c.query(
        `INSERT INTO periodos_letivos (nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo, dias_letivos)
         VALUES ($1,'bimestre',$2,$3,$4,$5,$6,50)
         ON CONFLICT (tipo, numero, ano_letivo) DO UPDATE SET ativo = EXCLUDED.ativo
         RETURNING id`, [nome, numero, ANO, ini, fim, ativo])
      periodoIds[numero] = r.rows[0].id
    }

    // 5. Disciplinas (9 padrão)
    const discIds = []
    for (const [nome, codigo, abrev, ordem] of DISCIPLINAS) {
      const r = await c.query(
        `INSERT INTO disciplinas_escolares (nome, codigo, abreviacao, ordem, ativo) VALUES ($1,$2,$3,$4,true)
         ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome RETURNING id, codigo`, [nome, codigo, abrev, ordem])
      discIds.push(r.rows[0])
    }
    const matId = discIds.find((d) => d.codigo === 'MAT').id

    // 6. Usuários (todos os perfis)
    const users = [
      { email: 'admin.demo@educanet.app', nome: 'Administrador (Demo)', tipo: 'administrador', escola_id: null, flags: { sisam: true, gestor: true, semed: true, transp: true, admin: true } },
      { email: 'tecnico.demo@educanet.app', nome: 'Técnico SEMED (Demo)', tipo: 'tecnico', escola_id: null, flags: { sisam: true, gestor: true, semed: true, transp: false, admin: false } },
      { email: 'escola.demo@educanet.app', nome: 'Direção Escola (Demo)', tipo: 'escola', escola_id: escola, flags: { sisam: true, gestor: true, semed: false, transp: false, admin: false } },
      { email: 'professor.demo@educanet.app', nome: 'Professor (Demo)', tipo: 'professor', escola_id: escola, flags: { sisam: true, gestor: false, semed: false, transp: false, admin: false } },
      { email: 'responsavel.demo@educanet.app', nome: 'Responsável (Demo)', tipo: 'responsavel', escola_id: null, cpf: '00000000191', flags: { sisam: false, gestor: false, semed: false, transp: false, admin: false } },
    ]
    const userIds = {}
    for (const u of users) {
      const r = await c.query(
        `INSERT INTO usuarios (nome, email, senha, tipo_usuario, escola_id, cpf, ativo, acesso_sisam, acesso_gestor, acesso_semed, acesso_transparencia, acesso_admin)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,$11)
         ON CONFLICT (email) DO UPDATE SET senha=EXCLUDED.senha, tipo_usuario=EXCLUDED.tipo_usuario, escola_id=EXCLUDED.escola_id,
           acesso_sisam=EXCLUDED.acesso_sisam, acesso_gestor=EXCLUDED.acesso_gestor, acesso_semed=EXCLUDED.acesso_semed,
           acesso_transparencia=EXCLUDED.acesso_transparencia, acesso_admin=EXCLUDED.acesso_admin
         RETURNING id`,
        [u.nome, u.email, hash, u.tipo, u.escola_id, u.cpf || null, u.flags.sisam, u.flags.gestor, u.flags.semed, u.flags.transp, u.flags.admin])
      userIds[u.tipo] = r.rows[0].id
    }
    const professorId = userIds.professor
    const responsavelId = userIds.responsavel

    // 7. Turmas + 8. vínculos professor
    const turmaIds = []
    for (const t of TURMAS) {
      const tid = (await c.query(
        `INSERT INTO turmas (codigo, nome, escola_id, serie, serie_numero, ano_letivo, turno, ativo)
         VALUES ($1,$2,$3,$4,$5,$6,'matutino',true) RETURNING id`,
        [t.codigo, `Turma ${t.serie}`, escola, t.serie, t.serie_numero, ANO])).rows[0].id
      turmaIds.push({ id: tid, ...t })
      await c.query(
        `INSERT INTO professor_turmas (professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo, ativo)
         VALUES ($1,$2,$3,$4,$5,true)`,
        [professorId, tid, t.tipo_vinculo === 'disciplina' ? matId : null, t.tipo_vinculo, ANO])
    }

    // 9. Alunos (8 por turma) + 10. responsável + 11. notas + 12. frequência
    let nAlunos = 0, nNotas = 0, nFreq = 0, nVinc = 0
    let alunoSeq = 0
    for (const turma of turmaIds) {
      for (let i = 0; i < 8; i++) {
        const nome = `${NOMES[alunoSeq % NOMES.length]} ${SOBRENOMES[(alunoSeq * 3) % SOBRENOMES.length]}`
        const codigo = `DEMO-AL-${String(++alunoSeq).padStart(4, '0')}`
        const anoNasc = 2026 - (Number(turma.serie_numero) + 6)
        const aluno = (await c.query(
          `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, serie_numero, ano_letivo, situacao, data_nascimento, data_matricula, genero, nome_mae, responsavel, telefone_responsavel, ativo)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'cursando',$8,'2026-02-02',$9,$10,$11,'(91) 90000-0000',true) RETURNING id`,
          [codigo, nome, escola, turma.id, turma.serie, turma.serie_numero, ANO, `${anoNasc}-03-15`,
           i % 2 === 0 ? 'masculino' : 'feminino', `Mãe de ${nome}`, `Responsável de ${nome}`])).rows[0].id
        nAlunos++

        // Responsável demo é responsável pelos 3 primeiros alunos da 1ª turma
        if (turma.codigo === 'DEMO-5A' && i < 3) {
          await c.query(
            `INSERT INTO responsaveis_alunos (usuario_id, aluno_id, tipo_vinculo, ativo, status, origem)
             VALUES ($1,$2,'responsavel',true,'aprovado','admin')`, [responsavelId, aluno])
          nVinc++
        }

        // Notas: bimestres 1 e 2, todas as disciplinas. 1 aluno por turma com nota baixa.
        const baixo = i === 0
        for (const periodo of [1, 2]) {
          for (let d = 0; d < discIds.length; d++) {
            const base = baixo ? 4.0 : 6.0
            const nota = Math.min(10, base + ((alunoSeq + d + periodo) % 5) * 0.8)
            await c.query(
              `INSERT INTO notas_escolares (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, turma_id, nota, nota_final, faltas, registrado_por)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9)
               ON CONFLICT (aluno_id, disciplina_id, periodo_id) DO NOTHING`,
              [aluno, discIds[d].id, periodoIds[periodo], escola, ANO, turma.id, Number(nota.toFixed(1)), (alunoSeq + d) % 3, professorId])
            nNotas++
          }
          // Frequência: 1 aluno por turma com infrequência (<75%)
          const dias = 50
          const presencas = baixo ? 32 : 46 + (i % 4)
          const faltas = dias - presencas
          const pct = Number(((presencas / dias) * 100).toFixed(2))
          const cols = ['aluno_id', 'periodo_id', 'turma_id', 'escola_id', 'ano_letivo', 'dias_letivos', 'presencas', 'faltas', 'faltas_justificadas', 'registrado_por']
          const vals = [aluno, periodoIds[periodo], turma.id, escola, ANO, dias, presencas, faltas, Math.min(faltas, 2), professorId]
          if (!pctGenerated) { cols.splice(9, 0, 'percentual_frequencia'); vals.splice(9, 0, pct) }
          const ph = vals.map((_, k) => `$${k + 1}`).join(',')
          await c.query(`INSERT INTO frequencia_bimestral (${cols.join(',')}) VALUES (${ph}) ON CONFLICT (aluno_id, periodo_id) DO NOTHING`, vals)
          nFreq++
        }
      }
    }

    await c.query('COMMIT')
    console.log('\n✅ Seed de demonstração concluído!')
    console.log(`   Polo: Polo Demonstração (${POLO_CODIGO})`)
    console.log(`   Escola: Escola Municipal Modelo (Demonstração)`)
    console.log(`   Turmas: ${turmaIds.length} | Alunos: ${nAlunos} | Vínculos responsável: ${nVinc}`)
    console.log(`   Notas: ${nNotas} | Frequência: ${nFreq} registros`)
    console.log(`\n🔑 Credenciais (senha: ${SENHA_DEMO}):`)
    for (const u of users) console.log(`   ${u.tipo.padEnd(14)} ${u.email}`)
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    console.error('❌ Erro no seed:', e.message)
    process.exitCode = 1
  } finally {
    c.release()
    await pool.end()
  }
}

main()
