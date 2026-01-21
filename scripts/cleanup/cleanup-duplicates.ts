/**
 * Script Consolidado para Remoção de Duplicatas
 *
 * Analisa e remove registros duplicados em diferentes tabelas:
 * - Alunos duplicados
 * - Escolas duplicadas
 * - Turmas duplicadas
 * - Resultados duplicados
 *
 * Uso:
 *   npx ts-node scripts/cleanup/cleanup-duplicates.ts analise          - Analisar duplicatas
 *   npx ts-node scripts/cleanup/cleanup-duplicates.ts alunos           - Remover alunos duplicados
 *   npx ts-node scripts/cleanup/cleanup-duplicates.ts escolas          - Remover escolas duplicadas
 *   npx ts-node scripts/cleanup/cleanup-duplicates.ts turmas           - Remover turmas duplicadas
 *   npx ts-node scripts/cleanup/cleanup-duplicates.ts resultados       - Remover resultados duplicados
 *   npx ts-node scripts/cleanup/cleanup-duplicates.ts todos            - Remover todas as duplicatas
 *
 * @consolidado de:
 * - analisar-e-remover-duplicatas-alunos.js
 * - analisar-escolas-duplicadas.js
 * - analise-tabelas-duplicadas.js
 * - excluir-aluno-duplicado.js
 * - verificar-alunos-duplicados-excel.js
 */

import { Pool } from 'pg'
import * as readline from 'readline'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
})

// Utilitários
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function pergunta(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve))
}

function log(emoji: string, msg: string) {
  console.log(`${emoji} ${msg}`)
}

function divisor() {
  console.log('='.repeat(60))
}

// Funções de análise e limpeza

async function analisarDuplicatas() {
  log('🔍', 'Análise de Duplicatas')
  divisor()

  // Alunos duplicados por código
  console.log('\n📋 Alunos duplicados (por código):')
  const alunosDup = await pool.query(`
    SELECT codigo, COUNT(*) as total
    FROM alunos
    WHERE codigo IS NOT NULL AND codigo != ''
    GROUP BY codigo
    HAVING COUNT(*) > 1
    ORDER BY total DESC
    LIMIT 20
  `)
  if (alunosDup.rows.length === 0) {
    log('✅', 'Nenhum aluno duplicado encontrado')
  } else {
    log('⚠️', `${alunosDup.rows.length} códigos com alunos duplicados`)
    for (const row of alunosDup.rows.slice(0, 5)) {
      console.log(`   - Código ${row.codigo}: ${row.total} registros`)
    }
    if (alunosDup.rows.length > 5) {
      console.log(`   ... e mais ${alunosDup.rows.length - 5} códigos`)
    }
  }

  // Escolas duplicadas por nome
  console.log('\n📋 Escolas duplicadas (por nome):')
  const escolasDup = await pool.query(`
    SELECT nome, COUNT(*) as total
    FROM escolas
    WHERE nome IS NOT NULL AND nome != ''
    GROUP BY nome
    HAVING COUNT(*) > 1
    ORDER BY total DESC
  `)
  if (escolasDup.rows.length === 0) {
    log('✅', 'Nenhuma escola duplicada encontrada')
  } else {
    log('⚠️', `${escolasDup.rows.length} nomes com escolas duplicadas`)
    for (const row of escolasDup.rows.slice(0, 5)) {
      console.log(`   - "${row.nome}": ${row.total} registros`)
    }
  }

  // Turmas duplicadas
  console.log('\n📋 Turmas duplicadas (por código + escola):')
  const turmasDup = await pool.query(`
    SELECT codigo, escola_id, COUNT(*) as total
    FROM turmas
    WHERE codigo IS NOT NULL AND codigo != ''
    GROUP BY codigo, escola_id
    HAVING COUNT(*) > 1
    ORDER BY total DESC
    LIMIT 10
  `)
  if (turmasDup.rows.length === 0) {
    log('✅', 'Nenhuma turma duplicada encontrada')
  } else {
    log('⚠️', `${turmasDup.rows.length} combinações com turmas duplicadas`)
    for (const row of turmasDup.rows.slice(0, 5)) {
      console.log(`   - Código ${row.codigo} (escola ${row.escola_id}): ${row.total} registros`)
    }
  }

  // Resultados duplicados
  console.log('\n📋 Resultados duplicados (por aluno + ano):')
  const resultadosDup = await pool.query(`
    SELECT aluno_id, ano_letivo, COUNT(*) as total
    FROM resultados_consolidados
    GROUP BY aluno_id, ano_letivo
    HAVING COUNT(*) > 1
    ORDER BY total DESC
    LIMIT 10
  `)
  if (resultadosDup.rows.length === 0) {
    log('✅', 'Nenhum resultado duplicado encontrado')
  } else {
    log('⚠️', `${resultadosDup.rows.length} combinações com resultados duplicados`)
  }

  divisor()
}

