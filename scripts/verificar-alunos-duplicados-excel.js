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

async function verificarDuplicados() {
  try {
    console.log('========================================')
    console.log('VERIFICAÇÃO DE ALUNOS DUPLICADOS')
    console.log('========================================\n')

    // 1. Verificar alunos duplicados no banco (mesmo nome + escola + ano)
    console.log('🔍 Verificando alunos duplicados no banco...')
    const duplicadosBanco = await pool.query(`
      SELECT 
        UPPER(TRIM(nome)) as nome,
        escola_id,
        ano_letivo,
        COUNT(*) as quantidade,
        STRING_AGG(id::text, ', ') as ids
      FROM alunos
      WHERE ano_letivo = '2025'
      GROUP BY UPPER(TRIM(nome)), escola_id, ano_letivo
      HAVING COUNT(*) > 1
    `)
    
    if (duplicadosBanco.rows.length > 0) {
      console.log(`   ⚠️ Encontrados ${duplicadosBanco.rows.length} grupos de alunos duplicados:`)
      duplicadosBanco.rows.forEach((dup, idx) => {
        console.log(`      ${idx + 1}. ${dup.nome}: ${dup.quantidade} registros`)
      })
    } else {
      console.log(`   ✅ Nenhum aluno duplicado no banco`)
    }

    // 2. Verificar alunos únicos no banco
    console.log(`\n📊 Alunos únicos no banco (por nome + escola):`)
    const alunosUnicos = await pool.query(`
      SELECT COUNT(DISTINCT UPPER(TRIM(nome)) || '_' || escola_id) as total
      FROM alunos
      WHERE ano_letivo = '2025'
    `)
    console.log(`   Total de alunos únicos: ${alunosUnicos.rows[0].total}`)

    // 3. Verificar se há alunos com mesmo nome em escolas diferentes
    console.log(`\n🔍 Alunos com mesmo nome em escolas diferentes:`)
    const mesmoNome = await pool.query(`
      SELECT 
        UPPER(TRIM(nome)) as nome,
        COUNT(DISTINCT escola_id) as escolas_diferentes,
        COUNT(*) as total_registros
      FROM alunos
      WHERE ano_letivo = '2025'
      GROUP BY UPPER(TRIM(nome))
      HAVING COUNT(DISTINCT escola_id) > 1
      ORDER BY total_registros DESC
      LIMIT 10
    `)
    
    if (mesmoNome.rows.length > 0) {
      console.log(`   Encontrados ${mesmoNome.rows.length} alunos com mesmo nome em escolas diferentes:`)
      mesmoNome.rows.forEach((aluno, idx) => {
        console.log(`      ${idx + 1}. ${aluno.nome}: ${aluno.total_registros} registros em ${aluno.escolas_diferentes} escolas`)
      })
    } else {
      console.log(`   ✅ Nenhum aluno com mesmo nome em escolas diferentes`)
    }

    // 4. Verificar alunos sem resultados consolidados
    console.log(`\n🔍 Alunos sem resultados consolidados:`)
    const semConsolidado = await pool.query(`
      SELECT COUNT(*) as total
      FROM alunos a
      LEFT JOIN resultados_consolidados rc ON a.id = rc.aluno_id AND rc.ano_letivo = '2025'
      WHERE a.ano_letivo = '2025' AND rc.id IS NULL
    `)
    console.log(`   ${semConsolidado.rows[0].total} alunos sem consolidado`)

    // 5. Análise de presença
    console.log(`\n👥 ANÁLISE DE PRESENÇA:`)
    const presenca = await pool.query(`
      SELECT 
        presenca,
        COUNT(*) as total
      FROM resultados_consolidados
      WHERE ano_letivo = '2025'
      GROUP BY presenca
      ORDER BY presenca
    `)
    
    presenca.rows.forEach(row => {
      console.log(`   ${row.presenca || 'NULL'}: ${row.total} alunos`)
    })

    console.log(`\n========================================`)
    console.log(`DIAGNÓSTICO:`)
    console.log(`========================================\n`)
    
    const totalEsperado = 978
    const totalNoBanco = await pool.query('SELECT COUNT(*) FROM alunos WHERE ano_letivo = \'2025\'')
    const totalBanco = parseInt(totalNoBanco.rows[0].count)
    const alunosUnicosTotal = parseInt(alunosUnicos.rows[0].total)
    
    console.log(`Total esperado: ${totalEsperado}`)
    console.log(`Total no banco: ${totalBanco}`)
    console.log(`Alunos únicos: ${alunosUnicosTotal}`)
    
    if (totalBanco < totalEsperado) {
      const faltando = totalEsperado - alunosUnicosTotal
      console.log(`\n⚠️ Faltam ${faltando} alunos únicos!`)
      
      if (totalBanco > alunosUnicosTotal) {
        console.log(`   Há ${totalBanco - alunosUnicosTotal} alunos duplicados no banco`)
      }
      
      console.log(`\n💡 POSSÍVEIS CAUSAS:`)
      console.log(`1. Alunos duplicados no Excel (mesmo nome + escola)`)
      console.log(`2. Linhas com dados inválidos que foram puladas`)
      console.log(`3. Problemas na normalização de nomes de escolas`)
      console.log(`4. Alunos que não puderam ser criados por erro silencioso`)
    } else if (alunosUnicosTotal === totalEsperado) {
      console.log(`\n✅ Total de alunos únicos correto!`)
      if (totalBanco > alunosUnicosTotal) {
        console.log(`   ⚠️ Mas há ${totalBanco - alunosUnicosTotal} duplicados no banco`)
      }
    } else {
      console.log(`\n⚠️ Há mais alunos únicos (${alunosUnicosTotal}) que o esperado (${totalEsperado})`)
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

verificarDuplicados()

