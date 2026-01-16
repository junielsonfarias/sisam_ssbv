/**
 * Script para corrigir Q15-Q20 que estão como LP mas deveriam ser MAT
 * para alunos do 2º ano
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Carregar .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=').trim()
      if (key && value) {
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '')
      }
    }
  })
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false,
})

async function corrigirLPParaMAT() {
  const client = await pool.connect()

  try {
    console.log('========================================')
    console.log('CORRECAO: 2o ANO - LP (Q15-Q20) -> MAT')
    console.log('========================================\n')

    // Iniciar transação
    await client.query('BEGIN')

    // 1. Identificar alunos do 2º ano
    console.log('1. Identificando alunos do 2o ano...')
    const alunos2Ano = await client.query(`
      SELECT id, nome, serie
      FROM alunos
      WHERE serie LIKE '%2%' AND ano_letivo = '2025'
    `)
    console.log(`   Encontrados ${alunos2Ano.rows.length} alunos do 2o ano\n`)

    if (alunos2Ano.rows.length === 0) {
      console.log('Nenhum aluno do 2o ano encontrado. Abortando.')
      await client.query('ROLLBACK')
      return
    }

    const alunoIds = alunos2Ano.rows.map(a => a.id)

    // 2. Corrigir disciplina de LP para Matemática nas questões Q15-Q20
    console.log('2. Corrigindo disciplina de LP para Matematica (Q15-Q20)...')

    // Gerar lista de questões Q15 até Q20
    const questoesCorrigir = ['Q15', 'Q16', 'Q17', 'Q18', 'Q19', 'Q20']

    const updateDisciplina = await client.query(`
      UPDATE resultados_provas
      SET disciplina = 'Matemática',
          area_conhecimento = 'Matemática'
      WHERE aluno_id = ANY($1)
        AND ano_letivo = '2025'
        AND questao_codigo = ANY($2)
        AND disciplina = 'Língua Portuguesa'
      RETURNING id, aluno_id, questao_codigo
    `, [alunoIds, questoesCorrigir])
    console.log(`   ${updateDisciplina.rowCount} questoes corrigidas de LP para MAT\n`)

    // 3. Recalcular notas nos resultados_consolidados
    console.log('3. Recalculando notas nos resultados_consolidados...')

    let consolidadosAtualizados = 0

    for (const aluno of alunos2Ano.rows) {
      // Contar acertos por disciplina
      const acertos = await client.query(`
        SELECT
          disciplina,
          COUNT(*) FILTER (WHERE acertou = true) as acertos
        FROM resultados_provas
        WHERE aluno_id = $1 AND ano_letivo = '2025'
        GROUP BY disciplina
      `, [aluno.id])

      let acertosLP = 0
      let acertosMAT = 0

      acertos.rows.forEach(row => {
        if (row.disciplina === 'Língua Portuguesa') acertosLP = parseInt(row.acertos) || 0
        if (row.disciplina === 'Matemática') acertosMAT = parseInt(row.acertos) || 0
      })

      // Calcular notas (2º ano: LP=14 questões, MAT=14 questões)
      const notaLP = acertosLP > 0 ? (acertosLP / 14) * 10 : 0
      const notaMAT = acertosMAT > 0 ? (acertosMAT / 14) * 10 : 0
      const mediaAluno = (notaLP + notaMAT) / 2

      // Atualizar resultados_consolidados
      await client.query(`
        UPDATE resultados_consolidados
        SET
          total_acertos_lp = $2,
          total_acertos_mat = $3,
          total_acertos_ch = 0,
          total_acertos_cn = 0,
          nota_lp = $4,
          nota_mat = $5,
          nota_ch = 0,
          nota_cn = 0,
          media_aluno = $6
        WHERE aluno_id = $1 AND ano_letivo = '2025'
      `, [aluno.id, acertosLP, acertosMAT, notaLP.toFixed(2), notaMAT.toFixed(2), mediaAluno.toFixed(2)])

      consolidadosAtualizados++
    }

    console.log(`   ${consolidadosAtualizados} consolidados recalculados\n`)

    // 4. Commit da transação
    await client.query('COMMIT')

    console.log('========================================')
    console.log('CORRECAO CONCLUIDA COM SUCESSO!')
    console.log('========================================\n')

    // 5. Verificar resultados
    console.log('Verificando resultados...\n')

    const verificacao = await pool.query(`
      SELECT
        a.nome,
        rc.serie,
        rc.total_acertos_lp,
        rc.total_acertos_mat,
        rc.total_acertos_ch,
        rc.total_acertos_cn,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        rc.media_aluno
      FROM resultados_consolidados rc
      JOIN alunos a ON a.id = rc.aluno_id
      WHERE a.serie LIKE '%2%' AND rc.ano_letivo = '2025'
      ORDER BY a.nome
      LIMIT 10
    `)

    console.log('Primeiros 10 alunos do 2o ano apos correcao:')
    verificacao.rows.forEach(row => {
      console.log(`\n  ${row.nome}`)
      console.log(`     Serie: "${row.serie}"`)
      console.log(`     LP: ${row.nota_lp} (${row.total_acertos_lp} acertos de 14)`)
      console.log(`     MAT: ${row.nota_mat} (${row.total_acertos_mat} acertos de 14)`)
      console.log(`     CH: ${row.nota_ch} (${row.total_acertos_ch} acertos)`)
      console.log(`     Media: ${row.media_aluno}`)
    })

    // Verificar se há notas acima de 10
    const notasInvalidas = await pool.query(`
      SELECT COUNT(*) as total
      FROM resultados_consolidados rc
      JOIN alunos a ON a.id = rc.aluno_id
      WHERE a.serie LIKE '%2%'
        AND rc.ano_letivo = '2025'
        AND (CAST(rc.nota_lp AS DECIMAL) > 10 OR CAST(rc.nota_mat AS DECIMAL) > 10)
    `)

    if (parseInt(notasInvalidas.rows[0].total) > 0) {
      console.log(`\n!! AVISO: ${notasInvalidas.rows[0].total} alunos com notas acima de 10`)
    } else {
      console.log('\n✓ Todas as notas estao dentro do limite (0-10)')
    }

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('ERRO:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

corrigirLPParaMAT()
