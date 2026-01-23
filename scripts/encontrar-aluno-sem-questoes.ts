import pool from '../database/connection'

async function encontrarAlunoSemQuestoes() {
  try {
    console.log('Buscando alunos do 2º ano avaliados...')

    // Query para encontrar alunos do 2º ano que estão em resultados_consolidados
    // mas não têm registros em resultados_provas
    const query = `
      WITH alunos_consolidados AS (
        -- Alunos do 2º ano com presença P em resultados_consolidados
        SELECT DISTINCT
          rc.aluno_id,
          a.nome as aluno_nome,
          a.codigo as aluno_codigo,
          e.nome as escola_nome,
          t.codigo as turma_codigo,
          rc.presenca,
          rc.nota_lp,
          rc.nota_mat,
          rc.nota_producao,
          rc.media_aluno
        FROM resultados_consolidados rc
        JOIN alunos a ON rc.aluno_id = a.id
        JOIN escolas e ON rc.escola_id = e.id
        LEFT JOIN turmas t ON rc.turma_id = t.id
        WHERE rc.serie LIKE '%2%'
          AND (rc.presenca = 'P' OR rc.presenca = 'p')
      ),
      alunos_com_questoes AS (
        -- Alunos que têm pelo menos um registro em resultados_provas
        SELECT DISTINCT aluno_id
        FROM resultados_provas rp
        JOIN alunos a ON rp.aluno_codigo = a.codigo OR rp.aluno_id = a.id
        WHERE rp.serie LIKE '%2%'
      )
      SELECT
        ac.*,
        CASE WHEN acq.aluno_id IS NULL THEN 'SEM QUESTÕES' ELSE 'COM QUESTÕES' END as status_questoes
      FROM alunos_consolidados ac
      LEFT JOIN alunos_com_questoes acq ON ac.aluno_id = acq.aluno_id
      ORDER BY status_questoes DESC, ac.escola_nome, ac.aluno_nome
    `

    const result = await pool.query(query)

    console.log(`\nTotal de alunos do 2º ano avaliados (presença P): ${result.rows.length}`)

    const semQuestoes = result.rows.filter(r => r.status_questoes === 'SEM QUESTÕES')
    const comQuestoes = result.rows.filter(r => r.status_questoes === 'COM QUESTÕES')

    console.log(`Alunos COM dados de questões: ${comQuestoes.length}`)
    console.log(`Alunos SEM dados de questões: ${semQuestoes.length}`)

    if (semQuestoes.length > 0) {
      console.log('\n========================================')
      console.log('ALUNOS SEM DADOS DE QUESTÕES:')
      console.log('========================================')

      semQuestoes.forEach((aluno, index) => {
        console.log(`\n${index + 1}. ${aluno.aluno_nome}`)
        console.log(`   Código: ${aluno.aluno_codigo}`)
        console.log(`   Escola: ${aluno.escola_nome}`)
        console.log(`   Turma: ${aluno.turma_codigo || 'N/A'}`)
        console.log(`   Presença: ${aluno.presenca}`)
        console.log(`   Nota LP: ${aluno.nota_lp || '-'}`)
        console.log(`   Nota MAT: ${aluno.nota_mat || '-'}`)
        console.log(`   Nota PROD: ${aluno.nota_producao || '-'}`)
        console.log(`   Média: ${aluno.media_aluno || '-'}`)
      })
    }

    process.exit(0)
  } catch (error) {
    console.error('Erro:', error)
    process.exit(1)
  }
}

encontrarAlunoSemQuestoes()
