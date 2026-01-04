/**
 * Script para executar a correção de presença de alunos de 2º, 3º e 5º ano
 * Atualiza presença de 'F' para '-' quando não há dados de frequência
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : false,
})

async function executarCorrecao() {
  const client = await pool.connect()
  
  try {
    console.log('========================================')
    console.log('CORREÇÃO DE PRESENÇA - ANOS INICIAIS')
    console.log('========================================\n')

    // Iniciar transação
    await client.query('BEGIN')

    // 1. Verificar quantos registros serão atualizados
    console.log('🔍 Verificando registros que precisam ser atualizados...')
    const verificarConsolidados = await client.query(`
      SELECT COUNT(*) as total
      FROM resultados_consolidados
      WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
        AND presenca = 'F'
        AND (media_aluno IS NULL OR media_aluno = 0)
        AND (nota_lp IS NULL OR nota_lp = 0)
        AND (nota_ch IS NULL OR nota_ch = 0)
        AND (nota_mat IS NULL OR nota_mat = 0)
        AND (nota_cn IS NULL OR nota_cn = 0)
        AND (nota_producao IS NULL OR nota_producao = 0)
    `)
    
    const qtdParaAtualizar = parseInt(verificarConsolidados.rows[0]?.total || '0', 10)
    console.log(`   Encontrados ${qtdParaAtualizar} registros em resultados_consolidados que precisam ser atualizados\n`)

    if (qtdParaAtualizar === 0) {
      console.log('   ✅ Nenhum registro precisa ser atualizado')
      await client.query('ROLLBACK')
      return
    }

    // 2. Atualizar resultados_consolidados
    console.log('🔄 Atualizando resultados_consolidados...')
    const updateConsolidados = await client.query(`
      UPDATE resultados_consolidados
      SET presenca = '-'
      WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
        AND presenca = 'F'
        AND (media_aluno IS NULL OR media_aluno = 0)
        AND (nota_lp IS NULL OR nota_lp = 0)
        AND (nota_ch IS NULL OR nota_ch = 0)
        AND (nota_mat IS NULL OR nota_mat = 0)
        AND (nota_cn IS NULL OR nota_cn = 0)
        AND (nota_producao IS NULL OR nota_producao = 0)
    `)
    
    console.log(`   ✅ ${updateConsolidados.rowCount} registros atualizados em resultados_consolidados\n`)

    // 3. Atualizar resultados_provas
    console.log('🔄 Atualizando resultados_provas...')
    const updateProvas = await client.query(`
      UPDATE resultados_provas
      SET presenca = '-'
      WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
        AND presenca = 'F'
        AND aluno_id IN (
          SELECT DISTINCT aluno_id
          FROM resultados_consolidados
          WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
            AND presenca = '-'
        )
    `)
    
    console.log(`   ✅ ${updateProvas.rowCount} registros atualizados em resultados_provas\n`)

    // 4. Verificar resultado final
    console.log('📊 Verificando resultado final...')
    const resultadoFinalConsolidados = await client.query(`
      SELECT COUNT(*) as total
      FROM resultados_consolidados
      WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
        AND presenca = '-'
    `)
    
    const resultadoFinalProvas = await client.query(`
      SELECT COUNT(*) as total
      FROM resultados_provas
      WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
        AND presenca = '-'
    `)
    
    console.log(`   Total de registros com presença = '-' após atualização:`)
    console.log(`   - resultados_consolidados: ${resultadoFinalConsolidados.rows[0]?.total || 0}`)
    console.log(`   - resultados_provas: ${resultadoFinalProvas.rows[0]?.total || 0}\n`)

    // Confirmar transação
    await client.query('COMMIT')
    console.log('✅ Correção concluída com sucesso!')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Erro ao executar correção:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

executarCorrecao()
  .then(() => {
    console.log('\n✅ Processo finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })

