require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function padronizarSerie2Ano() {
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
    console.log('PADRONIZAÇÃO DA SÉRIE "2º Ano" EM TODAS AS TABELAS')
    console.log('='.repeat(60))

    // 1. Verificar valores atuais de série do 2º ano
    console.log('\n1. VALORES ATUAIS DE SÉRIE (2º ANO):')

    console.log('\n   TABELA ALUNOS:')
    const alunosAntes = await pool.query(`
      SELECT serie, COUNT(*) as total
      FROM alunos
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      GROUP BY serie
      ORDER BY total DESC
    `)
    alunosAntes.rows.forEach(r => {
      console.log(`   - "${r.serie}": ${r.total} alunos`)
    })

    console.log('\n   TABELA RESULTADOS_CONSOLIDADOS:')
    const consolidadosAntes = await pool.query(`
      SELECT serie, COUNT(*) as total
      FROM resultados_consolidados
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      GROUP BY serie
      ORDER BY total DESC
    `)
    consolidadosAntes.rows.forEach(r => {
      console.log(`   - "${r.serie}": ${r.total} registros`)
    })

    console.log('\n   TABELA RESULTADOS_PROVAS:')
    const provasAntes = await pool.query(`
      SELECT serie, COUNT(*) as total
      FROM resultados_provas
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      GROUP BY serie
      ORDER BY total DESC
    `)
    provasAntes.rows.forEach(r => {
      console.log(`   - "${r.serie}": ${r.total} questões`)
    })

    // 2. Corrigir tabela alunos
    console.log('\n2. CORRIGINDO TABELA ALUNOS:')
    const updateAlunos = await pool.query(`
      UPDATE alunos
      SET serie = '2º Ano'
      WHERE serie LIKE '%2%'
        AND serie NOT LIKE '%12%'
        AND serie != '2º Ano'
      RETURNING id
    `)
    console.log(`   ✓ ${updateAlunos.rowCount} registros atualizados`)

    // 3. Corrigir tabela resultados_consolidados
    console.log('\n3. CORRIGINDO TABELA RESULTADOS_CONSOLIDADOS:')
    const updateConsolidados = await pool.query(`
      UPDATE resultados_consolidados
      SET serie = '2º Ano'
      WHERE serie LIKE '%2%'
        AND serie NOT LIKE '%12%'
        AND serie != '2º Ano'
      RETURNING id
    `)
    console.log(`   ✓ ${updateConsolidados.rowCount} registros atualizados`)

    // 4. Corrigir tabela resultados_provas
    console.log('\n4. CORRIGINDO TABELA RESULTADOS_PROVAS:')
    const updateProvas = await pool.query(`
      UPDATE resultados_provas
      SET serie = '2º Ano'
      WHERE serie LIKE '%2%'
        AND serie NOT LIKE '%12%'
        AND serie != '2º Ano'
      RETURNING id
    `)
    console.log(`   ✓ ${updateProvas.rowCount} registros atualizados`)

    // 5. Verificar resultado final
    console.log('\n5. VERIFICAÇÃO FINAL:')

    console.log('\n   TABELA ALUNOS:')
    const alunosDepois = await pool.query(`
      SELECT serie, COUNT(*) as total
      FROM alunos
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      GROUP BY serie
      ORDER BY total DESC
    `)
    alunosDepois.rows.forEach(r => {
      console.log(`   - "${r.serie}": ${r.total} alunos`)
    })

    console.log('\n   TABELA RESULTADOS_CONSOLIDADOS:')
    const consolidadosDepois = await pool.query(`
      SELECT serie, COUNT(*) as total
      FROM resultados_consolidados
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      GROUP BY serie
      ORDER BY total DESC
    `)
    consolidadosDepois.rows.forEach(r => {
      console.log(`   - "${r.serie}": ${r.total} registros`)
    })

    console.log('\n   TABELA RESULTADOS_PROVAS:')
    const provasDepois = await pool.query(`
      SELECT serie, COUNT(*) as total
      FROM resultados_provas
      WHERE serie LIKE '%2%' AND serie NOT LIKE '%12%'
      GROUP BY serie
      ORDER BY total DESC
    `)
    provasDepois.rows.forEach(r => {
      console.log(`   - "${r.serie}": ${r.total} questões`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('✓ PADRONIZAÇÃO CONCLUÍDA!')
    console.log('='.repeat(60))

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Erro:', error)
    await pool.end()
    process.exit(1)
  }
}

padronizarSerie2Ano()
