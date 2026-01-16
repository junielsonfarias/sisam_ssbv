require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function encontrarAlunoSemQuestoes() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    console.log('Conectando ao banco de dados...')
    console.log(`Host: ${process.env.DB_HOST}`)
    console.log(`Database: ${process.env.DB_NAME}`)

    console.log('\nBuscando alunos do 2º ano avaliados...')

    // Primeiro, vamos contar quantos alunos estão em cada tabela
    const countConsolidados = await pool.query(`
      SELECT COUNT(DISTINCT aluno_id) as total
      FROM resultados_consolidados
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
        AND (presenca = 'P' OR presenca = 'p')
    `)

    const countQuestoes = await pool.query(`
      SELECT COUNT(DISTINCT rp.aluno_id) as total
      FROM resultados_provas rp
      WHERE rp.serie LIKE '%2%' AND rp.serie NOT LIKE '%12%'
    `)

    console.log(`\nAlunos do 2º ano em resultados_consolidados (presença P): ${countConsolidados.rows[0].total}`)
    console.log(`Alunos do 2º ano em resultados_provas (questões): ${countQuestoes.rows[0].total}`)

    // Query para encontrar alunos que estão em resultados_consolidados mas NÃO em resultados_provas
    const query = `
      SELECT DISTINCT
        rc.aluno_id,
        a.nome as aluno_nome,
        a.codigo as aluno_codigo,
        e.nome as escola_nome,
        t.codigo as turma_codigo,
        rc.serie,
        rc.presenca,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_producao,
        rc.media_aluno,
        rc.total_acertos_lp,
        rc.total_acertos_mat
      FROM resultados_consolidados rc
      JOIN alunos a ON rc.aluno_id = a.id
      JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      WHERE rc.serie LIKE '%2%' AND rc.serie NOT LIKE '%12%'
        AND (rc.presenca = 'P' OR rc.presenca = 'p')
        AND rc.aluno_id NOT IN (
          SELECT DISTINCT aluno_id
          FROM resultados_provas
          WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
            AND aluno_id IS NOT NULL
        )
      ORDER BY e.nome, a.nome
    `

    const result = await pool.query(query)

    if (result.rows.length > 0) {
      console.log('\n========================================')
      console.log(`ALUNOS SEM DADOS DE QUESTÕES: ${result.rows.length}`)
      console.log('========================================')

      result.rows.forEach((aluno, index) => {
        console.log(`\n${index + 1}. ${aluno.aluno_nome}`)
        console.log(`   ID: ${aluno.aluno_id}`)
        console.log(`   Código: ${aluno.aluno_codigo}`)
        console.log(`   Escola: ${aluno.escola_nome}`)
        console.log(`   Turma: ${aluno.turma_codigo || 'N/A'}`)
        console.log(`   Série: ${aluno.serie}`)
        console.log(`   Presença: ${aluno.presenca}`)
        console.log(`   Acertos LP: ${aluno.total_acertos_lp || '-'}`)
        console.log(`   Acertos MAT: ${aluno.total_acertos_mat || '-'}`)
        console.log(`   Nota LP: ${aluno.nota_lp || '-'}`)
        console.log(`   Nota MAT: ${aluno.nota_mat || '-'}`)
        console.log(`   Nota PROD: ${aluno.nota_producao || '-'}`)
        console.log(`   Média: ${aluno.media_aluno || '-'}`)
      })

      // Exportar dados em formato CSV
      console.log('\n\n========================================')
      console.log('DADOS PARA EXPORTAÇÃO (CSV):')
      console.log('========================================')
      console.log('ID,Código,Nome,Escola,Turma,Série')
      result.rows.forEach(aluno => {
        console.log(`${aluno.aluno_id},${aluno.aluno_codigo},"${aluno.aluno_nome}","${aluno.escola_nome}",${aluno.turma_codigo || ''},${aluno.serie}`)
      })
    } else {
      console.log('\n✓ Todos os alunos do 2º ano têm dados de questões!')

      // Verificar se há diferença por outro motivo
      console.log('\nVerificando possíveis causas da diferença...')

      const verificacao = await pool.query(`
        SELECT
          'Consolidados com presença P' as tipo,
          COUNT(DISTINCT aluno_id) as total
        FROM resultados_consolidados
        WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
          AND (presenca = 'P' OR presenca = 'p')
        UNION ALL
        SELECT
          'Consolidados com presença F' as tipo,
          COUNT(DISTINCT aluno_id) as total
        FROM resultados_consolidados
        WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
          AND (presenca = 'F' OR presenca = 'f')
        UNION ALL
        SELECT
          'Consolidados com presença -' as tipo,
          COUNT(DISTINCT aluno_id) as total
        FROM resultados_consolidados
        WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
          AND presenca = '-'
        UNION ALL
        SELECT
          'Total em resultados_provas' as tipo,
          COUNT(DISTINCT aluno_id) as total
        FROM resultados_provas
        WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      `)

      console.log('\nDistribuição:')
      verificacao.rows.forEach(row => {
        console.log(`  ${row.tipo}: ${row.total}`)
      })
    }

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Erro:', error)
    await pool.end()
    process.exit(1)
  }
}

encontrarAlunoSemQuestoes()
