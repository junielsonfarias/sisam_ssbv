/**
 * Script Consolidado de Limpeza do Banco de Dados
 *
 * Consolida operações de limpeza de dados:
 * - Limpar dados de importação (para nova importação)
 * - Limpar dados de um ano letivo específico
 * - Limpar cache do sistema
 * - Limpar tudo (reset completo)
 * - Verificar status das tabelas
 *
 * Uso:
 *   npx ts-node scripts/cleanup/cleanup-db.ts status            - Ver contagem de registros
 *   npx ts-node scripts/cleanup/cleanup-db.ts importacao        - Limpar dados de importação
 *   npx ts-node scripts/cleanup/cleanup-db.ts ano <ano>         - Limpar dados de um ano específico
 *   npx ts-node scripts/cleanup/cleanup-db.ts cache             - Limpar caches do Next.js
 *   npx ts-node scripts/cleanup/cleanup-db.ts importacoes       - Limpar histórico de importações
 *   npx ts-node scripts/cleanup/cleanup-db.ts tudo              - Reset completo (CUIDADO!)
 *
 * @consolidado de:
 * - limpar-tudo.js
 * - limpar-dados-importacao.js
 * - limpar-ano-letivo-2025.js
 * - limpar-cache.js
 * - limpar-cache-nextjs.js
 * - limpar-caches-expirados.js
 * - limpar-e-preparar-nova-importacao.js
 * - limpar-importacoes-antigas.js
 * - verificar-limpeza-banco.js
 */

import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
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

// Tabelas do sistema (ordem de exclusão respeitando FKs)
const TABELAS_DADOS = [
  'resultados_provas',
  'resultados_consolidados',
  'alunos',
  'turmas',
  'questoes',
  'escolas',
  'polos'
]

const TABELAS_SISTEMA = ['importacoes', 'logs_acesso']

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

// Funções de limpeza

