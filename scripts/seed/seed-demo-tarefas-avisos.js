/**
 * Seed idempotente de TAREFAS (tarefas_turma) e AVISOS (notificacoes +
 * notificacoes_disparos) para o ambiente de demonstração (Educanet).
 * Opera sobre turmas/alunos/usuários DEMO já existentes.
 *
 * Uso:  node scripts/seed/seed-demo-tarefas-avisos.js
 */
const { Client } = require('pg')
try { require('dotenv').config({ path: '.env.local' }) } catch { /* opcional */ }

const cfg = {
  host: process.env.DB_HOST || 'aws-1-us-west-2.pooler.supabase.com',
  port: Number(process.env.DB_PORT || 6543),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres.tbbnswuqsqhulserwtcc',
  password: process.env.DB_PASSWORD || 'Educanet2026Ssbv',
  ssl: { rejectUnauthorized: false },
}

async function main() {
  const c = new Client(cfg)
  await c.connect()
  try {
    const escola = (await c.query(`SELECT id FROM escolas WHERE nome ILIKE '%Demonstra%' LIMIT 1`)).rows[0]
    if (!escola) { console.log('Escola demo não encontrada.'); return }
    const turmas = (await c.query(`SELECT id, codigo FROM turmas WHERE escola_id = $1`, [escola.id])).rows
    const prof = (await c.query(`SELECT id FROM usuarios WHERE email = 'professor.demo@educanet.app'`)).rows[0]
    const resp = (await c.query(`SELECT id FROM usuarios WHERE email = 'responsavel.demo@educanet.app'`)).rows[0]
    const alunos = (await c.query(
      `SELECT a.id, a.nome FROM alunos a JOIN responsaveis_alunos ra ON ra.aluno_id = a.id
        WHERE ra.usuario_id = $1 AND ra.ativo = true ORDER BY a.codigo`, [resp.id]
    )).rows

    // ---------- 1) TAREFAS ----------
    const turmaIds = turmas.map(t => t.id)
    await c.query(`DELETE FROM tarefas_turma WHERE turma_id = ANY($1::uuid[])`, [turmaIds])
    const tarefas = [
      { disc: 'Matemática', tit: 'Lista de exercícios — frações', desc: 'Resolver as questões 1 a 10 da página 42.', dias: 3, tipo: 'atividade' },
      { disc: 'Língua Portuguesa', tit: 'Prova — interpretação de texto', desc: 'Avaliação bimestral. Estudar os capítulos 3 e 4.', dias: 7, tipo: 'prova' },
      { disc: 'Ciências', tit: 'Trabalho — ciclo da água', desc: 'Cartaz em grupo sobre as etapas do ciclo da água.', dias: 10, tipo: 'trabalho' },
      { disc: 'História', tit: 'Leitura do capítulo 4', desc: 'Ler e responder o questionário ao final do capítulo.', dias: -5, tipo: 'leitura' },
    ]
    let nT = 0
    for (const t of turmas) {
      for (const tf of tarefas) {
        await c.query(
          `INSERT INTO tarefas_turma (turma_id, professor_id, disciplina, titulo, descricao, data_entrega, tipo, ativo)
           VALUES ($1,$2,$3,$4,$5, CURRENT_DATE + ($6 || ' days')::interval, $7, true)`,
          [t.id, prof.id, tf.disc, tf.tit, tf.desc, String(tf.dias), tf.tipo]
        )
        nT++
      }
    }

    // ---------- 2) AVISOS: disparos in_app (infrequência) ----------
    await c.query(`DELETE FROM notificacoes_disparos WHERE destinatario_id = $1 AND evento_tipo = 'infrequencia'`, [resp.id])
    const filho = alunos[0]
    let nD = 0
    if (filho) {
      await c.query(
        `INSERT INTO notificacoes_disparos (destinatario_id, evento_tipo, canal, titulo, corpo, status, criada_em, lida_em)
         VALUES ($1,'infrequencia','in_app',$2,$3,'enviada', NOW() - INTERVAL '1 day', NULL)`,
        [resp.id, 'Alerta de frequência', `${filho.nome} acumulou faltas que merecem atenção. Procure a escola para mais informações.`]
      )
      await c.query(
        `INSERT INTO notificacoes_disparos (destinatario_id, evento_tipo, canal, titulo, corpo, status, criada_em, lida_em)
         VALUES ($1,'infrequencia','in_app',$2,$3,'enviada', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days')`,
        [resp.id, 'Alerta de frequência', `${filho.nome} faltou 2 dias seguidos na semana passada.`]
      )
      nD += 2
    }

    // ---------- 3) AVISOS: notificacoes gerais ----------
    const ids = alunos.map(a => a.id)
    if (ids.length) await c.query(`DELETE FROM notificacoes WHERE aluno_id = ANY($1::uuid[])`, [ids])
    let nN = 0
    if (filho) {
      await c.query(
        `INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, destinatario_tipo, destinatario_id, escola_id, aluno_id, lida, criado_em)
         VALUES ('novo_comunicado',$1,$2,'normal','responsavel',$3,$4,$5,false, NOW() - INTERVAL '2 days')`,
        ['Reunião de pais e mestres', 'A reunião bimestral acontecerá no próximo sábado, às 9h, no pátio da escola.', resp.id, escola.id, filho.id]
      )
      await c.query(
        `INSERT INTO notificacoes (tipo, titulo, mensagem, prioridade, destinatario_tipo, destinatario_id, escola_id, aluno_id, lida, criado_em)
         VALUES ('resultados_publicados',$1,$2,'normal','responsavel',$3,$4,$5,false, NOW() - INTERVAL '6 hours')`,
        ['Entrega de boletim', 'O boletim do bimestre já está disponível no portal. Confira as notas do seu filho(a).', resp.id, escola.id, filho.id]
      )
      nN += 2
    }

    console.log(`✅ Tarefas: ${nT} (${turmas.length} turmas x ${tarefas.length})`)
    console.log(`✅ Disparos infrequência: ${nD} | Notificações gerais: ${nN}`)
  } finally {
    await c.end()
  }
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
