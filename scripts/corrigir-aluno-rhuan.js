require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const ALUNO_ID = '6bfbf191-adfc-4fae-a4dc-273bfdc74a89'

async function corrigirSerie() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    console.log('='.repeat(60))
    console.log('CORREÇÃO DA SÉRIE DO ALUNO RHUAN')
    console.log('='.repeat(60))

    // 1. Estado antes
    console.log('\n1. ANTES DA CORREÇÃO:')
    const antes = await pool.query(`
      SELECT serie, COUNT(*) as total
      FROM resultados_provas
      WHERE aluno_id = $1
      GROUP BY serie
    `, [ALUNO_ID])

    antes.rows.forEach(s => {
      console.log(`   Série: "${s.serie}" - ${s.total} questões`)
    })

    // 2. Corrigir série de "2º ANO" para "2º Ano"
    console.log('\n2. CORRIGINDO SÉRIE "2º ANO" -> "2º Ano":')
    const update = await pool.query(`
      UPDATE resultados_provas
      SET serie = '2º Ano'
      WHERE aluno_id = $1 AND serie = '2º ANO'
      RETURNING id
    `, [ALUNO_ID])

    console.log(`   Questões atualizadas: ${update.rowCount}`)

    // 3. Estado depois
    console.log('\n3. APÓS CORREÇÃO:')
    const depois = await pool.query(`
      SELECT serie, COUNT(*) as total
      FROM resultados_provas
      WHERE aluno_id = $1
      GROUP BY serie
    `, [ALUNO_ID])

    depois.rows.forEach(s => {
      console.log(`   Série: "${s.serie}" - ${s.total} questões`)
    })

    // 4. Verificar contagem total por série no 2º ano
    console.log('\n4. CONTAGEM TOTAL NO 2º ANO:')
    const totais = await pool.query(`
      SELECT
        serie,
        COUNT(DISTINCT aluno_id) as total_alunos,
        COUNT(*) as total_questoes
      FROM resultados_provas
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      GROUP BY serie
      ORDER BY total_alunos DESC
    `)

    totais.rows.forEach(s => {
      console.log(`   "${s.serie}": ${s.total_alunos} alunos, ${s.total_questoes} questões`)
    })

    // 5. Verificar se há questões com apenas 1 aluno
    console.log('\n5. VERIFICAÇÃO FINAL - QUESTÕES COM POUCOS ALUNOS:')
    const questoesPoucosAlunos = await pool.query(`
      SELECT
        questao_codigo,
        disciplina,
        serie,
        COUNT(DISTINCT aluno_id) as total_alunos
      FROM resultados_provas
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      GROUP BY questao_codigo, disciplina, serie
      HAVING COUNT(DISTINCT aluno_id) < 10
      ORDER BY total_alunos, questao_codigo
    `)

    if (questoesPoucosAlunos.rows.length > 0) {
      console.log(`   Ainda há ${questoesPoucosAlunos.rows.length} combinações com menos de 10 alunos:`)
      questoesPoucosAlunos.rows.forEach(q => {
        console.log(`   - ${q.questao_codigo} (${q.disciplina}, ${q.serie}): ${q.total_alunos} alunos`)
      })
    } else {
      console.log('   ✓ Todas as questões têm pelo menos 10 alunos!')
    }

    console.log('\n' + '='.repeat(60))
    console.log('CORREÇÃO CONCLUÍDA!')
    console.log('='.repeat(60))

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Erro:', error)
    await pool.end()
    process.exit(1)
  }
}

corrigirSerie()
