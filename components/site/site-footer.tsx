'use client'

import { Heart, ArrowUpRight } from 'lucide-react'
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-16">
          {/* Column 1: About */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <img src="/logo-semed.png" alt="SEMED" className="h-10 w-auto" />
              <img src="/logo-prefeitura.png" alt="Prefeitura de São Sebastião da Boa Vista" className="h-10 w-auto" />
              <div>
                <span className="text-xl font-extrabold text-white tracking-tight">{logoText}</span>
                <p className="text-xs text-blue-400 font-medium">Educação e Cidadania</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
              {description}
            </p>
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

          {/* Column 3: Contact */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Contato
            </h4>
            <ul className="space-y-3">
              {contactInfo.map((info: string, i: number) => (
                <li key={i} className="text-sm text-slate-400">
                  {info}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
