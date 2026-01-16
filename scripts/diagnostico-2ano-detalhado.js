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

async function diagnosticoDetalhado() {
  try {
    console.log('========================================')
    console.log('DIAGNOSTICO DETALHADO: 2o ANO')
    console.log('========================================\n')

    // 1. Verificar registros com serie null
    console.log('1. REGISTROS COM SERIE NULL:')
    console.log('----------------------------')

    const registrosNull = await pool.query(`
      SELECT
        aluno_nome,
        disciplina,
        questao_codigo,
        COUNT(*) as total
      FROM resultados_provas
      WHERE serie IS NULL AND ano_letivo = '2025'
      GROUP BY aluno_nome, disciplina, questao_codigo
      LIMIT 30
    `)

    console.log(`\nExemplos de registros com serie NULL:`)
    registrosNull.rows.slice(0, 15).forEach(row => {
      console.log(`  Aluno: ${row.aluno_nome} | Disciplina: ${row.disciplina} | Questao: ${row.questao_codigo}`)
    })

    // 2. Verificar se ha CH nos registros null
    const chNull = await pool.query(`
      SELECT
        disciplina,
        COUNT(*) as total
      FROM resultados_provas
      WHERE serie IS NULL AND ano_letivo = '2025'
      GROUP BY disciplina
    `)

    console.log(`\nDisciplinas nos registros NULL:`)
    chNull.rows.forEach(row => {
      console.log(`  ${row.disciplina}: ${row.total} registros`)
    })

    // 3. Verificar alunos do 2o ano (pela tabela alunos)
    console.log('\n\n2. ALUNOS DO 2o ANO (tabela alunos):')
    console.log('------------------------------------')

    const alunos2Ano = await pool.query(`
      SELECT
        a.id,
        a.nome,
        a.serie,
        e.nome as escola
      FROM alunos a
      JOIN escolas e ON e.id = a.escola_id
      WHERE a.serie LIKE '%2%' AND a.ano_letivo = '2025'
      ORDER BY a.nome
      LIMIT 20
    `)

    console.log(`\nTotal de alunos do 2o ano: ${alunos2Ano.rows.length}`)
    alunos2Ano.rows.slice(0, 10).forEach(row => {
      console.log(`  ${row.nome} | Serie: "${row.serie}" | Escola: ${row.escola}`)
    })

    // 4. Verificar resultados_consolidados do 2o ano
    console.log('\n\n3. CONSOLIDADOS DO 2o ANO COM PROBLEMAS:')
    console.log('-----------------------------------------')

    const consolidadosProblema = await pool.query(`
      SELECT
        a.nome as aluno_nome,
        rc.serie,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        rc.total_acertos_lp,
        rc.total_acertos_mat,
        rc.total_acertos_ch,
        rc.total_acertos_cn
      FROM resultados_consolidados rc
      JOIN alunos a ON a.id = rc.aluno_id
      WHERE a.serie LIKE '%2%' AND rc.ano_letivo = '2025'
      ORDER BY a.nome
    `)

    console.log(`\nTotal de consolidados do 2o ano: ${consolidadosProblema.rows.length}`)

    let problemasEncontrados = 0
    consolidadosProblema.rows.forEach(row => {
      const temCH = parseFloat(row.nota_ch) > 0 || parseInt(row.total_acertos_ch) > 0
      const temCN = parseFloat(row.nota_cn) > 0 || parseInt(row.total_acertos_cn) > 0

      if (temCH || temCN) {
        problemasEncontrados++
        console.log(`\n  !! PROBLEMA: ${row.aluno_nome}`)
        console.log(`     Serie: "${row.serie}"`)
        console.log(`     LP: ${row.nota_lp} (${row.total_acertos_lp} acertos)`)
        console.log(`     MAT: ${row.nota_mat} (${row.total_acertos_mat} acertos)`)
        console.log(`     CH: ${row.nota_ch} (${row.total_acertos_ch} acertos) <-- NAO DEVERIA TER`)
        console.log(`     CN: ${row.nota_cn} (${row.total_acertos_cn} acertos) <-- NAO DEVERIA TER`)
      }
    })

    if (problemasEncontrados === 0) {
      console.log('\nNenhum consolidado do 2o ano com CH ou CN encontrado.')
    }

    // 5. Verificar resultados_provas do 2o ano
    console.log('\n\n4. RESULTADOS_PROVAS DO 2o ANO:')
    console.log('-------------------------------')

    const resultados2Ano = await pool.query(`
      SELECT
        rp.aluno_nome,
        rp.serie,
        rp.disciplina,
        rp.questao_codigo,
        rp.acertou
      FROM resultados_provas rp
      JOIN alunos a ON a.id = rp.aluno_id
      WHERE a.serie LIKE '%2%' AND rp.ano_letivo = '2025'
      ORDER BY rp.aluno_nome, rp.questao_codigo
      LIMIT 50
    `)

    console.log(`\nResultados de provas do 2o ano:`)
    let currentAluno = ''
    resultados2Ano.rows.forEach(row => {
      if (row.aluno_nome !== currentAluno) {
        currentAluno = row.aluno_nome
        console.log(`\n  ${row.aluno_nome} (Serie planilha: "${row.serie}"):`)
      }
      console.log(`     ${row.questao_codigo}: ${row.disciplina} - ${row.acertou ? 'Acertou' : 'Errou'}`)
    })

    // 6. Verificar ultima importacao do 2o ano
    console.log('\n\n5. ULTIMA IMPORTACAO:')
    console.log('---------------------')

    const ultimaImportacao = await pool.query(`
      SELECT
        id,
        nome_arquivo,
        status,
        total_linhas,
        linhas_processadas,
        linhas_com_erro,
        erros,
        criado_em
      FROM importacoes
      WHERE ano_letivo = '2025'
      ORDER BY criado_em DESC
      LIMIT 3
    `)

    ultimaImportacao.rows.forEach(imp => {
      console.log(`\n  Arquivo: ${imp.nome_arquivo}`)
      console.log(`  Status: ${imp.status}`)
      console.log(`  Linhas: ${imp.linhas_processadas}/${imp.total_linhas}`)
      console.log(`  Data: ${new Date(imp.criado_em).toLocaleString('pt-BR')}`)
      if (imp.erros) {
        console.log(`  Erros: ${imp.erros.substring(0, 500)}...`)
      }
    })

    console.log('\n========================================')
    console.log('ANALISE DO PROBLEMA:')
    console.log('========================================')
    console.log(`
O problema pode ser:
1. A serie no arquivo Excel nao esta sendo lida corretamente
2. A funcao de normalizacao nao esta encontrando a configuracao
3. Os dados foram importados com fallback de anos finais

SOLUCAO: Verificar o arquivo Excel original e reimportar os dados do 2o ano.
    `)

  } catch (error) {
    console.error('Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

diagnosticoDetalhado()
