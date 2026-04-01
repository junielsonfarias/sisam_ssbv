import { TabProps, inputClass, labelClass } from './types'
import { Plus, Trash2 } from 'lucide-react'

export function TabRodape({ formData, updateField, addItem, removeItem }: TabProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className={labelClass}>Texto de Copyright</label>
        <input type="text" className={inputClass} value={formData.texto_copyright || ''} onChange={e => updateField('texto_copyright', e.target.value)} placeholder="Ex: 2026 Educatec. Todos os direitos reservados." />
      </div>

      {/* Links Uteis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Links Uteis</label>
          <button
            type="button"
            onClick={() => addItem?.('links_uteis', { label: '', href: '' })}
            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        {(formData.links_uteis || []).map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input type="text" className={inputClass} value={item.label || ''} onChange={e => updateField(`links_uteis.${i}.label`, e.target.value)} placeholder="Label do link" />
              <input type="text" className={inputClass} value={item.href || ''} onChange={e => updateField(`links_uteis.${i}.href`, e.target.value)} placeholder="URL do link" />
            </div>
            <button type="button" onClick={() => removeItem?.('links_uteis', i)} className="mt-1 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Redes Sociais */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Redes Sociais</label>
          <button
            type="button"
            onClick={() => addItem?.('redes_sociais', { nome: '', url: '' })}
            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        {(formData.redes_sociais || []).map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input type="text" className={inputClass} value={item.nome || ''} onChange={e => updateField(`redes_sociais.${i}.nome`, e.target.value)} placeholder="Nome (ex: Instagram)" />
              <input type="text" className={inputClass} value={item.url || ''} onChange={e => updateField(`redes_sociais.${i}.url`, e.target.value)} placeholder="URL do perfil" />
            </div>
            <button type="button" onClick={() => removeItem?.('redes_sociais', i)} className="mt-1 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
