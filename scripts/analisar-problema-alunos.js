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

async function analisarProblema() {
  try {
    console.log('========================================')
    console.log('ANÁLISE COMPLETA DO PROBLEMA')
    console.log('========================================\n')

    // 1. Análise geral
    console.log('📊 VISÃO GERAL:')
    const total = await pool.query('SELECT COUNT(*) FROM alunos WHERE ano_letivo = \'2025\'')
    console.log(`   Total de alunos (2025): ${total.rows[0].count}`)
    console.log(`   Esperado: 978`)
    console.log(`   Diferença: ${parseInt(total.rows[0].count) - 978}\n`)

    // 2. Por data de criação
    console.log('📅 ALUNOS POR DATA DE CRIAÇÃO:')
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
      console.log(`   ${new Date(row.data).toLocaleDateString('pt-BR')}: ${row.total} alunos`)
    })

    // 3. Verificar se há alunos repetidos na importação mais recente
    console.log(`\n🔍 ALUNOS MAIS RECENTES (01/01/2026):`)
    const maisRecentes = await pool.query(`
      SELECT DATE(criado_em) as data, COUNT(*) as total
      FROM alunos
      WHERE DATE(criado_em) = (SELECT MAX(DATE(criado_em)) FROM alunos WHERE ano_letivo = '2025')
        AND ano_letivo = '2025'
      GROUP BY DATE(criado_em)
    `)
    console.log(`   Total: ${maisRecentes.rows[0]?.total || 0} alunos`)
    console.log(`   Diferença do esperado: ${(maisRecentes.rows[0]?.total || 0) - 978}`)

    // 4. Ver se há múltiplos horários na mesma data (indicando múltiplas importações no mesmo dia)
    console.log(`\n⏰ HORÁRIOS DE CRIAÇÃO (01/01/2026):`)
    const porHorario = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', criado_em) as hora,
        COUNT(*) as total
      FROM alunos
      WHERE DATE(criado_em) = (SELECT MAX(DATE(criado_em)) FROM alunos WHERE ano_letivo = '2025')
        AND ano_letivo = '2025'
      GROUP BY DATE_TRUNC('hour', criado_em)
      ORDER BY hora DESC
    `)
    porHorario.rows.forEach(row => {
      console.log(`   ${new Date(row.hora).toLocaleString('pt-BR')}: ${row.total} alunos`)
    })

    // 5. Verificar registros duplicados nos últimos criados
    console.log(`\n🔍 VERIFICANDO DUPLICATAS NOS REGISTROS MAIS RECENTES:`)
    const dupRecentes = await pool.query(`
      SELECT 
        UPPER(TRIM(nome)) as nome,
        escola_id,
        COUNT(*) as quantidade
      FROM alunos
      WHERE DATE(criado_em) = (SELECT MAX(DATE(criado_em)) FROM alunos WHERE ano_letivo = '2025')
        AND ano_letivo = '2025'
      GROUP BY UPPER(TRIM(nome)), escola_id
      HAVING COUNT(*) > 1
      ORDER BY quantidade DESC
      LIMIT 10
    `)
    
    if (dupRecentes.rows.length > 0) {
      console.log(`   ⚠️  Encontradas ${dupRecentes.rows.length} duplicatas nos registros recentes:`)
      dupRecentes.rows.forEach((dup, idx) => {
        console.log(`      ${idx + 1}. ${dup.nome}: ${dup.quantidade} registros`)
      })
    } else {
      console.log(`   ✅ Não há duplicatas nos registros recentes`)
    }

    // 6. Última importação bem sucedida
    console.log(`\n📋 ÚLTIMA IMPORTAÇÃO:`)
    const ultimaImportacao = await pool.query(`
      SELECT 
        nome_arquivo,
        ano_letivo,
        total_linhas,
        linhas_processadas,
        alunos_criados,
        alunos_existentes,
        criado_em
      FROM importacoes
      WHERE status = 'concluido' AND ano_letivo = '2025'
      ORDER BY criado_em DESC
      LIMIT 1
    `)
    if (ultimaImportacao.rows.length > 0) {
      const imp = ultimaImportacao.rows[0]
      console.log(`   Arquivo: ${imp.nome_arquivo}`)
      console.log(`   Linhas processadas: ${imp.linhas_processadas}/${imp.total_linhas}`)
      console.log(`   Alunos criados: ${imp.alunos_criados}`)
      console.log(`   Alunos existentes: ${imp.alunos_existentes}`)
      console.log(`   Data: ${new Date(imp.criado_em).toLocaleString('pt-BR')}`)
      console.log(`\n   📊 Análise:`)
      console.log(`      Total no arquivo: ${imp.total_linhas}`)
      console.log(`      Alunos criados nesta importação: ${imp.alunos_criados}`)
      console.log(`      Alunos que já existiam: ${imp.alunos_existentes}`)
      console.log(`      Total de alunos no banco após importação: ${parseInt(total.rows[0].count)}`)
    }

    console.log(`\n========================================`)
    console.log(`DIAGNÓSTICO:`)
    console.log(`========================================`)
    
    const totalRecente = parseInt(maisRecentes.rows[0]?.total || 0)
    const totalAntigo = parseInt(total.rows[0].count) - totalRecente
    
    console.log(`\n1. Total de alunos: ${total.rows[0].count}`)
    console.log(`   - Antigos (31/12): ${totalAntigo}`)
    console.log(`   - Recentes (01/01): ${totalRecente}`)
    
    if (totalRecente > 978) {
      console.log(`\n2. O problema:`)
      console.log(`   - A importação mais recente criou ${totalRecente} alunos`)
      console.log(`   - Mas o arquivo tem apenas 978 linhas`)
      console.log(`   - Diferença: ${totalRecente - 978} alunos a mais`)
      console.log(`\n3. Possível causa:`)
      console.log(`   - Múltiplas importações no mesmo dia (01/01/2026)`)
      console.log(`   - ${porHorario.rows.length} horários diferentes detectados`)
    }

    console.log(`\n========================================`)
    console.log(`SOLUÇÃO RECOMENDADA:`)
    console.log(`========================================`)
    console.log(`\n1. Remover TODOS os ${total.rows[0].count} alunos atuais`)
    console.log(`2. Fazer uma NOVA importação limpa do arquivo com 978 alunos`)
    console.log(`3. Garantir que não haja importações duplicadas`)
    
    console.log(`\nOU\n`)
    console.log(`1. Manter apenas os ${porHorario.rows[0]?.total || 0} alunos do horário mais recente`)
    console.log(`2. Remover os outros ${totalRecente - (porHorario.rows[0]?.total || 0)} do mesmo dia`)
    console.log(`3. Remover os ${totalAntigo} alunos antigos`)

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

analisarProblema()

