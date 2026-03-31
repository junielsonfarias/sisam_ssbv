/**
 * Classes Tailwind reutilizaveis — padrao SISAM
 *
 * Evita duplicacao de strings longas de classes em 50+ arquivos.
 * Usar estas constantes em vez de copiar/colar as mesmas classes.
 *
 * @example
 * import { inputClass, labelClass, cardClass } from '@/lib/styles'
 * <label className={labelClass}>Nome</label>
 * <input className={inputClass} />
 */

// ============================================================================
// INPUTS
// ============================================================================

/** Input padrao (text, email, date, number) */
export const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'

/** Input grande (formularios principais, boletim) */
export const inputLargeClass =
  'w-full rounded-xl border border-gray-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 px-5 py-4 sm:py-5 text-base sm:text-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-600 transition-all'

/** Select padrao */
export const selectClass =
  'w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

/** Textarea padrao */
export const textareaClass =
  'w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white resize-y focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

/** Checkbox padrao */
export const checkboxClass =
  'w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500'

// ============================================================================
// LABELS
// ============================================================================

/** Label padrao para campos de formulario */
export const labelClass =
  'block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

/** Label muted (para campos secundarios) */
export const labelMutedClass =
  'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

// ============================================================================
// CARDS & CONTAINERS
// ============================================================================

/** Card padrao com borda e sombra */
export const cardClass =
  'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6'

/** Card sem padding (para tabelas, conteudo flush) */
export const cardFlushClass =
  'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden'

/** Header de pagina com gradiente */
export const headerGradientClass =
  'bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white'

// ============================================================================
// BOTOES
// ============================================================================

/** Botao primario (indigo) */
export const btnPrimaryClass =
  'bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors active:scale-95 min-h-[44px]'

/** Botao secundario (outline) */
export const btnSecondaryClass =
  'border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors active:scale-95 min-h-[44px]'

/** Botao de perigo (vermelho) */
export const btnDangerClass =
  'bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors active:scale-95 min-h-[44px]'

/** Botao fantasma (sem borda, hover sutil) */
export const btnGhostClass =
  'text-gray-500 dark:text-gray-400 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors active:scale-95 min-h-[44px]'

// ============================================================================
// BADGES
// ============================================================================

/** Badge base (usar com variante de cor) */
export const badgeBase = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold'

export const badgeVariants = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
} as const

export type BadgeVariant = keyof typeof badgeVariants

/** Combinar badge base + variante */
export function badgeClass(variant: BadgeVariant): string {
  return `${badgeBase} ${badgeVariants[variant]}`
}

// ============================================================================
// TABELAS
// ============================================================================

/** Container da tabela desktop */
export const tableContainerClass =
  'hidden sm:block overflow-x-auto'

/** Container dos cards mobile */
export const mobileCardsContainerClass =
  'sm:hidden divide-y divide-gray-100 dark:divide-slate-700'

/** Header da tabela */
export const tableHeaderClass =
  'bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'

/** Celula do header */
export const thClass =
  'px-4 py-3 text-left font-semibold whitespace-nowrap text-xs sm:text-sm'

/** Linha da tabela */
export const trClass =
  'border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors'

/** Celula da tabela */
export const tdClass =
  'px-4 py-3 text-sm text-gray-700 dark:text-gray-300'
