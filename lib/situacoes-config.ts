export type Situacao = 'cursando' | 'transferido' | 'abandono' | 'aprovado' | 'reprovado' | 'remanejado'

export const SITUACOES: { value: Situacao; label: string; cor: string; corDark: string }[] = [
  { value: 'cursando', label: 'Cursando', cor: 'bg-emerald-100 text-emerald-700', corDark: 'dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'aprovado', label: 'Aprovado', cor: 'bg-blue-100 text-blue-700', corDark: 'dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'reprovado', label: 'Reprovado', cor: 'bg-red-100 text-red-700', corDark: 'dark:bg-red-900/40 dark:text-red-300' },
  { value: 'transferido', label: 'Transferido', cor: 'bg-orange-100 text-orange-700', corDark: 'dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'abandono', label: 'Abandono', cor: 'bg-gray-200 text-gray-600', corDark: 'dark:bg-gray-700 dark:text-gray-400' },
  { value: 'remanejado', label: 'Remanejado', cor: 'bg-purple-100 text-purple-700', corDark: 'dark:bg-purple-900/40 dark:text-purple-300' },
]
