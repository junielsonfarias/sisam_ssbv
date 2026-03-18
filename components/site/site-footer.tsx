'use client'

import { GraduationCap, Heart, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

interface SiteFooterProps {
  data: any
}

export default function SiteFooter({ data }: SiteFooterProps) {
  const logoText = data?.logoText || 'SEMED'
  const description = data?.description || 'Secretaria Municipal de Educacao de Sao Sebastiao da Boa Vista - PA. Comprometida com a educacao publica de qualidade para todas as criancas e jovens do municipio.'
  const year = new Date().getFullYear()

  const quickLinks = data?.quickLinks || [
    { label: 'Sobre', href: '#sobre' },
    { label: 'Servicos', href: '#servicos' },
    { label: 'Escolas', href: '#escolas' },
    { label: 'Noticias', href: '#noticias' },
    { label: 'Contato', href: '#contato' },
  ]

  const serviceLinks = data?.serviceLinks || [
    { label: 'Educacao Infantil e Fundamental', href: '#servicos' },
    { label: 'Acompanhamento Pedagogico', href: '#servicos' },
    { label: 'Formacao de Professores', href: '#servicos' },
    { label: 'Frequencia e Permanencia', href: '#servicos' },
    { label: 'Inclusao e Acessibilidade', href: '#servicos' },
  ]

  const contactInfo = data?.contactInfo || [
    'Sao Sebastiao da Boa Vista - PA',
    'semed@municipio.gov.br',
    '(00) 0000-0000',
  ]

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const target = document.querySelector(href)
      if (target) target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-[#0f172a] text-slate-300">
      {/* Emerald top border */}
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-white">{logoText}</span>
                <p className="text-xs text-emerald-400 font-medium">Educacao e Solidariedade</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-6">
              {description}
            </p>
            {/* Access button */}
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all duration-300"
            >
              Portal do Educador
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Links Rapidos
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link: any, i: number) => (
                <li key={i}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
              Servicos
            </h4>
            <ul className="space-y-3">
              {serviceLinks.map((link: any, i: number) => (
                <li key={i}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
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
              &copy; {year} SEMED - Secretaria Municipal de Educacao de Sao Sebastiao da Boa Vista. Todos os direitos reservados.
            </p>
            <p className="flex items-center gap-1.5">
              Desenvolvido com <Heart className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" /> para a educacao
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
