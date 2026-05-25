#!/usr/bin/env node
/**
 * Script de restore do banco PostgreSQL — versão Node.js multiplataforma.
 *
 * Pré-requisitos:
 *  - `pg_restore` no PATH
 *  - Variáveis de ambiente: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *
 * Uso:
 *   node scripts/backup/restore.js <arquivo.dump>
 *   node scripts/backup/restore.js ./backups/sisam-2026-05-25-12-00-00.dump
 *
 * ATENÇÃO: o restore DROPA o conteúdo existente do banco antes de aplicar.
 * Use `--no-clean` para preservar (geralmente não é o que você quer).
 */

require('dotenv').config({ path: '.env.local' })

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT || '5432'
const DB_NAME = process.env.DB_NAME
const DB_USER = process.env.DB_USER
const DB_PASSWORD = process.env.DB_PASSWORD

function log(level, message) {
  console.log(`[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}`)
}

function abort(msg, code = 1) {
  log('error', msg)
  process.exit(code)
}

async function confirmar(prompt) {
  if (process.env.RESTORE_NO_CONFIRM === 'true') return true
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ans = await new Promise((resolve) => rl.question(prompt, resolve))
  rl.close()
  return ans.trim().toLowerCase() === 'sim'
}

async function main() {
  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    abort('Variáveis de ambiente faltando: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD')
  }

  const arquivo = process.argv[2]
  if (!arquivo) {
    abort('Uso: node scripts/backup/restore.js <caminho-do-dump>')
  }

  const full = path.resolve(arquivo)
  if (!fs.existsSync(full)) {
    abort(`Arquivo não encontrado: ${full}`)
  }

  const stat = fs.statSync(full)
  const tamanhoMB = (stat.size / 1024 / 1024).toFixed(2)

  log('warn', `=== RESTORE DO BANCO DE DADOS ===`)
  log('warn', `Origem:  ${full} (${tamanhoMB} MB)`)
  log('warn', `Destino: ${DB_HOST}:${DB_PORT}/${DB_NAME} (user: ${DB_USER})`)
  log('warn', `Isso vai SUBSTITUIR os dados atuais do banco.`)

  const ok = await confirmar('Digite "sim" para continuar: ')
  if (!ok) abort('Cancelado pelo usuário', 0)

  const args = [
    '-h', DB_HOST,
    '-p', String(DB_PORT),
    '-U', DB_USER,
    '-d', DB_NAME,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '-j', '2', // 2 jobs paralelos
    full,
  ]

  const env = { ...process.env, PGPASSWORD: DB_PASSWORD }
  if (process.env.DB_SSL === 'true') env.PGSSLMODE = 'require'

  const inicio = Date.now()
  const code = await runCommand('pg_restore', args, env)
  const duracao = ((Date.now() - inicio) / 1000).toFixed(1)

  if (code !== 0) {
    log('warn', `pg_restore retornou código ${code} — pode haver erros não-fatais (esperado se objetos não existiam antes do --if-exists). Verifique a saída acima.`)
  } else {
    log('info', `Restore concluído em ${duracao}s`)
  }
}

function runCommand(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'inherit', 'inherit'] })
    child.on('error', (err) => {
      log('error', `Falha ao executar ${cmd}: ${err.message}`)
      if (err.code === 'ENOENT') {
        log('error', 'pg_restore não encontrado no PATH. Instale PostgreSQL client tools.')
      }
      resolve(1)
    })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

main().catch((err) => {
  abort(`Erro inesperado: ${err.message}`)
})
