/**
 * Script para corrigir os dados do 2º ano
 * Problema: As notas de Matemática foram atribuídas incorretamente para CH
 * porque a série estava vazia na importação
 *
 * Correções:
 * 1. Atualizar série nos resultados_provas para "2º Ano"
 * 2. Corrigir disciplina de CH para Matemática nas questões Q15-Q28
 * 3. Recalcular as notas no resultados_consolidados
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

async function corrigir2Ano() {
  const client = await pool.connect()

  try {
    console.log('========================================')
    console.log('CORRECAO: 2o ANO - CH -> MATEMATICA')
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

    // 2. Atualizar série nos resultados_provas
    console.log('2. Atualizando serie nos resultados_provas...')
    const updateSerie = await client.query(`
      UPDATE resultados_provas
      SET serie = '2º Ano'
      WHERE aluno_id = ANY($1) AND ano_letivo = '2025'
      RETURNING id
    `, [alunoIds])
    console.log(`   ${updateSerie.rowCount} registros atualizados\n`)

    // 3. Corrigir disciplina de CH para Matemática nas questões Q15-Q28
    console.log('3. Corrigindo disciplina de CH para Matematica (Q15-Q28)...')

    // Gerar lista de questões Q15 até Q28
    const questoesMat = []
    for (let i = 15; i <= 28; i++) {
      questoesMat.push(`Q${i}`)
    }

    const updateDisciplina = await client.query(`
      UPDATE resultados_provas
      SET disciplina = 'Matemática',
          area_conhecimento = 'Matemática'
      WHERE aluno_id = ANY($1)
        AND ano_letivo = '2025'
        AND questao_codigo = ANY($2)
        AND disciplina = 'Ciências Humanas'
      RETURNING id, aluno_id, questao_codigo
    `, [alunoIds, questoesMat])
    console.log(`   ${updateDisciplina.rowCount} questoes corrigidas de CH para MAT\n`)

    // 4. Recalcular notas nos resultados_consolidados
    console.log('4. Recalculando notas nos resultados_consolidados...')

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
          serie = '2º Ano',
          total_acertos_lp = $2,
          total_acertos_mat = $3,
          total_acertos_ch = 0,
          total_acertos_cn = 0,
          nota_lp = $4,
          nota_mat = $5,
          nota_ch = 0,
          nota_cn = 0,
          media_aluno = $6,
          tipo_avaliacao = 'anos_iniciais',
          total_questoes_esperadas = 28
        WHERE aluno_id = $1 AND ano_letivo = '2025'
      `, [aluno.id, acertosLP, acertosMAT, notaLP.toFixed(2), notaMAT.toFixed(2), mediaAluno.toFixed(2)])

      consolidadosAtualizados++
    }

    console.log(`   ${consolidadosAtualizados} consolidados recalculados\n`)

    // 5. Commit da transação
    await client.query('COMMIT')

    console.log('========================================')
    console.log('CORRECAO CONCLUIDA COM SUCESSO!')
    console.log('========================================\n')

    // 6. Verificar resultados
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
      console.log(`     LP: ${row.nota_lp} (${row.total_acertos_lp} acertos)`)
      console.log(`     MAT: ${row.nota_mat} (${row.total_acertos_mat} acertos)`)
      console.log(`     CH: ${row.nota_ch} (${row.total_acertos_ch} acertos)`)
      console.log(`     Media: ${row.media_aluno}`)
    })

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

// Perguntar confirmação antes de executar
const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('\n========================================')
console.log('AVISO: Este script vai corrigir os dados')
console.log('do 2o ano que foram importados com')
console.log('disciplinas incorretas (MAT -> CH)')
console.log('========================================\n')

rl.question('Deseja continuar? (s/n): ', (answer) => {
  rl.close()
  if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') {
    corrigir2Ano()
  } else {
    console.log('Operacao cancelada.')
    process.exit(0)
  }
})
