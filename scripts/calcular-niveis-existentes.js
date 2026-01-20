/**
 * Script para calcular os níveis por disciplina dos alunos já existentes
 *
 * Este script atualiza os campos nivel_lp, nivel_mat, nivel_prod e nivel_aluno
 * baseado nos dados já existentes na tabela resultados_consolidados.
 *
 * Execute: node scripts/calcular-niveis-existentes.js
 */

const { Pool } = require('pg')

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sisam'
})

/**
 * Calcula o nível baseado em acertos
 *
 * Regras:
 * - 2º e 3º Anos (14 questões LP, 14 questões MAT):
 *   N1: 1-3, N2: 4-7, N3: 8-11, N4: 12-14
 *
 * - 5º Ano LP (14 questões): mesma regra
 * - 5º Ano MAT (20 questões):
 *   N1: 1-5, N2: 6-10, N3: 11-15, N4: 16-20
 */
function calcularNivelPorAcertos(acertos, serie, disciplina) {
  if (acertos === null || acertos === undefined || acertos <= 0) {
    return null
  }

  // Extrair número da série
  const match = serie ? serie.match(/(\d+)/) : null
  const numeroSerie = match ? match[1] : null
  if (!numeroSerie) return null

  // Regras para 2º e 3º Anos (LP e MAT: 14 questões cada)
  if (numeroSerie === '2' || numeroSerie === '3') {
    if (acertos >= 1 && acertos <= 3) return 'N1'
    if (acertos >= 4 && acertos <= 7) return 'N2'
    if (acertos >= 8 && acertos <= 11) return 'N3'
    if (acertos >= 12) return 'N4'
  }

  // Regras para 5º Ano
  if (numeroSerie === '5') {
    // LP: 14 questões (mesma regra do 2º/3º)
    if (disciplina === 'LP') {
      if (acertos >= 1 && acertos <= 3) return 'N1'
      if (acertos >= 4 && acertos <= 7) return 'N2'
      if (acertos >= 8 && acertos <= 11) return 'N3'
      if (acertos >= 12) return 'N4'
    }
    // MAT: 20 questões
    if (disciplina === 'MAT') {
      if (acertos >= 1 && acertos <= 5) return 'N1'
      if (acertos >= 6 && acertos <= 10) return 'N2'
      if (acertos >= 11 && acertos <= 15) return 'N3'
      if (acertos >= 16) return 'N4'
    }
  }

  return null
}

/**
 * Converte nível de aprendizagem para N1-N4
 */
function converterNivelProducao(nivelAtual) {
  if (!nivelAtual) return null

  const nivelNormalizado = nivelAtual.toUpperCase().trim()

  const mapeamento = {
    'INSUFICIENTE': 'N1',
    'BÁSICO': 'N2',
    'BASICO': 'N2',
    'ADEQUADO': 'N3',
    'AVANÇADO': 'N4',
    'AVANCADO': 'N4',
    'N1': 'N1',
    'N2': 'N2',
    'N3': 'N3',
    'N4': 'N4',
  }

  return mapeamento[nivelNormalizado] || null
}

/**
 * Converte nível para valor numérico
 */
function nivelParaValor(nivel) {
  if (!nivel) return null
  const mapeamento = { 'N1': 1, 'N2': 2, 'N3': 3, 'N4': 4 }
  return mapeamento[nivel.toUpperCase().trim()] || null
}

/**
 * Converte valor numérico para nível
 */
function valorParaNivel(valor) {
  if (valor === null || valor === undefined) return null
  const valorArredondado = Math.round(valor)
  const valorLimitado = Math.max(1, Math.min(4, valorArredondado))
  const mapeamento = { 1: 'N1', 2: 'N2', 3: 'N3', 4: 'N4' }
  return mapeamento[valorLimitado] || null
}

/**
 * Calcula nível geral do aluno (média dos 3 níveis)
 */
function calcularNivelAluno(nivelLp, nivelMat, nivelProd) {
  const valorLp = nivelParaValor(nivelLp)
  const valorMat = nivelParaValor(nivelMat)
  const valorProd = nivelParaValor(nivelProd)

  const valoresValidos = [valorLp, valorMat, valorProd].filter(v => v !== null)

  if (valoresValidos.length === 0) return null

  const soma = valoresValidos.reduce((acc, v) => acc + v, 0)
  const media = soma / valoresValidos.length

  return valorParaNivel(media)
}

/**
 * Verifica se é série de Anos Iniciais
 */
function isAnosIniciais(serie) {
  if (!serie) return false
  const match = serie.match(/(\d+)/)
  const numero = match ? match[1] : null
  return numero === '2' || numero === '3' || numero === '5'
}

