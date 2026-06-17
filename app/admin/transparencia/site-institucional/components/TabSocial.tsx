import { TabProps, inputClass, labelClass } from './types'

export function TabSocial({ formData, updateField }: TabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Configure os links das redes sociais da SEMED. Apenas redes com URL preenchida serao exibidas no site.</p>
      </div>
      <div>
        <label className={labelClass}>Facebook (URL da pagina)</label>
        <input type="url" className={inputClass} value={formData.facebook_url || ''} onChange={e => updateField('facebook_url', e.target.value)} placeholder="https://www.facebook.com/semedssbvpa/" />
      </div>
      <div>
        <label className={labelClass}>Instagram (URL do perfil)</label>
        <input type="url" className={inputClass} value={formData.instagram_url || ''} onChange={e => updateField('instagram_url', e.target.value)} placeholder="https://www.instagram.com/semed_ssbv/" />
      </div>
      <div>
        <label className={labelClass}>YouTube (URL do canal)</label>
        <input type="url" className={inputClass} value={formData.youtube_url || ''} onChange={e => updateField('youtube_url', e.target.value)} placeholder="https://www.youtube.com/@semed" />
      </div>
      <div>
        <label className={labelClass}>X / Twitter (URL do perfil)</label>
        <input type="url" className={inputClass} value={formData.twitter_url || ''} onChange={e => updateField('twitter_url', e.target.value)} placeholder="https://x.com/semed_ssbv" />
      </div>
      <div>
        <label className={labelClass}>TikTok (URL do perfil)</label>
        <input type="url" className={inputClass} value={formData.tiktok_url || ''} onChange={e => updateField('tiktok_url', e.target.value)} placeholder="https://www.tiktok.com/@semed_ssbv" />
      </div>
      <div>
        <label className={labelClass}>Telegram (URL do canal/grupo)</label>
        <input type="url" className={inputClass} value={formData.telegram_url || ''} onChange={e => updateField('telegram_url', e.target.value)} placeholder="https://t.me/semed_ssbv" />
      </div>
      <div>
        <label className={labelClass}>WhatsApp (numero com DDD e codigo do pais)</label>
        <input type="text" className={inputClass} value={formData.whatsapp_numero || ''} onChange={e => updateField('whatsapp_numero', e.target.value)} placeholder="5591999999999" />
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={formData.mostrar_feed_facebook ?? false}
            onChange={e => updateField('mostrar_feed_facebook', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className={labelClass + ' mb-0'}>Exibir feed do Facebook no site (publicacoes recentes)</span>
        </label>
      </div>
    </div>
  )
}
