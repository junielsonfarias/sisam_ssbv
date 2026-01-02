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

async function limparEPreparar() {
  try {
    console.log('========================================')
    console.log('PREPARAÇÃO PARA NOVA IMPORTAÇÃO')
    console.log('========================================\n')

    console.log('🔄 Limpando dados do ano letivo 2025...\n')

    // Limpar na ordem correta
    console.log('   1/5 Removendo resultados de provas...')
    const delProvas = await pool.query(`DELETE FROM resultados_provas WHERE ano_letivo = '2025'`)
    console.log(`       ✅ ${delProvas.rowCount} removidos`)

    console.log('   2/5 Removendo resultados consolidados...')
    const delConsolidados = await pool.query(`DELETE FROM resultados_consolidados WHERE ano_letivo = '2025'`)
    console.log(`       ✅ ${delConsolidados.rowCount} removidos`)

    console.log('   3/5 Removendo alunos...')
    const delAlunos = await pool.query(`DELETE FROM alunos WHERE ano_letivo = '2025'`)
    console.log(`       ✅ ${delAlunos.rowCount} removidos`)

    console.log('   4/5 Removendo turmas...')
    const delTurmas = await pool.query(`DELETE FROM turmas WHERE ano_letivo = '2025'`)
    console.log(`       ✅ ${delTurmas.rowCount} removidos`)

    console.log('   5/5 Removendo escolas...')
    // Remover escolas que não têm mais alunos ou turmas vinculadas
    const delEscolas = await pool.query(`
      DELETE FROM escolas 
      WHERE id NOT IN (
        SELECT DISTINCT escola_id FROM alunos WHERE escola_id IS NOT NULL
        UNION
        SELECT DISTINCT escola_id FROM turmas WHERE escola_id IS NOT NULL
        UNION
        SELECT DISTINCT escola_id FROM resultados_provas WHERE escola_id IS NOT NULL
        UNION
        SELECT DISTINCT escola_id FROM resultados_consolidados WHERE escola_id IS NOT NULL
      )
    `)
    console.log(`       ✅ ${delEscolas.rowCount} removidas`)

    // Cancelar importações em andamento
    console.log(`\n🛑 Cancelando importações em andamento...`)
    const canceladas = await pool.query(`
      UPDATE importacoes 
      SET status = 'cancelado', concluido_em = CURRENT_TIMESTAMP
      WHERE status IN ('processando', 'pausado')
    `)
    console.log(`   ✅ ${canceladas.rowCount} importações canceladas`)

    // Verificar resultado
    const alunosRestantes = await pool.query(`SELECT COUNT(*) FROM alunos WHERE ano_letivo = '2025'`)
    const turmasRestantes = await pool.query(`SELECT COUNT(*) FROM turmas WHERE ano_letivo = '2025'`)
    const escolasRestantes = await pool.query(`
      SELECT COUNT(*) FROM escolas 
      WHERE id NOT IN (
        SELECT DISTINCT escola_id FROM alunos WHERE escola_id IS NOT NULL
        UNION
        SELECT DISTINCT escola_id FROM turmas WHERE escola_id IS NOT NULL
        UNION
        SELECT DISTINCT escola_id FROM resultados_provas WHERE escola_id IS NOT NULL
        UNION
        SELECT DISTINCT escola_id FROM resultados_consolidados WHERE escola_id IS NOT NULL
      )
    `)

    console.log(`\n📊 Verificação:`)
    console.log(`   - Alunos (2025): ${alunosRestantes.rows[0].count}`)
    console.log(`   - Turmas (2025): ${turmasRestantes.rows[0].count}`)
    console.log(`   - Escolas sem vínculos: ${escolasRestantes.rows[0].count}`)

    if (parseInt(alunosRestantes.rows[0].count) === 0 && parseInt(turmasRestantes.rows[0].count) === 0) {
      console.log(`\n✅ Banco limpo e pronto para nova importação!`)
      
      console.log(`\n========================================`)
      console.log(`PRÓXIMOS PASSOS:`)
      console.log(`========================================`)
      console.log(`\n1. Acesse: http://localhost:3000/admin/importar-completo`)
      console.log(`2. Selecione o arquivo Excel com os 978 alunos`)
      console.log(`3. Ano letivo: 2025`)
      console.log(`4. Clique em "Importar Tudo"`)
      console.log(`5. ⚠️  NÃO execute scripts de limpeza durante a importação!`)
      console.log(`6. Aguarde até mostrar "Importação concluída"`)
      console.log(`7. Verifique se há 978 alunos na página de Alunos`)
      
      console.log(`\n💡 DICA: A importação deve levar cerca de 2-5 minutos.`)
      console.log(`         Você pode acompanhar o progresso em tempo real!`)
    } else {
      console.log(`\n⚠️  Ainda há registros no banco. Execute novamente.`)
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

limparEPreparar()

