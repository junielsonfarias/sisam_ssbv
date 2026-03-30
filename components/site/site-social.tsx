'use client'

import { ExternalLink } from 'lucide-react'

interface SiteSocialProps {
  data: any
}

const defaultSocial = {
  facebook_url: 'https://www.facebook.com/semedssbvpa/',
  instagram_url: '',
  youtube_url: '',
  twitter_url: '',
  tiktok_url: '',
  telegram_url: '',
  whatsapp_numero: '',
}

const redes = [
  {
    key: 'facebook_url',
    nome: 'Facebook',
    cor: '#1877F2',
    corHover: 'hover:bg-[#1877F2]',
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: 'instagram_url',
    nome: 'Instagram',
    cor: '#E4405F',
    corHover: 'hover:bg-[#E4405F]',
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    key: 'youtube_url',
    nome: 'YouTube',
    cor: '#FF0000',
    corHover: 'hover:bg-[#FF0000]',
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: 'twitter_url',
    nome: 'X (Twitter)',
    cor: '#000000',
    corHover: 'hover:bg-black',
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: 'tiktok_url',
    nome: 'TikTok',
    cor: '#000000',
    corHover: 'hover:bg-black',
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    key: 'telegram_url',
    nome: 'Telegram',
    cor: '#0088CC',
    corHover: 'hover:bg-[#0088CC]',
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    key: 'whatsapp_numero',
    nome: 'WhatsApp',
    cor: '#25D366',
    corHover: 'hover:bg-[#25D366]',
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
]

function getUrl(data: any, key: string): string {
  const val = data?.[key] || (defaultSocial as any)[key] || ''
  if (key === 'whatsapp_numero' && val) {
    const num = val.replace(/\D/g, '')
    return `https://wa.me/${num}`
  }
  return val
}

export default function SiteSocial({ data }: SiteSocialProps) {
  const socialData = { ...defaultSocial, ...(data || {}) }

  // Filtrar apenas redes com URL configurada
  const redesAtivas = redes.filter(r => {
    const url = getUrl(socialData, r.key)
    return url && url.length > 0
  })

  if (redesAtivas.length === 0) return null

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900" aria-label="Redes sociais">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-300 mb-2">Siga-nos</p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white">
            Acompanhe a SEMED nas Redes Sociais
          </h2>
        </div>

        {/* Grid de redes sociais */}
        <div className={`grid ${redesAtivas.length <= 3 ? `grid-cols-${redesAtivas.length}` : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-7'} gap-3 sm:gap-4 max-w-4xl mx-auto`}>
          {redesAtivas.map((rede) => {
            const url = getUrl(socialData, rede.key)
            return (
              <a
                key={rede.key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white hover:border-white/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="text-white group-hover:text-blue-800 transition-colors duration-300">
                  <div className="group-hover:scale-110 transition-transform duration-300">
                    {rede.icon}
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-white/90 group-hover:text-slate-800 transition-colors text-center leading-tight">
                  {rede.nome}
                </span>
              </a>
            )
          })}
        </div>

        {/* Feed do Facebook (embed) */}
        {socialData.mostrar_feed_facebook && socialData.facebook_url && (
          <div className="mt-8 sm:mt-10 flex justify-center">
            <div className="bg-white rounded-xl overflow-hidden shadow-lg w-full max-w-lg">
              <iframe
                src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(socialData.facebook_url)}&tabs=timeline&width=500&height=500&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`}
                width="500"
                height="500"
                className="w-full border-0"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                loading="lazy"
                title="Feed Facebook SEMED"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
