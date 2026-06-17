import { TabProps, inputClass, labelClass } from './types'

export function TabContato({ formData, updateField }: TabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Endereco</label>
        <input type="text" className={inputClass} value={formData.endereco || ''} onChange={e => updateField('endereco', e.target.value)} placeholder="Endereco completo" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Telefone</label>
          <input type="text" className={inputClass} value={formData.telefone || ''} onChange={e => updateField('telefone', e.target.value)} placeholder="(00) 0000-0000" />
        </div>
        <div>
          <label className={labelClass}>E-mail</label>
          <input type="text" className={inputClass} value={formData.email || ''} onChange={e => updateField('email', e.target.value)} placeholder="contato@exemplo.com" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Horario de Funcionamento</label>
        <input type="text" className={inputClass} value={formData.horario_funcionamento || ''} onChange={e => updateField('horario_funcionamento', e.target.value)} placeholder="Ex: Seg a Sex, 8h as 17h" />
      </div>
      <div>
        <label className={labelClass}>URL do Mapa (embed, opcional)</label>
        <input type="text" className={inputClass} value={formData.mapa_embed_url || ''} onChange={e => updateField('mapa_embed_url', e.target.value)} placeholder="https://www.google.com/maps/embed?..." />
      </div>
    </div>
  )
}
