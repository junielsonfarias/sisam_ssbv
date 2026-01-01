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

async function atualizarPresencaPorMedia() {
  try {
    console.log('========================================')
    console.log('ATUALIZAÇÃO DE PRESENÇA POR MÉDIA')
    console.log('========================================\n')

    // 1. Buscar alunos com média 0,00 ou null que estão marcados como presentes
    console.log('🔍 Buscando alunos com média 0,00 ou null...')
    const alunosComMediaZero = await pool.query(`
      SELECT 
        id,
        aluno_id,
        media_aluno,
        presenca,
        (SELECT nome FROM alunos WHERE id = resultados_consolidados.aluno_id) as aluno_nome
      FROM resultados_consolidados
      WHERE (media_aluno = 0 OR media_aluno IS NULL)
        AND (presenca = 'P' OR presenca IS NULL OR presenca = '')
        AND ano_letivo = '2025'
    `)

    console.log(`   Encontrados ${alunosComMediaZero.rows.length} alunos com média 0,00 ou null marcados como presentes`)

    if (alunosComMediaZero.rows.length === 0) {
      console.log('   ✅ Nenhum aluno precisa ser atualizado')
      return
    }

    // 2. Atualizar presença para 'F' (Faltante)
    console.log('\n🔄 Atualizando presença para "F" (Faltante)...')
    const resultado = await pool.query(`
      UPDATE resultados_consolidados
      SET presenca = 'F'
      WHERE (media_aluno = 0 OR media_aluno IS NULL)
        AND (presenca = 'P' OR presenca IS NULL OR presenca = '')
        AND ano_letivo = '2025'
    `)

    console.log(`   ✅ ${resultado.rowCount} alunos atualizados para "Faltante"`)

    // 3. Atualizar também resultados_provas
    console.log('\n🔄 Atualizando resultados_provas...')
    const resultadoProvas = await pool.query(`
      UPDATE resultados_provas rp
      SET presenca = 'F'
      FROM resultados_consolidados rc
      WHERE rp.aluno_id = rc.aluno_id
        AND rp.ano_letivo = rc.ano_letivo
        AND (rc.media_aluno = 0 OR rc.media_aluno IS NULL)
        AND rc.presenca = 'F'
        AND (rp.presenca = 'P' OR rp.presenca IS NULL OR rp.presenca = '')
        AND rp.ano_letivo = '2025'
    `)

    console.log(`   ✅ ${resultadoProvas.rowCount} registros de resultados_provas atualizados`)

    // 4. Verificar resultado final
    console.log('\n📊 Verificação final:')
    const verificacao = await pool.query(`
      SELECT 
        presenca,
        COUNT(*) as total
      FROM resultados_consolidados
      WHERE ano_letivo = '2025'
      GROUP BY presenca
      ORDER BY presenca
    `)

    verificacao.rows.forEach(row => {
      console.log(`   ${row.presenca || 'NULL'}: ${row.total} alunos`)
    })

    console.log('\n========================================')
    console.log('✅ Atualização concluída!')
    console.log('========================================')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

atualizarPresencaPorMedia()

