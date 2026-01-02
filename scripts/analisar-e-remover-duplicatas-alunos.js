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

async function analisarERmoverDuplicatas() {
  try {
    console.log('========================================')
    console.log('ANÁLISE E REMOÇÃO DE DUPLICATAS DE ALUNOS')
    console.log('========================================\n')

    // 1. Contar total de alunos
    const totalAlunos = await pool.query('SELECT COUNT(*) as total FROM alunos')
    console.log(`📊 Total de alunos no banco: ${totalAlunos.rows[0].total}`)

    // 2. Identificar duplicatas (mesmo nome, escola e ano letivo)
    const duplicatasQuery = `
      SELECT 
        UPPER(TRIM(nome)) as nome_normalizado,
        escola_id,
        ano_letivo,
        COUNT(*) as quantidade,
        STRING_AGG(id::text, ', ' ORDER BY criado_em DESC) as ids,
        STRING_AGG(codigo, ', ' ORDER BY criado_em DESC) as codigos
      FROM alunos
      GROUP BY UPPER(TRIM(nome)), escola_id, ano_letivo
      HAVING COUNT(*) > 1
      ORDER BY quantidade DESC
    `
    
    const duplicatas = await pool.query(duplicatasQuery)
    
    if (duplicatas.rows.length === 0) {
      console.log('\n✅ Nenhuma duplicata encontrada!')
      console.log(`Total de alunos únicos: ${totalAlunos.rows[0].total}`)
      return
    }

    console.log(`\n⚠️  Encontradas ${duplicatas.rows.length} grupos de alunos duplicados`)
    
    let totalDuplicados = 0
    duplicatas.rows.forEach((dup, index) => {
      if (index < 10) { // Mostrar apenas os 10 primeiros
        console.log(`\n${index + 1}. Nome: ${dup.nome_normalizado}`)
        console.log(`   Quantidade: ${dup.quantidade} registros`)
        console.log(`   IDs: ${dup.ids}`)
        console.log(`   Códigos: ${dup.codigos}`)
      }
      totalDuplicados += parseInt(dup.quantidade) - 1 // -1 porque vamos manter 1
    })
    
    if (duplicatas.rows.length > 10) {
      console.log(`\n... e mais ${duplicatas.rows.length - 10} grupos duplicados`)
    }

    console.log(`\n📈 Total de registros duplicados a remover: ${totalDuplicados}`)
    console.log(`📉 Alunos únicos após limpeza: ${totalAlunos.rows[0].total - totalDuplicados}`)

    // Confirmar remoção
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const resposta = await new Promise((resolve) => {
      readline.question('\n❓ Deseja remover os duplicados? (sim/não): ', (answer) => {
        readline.close()
        resolve(answer.toLowerCase())
      })
    })

    if (resposta !== 'sim' && resposta !== 's') {
      console.log('\n❌ Operação cancelada pelo usuário.')
      return
    }

    console.log('\n🔄 Removendo duplicados...')

    let removidos = 0
    let erros = 0

    // Processar cada grupo de duplicatas
    for (const dup of duplicatas.rows) {
      try {
        const idsArray = dup.ids.split(', ')
        const idParaManter = idsArray[0] // Manter o mais recente (primeiro na ordem DESC)
        const idsParaRemover = idsArray.slice(1) // Remover os outros

        for (const idRemover of idsParaRemover) {
          // Remover registros relacionados primeiro
          await pool.query('DELETE FROM resultados_provas WHERE aluno_id = $1', [idRemover])
          await pool.query('DELETE FROM resultados_consolidados WHERE aluno_id = $1', [idRemover])
          
          // Remover o aluno
          await pool.query('DELETE FROM alunos WHERE id = $1', [idRemover])
          
          removidos++
        }
      } catch (error) {
        console.error(`❌ Erro ao remover duplicata: ${error.message}`)
        erros++
      }
    }

    console.log(`\n✅ Remoção concluída!`)
    console.log(`   - Removidos: ${removidos} registros duplicados`)
    if (erros > 0) {
      console.log(`   - Erros: ${erros}`)
    }

    // Verificar resultado final
    const totalFinal = await pool.query('SELECT COUNT(*) as total FROM alunos')
    const totalEsperado = 978

    console.log(`\n📊 RESULTADO FINAL:`)
    console.log(`   - Total de alunos: ${totalFinal.rows[0].total}`)
    console.log(`   - Total esperado: ${totalEsperado}`)
    
    if (parseInt(totalFinal.rows[0].total) === totalEsperado) {
      console.log(`   ✅ Total correto! ${totalEsperado} alunos únicos`)
    } else {
      const diferenca = parseInt(totalFinal.rows[0].total) - totalEsperado
      if (diferenca > 0) {
        console.log(`   ⚠️  ${diferenca} alunos a mais que o esperado`)
      } else {
        console.log(`   ⚠️  ${Math.abs(diferenca)} alunos a menos que o esperado`)
      }
    }

    // Verificar distribuição por ano letivo
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

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

analisarERmoverDuplicatas()

