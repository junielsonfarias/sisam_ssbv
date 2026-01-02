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

async function limparImportacoesAntigas() {
  try {
    console.log('========================================')
    console.log('LIMPEZA DE IMPORTAÇÕES ANTIGAS')
    console.log('========================================\n')

    // 1. Análise por data de criação
    console.log('📅 Análise de alunos por data de criação:')
    const porData = await pool.query(`
      SELECT 
        DATE(criado_em) as data,
        COUNT(*) as total,
        MIN(criado_em) as primeira_criacao,
        MAX(criado_em) as ultima_criacao
      FROM alunos
      WHERE ano_letivo = '2025'
      GROUP BY DATE(criado_em)
      ORDER BY DATE(criado_em) ASC
    `)
    
    let datasMaisAntigas = []
    let dataMaisRecente = null
    
    porData.rows.forEach((row, idx) => {
      const dataFormatada = new Date(row.data).toLocaleDateString('pt-BR')
      console.log(`   ${idx + 1}. ${dataFormatada}: ${row.total} alunos`)
      
      if (idx === porData.rows.length - 1) {
        dataMaisRecente = row.data
        console.log(`      ✅ Data mais recente - MANTER`)
      } else {
        datasMaisAntigas.push(row.data)
        console.log(`      ❌ Data antiga - REMOVER`)
      }
    })

    if (datasMaisAntigas.length === 0) {
      console.log('\n✅ Todos os alunos foram criados na mesma data. Não há necessidade de limpeza.')
      return
    }

    // 2. Contar alunos a remover
    const aRemover = await pool.query(`
      SELECT COUNT(*) as total
      FROM alunos
      WHERE DATE(criado_em) < $1 AND ano_letivo = '2025'
    `, [dataMaisRecente])

    const aManterQuery = await pool.query(`
      SELECT COUNT(*) as total
      FROM alunos
      WHERE DATE(criado_em) >= $1 AND ano_letivo = '2025'
    `, [dataMaisRecente])

    console.log(`\n📊 RESUMO:`)
    console.log(`   - Total atual: ${parseInt(aRemover.rows[0].total) + parseInt(aManterQuery.rows[0].total)} alunos`)
    console.log(`   - A remover (antigos): ${aRemover.rows[0].total} alunos`)
    console.log(`   - A manter (recentes): ${aManterQuery.rows[0].total} alunos`)

    // Confirmar remoção
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const resposta = await new Promise((resolve) => {
      readline.question('\n❓ Deseja remover os alunos antigos e manter apenas os mais recentes? (sim/não): ', (answer) => {
        readline.close()
        resolve(answer.toLowerCase())
      })
    })

    if (resposta !== 'sim' && resposta !== 's') {
      console.log('\n❌ Operação cancelada pelo usuário.')
      return
    }

    console.log('\n🔄 Removendo alunos antigos...')

    // Buscar IDs dos alunos a remover
    const alunosAntigos = await pool.query(`
      SELECT id FROM alunos
      WHERE DATE(criado_em) < $1 AND ano_letivo = '2025'
    `, [dataMaisRecente])

    let removidosResultadosProvas = 0
    let removidosConsolidados = 0
    let removidosAlunos = 0

    // Remover registros relacionados e alunos
    for (const aluno of alunosAntigos.rows) {
      try {
        // Remover resultados de provas
        const resProvas = await pool.query('DELETE FROM resultados_provas WHERE aluno_id = $1', [aluno.id])
        removidosResultadosProvas += resProvas.rowCount || 0

        // Remover resultados consolidados
        const resConsolidados = await pool.query('DELETE FROM resultados_consolidados WHERE aluno_id = $1', [aluno.id])
        removidosConsolidados += resConsolidados.rowCount || 0

        // Remover aluno
        await pool.query('DELETE FROM alunos WHERE id = $1', [aluno.id])
        removidosAlunos++
      } catch (error) {
        console.error(`❌ Erro ao remover aluno ${aluno.id}: ${error.message}`)
      }
    }

    console.log(`\n✅ Limpeza concluída!`)
    console.log(`   - Alunos removidos: ${removidosAlunos}`)
    console.log(`   - Resultados de provas removidos: ${removidosResultadosProvas}`)
    console.log(`   - Resultados consolidados removidos: ${removidosConsolidados}`)

    // Verificar resultado final
    const totalFinal = await pool.query(`
      SELECT COUNT(*) as total 
      FROM alunos 
      WHERE ano_letivo = '2025'
    `)

    console.log(`\n📊 RESULTADO FINAL:`)
    console.log(`   - Total de alunos (2025): ${totalFinal.rows[0].total}`)
    console.log(`   - Total esperado: 978`)
    
    const diferenca = parseInt(totalFinal.rows[0].total) - 978
    if (diferenca === 0) {
      console.log(`   ✅ Total correto!`)
    } else if (diferenca > 0) {
      console.log(`   ⚠️  ${diferenca} alunos a mais`)
    } else {
      console.log(`   ⚠️  ${Math.abs(diferenca)} alunos a menos`)
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

limparImportacoesAntigas()

