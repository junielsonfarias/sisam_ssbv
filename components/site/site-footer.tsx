'use client'

import { Heart, ArrowUpRight, MapPin, Phone, Mail, Clock } from 'lucide-react'
import Link from 'next/link'

interface SiteFooterProps {
  data: any
}

export default function SiteFooter({ data }: SiteFooterProps) {
  const logoText = data?.logoText || 'SEMED'
  const description = data?.description || 'Secretaria Municipal de Educação de São Sebastião da Boa Vista - PA. Comprometida com a educação pública de qualidade para todas as crianças e jovens do município.'
  const year = new Date().getFullYear()

  const quickLinks = data?.quickLinks || [
    { label: 'Sobre', href: '#sobre' },
    { label: 'Serviços', href: '#servicos' },
    { label: 'Escolas', href: '#escolas' },
    { label: 'Notícias', href: '#noticias' },
    { label: 'Contato', href: '#contato' },
    { label: 'Boletim', href: '/boletim' },
  ]

  const contactInfo = data?.contactInfo || [
    'São Sebastião da Boa Vista - PA',
    'semed@ssbv.pa.gov.br',
    '(91) 0000-0000',
  ]

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const target = document.querySelector(href)
      if (target) target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-slate-900 text-slate-300" role="contentinfo">
      {/* Blue top border */}
      <div className="h-1 bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-16 lg:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 lg:gap-16">
          {/* Column 1: About */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <img src="/logo-semed.png" alt="SEMED" className="h-10 w-auto" />
              <img src="/logo-prefeitura.png" alt="Prefeitura de São Sebastião da Boa Vista" className="h-10 w-auto" />
              <div>
                <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{logoText}</span>
                <p className="text-xs text-blue-400 font-medium">Educação e Cidadania</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
              {description}
            </p>
            {/* Ícones de redes sociais */}
            <div className="flex items-center gap-3 mb-6">
              {data?.facebook_url && (
                <a href={data.facebook_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:bg-[#1877F2] hover:text-white transition-all" title="Facebook">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
              )}
              {data?.instagram_url && (
                <a href={data.instagram_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:bg-[#E4405F] hover:text-white transition-all" title="Instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
              )}
              {data?.youtube_url && (
                <a href={data.youtube_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:bg-[#FF0000] hover:text-white transition-all" title="YouTube">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </a>
              )}
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-blue-800/10 border border-blue-700/20 text-blue-400 hover:bg-blue-800/20 hover:text-blue-300 transition-all duration-300"
            >
              Portal do Educador
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Column 2: Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Links Rápidos
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link: any, i: number) => (
                <li key={i}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-sm text-slate-400 hover:text-blue-400 transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-blue-700/50" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact with icons */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Contato
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>{contactInfo[0] || 'São Sebastião da Boa Vista - PA'}</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-400">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>{contactInfo[1] || 'semed@ssbv.pa.gov.br'}</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-400">
                <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>{contactInfo[2] || '(91) 0000-0000'}</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-400">
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Seg a Sex, 08h às 14h</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <p>
              &copy; {year} SEMED - São Sebastião da Boa Vista. Todos os direitos reservados.
            </p>
            <p className="flex items-center gap-1.5">
              Desenvolvido com <Heart className="w-3.5 h-3.5 text-blue-700 fill-blue-700" /> para a educação
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
