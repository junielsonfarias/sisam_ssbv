const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
})

async function corrigirPresenca() {
  try {
    console.log('=== CORREÇÃO DE PRESENÇA - ANOS INICIAIS ===\n')

    // 1. Diagnóstico inicial
    console.log('1. Diagnóstico atual:')
    const diagnostico = await pool.query(`
      SELECT
        serie,
        presenca,
        COUNT(*) as total
      FROM resultados_consolidados
      WHERE serie LIKE '%2%' OR serie LIKE '%3%' OR serie LIKE '%5%'
      GROUP BY serie, presenca
      ORDER BY serie, presenca
    `)
    console.table(diagnostico.rows)

    // 2. Verificar se há dados de provas (resultados_provas) para esses alunos
    console.log('\n2. Verificando dados em resultados_provas para anos iniciais:')
    const dadosProvas = await pool.query(`
      SELECT
        rp.serie,
        rp.presenca,
        COUNT(DISTINCT rp.aluno_id) as alunos,
        COUNT(*) as registros
      FROM resultados_provas rp
      WHERE rp.serie LIKE '%2%' OR rp.serie LIKE '%3%' OR rp.serie LIKE '%5%'
      GROUP BY rp.serie, rp.presenca
      ORDER BY rp.serie, rp.presenca
    `)
    console.table(dadosProvas.rows)

    // 3. Perguntar se deseja corrigir
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const resposta = await new Promise(resolve => {
      rl.question('\nDeseja corrigir a presença dos anos iniciais? (s/n): ', resolve)
    })
    rl.close()

    if (resposta.toLowerCase() !== 's') {
      console.log('Operação cancelada.')
      await pool.end()
      return
    }

    // 4. Atualizar presença em resultados_consolidados
    // Considera presente quem tem presença '-' mas está na lista
    console.log('\n3. Corrigindo presença em resultados_consolidados...')

    const updateConsolidados = await pool.query(`
      UPDATE resultados_consolidados
      SET presenca = 'P'
      WHERE (serie LIKE '%2%' OR serie LIKE '%3%' OR serie LIKE '%5%')
        AND (presenca = '-' OR presenca IS NULL OR presenca = '')
    `)
    console.log(`   Registros atualizados em resultados_consolidados: ${updateConsolidados.rowCount}`)

    // 5. Atualizar presença em resultados_provas também
    console.log('\n4. Corrigindo presença em resultados_provas...')

    const updateProvas = await pool.query(`
      UPDATE resultados_provas
      SET presenca = 'P'
      WHERE (serie LIKE '%2%' OR serie LIKE '%3%' OR serie LIKE '%5%')
        AND (presenca = '-' OR presenca IS NULL OR presenca = '')
    `)
    console.log(`   Registros atualizados em resultados_provas: ${updateProvas.rowCount}`)

    // 6. Verificar resultado
    console.log('\n5. Verificando resultado:')
    const verificacao = await pool.query(`
      SELECT
        serie,
        presenca,
        COUNT(*) as total
      FROM resultados_consolidados
      WHERE serie LIKE '%2%' OR serie LIKE '%3%' OR serie LIKE '%5%'
      GROUP BY serie, presenca
      ORDER BY serie, presenca
    `)
    console.table(verificacao.rows)

    // 7. Verificar médias
    console.log('\n6. Verificando médias após correção:')
    const medias = await pool.query(`
      SELECT
        cs.tipo_ensino,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno > 0 THEN rc.media_aluno ELSE NULL END), 2) as media,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.media_aluno > 0 THEN 1 END) as total
      FROM resultados_consolidados_unificada rc
      JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') = cs.serie
      WHERE rc.presenca IN ('P', 'p')
      GROUP BY cs.tipo_ensino
    `)
    console.table(medias.rows)

    console.log('\n✅ Correção concluída!')
    console.log('   Atualize o cache do dashboard ou aguarde para ver os novos valores.')

  } catch (error) {
    console.error('Erro:', error.message)
  } finally {
    await pool.end()
  }
}

corrigirPresenca()
