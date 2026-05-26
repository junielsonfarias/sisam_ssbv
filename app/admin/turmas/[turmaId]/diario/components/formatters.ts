export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatarNota(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return n.toFixed(1).replace('.', ',')
}

export function formatarPercentual(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '—'
  return `${n.toFixed(1).replace('.', ',')}%`
}

export function corPercentual(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'text-gray-400'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return 'text-gray-400'
  if (n >= 75) return 'text-emerald-600 dark:text-emerald-400'
  if (n >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function corNota(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'text-gray-400'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return 'text-gray-400'
  if (n >= 7) return 'text-emerald-600 dark:text-emerald-400'
  if (n >= 5) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Abrevia nomes longos para caber em colunas de relatorio sem perder
 * informacao identificadora. Estrategia:
 *   1. Se cabe inteiro em `max`, retorna sem alterar
 *   2. Senao, mantem PRIMEIRO nome + ULTIMO sobrenome completos
 *      e reduz os nomes do meio a iniciais (J. P. Silva)
 *   3. Preposicoes (de, da, do, dos, das, e) sao removidas do meio
 *   4. Se mesmo abreviado nao cabe, encolhe primeiro nome para inicial
 *   5. Se ainda nao cabe, trunca com ellipsis
 *
 * Exemplos com max=22:
 *   "ADRINEY RAMOS FREITAS"           -> "ADRINEY R. FREITAS"
 *   "ANA BEATRIZ PINHEIRO DE SOUZA"   -> "ANA B. P. SOUZA"
 *   "EDUARDA KAROLINE SOUZA DE SOUZA" -> "EDUARDA K. S. SOUZA"
 *   "JAILTON WILLIAN DE SOUZA TEIXEIRA" -> "JAILTON W. S. TEIXEIRA"
 */
const PREPOSICOES = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])

export function abreviarNome(nome: string, max: number = 28): string {
  if (!nome) return ''
  const limpo = nome.trim()
  if (limpo.length <= max) return limpo

  const partes = limpo.split(/\s+/)
  if (partes.length <= 1) return limpo.slice(0, max - 1) + '…'

  const primeiro = partes[0]
  const ultimo = partes[partes.length - 1]
  const meio = partes.slice(1, -1)

  const meioAbrev = meio
    .filter(p => !PREPOSICOES.has(p.toLowerCase()))
    .map(p => p[0].toUpperCase() + '.')
    .join(' ')

  let r = meioAbrev ? `${primeiro} ${meioAbrev} ${ultimo}` : `${primeiro} ${ultimo}`
  if (r.length <= max) return r

  // Ainda muito longo: encurta primeiro nome para inicial
  if (meioAbrev) {
    r = `${primeiro[0]}. ${meioAbrev} ${ultimo}`
  } else {
    r = `${primeiro[0]}. ${ultimo}`
  }
  if (r.length <= max) return r

  return r.slice(0, max - 1) + '…'
}
