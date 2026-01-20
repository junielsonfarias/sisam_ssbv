'use client'

interface OpcaoFiltro {
  value: string
  label: string
}

interface FiltroSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  opcoes: OpcaoFiltro[]
  placeholder?: string
  disabled?: boolean
  disabledMessage?: string
  fixedValue?: string // Valor fixo para exibir (input desabilitado)
}

/**
 * Componente de select reutilizavel para filtros
 * Exibe destaque visual quando tem valor selecionado
 */
export default function FiltroSelect({
  label,
  value,
  onChange,
  opcoes,
  placeholder = 'Selecione...',
  disabled = false,
  disabledMessage,
  fixedValue
}: FiltroSelectProps) {
  const temValor = Boolean(value)

  // Se tem valor fixo, exibir input desabilitado
  if (fixedValue !== undefined) {
    return (
      <div className="space-y-1.5 p-3 rounded-lg transition-all bg-transparent">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          {label}
        </label>
        <input
          type="text"
          value={fixedValue || 'Carregando...'}
          disabled
          className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 cursor-not-allowed"
        />
      </div>
    )
  }

  return (
    <div
      className={`space-y-1.5 p-3 rounded-lg transition-all ${
        temValor
          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            temValor ? 'bg-indigo-600' : 'bg-indigo-500'
          }`}
        ></span>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 ${
          temValor
            ? 'bg-white dark:bg-slate-700 border-2 border-indigo-500 text-gray-900 dark:text-white shadow-sm'
            : 'bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'
        }`}
        title={disabled && disabledMessage ? disabledMessage : undefined}
      >
        <option value="">{disabled && disabledMessage ? disabledMessage : placeholder}</option>
        {opcoes.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
    </div>
  )
}
