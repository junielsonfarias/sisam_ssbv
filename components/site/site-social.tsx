'use client'

import { ExternalLink } from 'lucide-react'

interface SiteSocialProps {
  data: any
}

const defaultSocial = {
  facebook_url: 'https://www.facebook.com/semedssbvpa/',
  instagram_url: '',
  youtube_url: '',
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
        <div className={`grid ${redesAtivas.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-3 sm:gap-4 max-w-2xl mx-auto`}>
          {redesAtivas.map((rede) => {
            const url = getUrl(socialData, rede.key)
            return (
              <a
                key={rede.key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white hover:border-white/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="text-white group-hover:text-blue-800 transition-colors duration-300" style={{ color: undefined }}>
                  <div className="group-hover:scale-110 transition-transform duration-300">
                    {rede.icon}
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-white/90 group-hover:text-slate-800 transition-colors">
                  {rede.nome}
                </span>
                <ExternalLink className="w-3 h-3 text-white/40 group-hover:text-blue-600 transition-colors" />
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
