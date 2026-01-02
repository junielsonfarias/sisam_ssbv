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

async function manterApenasUltimaImportacao() {
  try {
    console.log('========================================')
    console.log('MANTER APENAS ÚLTIMA IMPORTAÇÃO')
    console.log('========================================\n')

    // 1. Identificar o horário da última importação
    const ultimaHora = await pool.query(`
      SELECT DATE_TRUNC('hour', MAX(criado_em)) as ultima_hora
      FROM alunos
      WHERE ano_letivo = '2025'
    `)
    
    const horaCorte = ultimaHora.rows[0].ultima_hora
    console.log(`⏰ Horário da última importação: ${new Date(horaCorte).toLocaleString('pt-BR')}`)

    // 2. Contar alunos a manter e remover
    const aManter = await pool.query(`
      SELECT COUNT(*) as total
      FROM alunos
      WHERE DATE_TRUNC('hour', criado_em) >= $1 AND ano_letivo = '2025'
    `, [horaCorte])

    const aRemover = await pool.query(`
      SELECT COUNT(*) as total
      FROM alunos
      WHERE DATE_TRUNC('hour', criado_em) < $1 AND ano_letivo = '2025'
    `, [horaCorte])

    console.log(`\n📊 RESUMO:`)
    console.log(`   - A manter (última importação): ${aManter.rows[0].total} alunos`)
    console.log(`   - A remover (importações antigas): ${aRemover.rows[0].total} alunos`)
    console.log(`   - Total esperado após limpeza: ${aManter.rows[0].total}`)
    console.log(`   - Meta: 978 alunos`)
    
    const diferenca = parseInt(aManter.rows[0].total) - 978
    if (diferenca === 0) {
      console.log(`   ✅ Total correto!`)
    } else if (diferenca > 0) {
      console.log(`   ⚠️  ${diferenca} alunos a mais que o esperado`)
    } else {
      console.log(`   ⚠️  ${Math.abs(diferenca)} alunos a menos que o esperado`)
    }

    console.log(`\n🔄 Removendo ${aRemover.rows[0].total} alunos de importações antigas...`)

    // 3. Buscar IDs dos alunos a remover
    const alunosAntigos = await pool.query(`
      SELECT id FROM alunos
      WHERE DATE_TRUNC('hour', criado_em) < $1 AND ano_letivo = '2025'
    `, [horaCorte])

    let removidosResultadosProvas = 0
    let removidosConsolidados = 0
    let removidosAlunos = 0

    // 4. Remover registros relacionados e alunos
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

    // 5. Verificar resultado final
    const totalFinal = await pool.query(`
      SELECT COUNT(*) as total 
      FROM alunos 
      WHERE ano_letivo = '2025'
    `)

    console.log(`\n📊 RESULTADO FINAL:`)
    console.log(`   - Total de alunos (2025): ${totalFinal.rows[0].total}`)
    console.log(`   - Total esperado: 978`)
    
    const diferencaFinal = parseInt(totalFinal.rows[0].total) - 978
    if (diferencaFinal === 0) {
      console.log(`   ✅ Total correto! 978 alunos únicos`)
    } else if (diferencaFinal > 0) {
      console.log(`   ⚠️  ${diferencaFinal} alunos a mais`)
    } else {
      console.log(`   ⚠️  ${Math.abs(diferencaFinal)} alunos a menos`)
    }

    // 6. Distribuição final
    console.log(`\n📅 Distribuição final:`)
    const porData = await pool.query(`
      SELECT 
        DATE(criado_em) as data,
        COUNT(*) as total
      FROM alunos
      WHERE ano_letivo = '2025'
      GROUP BY DATE(criado_em)
      ORDER BY DATE(criado_em) DESC
    `)
    porData.rows.forEach(row => {
      console.log(`   - ${new Date(row.data).toLocaleDateString('pt-BR')}: ${row.total} alunos`)
    })

    console.log(`\n========================================`)
    console.log(`✅ PROCESSO CONCLUÍDO!`)
    console.log(`========================================`)

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

manterApenasUltimaImportacao()

