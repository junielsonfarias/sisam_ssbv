import { TabProps, inputClass, labelClass } from './types'
import { Plus, Trash2 } from 'lucide-react'

export function TabEstatisticas({ formData, updateField, addItem, removeItem }: TabProps) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
        <input
          type="checkbox"
          checked={formData.auto_count ?? true}
          onChange={e => updateField('auto_count', e.target.checked)}
          className="w-5 h-5 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Calcular automaticamente dos dados do sistema</span>
      </label>

      {!formData.auto_count && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={labelClass}>Itens de Estatistica</label>
            <button
              type="button"
              onClick={() => addItem?.('items', { label: '', valor: '' })}
              className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          {(formData.items || []).map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input type="text" className={inputClass} value={item.label || ''} onChange={e => updateField(`items.${i}.label`, e.target.value)} placeholder="Label (ex: Alunos)" />
                <input type="text" className={inputClass} value={item.valor || ''} onChange={e => updateField(`items.${i}.valor`, e.target.value)} placeholder="Valor (ex: 1500)" />
              </div>
              <button type="button" onClick={() => removeItem?.('items', i)} className="mt-1 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
