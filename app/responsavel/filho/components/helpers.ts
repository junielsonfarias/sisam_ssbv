// Helpers de cor/formatação e tipos compartilhados pela página do filho (responsável).
// Extraídos de page.tsx sem mudança de lógica.

export interface Aluno {
  id: string; nome: string; codigo: string; serie: string; escola_nome: string
  turma_codigo: string | null; turma_nome: string | null; situacao: string
}
export interface Disciplina { id: string; nome: string; codigo: string; abreviacao: string }
export interface Periodo { id: string; nome: string; numero: number }
export interface Frequencia { bimestre: number; aulas_dadas: number; faltas: number; percentual_frequencia: number; periodo_nome: string }

// ---- helpers de cor ----
export const corNota = (n: number | null) => {
  if (n === null || n === undefined || isNaN(n)) return 'text-gray-400'
  return n >= 6 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
}
export const badgeNota = (n: number | null) => {
  if (n === null || n === undefined || isNaN(n)) return 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300'
  return n >= 6
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
}
export const corFreq = (p: number) => {
  if (p >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (p >= 75) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
export const strokeFreq = (p: number) => (p >= 90 ? 'text-emerald-500' : p >= 75 ? 'text-amber-500' : 'text-red-500')

export const labelSit = (s: string | null) => {
  const m: Record<string, string> = { cursando: 'Cursando', aprovado: 'Aprovado', reprovado: 'Reprovado', transferido: 'Transferido', abandono: 'Abandono', remanejado: 'Remanejado', progressao_parcial: 'Progressão parcial' }
  return s ? (m[s] || s) : '—'
}
export const corSit = (s: string | null) => {
  if (s === 'aprovado' || s === 'cursando') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  if (s === 'reprovado' || s === 'abandono') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  if (s === 'transferido' || s === 'remanejado') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  if (s === 'progressao_parcial') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
}
export const fmtData = (iso: string | null) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
export const fmtGenero = (g: string | null) => {
  if (!g) return null
  const v = g.toLowerCase()
  if (v === 'm' || v === 'masculino') return 'Masculino'
  if (v === 'f' || v === 'feminino') return 'Feminino'
  return g
}
export const simNao = (b: boolean | null | undefined) => (b === true ? 'Sim' : b === false ? 'Não' : null)
export const fmtNota = (v: any) => (v === null || v === undefined || v === '' ? '—' : Number(v).toFixed(1))
