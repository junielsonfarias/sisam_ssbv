require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const ALUNO_ID = '6bfbf191-adfc-4fae-a4dc-273bfdc74a89'

async function corrigirTodasTabelas() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    console.log('='.repeat(60))
    console.log('CORREÇÃO COMPLETA DO ALUNO RHUAN')
    console.log('='.repeat(60))

    // 1. Corrigir tabela alunos
    console.log('\n1. CORRIGINDO TABELA ALUNOS:')
    const updateAlunos = await pool.query(`
      UPDATE alunos
      SET serie = '2º Ano'
      WHERE id = $1
      RETURNING id, nome, serie
    `, [ALUNO_ID])

    if (updateAlunos.rowCount > 0) {
      console.log(`   ✓ Série atualizada para "2º Ano"`)
    }

    // 2. Corrigir tabela resultados_consolidados
    console.log('\n2. CORRIGINDO TABELA RESULTADOS_CONSOLIDADOS:')
    const updateConsolidados = await pool.query(`
      UPDATE resultados_consolidados
      SET serie = '2º Ano'
      WHERE aluno_id = $1
      RETURNING id, serie
    `, [ALUNO_ID])

    if (updateConsolidados.rowCount > 0) {
      console.log(`   ✓ Série atualizada para "2º Ano"`)
    }

    // 3. Verificar estado final
    console.log('\n3. VERIFICAÇÃO FINAL:')

    const alunoFinal = await pool.query(`
      SELECT serie FROM alunos WHERE id = $1
    `, [ALUNO_ID])
    console.log(`   Tabela alunos: "${alunoFinal.rows[0]?.serie}"`)

    const consolidadoFinal = await pool.query(`
      SELECT serie FROM resultados_consolidados WHERE aluno_id = $1
    `, [ALUNO_ID])
    console.log(`   Tabela resultados_consolidados: "${consolidadoFinal.rows[0]?.serie}"`)

    const provasFinal = await pool.query(`
      SELECT DISTINCT serie FROM resultados_provas WHERE aluno_id = $1
    `, [ALUNO_ID])
    console.log(`   Tabela resultados_provas: "${provasFinal.rows[0]?.serie}"`)

    // 4. Verificar se todas estão iguais
    const todasIguais =
      alunoFinal.rows[0]?.serie === '2º Ano' &&
      consolidadoFinal.rows[0]?.serie === '2º Ano' &&
      provasFinal.rows[0]?.serie === '2º Ano'

    console.log('\n' + '='.repeat(60))
    if (todasIguais) {
      console.log('✓ TODAS AS TABELAS CORRIGIDAS COM SUCESSO!')
    } else {
      console.log('⚠ AINDA HÁ INCONSISTÊNCIAS!')
    }
    console.log('='.repeat(60))

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Erro:', error)
    await pool.end()
    process.exit(1)
  }
}

corrigirTodasTabelas()
