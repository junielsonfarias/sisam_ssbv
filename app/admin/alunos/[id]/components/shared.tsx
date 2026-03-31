import React from 'react'

export function Campo({ label, valor, editando, campo, form, updateForm, tipo = 'text', opcoes, placeholder, icon: Icon }: any) {
  const displayVal = editando ? (form[campo] ?? '') : (valor ?? '-')

  if (editando) {
    if (opcoes) {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
          <select value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="">-</option>
            {opcoes.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )
    }
    if (tipo === 'boolean') {
      return (
        <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={!!form[campo]} onChange={e => updateForm(campo, e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          {label}
        </label>
      )
    }
    if (tipo === 'textarea') {
      return (
        <div className="col-span-full">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
          <textarea value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)} rows={2} placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
      )
    }
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        <input type={tipo} value={form[campo] ?? ''} onChange={e => updateForm(campo, e.target.value || null)} placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <span className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-sm text-gray-900 dark:text-white">{typeof displayVal === 'boolean' ? (displayVal ? 'Sim' : 'Não') : (displayVal || '-')}</span>
      </div>
    </div>
  )
}

export function Secao({ titulo, icon: Icon, children, cor = 'indigo' }: { titulo: string; icon: any; children: React.ReactNode; cor?: string }) {
  const cores: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      <div className={`bg-gradient-to-r ${cores[cor] || cores.indigo} px-5 py-3 flex items-center gap-2`}>
        <Icon className="w-4 h-4 text-white" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{titulo}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
