#!/usr/bin/env node
/**
 * Script de backup do banco PostgreSQL/Supabase — versão Node.js multiplataforma.
 *
 * Substitui (mas não deleta) o `backup-database.sh` legado.
 *
 * Vantagens:
 *  - Funciona em Windows, Linux e macOS
 *  - Lê .env.local automaticamente
 *  - Rotação configurável (default: mantém 30 dias)
 *  - Validação pós-backup (header do dump conferido)
 *  - Saída estruturada para logs
 *
 * Pré-requisitos:
 *  - `pg_dump` no PATH (PostgreSQL client tools)
 *  - Variáveis de ambiente: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *
 * Uso:
 *   node scripts/backup/backup.js
 *   BACKUP_DIR=./meus-backups node scripts/backup/backup.js
 *   BACKUP_RETENTION_DAYS=7 node scripts/backup/backup.js
 *
 * Agendamento:
 *   Linux/macOS — adicionar ao cron:
 *     0 2 * * * cd /caminho/do/projeto && node scripts/backup/backup.js
 *
 *   Windows — agendar via Task Scheduler:
 *     Programa:   node
 *     Argumentos: scripts\backup\backup.js
 *     Iniciar em: C:\caminho\do\projeto
 */

require('dotenv').config({ path: '.env.local' })

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const BACKUP_DIR = process.env.BACKUP_DIR || './backups'
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10)

const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT || '5432'
const DB_NAME = process.env.DB_NAME
const DB_USER = process.env.DB_USER
const DB_PASSWORD = process.env.DB_PASSWORD

function log(level, message, extra) {
  const ts = new Date().toISOString()
  const line = extra
    ? `[${ts}] ${level.toUpperCase().padEnd(5)} ${message} ${JSON.stringify(extra)}`
    : `[${ts}] ${level.toUpperCase().padEnd(5)} ${message}`
  console.log(line)
}

function abort(msg, code = 1) {
  log('error', msg)
  process.exit(code)
}

async function main() {
  // 1. Validar env
  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    abort('Variáveis de ambiente faltando: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD')
  }

  // 2. Garantir diretório
  fs.mkdirSync(BACKUP_DIR, { recursive: true })

  // 3. Nome do arquivo
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fileName = `sisam-${stamp}.dump`
  const fullPath = path.resolve(BACKUP_DIR, fileName)

  log('info', `Iniciando backup`, { db: DB_NAME, host: DB_HOST, port: DB_PORT, dest: fullPath })

  // 4. Executar pg_dump
  const args = [
    '-h', DB_HOST,
    '-p', String(DB_PORT),
    '-U', DB_USER,
    '-d', DB_NAME,
    '-F', 'c',           // formato custom (compactado, suporta restore parcial)
    '-Z', '9',           // compressão máxima
    '--no-owner',        // facilita restore em outro user
    '--no-privileges',   // facilita restore em outro role
    '-f', fullPath,
  ]

  const env = { ...process.env, PGPASSWORD: DB_PASSWORD }
  if (process.env.DB_SSL === 'true') {
    env.PGSSLMODE = 'require'
  }

  const inicio = Date.now()
  const code = await runCommand('pg_dump', args, env)
  const duracao = ((Date.now() - inicio) / 1000).toFixed(1)

  if (code !== 0) {
    abort(`pg_dump retornou código ${code}`)
  }

  // 5. Validar arquivo
  const stat = fs.statSync(fullPath)
  if (stat.size < 1024) {
    abort(`Arquivo de backup muito pequeno (${stat.size} bytes) — provável falha silenciosa`)
  }

  // pg_dump formato custom começa com magic "PGDMP"
  const header = Buffer.alloc(5)
  const fd = fs.openSync(fullPath, 'r')
  fs.readSync(fd, header, 0, 5, 0)
  fs.closeSync(fd)
  if (header.toString('utf8') !== 'PGDMP') {
    abort(`Arquivo gerado não parece ser um dump válido (magic header inválido)`)
  }

  const tamanhoMB = (stat.size / 1024 / 1024).toFixed(2)
  log('info', `Backup concluído`, { duracaoSegundos: duracao, tamanhoMB })

  // 6. Rotação
  rotacionar(BACKUP_DIR, RETENTION_DAYS)
}

function runCommand(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'inherit', 'inherit'] })
    child.on('error', (err) => {
      log('error', `Falha ao executar ${cmd}: ${err.message}`)
      if (err.code === 'ENOENT') {
        log('error', 'pg_dump não encontrado no PATH. Instale PostgreSQL client tools.')
      }
      resolve(1)
    })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

function rotacionar(dir, dias) {
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000
  let removidos = 0
  let preservados = 0
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.startsWith('sisam-') || !entry.endsWith('.dump')) continue
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.mtimeMs < limite) {
      fs.unlinkSync(full)
      removidos++
    } else {
      preservados++
    }
  }
  log('info', `Rotação concluída`, { removidos, preservados, retencaoDias: dias })
}

main().catch((err) => {
  abort(`Erro inesperado: ${err.message}`)
})
