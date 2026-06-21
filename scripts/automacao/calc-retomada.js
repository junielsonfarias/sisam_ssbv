#!/usr/bin/env node
/**
 * calc-retomada.js — calcula quanto tempo esperar para retomar a automação
 * APÓS o reset de créditos, com buffer (padrão 2 min) depois do horário de reset.
 *
 * Uso:
 *   node calc-retomada.js "<reset>" [bufferMin]
 *   ex.: node calc-retomada.js "1:10am" 2
 *        node calc-retomada.js "01:10"
 *        node calc-retomada.js "2026-06-21T01:10:00-03:00"
 *
 * Saída (JSON):
 *   { agora, retomarEm, realDelay, delayWakeup, needsChaining }
 *   - realDelay     : segundos até (reset + buffer) — use para `sleep` em background (sem teto)
 *   - delayWakeup   : mesmo valor, mas com clamp [60, 3600] para ScheduleWakeup
 *   - needsChaining : true se realDelay > 3600 (ScheduleWakeup sozinho não alcança)
 *
 * Observação de fuso: o reset costuma vir em America/Fortaleza (UTC-3), igual ao
 * horário local do projeto (-03:00, sem DST). O clock é tratado como horário local.
 */

const raw = (process.argv[2] || '').trim()
const bufferMin = parseInt(process.argv[3] || '2', 10)
const now = new Date()

function parseTarget(s) {
  if (/\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d
  }
  const m = s.match(/(\d{1,2})[:h.](\d{2})\s*(am|pm)?/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const ap = (m[3] || '').toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  const t = new Date(now)
  t.setHours(h, min, 0, 0)
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1)
  return t
}

const target = parseTarget(raw)
if (!target) {
  console.log(JSON.stringify({ erro: 'reset nao reconhecido: ' + raw, realDelay: 1800, delayWakeup: 1800, needsChaining: false }))
  process.exit(0)
}

target.setMinutes(target.getMinutes() + bufferMin)

let realDelay = Math.round((target.getTime() - now.getTime()) / 1000)
if (realDelay < 60) realDelay = 60

let delayWakeup = realDelay
let needsChaining = false
if (delayWakeup > 3600) { delayWakeup = 3600; needsChaining = true }

console.log(JSON.stringify({
  agora: now.toISOString(),
  retomarEm: target.toISOString(),
  realDelay,
  delayWakeup,
  needsChaining,
}))
