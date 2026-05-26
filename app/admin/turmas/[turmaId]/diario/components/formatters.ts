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