async function calcularNiveis() {
  console.log('='.repeat(60))
  console.log('CÁLCULO DE NÍVEIS PARA ALUNOS EXISTENTES')
  console.log('='.repeat(60))

  const client = await pool.connect()

  try {
    // Buscar todos os alunos de Anos Iniciais (2º, 3º e 5º anos)
    console.log('\n🔍 Buscando alunos de Anos Iniciais...')

    const result = await client.query(`
      SELECT
        id,
        aluno_id,
        serie,
        presenca,
        total_acertos_lp,
        total_acertos_mat,
        nivel_aprendizagem
      FROM resultados_consolidados
      WHERE REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    `)

    console.log(`📊 Encontrados ${result.rows.length} registros de Anos Iniciais`)

    let atualizados = 0
    let erros = 0
    let pulados = 0

    // Estatísticas por nível
    const estatisticas = {
      nivel_lp: { N1: 0, N2: 0, N3: 0, N4: 0, null: 0 },
      nivel_mat: { N1: 0, N2: 0, N3: 0, N4: 0, null: 0 },
      nivel_prod: { N1: 0, N2: 0, N3: 0, N4: 0, null: 0 },
      nivel_aluno: { N1: 0, N2: 0, N3: 0, N4: 0, null: 0 },
    }

    console.log('\n🔄 Calculando níveis...\n')

    for (const row of result.rows) {
      // Pular alunos faltantes
      if (row.presenca && row.presenca.toUpperCase() !== 'P') {
        pulados++
        continue
      }

      try {
        // Calcular níveis
        const nivelLp = calcularNivelPorAcertos(row.total_acertos_lp, row.serie, 'LP')
        const nivelMat = calcularNivelPorAcertos(row.total_acertos_mat, row.serie, 'MAT')
        const nivelProd = converterNivelProducao(row.nivel_aprendizagem)
        const nivelAluno = calcularNivelAluno(nivelLp, nivelMat, nivelProd)

        // Atualizar no banco
        await client.query(`
          UPDATE resultados_consolidados
          SET
            nivel_lp = $1,
            nivel_mat = $2,
            nivel_prod = $3,
            nivel_aluno = $4,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [nivelLp, nivelMat, nivelProd, nivelAluno, row.id])

        atualizados++

        // Atualizar estatísticas
        estatisticas.nivel_lp[nivelLp || 'null']++
        estatisticas.nivel_mat[nivelMat || 'null']++
        estatisticas.nivel_prod[nivelProd || 'null']++
        estatisticas.nivel_aluno[nivelAluno || 'null']++

        // Log de progresso a cada 100 registros
        if (atualizados % 100 === 0) {
          process.stdout.write(`  Processados: ${atualizados}...\r`)
        }
      } catch (error) {
        erros++
        console.error(`  ❌ Erro no registro ${row.id}: ${error.message}`)
      }
    }

    console.log(`\n\n✅ Processamento concluído!`)
    console.log(`  - Atualizados: ${atualizados}`)
    console.log(`  - Pulados (faltantes): ${pulados}`)
    console.log(`  - Erros: ${erros}`)

    // Exibir estatísticas
    console.log('\n📊 Distribuição por Nível:')
    console.log('\n  Nível LP:')
    console.log(`    N1 (1-3 acertos): ${estatisticas.nivel_lp.N1}`)
    console.log(`    N2 (4-7 acertos): ${estatisticas.nivel_lp.N2}`)
    console.log(`    N3 (8-11 acertos): ${estatisticas.nivel_lp.N3}`)
    console.log(`    N4 (12+ acertos): ${estatisticas.nivel_lp.N4}`)
    console.log(`    Sem dados: ${estatisticas.nivel_lp.null}`)

    console.log('\n  Nível MAT:')
    console.log(`    N1: ${estatisticas.nivel_mat.N1}`)
    console.log(`    N2: ${estatisticas.nivel_mat.N2}`)
    console.log(`    N3: ${estatisticas.nivel_mat.N3}`)
    console.log(`    N4: ${estatisticas.nivel_mat.N4}`)
    console.log(`    Sem dados: ${estatisticas.nivel_mat.null}`)

    console.log('\n  Nível PROD (Produção Textual):')
    console.log(`    N1 (Insuficiente): ${estatisticas.nivel_prod.N1}`)
    console.log(`    N2 (Básico): ${estatisticas.nivel_prod.N2}`)
    console.log(`    N3 (Adequado): ${estatisticas.nivel_prod.N3}`)
    console.log(`    N4 (Avançado): ${estatisticas.nivel_prod.N4}`)
    console.log(`    Sem dados: ${estatisticas.nivel_prod.null}`)

    console.log('\n  Nível Geral do Aluno:')
    console.log(`    N1: ${estatisticas.nivel_aluno.N1}`)
    console.log(`    N2: ${estatisticas.nivel_aluno.N2}`)
    console.log(`    N3: ${estatisticas.nivel_aluno.N3}`)
    console.log(`    N4: ${estatisticas.nivel_aluno.N4}`)
    console.log(`    Sem dados: ${estatisticas.nivel_aluno.null}`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ CÁLCULO DE NÍVEIS CONCLUÍDO!')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

calcularNiveis().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
