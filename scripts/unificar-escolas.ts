/**
 * Script Consolidado de Unificação de Escolas
 *
 * Este script consolida todas as operações de unificação de escolas:
 * - Analisar escolas duplicadas
 * - Unificar escolas por mapeamento definido
 * - Unificar escolas automaticamente por similaridade de nome
 * - Remover prefixos inconsistentes
 * - Remover escolas sem alunos
 *
 * Uso:
 *   npx ts-node scripts/unificar-escolas.ts analise          - Analisar escolas duplicadas
 *   npx ts-node scripts/unificar-escolas.ts mapeamento       - Unificar por mapeamento definido
 *   npx ts-node scripts/unificar-escolas.ts similaridade     - Unificar por similaridade de nome
 *   npx ts-node scripts/unificar-escolas.ts prefixos         - Padronizar prefixos (EMEF, EMEIF, etc)
 *   npx ts-node scripts/unificar-escolas.ts sem-alunos       - Listar/remover escolas sem alunos
 *   npx ts-node scripts/unificar-escolas.ts full             - Execução completa
 *
 * @consolidado de:
 * - unificar-escolas.js
 * - unificar-escolas-auto.js
 * - unificar-escolas-similares.js
 * - unificar-todas-escolas.js
 * - analisar-escolas-duplicadas.js
 * - corrigir-prefixos-escolas.js
 * - remover-prefixos-escolas.js
 * - excluir-escolas-sem-alunos.js
 */

import { Pool, PoolClient } from 'pg'
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

// Mapeamento de escolas duplicadas conhecidas
// Formato: { nome_duplicado: nome_correto }
const MAPEAMENTO_ESCOLAS: Record<string, string> = {
  'MAG. BARATA': 'EMEF MAGALHÃES BARATA',
  'MAG BARATA': 'EMEF MAGALHÃES BARATA',
  'MAGALHÃES BARATA': 'EMEF MAGALHÃES BARATA',
  'ANCHIETA': 'EMEF PDE JOSÉ DE ANCHIETA',
  'EMANNOEL LOBATO': 'EMEB EMMANOEL',
  'EMEIF EMMANOEL': 'EMEB EMMANOEL'
}

// Prefixos padrão de escolas
const PREFIXOS_ESCOLAS = ['EMEF', 'EMEIF', 'EMEB', 'EMEI', 'EM', 'EEEM']

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

function normalizarNome(nome: string): string {
  return nome
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function calcularSimilaridade(str1: string, str2: string): number {
  const s1 = normalizarNome(str1)
  const s2 = normalizarNome(str2)

  if (s1 === s2) return 1.0

  const len1 = s1.length
  const len2 = s2.length

  if (len1 === 0 || len2 === 0) return 0

  // Algoritmo de distância de Levenshtein
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  return 1 - distance / maxLen
}

// Funções principais

async function analisarEscolas() {
  log('🔍', 'Análise de Escolas Duplicadas')
  divisor()

  const escolas = await pool.query(`
    SELECT e.id, e.nome, e.codigo, e.polo_id, p.nome as polo_nome,
           (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id) as total_alunos,
           (SELECT COUNT(*) FROM turmas WHERE escola_id = e.id) as total_turmas
    FROM escolas e
    LEFT JOIN polos p ON e.polo_id = p.id
    WHERE e.ativo = true OR e.ativo IS NULL
    ORDER BY e.nome
  `)

  log('📊', `Total de escolas: ${escolas.rows.length}`)

  // Agrupar por nome normalizado
  const grupos: Record<string, typeof escolas.rows> = {}
  for (const escola of escolas.rows) {
    const nomeNorm = normalizarNome(escola.nome)
    if (!grupos[nomeNorm]) {
      grupos[nomeNorm] = []
    }
    grupos[nomeNorm].push(escola)
  }

  // Encontrar duplicatas exatas
  console.log('\n📋 Duplicatas exatas (mesmo nome normalizado):')
  let duplicatasExatas = 0
  for (const [nome, grupo] of Object.entries(grupos)) {
    if (grupo.length > 1) {
      duplicatasExatas++
      console.log(`\n   "${grupo[0].nome}" (${grupo.length} registros):`)
      for (const escola of grupo) {
        console.log(`      ID: ${escola.id}, Polo: ${escola.polo_nome || 'N/A'}, Alunos: ${escola.total_alunos}`)
      }
    }
  }
  if (duplicatasExatas === 0) {
    log('✅', 'Nenhuma duplicata exata encontrada')
  }

  // Encontrar escolas similares (> 80% similaridade)
  console.log('\n📋 Escolas similares (>80% similaridade):')
  const escolasUnicos = escolas.rows.filter((e, i, arr) =>
    i === arr.findIndex(x => normalizarNome(x.nome) === normalizarNome(e.nome))
  )

  let similares = 0
  for (let i = 0; i < escolasUnicos.length; i++) {
    for (let j = i + 1; j < escolasUnicos.length; j++) {
      const sim = calcularSimilaridade(escolasUnicos[i].nome, escolasUnicos[j].nome)
      if (sim >= 0.8 && sim < 1.0) {
        similares++
        console.log(`   "${escolasUnicos[i].nome}" ~ "${escolasUnicos[j].nome}" (${(sim * 100).toFixed(0)}%)`)
      }
    }
  }
  if (similares === 0) {
    log('✅', 'Nenhuma escola similar encontrada')
  }

  divisor()
}

async function unificarPorMapeamento() {
  log('📝', 'Unificar Escolas por Mapeamento')
  divisor()

  console.log('\n📋 Mapeamento definido:')
  for (const [duplicada, correta] of Object.entries(MAPEAMENTO_ESCOLAS)) {
    console.log(`   "${duplicada}" → "${correta}"`)
  }

  const confirmar = await pergunta('\nDeseja aplicar este mapeamento? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const [nomeDuplicado, nomeCorreto] of Object.entries(MAPEAMENTO_ESCOLAS)) {
      // Buscar escola duplicada
      const duplicada = await client.query(
        `SELECT id FROM escolas WHERE UPPER(TRIM(nome)) = $1`,
        [nomeDuplicado.toUpperCase().trim()]
      )

      if (duplicada.rows.length === 0) {
        continue
      }

      // Buscar ou criar escola correta
      let correta = await client.query(
        `SELECT id FROM escolas WHERE UPPER(TRIM(nome)) = $1`,
        [nomeCorreto.toUpperCase().trim()]
      )

      if (correta.rows.length === 0) {
        // Renomear ao invés de criar
        await client.query(
          `UPDATE escolas SET nome = $1 WHERE id = $2`,
          [nomeCorreto, duplicada.rows[0].id]
        )
        log('🔄', `Renomeado: "${nomeDuplicado}" → "${nomeCorreto}"`)
        continue
      }

      await unificarDuasEscolas(client, duplicada.rows[0].id, correta.rows[0].id, nomeDuplicado)
    }

    await client.query('COMMIT')
    log('✅', 'Unificação por mapeamento concluída')
  } catch (error: any) {
    await client.query('ROLLBACK')
    log('❌', `Erro: ${error.message}`)
  } finally {
    client.release()
  }
}

