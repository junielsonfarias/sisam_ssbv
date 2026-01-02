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

async function diagnostico() {
  try {
    console.log('========================================')
    console.log('DIAGNÓSTICO DETALHADO DE IMPORTAÇÃO')
    console.log('========================================\n')

    // 1. Última importação
    console.log('📋 ÚLTIMA IMPORTAÇÃO:')
    const ultimaImportacao = await pool.query(`
      SELECT 
        id,
        nome_arquivo,
        ano_letivo,
        total_linhas,
        linhas_processadas,
        linhas_com_erro,
        status,
        alunos_criados,
        alunos_existentes,
        resultados_novos,
        resultados_duplicados,
        criado_em,
        concluido_em,
        erros
      FROM importacoes
      WHERE ano_letivo = '2025'
      ORDER BY criado_em DESC
      LIMIT 1
    `)
    
    if (ultimaImportacao.rows.length > 0) {
      const imp = ultimaImportacao.rows[0]
      console.log(`   ID: ${imp.id}`)
      console.log(`   Arquivo: ${imp.nome_arquivo}`)
      console.log(`   Ano letivo: ${imp.ano_letivo}`)
      console.log(`   Status: ${imp.status}`)
      console.log(`   Linhas: ${imp.linhas_processadas}/${imp.total_linhas}`)
      console.log(`   Erros: ${imp.linhas_com_erro || 0}`)
      console.log(`   Alunos criados: ${imp.alunos_criados || 0}`)
      console.log(`   Alunos existentes: ${imp.alunos_existentes || 0}`)
      console.log(`   Resultados novos: ${imp.resultados_novos || 0}`)
      console.log(`   Resultados duplicados: ${imp.resultados_duplicados || 0}`)
      console.log(`   Iniciado: ${new Date(imp.criado_em).toLocaleString('pt-BR')}`)
      if (imp.concluido_em) {
        console.log(`   Concluído: ${new Date(imp.concluido_em).toLocaleString('pt-BR')}`)
      }
      
      if (imp.erros) {
        console.log(`\n   ⚠️ PRIMEIROS ERROS:`)
        const errosArray = imp.erros.split('\n').slice(0, 10)
        errosArray.forEach((erro, idx) => {
          console.log(`      ${idx + 1}. ${erro}`)
        })
        if (imp.erros.split('\n').length > 10) {
          console.log(`      ... e mais ${imp.erros.split('\n').length - 10} erros`)
        }
      }
    } else {
      console.log('   Nenhuma importação encontrada para 2025')
    }

    // 2. Dados no banco
    console.log(`\n📊 DADOS NO BANCO (ano letivo 2025):`)
    const alunos = await pool.query('SELECT COUNT(*) FROM alunos WHERE ano_letivo = $1', ['2025'])
    const consolidados = await pool.query('SELECT COUNT(*) FROM resultados_consolidados WHERE ano_letivo = $1', ['2025'])
    const resultados = await pool.query('SELECT COUNT(*) FROM resultados_provas WHERE ano_letivo = $1', ['2025'])
    const turmas = await pool.query('SELECT COUNT(*) FROM turmas WHERE ano_letivo = $1', ['2025'])
    
    console.log(`   Alunos: ${alunos.rows[0].count}`)
    console.log(`   Turmas: ${turmas.rows[0].count}`)
    console.log(`   Consolidados: ${consolidados.rows[0].count}`)
    console.log(`   Resultados de provas: ${resultados.rows[0].count}`)

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

    // 4. Alunos sem consolidados
    console.log(`\n🔍 ALUNOS SEM RESULTADOS CONSOLIDADOS:`)
    const alunosSemConsolidado = await pool.query(`
      SELECT COUNT(*) as total
      FROM alunos a
      LEFT JOIN resultados_consolidados rc ON a.id = rc.aluno_id AND rc.ano_letivo = '2025'
      WHERE a.ano_letivo = '2025' AND rc.id IS NULL
    `)
    console.log(`   ${alunosSemConsolidado.rows[0].total} alunos sem consolidado`)

    // 5. Alunos sem resultados de provas
    console.log(`\n🔍 ALUNOS SEM RESULTADOS DE PROVAS:`)
    const alunosSemProvas = await pool.query(`
      SELECT COUNT(DISTINCT a.id) as total
      FROM alunos a
      LEFT JOIN resultados_provas rp ON a.id = rp.aluno_id AND rp.ano_letivo = '2025'
      WHERE a.ano_letivo = '2025' AND rp.id IS NULL
    `)
    console.log(`   ${alunosSemProvas.rows[0].total} alunos sem resultados de provas`)

    // 6. Distribuição por escola
    console.log(`\n🏫 TOP 10 ESCOLAS COM MAIS ALUNOS:`)
    const topEscolas = await pool.query(`
      SELECT 
        e.nome as escola,
        COUNT(DISTINCT a.id) as total_alunos
      FROM alunos a
      INNER JOIN escolas e ON a.escola_id = e.id
      WHERE a.ano_letivo = '2025'
      GROUP BY e.nome
      ORDER BY total_alunos DESC
      LIMIT 10
    `)
    
    topEscolas.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.escola}: ${row.total_alunos} alunos`)
    })

    console.log(`\n========================================`)
    console.log(`DIAGNÓSTICO:`)
    console.log(`========================================\n`)
    
    const totalAlunos = parseInt(alunos.rows[0].count)
    const esperado = 978
    
    if (totalAlunos === 0) {
      console.log('❌ Nenhum aluno no banco. Execute uma nova importação.')
    } else if (totalAlunos < esperado) {
      console.log(`⚠️ Faltam ${esperado - totalAlunos} alunos!`)
      console.log(`   Esperado: ${esperado}`)
      console.log(`   Importado: ${totalAlunos}`)
      console.log(`\n💡 Recomendação: Limpar e fazer nova importação completa`)
    } else if (totalAlunos === esperado) {
      console.log(`✅ Total correto! ${esperado} alunos importados.`)
    } else {
      console.log(`⚠️ Há ${totalAlunos} alunos (${totalAlunos - esperado} a mais)`)
      console.log(`   Pode haver alunos de importações anteriores`)
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

diagnostico()

