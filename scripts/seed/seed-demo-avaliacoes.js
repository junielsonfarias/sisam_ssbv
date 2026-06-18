/**
 * Seed idempotente de RECUPERAÇÃO + AVALIAÇÃO MUNICIPAL (SISAM) para o ambiente
 * de demonstração (Educanet). Opera sobre os alunos DEMO já existentes — NÃO
 * recria registros nem muda IDs. Pode rodar quantas vezes quiser.
 *
 * Uso:  node scripts/seed/seed-demo-avaliacoes.js
 * Conexão: variáveis DB_* do .env.local (ou padrão do banco de demo).
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

const nivelDe = (m) => (m >= 8 ? 'Avançado' : m >= 6 ? 'Adequado' : m >= 4 ? 'Básico' : 'Insuficiente')

async function main() {
  const c = new Client(cfg)
  await c.connect()
  try {
    // Alunos da escola demo
    const alunos = (await c.query(
      `SELECT a.id, a.escola_id, a.turma_id, a.serie, a.serie_numero, a.ano_letivo
         FROM alunos a JOIN escolas e ON e.id = a.escola_id
        WHERE e.nome ILIKE '%Demonstra%' ORDER BY a.codigo`
    )).rows
    if (alunos.length === 0) { console.log('Nenhum aluno demo encontrado.'); return }

    // --- 1) RECUPERAÇÃO: preencher nota_recuperacao nas notas < 6 dos alunos demo ---
    const baixas = (await c.query(
      `SELECT ne.id, ne.nota_final
         FROM notas_escolares ne
         JOIN alunos a ON a.id = ne.aluno_id
         JOIN escolas e ON e.id = a.escola_id
        WHERE e.nome ILIKE '%Demonstra%' AND ne.nota_final < 6 AND ne.nota_recuperacao IS NULL
        ORDER BY ne.id`
    )).rows
    let nRec = 0
    for (let i = 0; i < baixas.length; i++) {
      const orig = Number(baixas[i].nota_final)
      // alterna: maioria recupera (>=6); ~1 a cada 3 não recupera
      const ganho = (i % 3 === 0) ? 0.8 : 2.5
      const recup = Math.min(10, Number((orig + ganho).toFixed(1)))
      await c.query('UPDATE notas_escolares SET nota_recuperacao = $1 WHERE id = $2', [recup, baixas[i].id])
      nRec++
    }

    // --- 2) SISAM: resultados_consolidados por aluno x avaliação ---
    const avals = (await c.query(
      `SELECT id, nome FROM avaliacoes WHERE ano_letivo = '2026' ORDER BY ordem`
    )).rows
    // Limpa resultados demo antes de reinserir (idempotente)
    const ids = alunos.map((a) => a.id)
    await c.query('DELETE FROM resultados_consolidados WHERE aluno_id = ANY($1::uuid[])', [ids])
    let nSis = 0
    for (let ai = 0; ai < alunos.length; ai++) {
      const a = alunos[ai]
      for (let vi = 0; vi < avals.length; vi++) {
        const av = avals[vi]
        // Notas determinísticas (variam por aluno/avaliação), 0..10
        const base = 5 + ((ai + vi) % 5) // 5..9
        const nLp = Math.min(10, base + 0.5)
        const nMat = Math.min(10, Math.max(0, base - 0.5 + (ai % 3)))
        const nCh = Math.min(10, base + (vi ? 0.8 : 0))
        const nCn = Math.min(10, Math.max(0, base - 1 + (ai % 2)))
        const nProd = Math.min(10, base + 0.3)
        const media = Number(((nLp + nMat + nCh + nCn + nProd) / 5).toFixed(1))
        const presenca = (ai % 7 === 6) ? 'F' : 'P' // 1 ausente ocasional
        await c.query(
          `INSERT INTO resultados_consolidados
             (aluno_id, escola_id, turma_id, ano_letivo, serie, serie_numero, avaliacao_id,
              presenca, nota_lp, nota_mat, nota_ch, nota_cn, nota_producao, media_aluno, nivel_aprendizagem)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT DO NOTHING`,
          [a.id, a.escola_id, a.turma_id, '2026', a.serie, a.serie_numero, av.id,
           presenca,
           presenca === 'F' ? null : Number(nLp.toFixed(1)),
           presenca === 'F' ? null : Number(nMat.toFixed(1)),
           presenca === 'F' ? null : Number(nCh.toFixed(1)),
           presenca === 'F' ? null : Number(nCn.toFixed(1)),
           presenca === 'F' ? null : Number(nProd.toFixed(1)),
           presenca === 'F' ? null : media,
           presenca === 'F' ? null : nivelDe(media)]
        )
        nSis++
      }
    }

    console.log(`✅ Recuperação: ${nRec} notas atualizadas`)
    console.log(`✅ SISAM: ${nSis} resultados inseridos (${alunos.length} alunos x ${avals.length} avaliações)`)
  } finally {
    await c.end()
  }
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
