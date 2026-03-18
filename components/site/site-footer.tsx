'use client'

import { GraduationCap, Heart } from 'lucide-react'

interface SiteFooterProps {
  data: any
}

export default function SiteFooter({ data }: SiteFooterProps) {
  const logoText = data?.logoText || 'SEMED'
  const description = data?.description || 'Secretaria Municipal de Educacao - Transformando a educacao publica por meio da tecnologia.'
  const year = new Date().getFullYear()

  const links = data?.links || [
    { label: 'Sobre o SISAM', href: '#sobre' },
    { label: 'Servicos', href: '#servicos' },
    { label: 'Escolas', href: '#escolas' },
    { label: 'Noticias', href: '#noticias' },
    { label: 'Contato', href: '#contato' },
    { label: 'Acessar Sistema', href: '/login' },
  ]

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const target = document.querySelector(href)
      if (target) target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-600">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">{logoText}</span>
                <p className="text-xs text-slate-400">SISAM</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {description}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Links Uteis
            </h4>
            <ul className="space-y-2.5">
              {links.map((link: any, i: number) => (
                <li key={i}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Sobre o Sistema
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>Sistema de Avaliacao Municipal</li>
              <li>Gestao Educacional Integrada</li>
              <li>Frequencia Digital</li>
              <li>Relatorios e Analises</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <p>
              &copy; {year} SISAM - Sistema de Avaliacao Municipal. Todos os direitos reservados.
            </p>
            <p className="flex items-center gap-1.5">
              Desenvolvido com <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> para a educacao
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
