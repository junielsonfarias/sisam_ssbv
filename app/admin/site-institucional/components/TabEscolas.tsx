import { TabProps, inputClass, labelClass } from './types'

export function TabEscolas({ formData, updateField }: TabProps) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
        <input
          type="checkbox"
          checked={formData.mostrar_do_banco ?? true}
          onChange={e => updateField('mostrar_do_banco', e.target.checked)}
          className="w-5 h-5 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar escolas cadastradas no sistema</span>
      </label>
      <div>
        <label className={labelClass}>Titulo da Secao</label>
        <input type="text" className={inputClass} value={formData.titulo || ''} onChange={e => updateField('titulo', e.target.value)} placeholder="Ex: Nossas Escolas" />
      </div>
    </div>
  )
}
