/**
 * Script Consolidado de Configuração do Vercel
 *
 * Este script consolida todas as operações relacionadas ao Vercel:
 * - Verificar status do CLI e login
 * - Linkar projeto
 * - Listar variáveis de ambiente
 * - Adicionar/atualizar variáveis de ambiente
 * - Remover variáveis de ambiente
 * - Fazer deploy em produção
 *
 * Uso:
 *   npx ts-node scripts/vercel-setup.ts status     - Verificar status
 *   npx ts-node scripts/vercel-setup.ts link       - Linkar projeto
 *   npx ts-node scripts/vercel-setup.ts env:list   - Listar variáveis
 *   npx ts-node scripts/vercel-setup.ts env:add    - Adicionar variáveis interativamente
 *   npx ts-node scripts/vercel-setup.ts env:sync   - Sincronizar do .env.local
 *   npx ts-node scripts/vercel-setup.ts deploy     - Deploy em produção
 *   npx ts-node scripts/vercel-setup.ts full       - Configuração completa
 *
 * @consolidado de:
 * - atualizar-variaveis-vercel.js
 * - atualizar-vercel-env.js
 * - atualizar-vercel-producao.js
 * - configurar-vercel.js
 * - configurar-vercel-auto.js
 * - configurar-vercel-auto-v2.js
 * - configurar-vercel-completo.js
 * - configurar-vercel-final.js
 * - corrigir-vercel-env.js
 * - verificar-variaveis-vercel.js
 */

import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as readline from 'readline'

// Configurações padrão
const PROJECT_NAME = 'sisam-ssbv'
const VERCEL_DIR = path.join(process.cwd(), '.vercel')
const PROJECT_FILE = path.join(VERCEL_DIR, 'project.json')

// Utilitários
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function pergunta(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve))
}

function executar(comando: string, silent = false): { sucesso: boolean; resultado?: string; erro?: string } {
  try {
    if (!silent) console.log(`\n🔄 ${comando}`)
    const resultado = execSync(comando, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    })
    return { sucesso: true, resultado }
  } catch (error: any) {
    return { sucesso: false, erro: error.message }
  }
}

function log(emoji: string, msg: string) {
  console.log(`${emoji} ${msg}`)
}

function divisor() {
  console.log('='.repeat(60))
}

// Comandos

async function verificarStatus() {
  log('📦', 'Verificando Vercel CLI...')
  const versao = executar('vercel --version', true)
  if (!versao.sucesso) {
    log('❌', 'Vercel CLI não instalado!')
    log('💡', 'Execute: npm install -g vercel')
    return false
  }
  log('✅', `Vercel CLI instalado: ${versao.resultado?.trim()}`)

  log('🔐', 'Verificando login...')
  const whoami = executar('vercel whoami', true)
  if (!whoami.sucesso) {
    log('❌', 'Você não está logado no Vercel')
    log('💡', 'Execute: vercel login')
    return false
  }
  log('✅', `Logado como: ${whoami.resultado?.trim()}`)

  if (fs.existsSync(PROJECT_FILE)) {
    const projectData = JSON.parse(fs.readFileSync(PROJECT_FILE, 'utf-8'))
    log('🔗', `Projeto linkado: ${projectData.projectId}`)
    log('🏢', `Organização: ${projectData.orgId}`)
  } else {
    log('⚠️', 'Projeto não está linkado')
    log('💡', 'Execute: npx ts-node scripts/vercel-setup.ts link')
  }

  return true
}

async function linkarProjeto() {
  log('🔗', 'Linkando projeto ao Vercel...')

  if (fs.existsSync(PROJECT_FILE)) {
    const projectData = JSON.parse(fs.readFileSync(PROJECT_FILE, 'utf-8'))
    log('✅', `Projeto já está linkado: ${projectData.projectId}`)
    const relinkar = await pergunta('Deseja relinkar? (s/N): ')
    if (relinkar.toLowerCase() !== 's') {
      return true
    }
    // Remover link existente
    fs.rmSync(VERCEL_DIR, { recursive: true, force: true })
  }

  console.log('\n📝 Instruções:')
  console.log('   1. "Set up and deploy?" → Digite: N')
  console.log('   2. "Link to existing project?" → Digite: Y')
  console.log(`   3. "What's your project's name?" → Digite: ${PROJECT_NAME}`)
  console.log('\n')

  try {
    execSync('vercel link', { stdio: 'inherit' })
    log('✅', 'Projeto linkado com sucesso!')
    return true
  } catch (error) {
    log('❌', 'Erro ao linkar projeto')
    return false
  }
}

