'use client'

/**
 * Toggle switch reutilizado pelos 5 módulos (SISAM, Gestor, SEMED,
 * Transparência, Admin) + status Ativo. Antes vivia 6x duplicado no
 * page.tsx — extraído na decomposição da auditoria 31/05/2026.
 */
interface Props {
  titulo: string
  descricao: string
  checked: boolean
  ariaLabel: string
  /** Cor de fundo quando ativado. Default 'indigo'. */
  cor?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'slate' | 'green'
  onChange: () => void
}

const COR_BG: Record<NonNullable<Props['cor']>, string> = {
  indigo:  'bg-indigo-500 focus:ring-indigo-500',
  emerald: 'bg-emerald-500 focus:ring-emerald-500',
  amber:   'bg-amber-500 focus:ring-amber-500',
  sky:     'bg-sky-500 focus:ring-sky-500',
  slate:   'bg-slate-600 focus:ring-slate-500',
  green:   'bg-green-500 focus:ring-indigo-500',
}

const COR_RING: Record<NonNullable<Props['cor']>, string> = {
  indigo:  'focus:ring-indigo-500',
  emerald: 'focus:ring-emerald-500',
  amber:   'focus:ring-amber-500',
  sky:     'focus:ring-sky-500',
  slate:   'focus:ring-slate-500',
  green:   'focus:ring-indigo-500',
}

export function ToggleModulo({ titulo, descricao, checked, ariaLabel, cor = 'indigo', onChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-gray-700 dark:text-gray-300">{titulo}</span>
        <p className="text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${COR_RING[cor]} ${
          checked ? COR_BG[cor].split(' ')[0] : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
