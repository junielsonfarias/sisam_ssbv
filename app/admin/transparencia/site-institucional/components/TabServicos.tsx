import { TabProps, inputClass, labelClass, cardClass } from './types'
import { Plus, Trash2 } from 'lucide-react'

export function TabServicos({ formData, updateField, addItem, removeItem }: TabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className={labelClass}>Servicos</label>
        <button
          type="button"
          onClick={() => addItem?.('items', { titulo: '', descricao: '', icone: '' })}
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>
      {(formData.items || []).map((item: any, i: number) => (
        <div key={i} className={`${cardClass} relative`}>
          <button type="button" onClick={() => removeItem?.('items', i)} className="absolute top-3 right-3 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="space-y-3 pr-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Titulo</label>
                <input type="text" className={inputClass} value={item.titulo || ''} onChange={e => updateField(`items.${i}.titulo`, e.target.value)} placeholder="Nome do servico" />
              </div>
              <div>
                <label className={labelClass}>Icone</label>
                <input type="text" className={inputClass} value={item.icone || ''} onChange={e => updateField(`items.${i}.icone`, e.target.value)} placeholder="Nome do icone (ex: BookOpen)" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Descricao</label>
              <textarea className={inputClass} rows={2} value={item.descricao || ''} onChange={e => updateField(`items.${i}.descricao`, e.target.value)} placeholder="Descricao do servico" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