async function removerAlunosDuplicados() {
  log('👥', 'Remover Alunos Duplicados')
  divisor()

  // Encontrar duplicados
  const duplicados = await pool.query(`
    SELECT codigo, COUNT(*) as total
    FROM alunos
    WHERE codigo IS NOT NULL AND codigo != ''
    GROUP BY codigo
    HAVING COUNT(*) > 1
  `)

  if (duplicados.rows.length === 0) {
    log('✅', 'Nenhum aluno duplicado encontrado')
    return
  }

  log('📊', `${duplicados.rows.length} códigos com duplicatas`)

  const confirmar = await pergunta('\nDeseja remover duplicatas (mantendo o mais recente)? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  // Remover duplicados mantendo o mais recente (maior ID)
  const result = await pool.query(`
    DELETE FROM alunos a
    USING alunos b
    WHERE a.codigo = b.codigo
      AND a.codigo IS NOT NULL
      AND a.codigo != ''
      AND a.id < b.id
  `)

  log('✅', `${result.rowCount} alunos duplicados removidos`)
}

async function removerEscolasDuplicadas() {
  log('🏫', 'Remover Escolas Duplicadas')
  divisor()

  // Encontrar duplicados
  const duplicados = await pool.query(`
    SELECT nome, COUNT(*) as total, array_agg(id) as ids
    FROM escolas
    WHERE nome IS NOT NULL AND nome != ''
    GROUP BY nome
    HAVING COUNT(*) > 1
  `)

  if (duplicados.rows.length === 0) {
    log('✅', 'Nenhuma escola duplicada encontrada')
    return
  }

  log('📊', `${duplicados.rows.length} nomes com duplicatas`)

  for (const row of duplicados.rows) {
    console.log(`\n   "${row.nome}" tem ${row.total} registros (IDs: ${row.ids.join(', ')})`)
  }

  const confirmar = await pergunta('\nDeseja unificar (manter a mais antiga e atualizar referências)? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  let unificados = 0
  for (const row of duplicados.rows) {
    const ids = row.ids.sort((a: number, b: number) => a - b)
    const idManter = ids[0]
    const idsRemover = ids.slice(1)

    // Atualizar referências
    await pool.query(
      `UPDATE turmas SET escola_id = $1 WHERE escola_id = ANY($2)`,
      [idManter, idsRemover]
    )
    await pool.query(
      `UPDATE alunos SET escola_id = $1 WHERE escola_id = ANY($2)`,
      [idManter, idsRemover]
    )
    await pool.query(
      `UPDATE resultados_consolidados SET escola_id = $1 WHERE escola_id = ANY($2)`,
      [idManter, idsRemover]
    )

    // Remover duplicados
    await pool.query(`DELETE FROM escolas WHERE id = ANY($1)`, [idsRemover])
    unificados += idsRemover.length
  }

  log('✅', `${unificados} escolas duplicadas unificadas`)
}

async function removerTurmasDuplicadas() {
  log('📚', 'Remover Turmas Duplicadas')
  divisor()

  // Encontrar duplicados
  const duplicados = await pool.query(`
    SELECT codigo, escola_id, COUNT(*) as total, array_agg(id) as ids
    FROM turmas
    WHERE codigo IS NOT NULL AND codigo != ''
    GROUP BY codigo, escola_id
    HAVING COUNT(*) > 1
  `)

  if (duplicados.rows.length === 0) {
    log('✅', 'Nenhuma turma duplicada encontrada')
    return
  }

  log('📊', `${duplicados.rows.length} combinações com duplicatas`)

  const confirmar = await pergunta('\nDeseja unificar turmas duplicadas? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  let unificados = 0
  for (const row of duplicados.rows) {
    const ids = row.ids.sort((a: number, b: number) => a - b)
    const idManter = ids[0]
    const idsRemover = ids.slice(1)

    // Atualizar referências
    await pool.query(
      `UPDATE alunos SET turma_id = $1 WHERE turma_id = ANY($2)`,
      [idManter, idsRemover]
    )
    await pool.query(
      `UPDATE resultados_consolidados SET turma_id = $1 WHERE turma_id = ANY($2)`,
      [idManter, idsRemover]
    )

    // Remover duplicados
    await pool.query(`DELETE FROM turmas WHERE id = ANY($1)`, [idsRemover])
    unificados += idsRemover.length
  }

  log('✅', `${unificados} turmas duplicadas unificadas`)
}

async function removerResultadosDuplicados() {
  log('📊', 'Remover Resultados Duplicados')
  divisor()

  // Encontrar duplicados
  const duplicados = await pool.query(`
    SELECT aluno_id, ano_letivo, COUNT(*) as total
    FROM resultados_consolidados
    GROUP BY aluno_id, ano_letivo
    HAVING COUNT(*) > 1
  `)

  if (duplicados.rows.length === 0) {
    log('✅', 'Nenhum resultado duplicado encontrado')
    return
  }

  log('📊', `${duplicados.rows.length} combinações com duplicatas`)

  const confirmar = await pergunta('\nDeseja remover duplicatas (mantendo o mais recente)? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  // Remover duplicados mantendo o mais recente
  const result = await pool.query(`
    DELETE FROM resultados_consolidados a
    USING resultados_consolidados b
    WHERE a.aluno_id = b.aluno_id
      AND a.ano_letivo = b.ano_letivo
      AND a.id < b.id
  `)

  log('✅', `${result.rowCount} resultados duplicados removidos`)
}

async function removerTodasDuplicatas() {
  log('🧹', 'Remover Todas as Duplicatas')
  divisor()

  console.log('\nEsta operação irá:')
  console.log('   1. Remover alunos duplicados (mantendo mais recente)')
  console.log('   2. Unificar escolas duplicadas')
  console.log('   3. Unificar turmas duplicadas')
  console.log('   4. Remover resultados duplicados\n')

  const confirmar = await pergunta('Deseja continuar? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  console.log('\n--- Alunos ---')
  await removerAlunosDuplicados()

  console.log('\n--- Escolas ---')
  await removerEscolasDuplicadas()

  console.log('\n--- Turmas ---')
  await removerTurmasDuplicadas()

  console.log('\n--- Resultados ---')
  await removerResultadosDuplicados()

  divisor()
  log('✅', 'Limpeza de duplicatas concluída')
}

// Main
async function main() {
  const args = process.argv.slice(2)
  const comando = args[0] || 'help'

  try {
    switch (comando) {
      case 'analise':
        await analisarDuplicatas()
        break
      case 'alunos':
        await removerAlunosDuplicados()
        break
      case 'escolas':
        await removerEscolasDuplicadas()
        break
      case 'turmas':
        await removerTurmasDuplicadas()
        break
      case 'resultados':
        await removerResultadosDuplicados()
        break
      case 'todos':
        await removerTodasDuplicatas()
        break
      case 'help':
      default:
        console.log(`
🔍 Cleanup Duplicates - Remoção de Duplicatas

Uso: npx ts-node scripts/cleanup/cleanup-duplicates.ts <comando>

Comandos disponíveis:
  analise       Analisar duplicatas em todas as tabelas
  alunos        Remover alunos duplicados
  escolas       Unificar escolas duplicadas
  turmas        Unificar turmas duplicadas
  resultados    Remover resultados duplicados
  todos         Executar todas as limpezas
  help          Mostrar esta ajuda

Exemplos:
  npx ts-node scripts/cleanup/cleanup-duplicates.ts analise
  npx ts-node scripts/cleanup/cleanup-duplicates.ts todos
`)
    }
  } catch (error: any) {
    log('❌', `Erro: ${error.message}`)
  } finally {
    await pool.end()
    rl.close()
  }
}

main()