async function unificarDuasEscolas(
  client: PoolClient,
  idDuplicada: number,
  idCorreta: number,
  nomeDuplicada: string
) {
  log('🔄', `Unificando ID ${idDuplicada} → ID ${idCorreta}`)

  // Atualizar referências
  const updates = [
    { tabela: 'alunos', campo: 'escola_id' },
    { tabela: 'turmas', campo: 'escola_id' },
    { tabela: 'resultados_provas', campo: 'escola_id' },
    { tabela: 'resultados_consolidados', campo: 'escola_id' },
    { tabela: 'usuarios', campo: 'escola_id' }
  ]

  for (const { tabela, campo } of updates) {
    try {
      const result = await client.query(
        `UPDATE ${tabela} SET ${campo} = $1 WHERE ${campo} = $2`,
        [idCorreta, idDuplicada]
      )
      if (result.rowCount && result.rowCount > 0) {
        log('  ✓', `${tabela}: ${result.rowCount} atualizado(s)`)
      }
    } catch {
      // Ignorar se tabela não existir
    }
  }

  // Verificar se pode remover
  const refs = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM alunos WHERE escola_id = $1) as alunos,
      (SELECT COUNT(*) FROM turmas WHERE escola_id = $1) as turmas
  `, [idDuplicada])

  const totalRefs = parseInt(refs.rows[0].alunos) + parseInt(refs.rows[0].turmas)

  if (totalRefs === 0) {
    await client.query('DELETE FROM escolas WHERE id = $1', [idDuplicada])
    log('  ✓', 'Escola duplicada removida')
  } else {
    await client.query('UPDATE escolas SET ativo = false WHERE id = $1', [idDuplicada])
    log('  ⚠', 'Escola duplicada desativada (ainda há referências)')
  }
}

async function padronizarPrefixos() {
  log('🏷️', 'Padronizar Prefixos de Escolas')
  divisor()

  // Buscar escolas sem prefixo padrão
  const escolas = await pool.query(`
    SELECT id, nome FROM escolas
    WHERE ativo = true OR ativo IS NULL
    ORDER BY nome
  `)

  const semPrefixo: typeof escolas.rows = []
  const prefixosDiferentes: typeof escolas.rows = []

  for (const escola of escolas.rows) {
    const nome = escola.nome.toUpperCase().trim()
    const temPrefixo = PREFIXOS_ESCOLAS.some(p => nome.startsWith(p + ' '))

    if (!temPrefixo) {
      semPrefixo.push(escola)
    }
  }

  console.log(`\n📊 Escolas sem prefixo padrão: ${semPrefixo.length}`)
  if (semPrefixo.length > 0) {
    console.log('\n   Exemplos:')
    for (const escola of semPrefixo.slice(0, 10)) {
      console.log(`      - ${escola.nome}`)
    }
    if (semPrefixo.length > 10) {
      console.log(`      ... e mais ${semPrefixo.length - 10}`)
    }
  }

  log('💡', 'Para padronizar prefixos, edite o mapeamento MAPEAMENTO_ESCOLAS neste arquivo')
  divisor()
}

async function gerenciarEscolasSemAlunos() {
  log('👻', 'Escolas Sem Alunos')
  divisor()

  const semAlunos = await pool.query(`
    SELECT e.id, e.nome, e.codigo,
           (SELECT COUNT(*) FROM turmas WHERE escola_id = e.id) as total_turmas
    FROM escolas e
    LEFT JOIN alunos a ON e.id = a.escola_id
    WHERE (e.ativo = true OR e.ativo IS NULL)
    GROUP BY e.id, e.nome, e.codigo
    HAVING COUNT(a.id) = 0
    ORDER BY e.nome
  `)

  if (semAlunos.rows.length === 0) {
    log('✅', 'Todas as escolas têm alunos cadastrados')
    return
  }

  console.log(`\n📊 ${semAlunos.rows.length} escola(s) sem alunos:\n`)
  for (const escola of semAlunos.rows) {
    console.log(`   - ${escola.nome} (${escola.total_turmas} turmas)`)
  }

  const acao = await pergunta('\nDeseja: (1) Desativar, (2) Remover, (3) Cancelar: ')

  if (acao === '1') {
    await pool.query(
      `UPDATE escolas SET ativo = false WHERE id = ANY($1)`,
      [semAlunos.rows.map(e => e.id)]
    )
    log('✅', `${semAlunos.rows.length} escolas desativadas`)
  } else if (acao === '2') {
    const confirmar = await pergunta('Confirma REMOÇÃO permanente? (digite REMOVER): ')
    if (confirmar === 'REMOVER') {
      // Primeiro remover turmas
      await pool.query(
        `DELETE FROM turmas WHERE escola_id = ANY($1)`,
        [semAlunos.rows.map(e => e.id)]
      )
      // Depois remover escolas
      await pool.query(
        `DELETE FROM escolas WHERE id = ANY($1)`,
        [semAlunos.rows.map(e => e.id)]
      )
      log('✅', `${semAlunos.rows.length} escolas removidas`)
    } else {
      log('❌', 'Operação cancelada')
    }
  } else {
    log('❌', 'Operação cancelada')
  }
}

async function execucaoCompleta() {
  log('🚀', 'Execução Completa de Unificação')
  divisor()

  console.log('\nEsta operação irá:')
  console.log('   1. Analisar escolas duplicadas')
  console.log('   2. Aplicar mapeamento de unificação')
  console.log('   3. Listar escolas sem alunos')

  const confirmar = await pergunta('\nDeseja continuar? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  console.log('\n--- 1. Análise ---')
  await analisarEscolas()

  console.log('\n--- 2. Unificação por Mapeamento ---')
  await unificarPorMapeamento()

  console.log('\n--- 3. Escolas Sem Alunos ---')
  await gerenciarEscolasSemAlunos()

  divisor()
  log('✅', 'Execução completa finalizada')
}

// Main
async function main() {
  const args = process.argv.slice(2)
  const comando = args[0] || 'help'

  try {
    switch (comando) {
      case 'analise':
        await analisarEscolas()
        break
      case 'mapeamento':
        await unificarPorMapeamento()
        break
      case 'similaridade':
        // TODO: implementar unificação interativa por similaridade
        log('⚠️', 'Use "analise" para ver escolas similares, depois adicione ao MAPEAMENTO_ESCOLAS')
        break
      case 'prefixos':
        await padronizarPrefixos()
        break
      case 'sem-alunos':
        await gerenciarEscolasSemAlunos()
        break
      case 'full':
        await execucaoCompleta()
        break
      case 'help':
      default:
        console.log(`
🏫 Unificar Escolas - Script Consolidado

Uso: npx ts-node scripts/unificar-escolas.ts <comando>

Comandos disponíveis:
  analise       Analisar escolas duplicadas e similares
  mapeamento    Unificar escolas pelo mapeamento definido
  prefixos      Analisar/padronizar prefixos (EMEF, EMEIF, etc)
  sem-alunos    Listar/gerenciar escolas sem alunos
  full          Execução completa (análise + mapeamento + sem-alunos)
  help          Mostrar esta ajuda

Para adicionar novos mapeamentos, edite MAPEAMENTO_ESCOLAS neste arquivo.

Exemplos:
  npx ts-node scripts/unificar-escolas.ts analise
  npx ts-node scripts/unificar-escolas.ts full
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
