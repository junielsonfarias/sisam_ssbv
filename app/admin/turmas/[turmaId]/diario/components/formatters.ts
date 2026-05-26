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
 * Abrevia nomes APENAS quando muito longos.
 *
 * Regra principal (prioridade do usuario):
 *   - Se o nome tem ATE 4 nomes proprios (excluindo preposicoes),
 *     retorna o nome COMPLETO sem qualquer abreviacao
 *   - So abrevia quando ha 5+ nomes proprios
 *
 * Quando abrevia (>= 5 nomes proprios):
 *   - Mantem primeiro nome + ultimo sobrenome COMPLETOS
 *   - Reduz os nomes do meio a iniciais com ponto
 *   - Preposicoes (de, da, do, dos, das, e) sao removidas do meio
 *
 * Parametro `maxGuard` e apenas uma guarda final para casos extremos
 * (ex: nome com 7+ partes que mesmo abreviado nao caberia). Default 60.
 *
 * Exemplos:
 *   "ADRINEY RAMOS FREITAS"               (3 nomes) -> completo
 *   "ANA BEATRIZ PINHEIRO DE SOUZA"       (4 nomes) -> completo
 *   "EDUARDA KAROLINE SOUZA DE SOUZA"     (4 nomes) -> completo
 *   "JAILTON WILLIAN DE SOUZA TEIXEIRA"   (4 nomes) -> completo
 *   "MARIA DAS GRACAS FERREIRA DA SILVA SANTOS"  (5 nomes) -> "MARIA G. F. S. SANTOS"
 *   "JOSE PEDRO HENRIQUE MARQUES ALMEIDA SOUZA"  (6 nomes) -> "JOSE P. H. M. A. SOUZA"
 */
const PREPOSICOES = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])

export function abreviarNome(nome: string, maxGuard: number = 60): string {
  if (!nome) return ''
  const limpo = nome.trim()
  if (!limpo) return ''

  const partes = limpo.split(/\s+/)
  const nomesProprios = partes.filter(p => !PREPOSICOES.has(p.toLowerCase()))

  // PRIORIDADE: nome completo quando possivel (ate 4 nomes proprios)
  if (nomesProprios.length <= 4) return limpo

  // Defensivo: 1 ou 2 partes nao da pra abreviar significativamente
  if (partes.length <= 2) return limpo

  // Acima de 4 nomes: abrevia do meio mantendo primeiro + ultimo
  const primeiro = partes[0]
  const ultimo = partes[partes.length - 1]
  const meio = partes.slice(1, -1)

  const meioAbrev = meio
    .filter(p => !PREPOSICOES.has(p.toLowerCase()))
    .map(p => p[0].toUpperCase() + '.')
    .join(' ')

  const r = meioAbrev ? `${primeiro} ${meioAbrev} ${ultimo}` : `${primeiro} ${ultimo}`
  if (r.length <= maxGuard) return r

  // Caso extremo (nome com muitas partes e ainda longo): trunca
  return r.slice(0, maxGuard - 1) + '…'
}
