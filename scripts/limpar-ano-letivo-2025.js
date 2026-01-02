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

async function limparAnoLetivo2025() {
  try {
    console.log('========================================')
    console.log('LIMPEZA COMPLETA - ANO LETIVO 2025')
    console.log('========================================\n')

    // 1. Contar registros a remover
    console.log('📊 Contando registros do ano letivo 2025...\n')
    
    const alunos = await pool.query(`SELECT COUNT(*) FROM alunos WHERE ano_letivo = '2025'`)
    const consolidados = await pool.query(`SELECT COUNT(*) FROM resultados_consolidados WHERE ano_letivo = '2025'`)
    const provas = await pool.query(`SELECT COUNT(*) FROM resultados_provas WHERE ano_letivo = '2025'`)
    const turmas = await pool.query(`SELECT COUNT(*) FROM turmas WHERE ano_letivo = '2025'`)

    console.log(`   - Alunos: ${alunos.rows[0].count}`)
    console.log(`   - Resultados consolidados: ${consolidados.rows[0].count}`)
    console.log(`   - Resultados de provas: ${provas.rows[0].count}`)
    console.log(`   - Turmas: ${turmas.rows[0].count}`)

    const total = parseInt(alunos.rows[0].count) + 
                  parseInt(consolidados.rows[0].count) + 
                  parseInt(provas.rows[0].count) + 
                  parseInt(turmas.rows[0].count)

    console.log(`\n   📈 Total de registros a remover: ${total.toLocaleString('pt-BR')}`)

    if (total === 0) {
      console.log('\n✅ Não há dados do ano letivo 2025 para remover.')
      return
    }

    console.log(`\n⚠️  ATENÇÃO: Esta operação irá remover TODOS os dados do ano letivo 2025!`)
    console.log(`   Isso inclui alunos, turmas, resultados de provas e resultados consolidados.`)
    console.log(`   Esta operação NÃO pode ser desfeita!`)

    console.log(`\n🔄 Iniciando limpeza...`)

    // 2. Remover na ordem correta (evitar erros de foreign key)
    console.log(`\n   1/4 Removendo resultados de provas...`)
    const delProvas = await pool.query(`DELETE FROM resultados_provas WHERE ano_letivo = '2025'`)
    console.log(`       ✅ ${delProvas.rowCount} registros removidos`)

    console.log(`   2/4 Removendo resultados consolidados...`)
    const delConsolidados = await pool.query(`DELETE FROM resultados_consolidados WHERE ano_letivo = '2025'`)
    console.log(`       ✅ ${delConsolidados.rowCount} registros removidos`)

    console.log(`   3/4 Removendo alunos...`)
    const delAlunos = await pool.query(`DELETE FROM alunos WHERE ano_letivo = '2025'`)
    console.log(`       ✅ ${delAlunos.rowCount} registros removidos`)

    console.log(`   4/4 Removendo turmas...`)
    const delTurmas = await pool.query(`DELETE FROM turmas WHERE ano_letivo = '2025'`)
    console.log(`       ✅ ${delTurmas.rowCount} registros removidos`)

    console.log(`\n✅ Limpeza concluída!`)
    console.log(`   Total removido: ${(delProvas.rowCount + delConsolidados.rowCount + delAlunos.rowCount + delTurmas.rowCount).toLocaleString('pt-BR')} registros`)

    // 3. Verificar resultado
    console.log(`\n📊 Verificando resultado final...`)
    const alunosRestantes = await pool.query(`SELECT COUNT(*) FROM alunos WHERE ano_letivo = '2025'`)
    const turmasRestantes = await pool.query(`SELECT COUNT(*) FROM turmas WHERE ano_letivo = '2025'`)

    if (parseInt(alunosRestantes.rows[0].count) === 0 && parseInt(turmasRestantes.rows[0].count) === 0) {
      console.log(`   ✅ Todos os dados do ano letivo 2025 foram removidos com sucesso!`)
    } else {
      console.log(`   ⚠️  Ainda existem alguns registros:`)
      console.log(`      - Alunos: ${alunosRestantes.rows[0].count}`)
      console.log(`      - Turmas: ${turmasRestantes.rows[0].count}`)
    }

    console.log(`\n========================================`)
    console.log(`PRÓXIMOS PASSOS:`)
    console.log(`========================================`)
    console.log(`\n1. Acesse a página de Importação Completa`)
    console.log(`2. Selecione o arquivo Excel com os 978 alunos`)
    console.log(`3. Defina o ano letivo como 2025`)
    console.log(`4. Clique em "Importar Tudo"`)
    console.log(`5. Aguarde a conclusão (deve ser rápido agora!)`)
    console.log(`\n✅ Banco de dados limpo e pronto para nova importação!`)

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

limparAnoLetivo2025()

