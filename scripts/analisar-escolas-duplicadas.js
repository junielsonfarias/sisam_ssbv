/**
 * Script para analisar escolas duplicadas com nomes similares
 * Identifica escolas que são a mesma mas foram cadastradas com variações no nome
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : false,
})

/**
 * Normaliza um nome de escola removendo diferenças comuns
 */
function normalizarNome(nome) {
  if (!nome) return ''
  
  return nome
    .toUpperCase()
    .trim()
    // Remover pontos
    .replace(/\./g, '')
    // Remover múltiplos espaços
    .replace(/\s+/g, ' ')
    // Normalizar acentos comuns
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remover caracteres especiais exceto letras, números e espaços
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
}

/**
 * Calcula similaridade entre duas strings (Levenshtein simplificado)
 */
function similaridade(str1, str2) {
  const s1 = normalizarNome(str1)
  const s2 = normalizarNome(str2)
  
  if (s1 === s2) return 1.0
  if (s1.length === 0 || s2.length === 0) return 0.0
  
  // Verificar se uma contém a outra
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length)
    const maxLen = Math.max(s1.length, s2.length)
    return minLen / maxLen
  }
  
  // Calcular distância de Levenshtein
  const len1 = s1.length
  const len2 = s2.length
  const matrix = []
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  const distance = matrix[len2][len1]
  const maxLen = Math.max(len1, len2)
  return 1 - (distance / maxLen)
}

async function analisarEscolasDuplicadas() {
  const client = await pool.connect()
  
  try {
    console.log('========================================')
    console.log('ANÁLISE DE ESCOLAS DUPLICADAS')
    console.log('========================================\n')

    // Buscar todas as escolas
    const escolasResult = await client.query(`
      SELECT id, nome, codigo, polo_id, criado_em
      FROM escolas
      ORDER BY nome
    `)

    const escolas = escolasResult.rows
    console.log(`📊 Total de escolas encontradas: ${escolas.length}\n`)

    // Agrupar escolas por nome normalizado
    const escolasPorNomeNormalizado = new Map()
    
    for (const escola of escolas) {
      const nomeNormalizado = normalizarNome(escola.nome)
      
      if (!escolasPorNomeNormalizado.has(nomeNormalizado)) {
        escolasPorNomeNormalizado.set(nomeNormalizado, [])
      }
      
      escolasPorNomeNormalizado.get(nomeNormalizado).push(escola)
    }

    // Encontrar grupos com mais de uma escola
    const gruposDuplicados = []
    
    for (const [nomeNormalizado, grupo] of escolasPorNomeNormalizado.entries()) {
      if (grupo.length > 1) {
        gruposDuplicados.push({
          nomeNormalizado,
          escolas: grupo,
          tamanho: grupo.length
        })
      }
    }

    console.log(`🔍 Grupos de escolas duplicadas encontrados: ${gruposDuplicados.length}\n`)

    if (gruposDuplicados.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada por nome normalizado.')
      console.log('   Verificando por similaridade...\n')
      
      // Verificar similaridade entre todas as escolas
      const similares = []
      
      for (let i = 0; i < escolas.length; i++) {
        for (let j = i + 1; j < escolas.length; j++) {
          const sim = similaridade(escolas[i].nome, escolas[j].nome)
          
          if (sim > 0.85) { // 85% de similaridade
            similares.push({
              escola1: escolas[i],
              escola2: escolas[j],
              similaridade: sim
            })
          }
        }
      }
      
      if (similares.length > 0) {
        console.log(`📋 Escolas similares encontradas (similaridade > 85%):\n`)
        similares.forEach((par, index) => {
          console.log(`${index + 1}. Similaridade: ${(par.similaridade * 100).toFixed(1)}%`)
          console.log(`   ID: ${par.escola1.id} | Nome: "${par.escola1.nome}" | Código: ${par.escola1.codigo}`)
          console.log(`   ID: ${par.escola2.id} | Nome: "${par.escola2.nome}" | Código: ${par.escola2.codigo}`)
          console.log('')
        })
      } else {
        console.log('✅ Nenhuma escola similar encontrada.')
      }
      
      return
    }

    // Exibir grupos duplicados
    console.log('📋 GRUPOS DE ESCOLAS DUPLICADAS:\n')
    
    for (const grupo of gruposDuplicados.sort((a, b) => b.tamanho - a.tamanho)) {
      console.log(`\n🔸 Nome Normalizado: "${grupo.nomeNormalizado}"`)
      console.log(`   Total de escolas no grupo: ${grupo.tamanho}`)
      console.log('')
      
      // Ordenar por data de criação (mais antiga primeiro - será mantida)
      const escolasOrdenadas = grupo.escolas.sort((a, b) => 
        new Date(a.criado_em) - new Date(b.criado_em)
      )
      
      // Verificar quantos alunos, turmas e resultados cada escola tem
      for (const escola of escolasOrdenadas) {
        const alunosResult = await client.query(
          'SELECT COUNT(*) as total FROM alunos WHERE escola_id = $1',
          [escola.id]
        )
        
        const turmasResult = await client.query(
          'SELECT COUNT(*) as total FROM turmas WHERE escola_id = $1',
          [escola.id]
        )
        
        const resultadosResult = await client.query(
          'SELECT COUNT(*) as total FROM resultados_consolidados WHERE escola_id = $1',
          [escola.id]
        )
        
        const totalAlunos = parseInt(alunosResult.rows[0]?.total || '0', 10)
        const totalTurmas = parseInt(turmasResult.rows[0]?.total || '0', 10)
        const totalResultados = parseInt(resultadosResult.rows[0]?.total || '0', 10)
        
        const isPrincipal = escola === escolasOrdenadas[0]
        const marcador = isPrincipal ? '✅ (PRINCIPAL - será mantida)' : '❌ (será unificada)'
        
        console.log(`   ${marcador}`)
        console.log(`   ID: ${escola.id}`)
        console.log(`   Nome: "${escola.nome}"`)
        console.log(`   Código: ${escola.codigo}`)
        console.log(`   Criado em: ${escola.criado_em}`)
        console.log(`   Alunos: ${totalAlunos} | Turmas: ${totalTurmas} | Resultados: ${totalResultados}`)
        console.log('')
      }
    }

    console.log('\n========================================')
    console.log('RESUMO')
    console.log('========================================')
    console.log(`Total de grupos duplicados: ${gruposDuplicados.length}`)
    console.log(`Total de escolas a serem unificadas: ${gruposDuplicados.reduce((acc, g) => acc + g.tamanho - 1, 0)}`)
    console.log('\n💡 A escola mais antiga de cada grupo será mantida.')
    console.log('   As outras serão unificadas (dados migrados e escola removida).\n')

  } catch (error) {
    console.error('❌ Erro ao analisar escolas:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

analisarEscolasDuplicadas()
  .then(() => {
    console.log('✅ Análise concluída')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })

