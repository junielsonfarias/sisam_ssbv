const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

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

async function analisarLinhasFaltantes() {
  try {
    console.log('========================================')
    console.log('ANÁLISE DE LINHAS FALTANTES')
    console.log('========================================\n')

    // 1. Buscar última importação
    const ultimaImportacao = await pool.query(`
      SELECT nome_arquivo, total_linhas, linhas_processadas, linhas_com_erro, erros
      FROM importacoes
      WHERE ano_letivo = '2025'
      ORDER BY criado_em DESC
      LIMIT 1
    `)

    if (ultimaImportacao.rows.length === 0) {
      console.log('❌ Nenhuma importação encontrada')
      return
    }

    const imp = ultimaImportacao.rows[0]
    console.log(`📋 Última importação:`)
    console.log(`   Arquivo: ${imp.nome_arquivo}`)
    console.log(`   Total de linhas: ${imp.total_linhas}`)
    console.log(`   Linhas processadas: ${imp.linhas_processadas}`)
    console.log(`   Linhas com erro: ${imp.linhas_com_erro || 0}`)
    console.log(`   Diferença: ${imp.total_linhas - imp.linhas_processadas} linhas não processadas`)

    // 2. Alunos no banco
    const alunosNoBanco = await pool.query(`
      SELECT COUNT(*) as total
      FROM alunos
      WHERE ano_letivo = '2025'
    `)
    console.log(`\n📊 Alunos no banco: ${alunosNoBanco.rows[0].total}`)
    console.log(`   Esperado: ${imp.total_linhas}`)
    console.log(`   Faltam: ${imp.total_linhas - parseInt(alunosNoBanco.rows[0].total)}`)

    // 3. Análise de presença
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

    // 4. Verificar se há alunos sem consolidado
    console.log(`\n🔍 ALUNOS SEM CONSOLIDADO:`)
    const alunosSemConsolidado = await pool.query(`
      SELECT 
        a.id,
        a.codigo,
        a.nome,
        a.escola_id,
        e.nome as escola_nome
      FROM alunos a
      LEFT JOIN resultados_consolidados rc ON a.id = rc.aluno_id AND rc.ano_letivo = '2025'
      INNER JOIN escolas e ON a.escola_id = e.id
      WHERE a.ano_letivo = '2025' AND rc.id IS NULL
      LIMIT 20
    `)
    
    if (alunosSemConsolidado.rows.length > 0) {
      console.log(`   ⚠️ ${alunosSemConsolidado.rows.length} alunos sem consolidado:`)
      alunosSemConsolidado.rows.forEach((aluno, idx) => {
        console.log(`      ${idx + 1}. ${aluno.codigo} - ${aluno.nome} (${aluno.escola_nome})`)
      })
    } else {
      console.log(`   ✅ Todos os alunos têm consolidado`)
    }

    // 5. Verificar erros da última importação
    if (imp.erros) {
      console.log(`\n❌ ERROS DA ÚLTIMA IMPORTAÇÃO:`)
      const errosArray = imp.erros.split('\n').slice(0, 20)
      errosArray.forEach((erro, idx) => {
        console.log(`   ${idx + 1}. ${erro}`)
      })
      if (imp.erros.split('\n').length > 20) {
        console.log(`   ... e mais ${imp.erros.split('\n').length - 20} erros`)
      }
    }

    console.log(`\n========================================`)
    console.log(`DIAGNÓSTICO:`)
    console.log(`========================================\n`)
    
    const totalEsperado = imp.total_linhas
    const totalImportado = parseInt(alunosNoBanco.rows[0].total)
    const faltando = totalEsperado - totalImportado

    if (faltando > 0) {
      console.log(`⚠️ PROBLEMA: Faltam ${faltando} alunos!`)
      console.log(`\nPossíveis causas:`)
      console.log(`1. Erros durante a importação (${imp.linhas_com_erro || 0} linhas com erro)`)
      console.log(`2. Linhas com dados inválidos (escola ou aluno vazio)`)
      console.log(`3. Escolas não encontradas no banco`)
      console.log(`4. Problemas na normalização de nomes`)
      
      console.log(`\n💡 SOLUÇÃO:`)
      console.log(`1. Verifique os erros acima`)
      console.log(`2. Corrija o arquivo Excel se necessário`)
      console.log(`3. Limpe o banco: npm run preparar-importacao`)
      console.log(`4. Faça nova importação completa`)
    } else {
      console.log(`✅ Todos os alunos foram importados!`)
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

analisarLinhasFaltantes()

