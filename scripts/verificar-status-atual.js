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

async function verificarStatusAtual() {
  try {
    console.log('========================================')
    console.log('VERIFICAÇÃO DO STATUS ATUAL')
    console.log('========================================\n')

    // 1. Total de alunos por ano letivo
    console.log('📊 ALUNOS POR ANO LETIVO:')
    const porAno = await pool.query(`
      SELECT 
        ano_letivo,
        COUNT(*) as total
      FROM alunos
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `)
    
    let totalGeral = 0
    if (porAno.rows.length === 0) {
      console.log('   ⚠️  Nenhum aluno encontrado no banco!')
    } else {
      porAno.rows.forEach(row => {
        console.log(`   - ${row.ano_letivo || 'NULL'}: ${row.total} alunos`)
        totalGeral += parseInt(row.total)
      })
      console.log(`   📈 Total geral: ${totalGeral} alunos`)
    }

    // 2. Última importação
    console.log(`\n📋 HISTÓRICO DE IMPORTAÇÕES (ÚLTIMAS 5):`)
    const importacoes = await pool.query(`
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
        criado_em,
        concluido_em
      FROM importacoes
      ORDER BY criado_em DESC
      LIMIT 5
    `)
    
    if (importacoes.rows.length === 0) {
      console.log('   ⚠️  Nenhuma importação encontrada')
    } else {
      importacoes.rows.forEach((imp, idx) => {
        console.log(`\n   ${idx + 1}. ${imp.nome_arquivo}`)
        console.log(`      ID: ${imp.id}`)
        console.log(`      Ano letivo: ${imp.ano_letivo || 'NULL'}`)
        console.log(`      Status: ${imp.status}`)
        console.log(`      Linhas: ${imp.linhas_processadas}/${imp.total_linhas}`)
        console.log(`      Erros: ${imp.linhas_com_erro || 0}`)
        console.log(`      Alunos criados: ${imp.alunos_criados || 0}`)
        console.log(`      Alunos existentes: ${imp.alunos_existentes || 0}`)
        console.log(`      Iniciado: ${new Date(imp.criado_em).toLocaleString('pt-BR')}`)
        if (imp.concluido_em) {
          console.log(`      Concluído: ${new Date(imp.concluido_em).toLocaleString('pt-BR')}`)
        }
      })
    }

    // 3. Últimos alunos criados
    console.log(`\n\n👥 ÚLTIMOS 10 ALUNOS CRIADOS:`)
    const ultimosAlunos = await pool.query(`
      SELECT 
        codigo,
        nome,
        ano_letivo,
        serie,
        criado_em
      FROM alunos
      ORDER BY criado_em DESC
      LIMIT 10
    `)
    
    if (ultimosAlunos.rows.length === 0) {
      console.log('   ⚠️  Nenhum aluno no banco')
    } else {
      ultimosAlunos.rows.forEach((aluno, idx) => {
        console.log(`   ${idx + 1}. ${aluno.codigo} - ${aluno.nome} (${aluno.serie || 'sem série'}) - ${aluno.ano_letivo || 'sem ano'} - ${new Date(aluno.criado_em).toLocaleString('pt-BR')}`)
      })
    }

    // 4. Turmas
    console.log(`\n\n📚 TURMAS:`)
    const turmas = await pool.query(`
      SELECT 
        ano_letivo,
        COUNT(*) as total
      FROM turmas
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `)
    
    if (turmas.rows.length === 0) {
      console.log('   ⚠️  Nenhuma turma encontrada')
    } else {
      turmas.rows.forEach(row => {
        console.log(`   - ${row.ano_letivo || 'NULL'}: ${row.total} turmas`)
      })
    }

    // 5. Resultados
    console.log(`\n\n📝 RESULTADOS:`)
    const consolidados = await pool.query(`
      SELECT 
        ano_letivo,
        COUNT(*) as total
      FROM resultados_consolidados
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `)
    
    if (consolidados.rows.length === 0) {
      console.log('   - Consolidados: 0')
    } else {
      console.log('   - Consolidados:')
      consolidados.rows.forEach(row => {
        console.log(`     • ${row.ano_letivo || 'NULL'}: ${row.total}`)
      })
    }

    const provas = await pool.query(`
      SELECT 
        ano_letivo,
        COUNT(*) as total
      FROM resultados_provas
      GROUP BY ano_letivo
      ORDER BY ano_letivo DESC
    `)
    
    if (provas.rows.length === 0) {
      console.log('   - Provas: 0')
    } else {
      console.log('   - Provas:')
      provas.rows.forEach(row => {
        console.log(`     • ${row.ano_letivo || 'NULL'}: ${row.total}`)
      })
    }

    // 6. Se houver importação em processamento
    console.log(`\n\n🔄 IMPORTAÇÕES EM ANDAMENTO:`)
    const emAndamento = await pool.query(`
      SELECT 
        id,
        nome_arquivo,
        status,
        linhas_processadas,
        total_linhas,
        criado_em
      FROM importacoes
      WHERE status IN ('processando', 'pausado')
      ORDER BY criado_em DESC
    `)
    
    if (emAndamento.rows.length === 0) {
      console.log('   ✅ Nenhuma importação em andamento')
    } else {
      emAndamento.rows.forEach(imp => {
        const porcentagem = imp.total_linhas > 0 
          ? Math.round((imp.linhas_processadas / imp.total_linhas) * 100)
          : 0
        console.log(`   ⚠️  ${imp.nome_arquivo} - ${imp.status} (${porcentagem}%)`)
        console.log(`      ID: ${imp.id}`)
        console.log(`      Progresso: ${imp.linhas_processadas}/${imp.total_linhas}`)
      })
    }

    console.log(`\n========================================`)
    console.log(`DIAGNÓSTICO:`)
    console.log(`========================================\n`)
    
    if (totalGeral === 0) {
      console.log('❌ PROBLEMA: Nenhum aluno no banco de dados!')
      console.log('\nPossíveis causas:')
      console.log('1. A importação falhou')
      console.log('2. A importação ainda está em andamento')
      console.log('3. Erro na conexão com o banco')
      
      if (emAndamento.rows.length > 0) {
        console.log('\n💡 Há importação em andamento. Aguarde a conclusão.')
      } else if (importacoes.rows.length > 0 && importacoes.rows[0].status === 'erro') {
        console.log('\n💡 A última importação teve erro. Verifique os logs.')
      }
    } else if (totalGeral === 2) {
      console.log('❌ PROBLEMA: Apenas 2 alunos no banco!')
      console.log('\nPossíveis causas:')
      console.log('1. A importação foi cancelada ou parou no início')
      console.log('2. O arquivo importado tinha apenas 2 linhas')
      console.log('3. Erro durante a importação')
      
      if (importacoes.rows.length > 0) {
        const ultima = importacoes.rows[0]
        console.log(`\n💡 Última importação:`)
        console.log(`   - Arquivo: ${ultima.nome_arquivo}`)
        console.log(`   - Status: ${ultima.status}`)
        console.log(`   - Linhas processadas: ${ultima.linhas_processadas}/${ultima.total_linhas}`)
      }
    } else if (totalGeral < 978) {
      console.log(`⚠️  Há ${totalGeral} alunos, mas esperava-se 978.`)
      console.log(`   Faltam: ${978 - totalGeral} alunos`)
    } else if (totalGeral === 978) {
      console.log('✅ Total correto! 978 alunos no banco.')
    } else {
      console.log(`⚠️  Há ${totalGeral} alunos (${totalGeral - 978} a mais que o esperado)`)
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

verificarStatusAtual()

