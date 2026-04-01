import { TabProps, inputClass, labelClass } from './types'

export function TabHero({ formData, updateField }: TabProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Titulo</label>
        <input type="text" className={inputClass} value={formData.titulo || ''} onChange={e => updateField('titulo', e.target.value)} placeholder="Titulo principal do site" />
      </div>
      <div>
        <label className={labelClass}>Subtitulo</label>
        <input type="text" className={inputClass} value={formData.subtitulo || ''} onChange={e => updateField('subtitulo', e.target.value)} placeholder="Subtitulo do hero" />
      </div>
      <div>
        <label className={labelClass}>Descricao</label>
        <textarea className={inputClass} rows={4} value={formData.descricao || ''} onChange={e => updateField('descricao', e.target.value)} placeholder="Descricao do hero" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>CTA Primario - Texto</label>
          <input type="text" className={inputClass} value={formData.cta_primario?.texto || ''} onChange={e => updateField('cta_primario.texto', e.target.value)} placeholder="Ex: Acessar Sistema" />
        </div>
        <div>
          <label className={labelClass}>CTA Primario - Link</label>
          <input type="text" className={inputClass} value={formData.cta_primario?.href || ''} onChange={e => updateField('cta_primario.href', e.target.value)} placeholder="Ex: /login" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>CTA Secundario - Texto</label>
          <input type="text" className={inputClass} value={formData.cta_secundario?.texto || ''} onChange={e => updateField('cta_secundario.texto', e.target.value)} placeholder="Ex: Saiba Mais" />
        </div>
        <div>
          <label className={labelClass}>CTA Secundario - Link</label>
          <input type="text" className={inputClass} value={formData.cta_secundario?.href || ''} onChange={e => updateField('cta_secundario.href', e.target.value)} placeholder="Ex: #sobre" />
        </div>
      </div>
    </div>
  )
}
