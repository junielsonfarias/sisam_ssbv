const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Tentar carregar .env.local se existir
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

async function investigarAlunos() {
  try {
    console.log('========================================')
    console.log('INVESTIGAÇÃO DETALHADA DE ALUNOS')
    console.log('========================================\n')

    // 1. Total geral
    const total = await pool.query('SELECT COUNT(*) as total FROM alunos')
    console.log(`📊 Total de alunos: ${total.rows[0].total}`)

    // 2. Por ano letivo
    console.log(`\n📅 Distribuição por Ano Letivo:`)
    const porAno = await pool.query(`
      SELECT ano_letivo, COUNT(*) as total 
      FROM alunos 
      GROUP BY ano_letivo 
      ORDER BY ano_letivo DESC
    `)
    porAno.rows.forEach(row => {
      console.log(`   - ${row.ano_letivo || 'NULL'}: ${row.total} alunos`)
    })

    // 3. Histórico de importações
    console.log(`\n📋 Histórico de Importações:`)
    const importacoes = await pool.query(`
      SELECT 
        id,
        nome_arquivo,
        ano_letivo,
        total_linhas,
        linhas_processadas,
        alunos_criados,
        alunos_existentes,
        status,
        criado_em
      FROM importacoes
      WHERE status = 'concluido'
      ORDER BY criado_em DESC
      LIMIT 10
    `)
    importacoes.rows.forEach((imp, idx) => {
      console.log(`\n   ${idx + 1}. ${imp.nome_arquivo} (${imp.ano_letivo})`)
      console.log(`      Status: ${imp.status}`)
      console.log(`      Linhas: ${imp.linhas_processadas}/${imp.total_linhas}`)
      console.log(`      Alunos criados: ${imp.alunos_criados || 0}`)
      console.log(`      Alunos existentes: ${imp.alunos_existentes || 0}`)
      console.log(`      Data: ${new Date(imp.criado_em).toLocaleString('pt-BR')}`)
    })

    // 4. Verificar duplicatas ignorando ano_letivo (só nome + escola)
    console.log(`\n\n🔍 Verificando duplicatas por Nome + Escola (IGNORANDO ano letivo):`)
    const dupSemAno = await pool.query(`
      SELECT 
        UPPER(TRIM(nome)) as nome_normalizado,
        escola_id,
        COUNT(*) as quantidade,
        STRING_AGG(DISTINCT ano_letivo, ', ') as anos_letivos,
        STRING_AGG(id::text, ', ' ORDER BY criado_em DESC) as ids
      FROM alunos
      GROUP BY UPPER(TRIM(nome)), escola_id
      HAVING COUNT(*) > 1
      ORDER BY quantidade DESC
      LIMIT 20
    `)
    
    if (dupSemAno.rows.length > 0) {
      console.log(`   ⚠️  Encontrados ${dupSemAno.rows.length} alunos com mesmo nome e escola em anos diferentes:`)
      let totalDupSemAno = 0
      dupSemAno.rows.forEach((dup, idx) => {
        console.log(`\n   ${idx + 1}. ${dup.nome_normalizado}`)
        console.log(`      Registros: ${dup.quantidade}`)
        console.log(`      Anos letivos: ${dup.anos_letivos}`)
        totalDupSemAno += parseInt(dup.quantidade)
      })
      console.log(`\n   📈 Total de registros: ${totalDupSemAno}`)
      console.log(`   📉 Se mantiver apenas 1 por aluno: ${dupSemAno.rows.length}`)
      console.log(`   ❌ Registros a remover: ${totalDupSemAno - dupSemAno.rows.length}`)
    } else {
      console.log(`   ✅ Não há duplicatas ignorando ano letivo`)
    }

    // 5. Alunos com mesmo nome mas códigos diferentes
    console.log(`\n\n🔍 Alunos com códigos duplicados:`)
    const codigosDup = await pool.query(`
      SELECT codigo, COUNT(*) as quantidade
      FROM alunos
      GROUP BY codigo
      HAVING COUNT(*) > 1
    `)
    if (codigosDup.rows.length > 0) {
      console.log(`   ⚠️  ${codigosDup.rows.length} códigos duplicados`)
      codigosDup.rows.slice(0, 10).forEach(row => {
        console.log(`      - ${row.codigo}: ${row.quantidade} vezes`)
      })
    } else {
      console.log(`   ✅ Todos os códigos são únicos`)
    }

    // 6. Análise por data de criação
    console.log(`\n\n📅 Alunos criados por período:`)
    const porPeriodo = await pool.query(`
      SELECT 
        DATE(criado_em) as data,
        COUNT(*) as total
      FROM alunos
      GROUP BY DATE(criado_em)
      ORDER BY DATE(criado_em) DESC
      LIMIT 10
    `)
    porPeriodo.rows.forEach(row => {
      console.log(`   - ${new Date(row.data).toLocaleDateString('pt-BR')}: ${row.total} alunos`)
    })

    console.log(`\n========================================`)
    console.log(`RECOMENDAÇÃO:`)
    console.log(`========================================`)
    
    const totalEsperado = 978
    const totalAtual = parseInt(total.rows[0].total)
    const diferenca = totalAtual - totalEsperado

    if (totalAtual === totalEsperado) {
      console.log(`✅ Total correto: ${totalEsperado} alunos`)
    } else if (totalAtual > totalEsperado) {
      console.log(`⚠️  Há ${diferenca} alunos a mais que o esperado (${totalEsperado})`)
      console.log(`\nPossíveis causas:`)
      console.log(`1. Múltiplas importações do mesmo arquivo`)
      console.log(`2. Dados de múltiplos anos letivos (${porAno.rows.length} anos diferentes)`)
      console.log(`3. Alunos de diferentes turmas/séries`)
      
      if (dupSemAno.rows.length > 0) {
        console.log(`\n💡 Sugestão: Remover registros duplicados mantendo apenas o mais recente por aluno`)
        console.log(`   Isso removeria ${totalDupSemAno - dupSemAno.rows.length} registros`)
        console.log(`   Total final: ${totalAtual - (totalDupSemAno - dupSemAno.rows.length)} alunos`)
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

investigarAlunos()