async function verificarStatus() {
  log('📊', 'Status do Banco de Dados')
  divisor()

  console.log('\n📋 Contagem de registros:\n')

  const todasTabelas = [...TABELAS_DADOS, ...TABELAS_SISTEMA]

  for (const tabela of todasTabelas) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as total FROM ${tabela}`)
      const total = parseInt(result.rows[0].total)
      const status = total === 0 ? '⬜' : '🟦'
      console.log(`   ${status} ${tabela.padEnd(25)} ${total.toLocaleString('pt-BR').padStart(10)} registros`)
    } catch (error: any) {
      console.log(`   ❌ ${tabela.padEnd(25)} Erro: ${error.message}`)
    }
  }

  // Estatísticas adicionais
  console.log('\n📈 Estatísticas adicionais:\n')
  try {
    const anos = await pool.query(
      `SELECT DISTINCT ano_letivo, COUNT(*) as total
       FROM resultados_consolidados
       GROUP BY ano_letivo
       ORDER BY ano_letivo DESC`
    )
    if (anos.rows.length > 0) {
      console.log('   Anos letivos com dados:')
      for (const row of anos.rows) {
        console.log(`      - ${row.ano_letivo}: ${parseInt(row.total).toLocaleString('pt-BR')} resultados`)
      }
    }
  } catch {
    // Ignorar erros
  }

  divisor()
}

async function limparDadosImportacao() {
  log('🗑️', 'Limpar Dados de Importação')
  divisor()

  log('⚠️', 'Esta operação irá remover TODOS os dados de alunos, turmas, escolas, etc.')
  log('⚠️', 'Usuários e configurações serão MANTIDOS.')

  const confirmar = await pergunta('\n❓ Deseja continuar? (digite CONFIRMAR para prosseguir): ')
  if (confirmar !== 'CONFIRMAR') {
    log('❌', 'Operação cancelada')
    return
  }

  console.log('\n🔄 Iniciando limpeza...\n')

  let totalRemovido = 0

  for (const tabela of TABELAS_DADOS) {
    try {
      const result = await pool.query(`DELETE FROM ${tabela}`)
      const count = result.rowCount || 0
      totalRemovido += count
      log('✅', `${tabela}: ${count} registros removidos`)
    } catch (error: any) {
      log('❌', `${tabela}: ${error.message}`)
    }
  }

  divisor()
  log('📊', `Total de registros removidos: ${totalRemovido.toLocaleString('pt-BR')}`)
  log('✅', 'Banco pronto para nova importação')
}

async function limparAnoLetivo(ano: string) {
  log('📅', `Limpar Dados do Ano Letivo ${ano}`)
  divisor()

  // Verificar se há dados para este ano
  const check = await pool.query(
    `SELECT COUNT(*) as total FROM resultados_consolidados WHERE ano_letivo = $1`,
    [parseInt(ano)]
  )
  const total = parseInt(check.rows[0].total)

  if (total === 0) {
    log('ℹ️', `Nenhum dado encontrado para o ano ${ano}`)
    return
  }

  log('📊', `Encontrados ${total.toLocaleString('pt-BR')} registros para o ano ${ano}`)

  const confirmar = await pergunta('\n❓ Deseja remover? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  console.log('\n🔄 Removendo dados...\n')

  // Remover resultados_provas do ano
  try {
    const provas = await pool.query(
      `DELETE FROM resultados_provas WHERE ano_letivo = $1`,
      [parseInt(ano)]
    )
    log('✅', `resultados_provas: ${provas.rowCount} removidos`)
  } catch (error: any) {
    log('⚠️', `resultados_provas: ${error.message}`)
  }

  // Remover resultados_consolidados do ano
  try {
    const consolidados = await pool.query(
      `DELETE FROM resultados_consolidados WHERE ano_letivo = $1`,
      [parseInt(ano)]
    )
    log('✅', `resultados_consolidados: ${consolidados.rowCount} removidos`)
  } catch (error: any) {
    log('⚠️', `resultados_consolidados: ${error.message}`)
  }

  divisor()
  log('✅', `Dados do ano ${ano} removidos com sucesso`)
}

async function limparCache() {
  log('🧹', 'Limpar Cache do Next.js')
  divisor()

  const diretorios = [
    { path: '.next', nome: 'Build cache' },
    { path: 'node_modules/.cache', nome: 'Node modules cache' }
  ]

  for (const dir of diretorios) {
    const caminho = path.join(process.cwd(), dir.path)
    if (fs.existsSync(caminho)) {
      try {
        fs.rmSync(caminho, { recursive: true, force: true })
        log('✅', `${dir.nome} removido (${dir.path})`)
      } catch (error: any) {
        log('❌', `Erro ao remover ${dir.path}: ${error.message}`)
      }
    } else {
      log('⏭️', `${dir.nome} não encontrado (${dir.path})`)
    }
  }

  divisor()
  log('💡', 'Execute "npm run build" para recriar o cache')
}

async function limparImportacoes() {
  log('📦', 'Limpar Histórico de Importações')
  divisor()

  // Verificar importações existentes
  const stats = await pool.query(`
    SELECT status, COUNT(*) as total
    FROM importacoes
    GROUP BY status
  `)

  if (stats.rows.length > 0) {
    console.log('\n📊 Importações por status:')
    for (const row of stats.rows) {
      console.log(`   - ${row.status}: ${row.total}`)
    }
  }

  const opcao = await pergunta('\nDeseja remover: (1) Apenas antigas, (2) Todas, (3) Cancelar: ')

  if (opcao === '1') {
    const dias = await pergunta('Remover importações mais antigas que quantos dias? [30]: ') || '30'
    const result = await pool.query(
      `DELETE FROM importacoes WHERE criado_em < NOW() - INTERVAL '${parseInt(dias)} days'`
    )
    log('✅', `${result.rowCount} importações antigas removidas`)
  } else if (opcao === '2') {
    const confirmar = await pergunta('Confirma remoção de TODAS as importações? (s/N): ')
    if (confirmar.toLowerCase() === 's') {
      const result = await pool.query('DELETE FROM importacoes')
      log('✅', `${result.rowCount} importações removidas`)
    } else {
      log('❌', 'Operação cancelada')
    }
  } else {
    log('❌', 'Operação cancelada')
  }
}

async function limparTudo() {
  log('💀', 'RESET COMPLETO DO SISTEMA')
  divisor()

  console.log('\n⚠️  ATENÇÃO: Esta operação irá:')
  console.log('   - Remover TODOS os dados de alunos, turmas, escolas, etc.')
  console.log('   - Remover TODAS as importações')
  console.log('   - Limpar caches do Next.js')
  console.log('\n   Apenas USUÁRIOS e CONFIGURAÇÕES serão mantidos.\n')

  const confirmar1 = await pergunta('❓ Tem certeza? (digite RESET para continuar): ')
  if (confirmar1 !== 'RESET') {
    log('❌', 'Operação cancelada')
    return
  }

  const confirmar2 = await pergunta('❓ Última chance! Confirma reset total? (digite SIM CONFIRMO): ')
  if (confirmar2 !== 'SIM CONFIRMO') {
    log('❌', 'Operação cancelada')
    return
  }

  console.log('\n🔄 Iniciando reset completo...\n')

  // 1. Limpar dados
  let totalRemovido = 0
  const todasTabelas = [...TABELAS_DADOS, 'importacoes']

  for (const tabela of todasTabelas) {
    try {
      const result = await pool.query(`DELETE FROM ${tabela}`)
      const count = result.rowCount || 0
      totalRemovido += count
      log('✅', `${tabela}: ${count} registros removidos`)
    } catch (error: any) {
      log('❌', `${tabela}: ${error.message}`)
    }
  }

  // 2. Limpar cache
  console.log('')
  await limparCache()

  divisor()
  log('📊', `Total de registros removidos: ${totalRemovido.toLocaleString('pt-BR')}`)
  log('✅', 'Reset completo concluído!')
  console.log('\n📝 Próximos passos:')
  console.log('   1. Reinicie o servidor: npm run dev')
  console.log('   2. Limpe o cache do navegador')
  console.log('   3. O sistema está pronto para nova importação\n')
}

// Main
async function main() {
  const args = process.argv.slice(2)
  const comando = args[0] || 'help'

  try {
    switch (comando) {
      case 'status':
        await verificarStatus()
        break
      case 'importacao':
        await limparDadosImportacao()
        break
      case 'ano':
        const ano = args[1]
        if (!ano) {
          log('❌', 'Especifique o ano. Ex: npx ts-node scripts/cleanup/cleanup-db.ts ano 2025')
          break
        }
        await limparAnoLetivo(ano)
        break
      case 'cache':
        await limparCache()
        break
      case 'importacoes':
        await limparImportacoes()
        break
      case 'tudo':
        await limparTudo()
        break
      case 'help':
      default:
        console.log(`
🧹 Cleanup DB - Script Consolidado de Limpeza

Uso: npx ts-node scripts/cleanup/cleanup-db.ts <comando>

Comandos disponíveis:
  status        Ver contagem de registros em cada tabela
  importacao    Limpar dados de importação (para nova importação)
  ano <ano>     Limpar dados de um ano letivo específico
  cache         Limpar caches do Next.js
  importacoes   Limpar histórico de importações
  tudo          Reset completo (CUIDADO!)
  help          Mostrar esta ajuda

Exemplos:
  npx ts-node scripts/cleanup/cleanup-db.ts status
  npx ts-node scripts/cleanup/cleanup-db.ts ano 2024
  npx ts-node scripts/cleanup/cleanup-db.ts cache
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
