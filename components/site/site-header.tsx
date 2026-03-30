'use client'

import { useState, useEffect } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface SiteHeaderProps {
  data: any
}

const defaultNav = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Escolas', href: '#escolas' },
  { label: 'Notícias', href: '#noticias' },
  { label: 'Publicações', href: '/publicacoes' },
  { label: 'Transparência', href: '/transparencia' },
  { label: 'Ouvidoria', href: '/ouvidoria' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Contato', href: '#contato' },
  { label: 'Boletim', href: '/boletim' },
  { label: 'Matrícula', href: '/matricula' },
]

export default function SiteHeader({ data }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  const navItems = data?.nav || defaultNav
  const logoText = data?.logoText || 'SEMED'
  const logoSubtext = data?.logoSubtext || 'São Sebastião da Boa Vista - Pará'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)

      const sections = ['sobre', 'servicos', 'escolas', 'noticias', 'contato']
      let current = ''
      for (const id of sections) {
        const el = document.getElementById(id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 120) current = id
        }
      }
      setActiveSection(current)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const target = document.querySelector(href)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' })
      }
      setMenuOpen(false)
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-100'
          : 'bg-transparent'
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-500 ${
          scrolled ? 'h-16 sm:h-16' : 'h-18 sm:h-20'
        }`}>
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-2 sm:gap-3 group min-w-0"
            aria-label="Voltar ao topo"
          >
            {/* Logos lado a lado com tamanho adequado para mobile */}
            <img
              src="https://www.educacaossbv.com.br/wp-content/uploads/2021/11/logo-nova-300x154.png"
              alt="SEMED - São Sebastião da Boa Vista"
              className={`w-auto transition-all duration-500 ${scrolled ? 'h-9 sm:h-10' : 'h-11 sm:h-14'}`}
            />
            <div className="hidden sm:block w-px h-8 bg-slate-200 flex-shrink-0" />
            <img
              src="https://pmssbv.pa.gov.br/wp-content/uploads/2025/01/Logo-prefeitura-2025-Copia.png"
              alt="Prefeitura Municipal de São Sebastião da Boa Vista"
              className={`w-auto transition-all duration-500 ${scrolled ? 'h-9 sm:h-10' : 'h-11 sm:h-14'}`}
            />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            {navItems.map((item: any, i: number) => {
              const isActive = item.href === `#${activeSection}`
              return (
                <a
                  key={i}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-blue-800 bg-blue-50'
                      : scrolled
                        ? 'text-slate-600 hover:text-blue-800 hover:bg-blue-50/50'
                        : 'text-slate-600 hover:text-blue-800 hover:bg-blue-50/50'
                  }`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-700 rounded-full" />
                  )}
                </a>
              )
            })}
            <Link
              href="/login"
              className="ml-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-blue-800 text-white hover:bg-blue-900 shadow-lg shadow-blue-800/25 hover:shadow-blue-800/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              Entrar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Slide-in panel */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
          menuOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img src="https://www.educacaossbv.com.br/wp-content/uploads/2021/11/logo-nova-300x154.png" alt="SEMED" className="h-12 w-auto" />
                <img src="https://pmssbv.pa.gov.br/wp-content/uploads/2025/01/Logo-prefeitura-2025-Copia.png" alt="Prefeitura" className="h-12 w-auto" />
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-xs font-semibold text-blue-800">SEMED — São Sebastião da Boa Vista/PA</p>
          </div>
          <nav className="px-6 py-8 space-y-2" aria-label="Menu mobile">
            {navItems.map((item: any, i: number) => (
              <a
                key={i}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="block px-5 py-4 rounded-2xl text-lg font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-all duration-200"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-800 text-white font-bold text-lg shadow-lg shadow-blue-800/25 transition-all duration-200"
              >
                Entrar
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
