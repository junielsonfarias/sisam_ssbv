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

async function diagnostico2Ano() {
  try {
    console.log('========================================')
    console.log('DIAGNOSTICO: PROBLEMA 2o ANO - MAT -> CH')
    console.log('========================================\n')

    // 1. Verificar configuracao de series no banco
    console.log('1. CONFIGURACAO DE SERIES NO BANCO:')
    console.log('-----------------------------------')
    const configSeries = await pool.query(`
      SELECT id, serie, tipo_ensino,
             avalia_lp, avalia_mat, avalia_ch, avalia_cn,
             qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn
      FROM configuracao_series
      ORDER BY id
    `)

    console.log('\nSeries cadastradas:')
    configSeries.rows.forEach(row => {
      console.log(`  ID: ${row.id} | Serie: "${row.serie}" | Tipo: ${row.tipo_ensino}`)
      console.log(`     LP: ${row.avalia_lp ? 'Sim' : 'Nao'} (${row.qtd_questoes_lp || 0} questoes)`)
      console.log(`     MAT: ${row.avalia_mat ? 'Sim' : 'Nao'} (${row.qtd_questoes_mat || 0} questoes)`)
      console.log(`     CH: ${row.avalia_ch ? 'Sim' : 'Nao'} (${row.qtd_questoes_ch || 0} questoes)`)
      console.log(`     CN: ${row.avalia_cn ? 'Sim' : 'Nao'} (${row.qtd_questoes_cn || 0} questoes)`)
      console.log('')
    })

    // 2. Verificar disciplinas por serie
    console.log('\n2. DISCIPLINAS POR SERIE:')
    console.log('-------------------------')
    const disciplinas = await pool.query(`
      SELECT
        cs.serie,
        csd.disciplina,
        csd.sigla,
        csd.questao_inicio,
        csd.questao_fim,
        csd.ativo
      FROM configuracao_series_disciplinas csd
      JOIN configuracao_series cs ON cs.id = csd.serie_id
      ORDER BY cs.id, csd.ordem
    `)

    let currentSerie = ''
    disciplinas.rows.forEach(row => {
      if (row.serie !== currentSerie) {
        currentSerie = row.serie
        console.log(`\n  Serie "${row.serie}":`)
      }
      console.log(`     ${row.sigla}: ${row.disciplina} (Q${row.questao_inicio}-Q${row.questao_fim}) [${row.ativo ? 'Ativo' : 'Inativo'}]`)
    })

    // 3. Verificar dados do 2o ano nos resultados
    console.log('\n\n3. RESULTADOS DO 2o ANO:')
    console.log('------------------------')

    const resultados2Ano = await pool.query(`
      SELECT
        disciplina,
        area_conhecimento,
        COUNT(*) as total,
        COUNT(DISTINCT aluno_id) as total_alunos
      FROM resultados_provas
      WHERE serie LIKE '%2%' AND ano_letivo = '2025'
      GROUP BY disciplina, area_conhecimento
      ORDER BY disciplina
    `)

    console.log('\nDisciplinas encontradas nos resultados do 2o ano:')
    resultados2Ano.rows.forEach(row => {
      console.log(`  ${row.disciplina || 'NULL'} (area: ${row.area_conhecimento || 'NULL'}): ${row.total} registros, ${row.total_alunos} alunos`)
    })

    // 4. Verificar se CH aparece no 2o ano
    const chNo2Ano = await pool.query(`
      SELECT
        aluno_nome,
        questao_codigo,
        disciplina,
        acertou
      FROM resultados_provas
      WHERE serie LIKE '%2%'
        AND ano_letivo = '2025'
        AND disciplina = 'Ciencias Humanas'
      LIMIT 20
    `)

    if (chNo2Ano.rows.length > 0) {
      console.log('\n!! PROBLEMA ENCONTRADO: CH no 2o ano !!')
      console.log('Exemplos de registros com CH no 2o ano:')
      chNo2Ano.rows.forEach(row => {
        console.log(`  Aluno: ${row.aluno_nome} | Questao: ${row.questao_codigo} | Disciplina: ${row.disciplina}`)
      })
    } else {
      console.log('\nNao ha registros de CH no 2o ano.')
    }

    // 5. Verificar consolidados do 2o ano
    console.log('\n\n4. CONSOLIDADOS DO 2o ANO:')
    console.log('-------------------------')

    const consolidados2Ano = await pool.query(`
      SELECT
        rc.aluno_id,
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
      WHERE rc.serie LIKE '%2%' AND rc.ano_letivo = '2025'
      LIMIT 20
    `)

    console.log('\nExemplos de consolidados do 2o ano:')
    consolidados2Ano.rows.forEach(row => {
      console.log(`  Aluno: ${row.aluno_nome}`)
      console.log(`     LP: ${row.nota_lp || 0} (${row.total_acertos_lp || 0} acertos)`)
      console.log(`     MAT: ${row.nota_mat || 0} (${row.total_acertos_mat || 0} acertos)`)
      console.log(`     CH: ${row.nota_ch || 0} (${row.total_acertos_ch || 0} acertos)`)
      console.log(`     CN: ${row.nota_cn || 0} (${row.total_acertos_cn || 0} acertos)`)
      console.log('')
    })

    // 6. Verificar se existe serie "2" ou "2o" ou "2 Ano" na configuracao
    console.log('\n5. VERIFICACAO DE NORMALIZACAO:')
    console.log('-------------------------------')

    const seriesComDois = await pool.query(`
      SELECT id, serie
      FROM configuracao_series
      WHERE serie LIKE '%2%'
    `)

    console.log('Series que contem "2":')
    seriesComDois.rows.forEach(row => {
      console.log(`  ID: ${row.id} | Serie: "${row.serie}"`)
    })

    // Verificar como as series estao nos dados importados
    const seriesImportadas = await pool.query(`
      SELECT DISTINCT serie, COUNT(*) as total
      FROM resultados_provas
      WHERE ano_letivo = '2025'
      GROUP BY serie
      ORDER BY serie
    `)

    console.log('\nSeries encontradas nos dados importados:')
    seriesImportadas.rows.forEach(row => {
      console.log(`  "${row.serie}": ${row.total} registros`)
    })

    console.log('\n========================================')
    console.log('CONCLUSAO:')
    console.log('========================================')

    // Verificar se existe configuracao para serie "2"
    const config2 = configSeries.rows.find(r => r.serie === '2' || r.serie === '2º' || r.serie === '2º Ano')
    if (!config2) {
      console.log('\n!! A serie "2" NAO ESTA CONFIGURADA NO BANCO !!')
      console.log('Por isso o sistema esta usando o fallback de anos finais (com CH)')
      console.log('\nSOLUCAO: Adicionar configuracao para serie "2" na tabela configuracao_series')
    } else {
      console.log('\nConfiguracao para serie 2 encontrada:', config2.serie)
    }

  } catch (error) {
    console.error('Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

diagnostico2Ano()
