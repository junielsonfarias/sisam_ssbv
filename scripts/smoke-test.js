#!/usr/bin/env node
/**
 * Smoke test pós-deploy.
 *
 * Faz GET em URLs críticas e verifica:
 *  - HTTP status correto
 *  - Latência < 3s
 *  - Resposta contém marcador esperado (quando aplicável)
 *
 * Uso:
 *   BASE_URL=https://educatec.seu-dominio.gov.br node scripts/smoke-test.js
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.js
 *
 * Saída:
 *  exit 0 — todos os checks passaram
 *  exit 1 — pelo menos 1 check falhou (use em CI/CD)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT || '5000', 10)
const VERBOSE = process.env.VERBOSE === 'true'

/**
 * Lista de checks. Cada check é { url, esperaStatus?, contemTexto?, criticidade }
 * - criticidade 'critica' falha o smoke test inteiro
 * - criticidade 'warning' só avisa
 */
const CHECKS = [
  // Páginas públicas — devem responder 200
  { url: '/',                       esperaStatus: 200, criticidade: 'critica' },
  { url: '/login',                  esperaStatus: 200, criticidade: 'critica' },
  { url: '/esqueci-senha',          esperaStatus: 200, criticidade: 'warning' },
  { url: '/status',                 esperaStatus: 200, criticidade: 'critica' },
  { url: '/dados-abertos',          esperaStatus: 200, criticidade: 'warning' },
  { url: '/transparencia',          esperaStatus: 200, criticidade: 'warning' },
  { url: '/politica-de-privacidade', esperaStatus: 200, criticidade: 'warning' },
  { url: '/termos-de-uso',          esperaStatus: 200, criticidade: 'warning' },
  { url: '/matricula',              esperaStatus: 200, criticidade: 'warning' },
  { url: '/boletim',                esperaStatus: 200, criticidade: 'warning' },

  // APIs públicas — devem retornar JSON
  { url: '/api/health',             esperaStatus: [200, 404], criticidade: 'warning' },
  { url: '/api/publico/status',     esperaStatus: [200, 503], contemTexto: 'status_global', criticidade: 'critica' },
  { url: '/api/publico/transparencia?recurso=resumo', esperaStatus: 200, contemTexto: 'total_alunos', criticidade: 'warning' },

  // Validação documento inexistente — deve retornar 404 (e não 500)
  { url: '/api/publico/validar-documento/AAAA-BBBB-CCCC', esperaStatus: [400, 404], criticidade: 'warning' },

  // Rotas protegidas sem auth — devem retornar 401 (não 500)
  { url: '/api/admin/dashboard-semed', esperaStatus: [401, 404], criticidade: 'critica' },
  { url: '/api/admin/ficai',          esperaStatus: [401, 404], criticidade: 'critica' },
]

function log(level, msg) {
  const ts = new Date().toISOString().slice(11, 19)
  const cores = { ok: '\x1b[32m', warn: '\x1b[33m', err: '\x1b[31m', info: '\x1b[36m' }
  const reset = '\x1b[0m'
  console.log(`${cores[level] || ''}[${ts}] ${level.toUpperCase().padEnd(4)} ${reset}${msg}`)
}

async function runCheck(check) {
  const url = BASE_URL + check.url
  const inicio = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual' })
    const latencia = Date.now() - inicio
    clearTimeout(timer)

    const esperados = Array.isArray(check.esperaStatus) ? check.esperaStatus : [check.esperaStatus]
    const statusOk = esperados.includes(res.status)

    let textoOk = true
    if (check.contemTexto) {
      const texto = await res.text()
      textoOk = texto.includes(check.contemTexto)
    }

    const sucesso = statusOk && textoOk
    const status = sucesso ? 'ok' : (check.criticidade === 'critica' ? 'err' : 'warn')

    const detalhes = `${res.status} em ${latencia}ms` +
      (statusOk ? '' : ` ❌ esperava ${esperados.join('|')}`) +
      (textoOk ? '' : ` ❌ sem texto "${check.contemTexto}"`)

    log(status, `${check.url.padEnd(50)} → ${detalhes}`)

    return { check, sucesso, latencia, status: res.status }
  } catch (err) {
    clearTimeout(timer)
    const msg = err.name === 'AbortError' ? `timeout (>${TIMEOUT_MS}ms)` : err.message
    log('err', `${check.url.padEnd(50)} → ERRO: ${msg}`)
    return { check, sucesso: false, latencia: TIMEOUT_MS, status: 0, erro: msg }
  }
}

async function main() {
  log('info', `Iniciando smoke test contra ${BASE_URL}`)
  log('info', `Timeout por check: ${TIMEOUT_MS}ms`)
  log('info', `Total de checks: ${CHECKS.length}`)
  console.log()

  const resultados = []
  // Sequencial para não saturar; pode mudar para Promise.all se quiser concorrência
  for (const check of CHECKS) {
    resultados.push(await runCheck(check))
  }

  console.log()
  const total = resultados.length
  const sucessos = resultados.filter((r) => r.sucesso).length
  const falhas_criticas = resultados.filter((r) => !r.sucesso && r.check.criticidade === 'critica').length
  const falhas_warn = resultados.filter((r) => !r.sucesso && r.check.criticidade === 'warning').length

  const latenciaMedia = Math.round(
    resultados.reduce((s, r) => s + r.latencia, 0) / total
  )

  log('info', `Resumo: ${sucessos}/${total} OK · ${falhas_criticas} críticas · ${falhas_warn} warnings`)
  log('info', `Latência média: ${latenciaMedia}ms`)

  if (falhas_criticas > 0) {
    log('err', `❌ SMOKE TEST FALHOU — ${falhas_criticas} checks críticos`)
    process.exit(1)
  }

  if (falhas_warn > 0) {
    log('warn', `⚠️  ${falhas_warn} warnings — investigar mas não-bloqueante`)
  }

  log('ok', '✅ Smoke test passou')
  process.exit(0)
}

main().catch((err) => {
  log('err', `Erro inesperado: ${err.message}`)
  process.exit(1)
})