async function listarVariaveis() {
  log('📋', 'Variáveis de ambiente em Production:')
  divisor()
  executar('vercel env ls production')
  divisor()
}

async function adicionarVariaveisInterativo() {
  log('➕', 'Adicionar variáveis de ambiente')
  divisor()

  console.log('\n📋 Variáveis de banco de dados necessárias:')
  console.log('   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL')
  console.log('   JWT_SECRET, NODE_ENV\n')

  const dbHost = await pergunta('DB_HOST: ')
  const dbPort = await pergunta('DB_PORT [5432]: ') || '5432'
  const dbName = await pergunta('DB_NAME [postgres]: ') || 'postgres'
  const dbUser = await pergunta('DB_USER [postgres]: ') || 'postgres'
  const dbPassword = await pergunta('DB_PASSWORD: ')
  const dbSsl = await pergunta('DB_SSL [true]: ') || 'true'

  const gerarJwt = await pergunta('Gerar novo JWT_SECRET? (s/N): ')
  let jwtSecret = ''
  if (gerarJwt.toLowerCase() === 's') {
    jwtSecret = crypto.randomBytes(32).toString('hex')
    log('🔑', `Novo JWT_SECRET gerado: ${jwtSecret.substring(0, 20)}...`)
  } else {
    jwtSecret = await pergunta('JWT_SECRET: ')
  }

  const variaveis: Record<string, string> = {
    DB_HOST: dbHost,
    DB_PORT: dbPort,
    DB_NAME: dbName,
    DB_USER: dbUser,
    DB_PASSWORD: dbPassword,
    DB_SSL: dbSsl,
    JWT_SECRET: jwtSecret,
    NODE_ENV: 'production'
  }

  console.log('\n📝 Variáveis a serem adicionadas:')
  for (const [key, value] of Object.entries(variaveis)) {
    const displayValue = ['DB_PASSWORD', 'JWT_SECRET'].includes(key)
      ? '***'
      : value
    console.log(`   ${key}=${displayValue}`)
  }

  const confirmar = await pergunta('\nConfirmar adição? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  await adicionarVariaveis(variaveis)
}

async function adicionarVariaveis(variaveis: Record<string, string>) {
  let sucessos = 0
  let erros = 0

  for (const [nome, valor] of Object.entries(variaveis)) {
    log('📝', `Adicionando: ${nome}`)

    // Remover se existir
    executar(`vercel env rm ${nome} production --yes`, true)

    // Criar arquivo temporário com o valor
    const tempFile = path.join(process.cwd(), `temp_${nome}.txt`)
    fs.writeFileSync(tempFile, valor)

    try {
      if (process.platform === 'win32') {
        execSync(`type "${tempFile}" | vercel env add ${nome} production`, {
          stdio: 'pipe',
          shell: 'cmd.exe'
        })
      } else {
        execSync(`cat "${tempFile}" | vercel env add ${nome} production`, {
          stdio: 'pipe',
          shell: '/bin/bash'
        })
      }
      log('✅', `${nome} adicionada`)
      sucessos++
    } catch (error) {
      log('❌', `Erro ao adicionar ${nome}`)
      erros++
    }

    // Limpar arquivo temporário
    try {
      fs.unlinkSync(tempFile)
    } catch {}
  }

  divisor()
  log('📊', `Resumo: ${sucessos}/${Object.keys(variaveis).length} variáveis adicionadas`)
  if (erros > 0) {
    log('⚠️', `${erros} erros - configure manualmente no Dashboard do Vercel`)
  }
}

async function sincronizarEnvLocal() {
  log('🔄', 'Sincronizando variáveis do .env.local')

  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    log('❌', 'Arquivo .env.local não encontrado')
    return
  }

  const conteudo = fs.readFileSync(envPath, 'utf-8')
  const linhas = conteudo.split('\n')
  const variaveis: Record<string, string> = {}

  for (const linha of linhas) {
    const match = linha.match(/^([A-Z_]+)=(.*)$/)
    if (match && !linha.startsWith('#')) {
      const [, key, value] = match
      // Remover aspas se existirem
      variaveis[key] = value.replace(/^["']|["']$/g, '')
    }
  }

  console.log(`\n📋 ${Object.keys(variaveis).length} variáveis encontradas:`)
  for (const key of Object.keys(variaveis)) {
    console.log(`   - ${key}`)
  }

  const confirmar = await pergunta('\nSincronizar para production? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Operação cancelada')
    return
  }

  await adicionarVariaveis(variaveis)
}

async function deploy() {
  log('🚀', 'Iniciando deploy em produção...')
  divisor()

  const confirmar = await pergunta('Confirmar deploy em produção? (s/N): ')
  if (confirmar.toLowerCase() !== 's') {
    log('❌', 'Deploy cancelado')
    return
  }

  log('⏳', 'Deploy em andamento... (pode levar alguns minutos)')
  const resultado = executar('vercel --prod --yes')

  if (resultado.sucesso) {
    log('🎉', 'Deploy concluído com sucesso!')
  } else {
    log('❌', 'Erro no deploy')
    log('💡', 'Execute manualmente: vercel --prod --yes')
  }
}

async function configuracaoCompleta() {
  log('🚀', 'Configuração Completa do Vercel')
  divisor()

  // 1. Verificar status
  const statusOk = await verificarStatus()
  if (!statusOk) {
    const continuar = await pergunta('\nDeseja fazer login agora? (s/N): ')
    if (continuar.toLowerCase() === 's') {
      executar('vercel login')
    } else {
      return
    }
  }

  // 2. Linkar projeto se necessário
  if (!fs.existsSync(PROJECT_FILE)) {
    const linkar = await pergunta('\nDeseja linkar o projeto? (S/n): ')
    if (linkar.toLowerCase() !== 'n') {
      await linkarProjeto()
    }
  }

  // 3. Listar variáveis atuais
  console.log('\n')
  await listarVariaveis()

  // 4. Atualizar variáveis
  const atualizar = await pergunta('\nDeseja atualizar as variáveis de ambiente? (S/n): ')
  if (atualizar.toLowerCase() !== 'n') {
    const usarEnvLocal = await pergunta('Usar valores do .env.local? (S/n): ')
    if (usarEnvLocal.toLowerCase() !== 'n') {
      await sincronizarEnvLocal()
    } else {
      await adicionarVariaveisInterativo()
    }
  }

  // 5. Deploy
  const fazerDeploy = await pergunta('\nDeseja fazer deploy em produção? (S/n): ')
  if (fazerDeploy.toLowerCase() !== 'n') {
    await deploy()
  }

  divisor()
  log('✅', 'Configuração concluída!')
  console.log('\n📝 Próximos passos:')
  console.log('   1. Verifique: https://sisam-ssbv.vercel.app/api/health')
  console.log('   2. Teste o login no sistema')
  console.log('')
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
      case 'link':
        await linkarProjeto()
        break
      case 'env:list':
        await listarVariaveis()
        break
      case 'env:add':
        await adicionarVariaveisInterativo()
        break
      case 'env:sync':
        await sincronizarEnvLocal()
        break
      case 'deploy':
        await deploy()
        break
      case 'full':
        await configuracaoCompleta()
        break
      case 'help':
      default:
        console.log(`
🚀 Vercel Setup - Script Consolidado

Uso: npx ts-node scripts/vercel-setup.ts <comando>

Comandos disponíveis:
  status     Verificar status do CLI, login e projeto
  link       Linkar projeto ao Vercel
  env:list   Listar variáveis de ambiente
  env:add    Adicionar variáveis interativamente
  env:sync   Sincronizar variáveis do .env.local
  deploy     Fazer deploy em produção
  full       Configuração completa (guiada)
  help       Mostrar esta ajuda

Exemplos:
  npx ts-node scripts/vercel-setup.ts status
  npx ts-node scripts/vercel-setup.ts full
`)
    }
  } finally {
    rl.close()
  }
}

main().catch((error) => {
  console.error('\n❌ Erro:', error.message)
  rl.close()
  process.exit(1)
})
