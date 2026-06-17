import { TabProps, inputClass, labelClass } from './types'

export function TabSobre({ formData, updateField }: TabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Titulo</label>
        <input type="text" className={inputClass} value={formData.titulo || ''} onChange={e => updateField('titulo', e.target.value)} placeholder="Titulo da secao Sobre" />
      </div>
      <div>
        <label className={labelClass}>Texto</label>
        <textarea className={inputClass} rows={6} value={formData.texto || ''} onChange={e => updateField('texto', e.target.value)} placeholder="Texto principal da secao sobre" />
      </div>
      <div>
        <label className={labelClass}>Missao</label>
        <textarea className={inputClass} rows={3} value={formData.missao || ''} onChange={e => updateField('missao', e.target.value)} placeholder="Missao da instituicao" />
      </div>
      <div>
        <label className={labelClass}>Visao</label>
        <textarea className={inputClass} rows={3} value={formData.visao || ''} onChange={e => updateField('visao', e.target.value)} placeholder="Visao da instituicao" />
      </div>
    </div>
  )
}
