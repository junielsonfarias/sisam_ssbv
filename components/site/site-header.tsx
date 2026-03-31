'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, X, ArrowRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface SiteHeaderProps {
  data: any
}

// Menu desktop com submenus organizados
const desktopNav = [
  { label: 'Sobre', href: '#sobre' },
  {
    label: 'Serviços',
    href: '#servicos',
    children: [
      { label: 'Boletim Online', href: '/boletim' },
      { label: 'Pré-Matrícula', href: '/matricula' },
      { label: 'Ouvidoria', href: '/ouvidoria' },
    ],
  },
  { label: 'Escolas', href: '#escolas' },
  { label: 'Notícias', href: '#noticias' },
  {
    label: 'Institucional',
    href: '#',
    children: [
      { label: 'Publicações', href: '/publicacoes' },
      { label: 'Transparência', href: '/transparencia' },
      { label: 'Eventos', href: '/eventos' },
    ],
  },
  { label: 'Contato', href: '#contato' },
]

// Menu mobile — lista plana completa
const mobileNav = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Escolas', href: '#escolas' },
  { label: 'Notícias', href: '#noticias' },
  { label: 'Boletim Online', href: '/boletim' },
  { label: 'Pré-Matrícula', href: '/matricula' },
  { label: 'Publicações', href: '/publicacoes' },
  { label: 'Transparência', href: '/transparencia' },
  { label: 'Ouvidoria', href: '/ouvidoria' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Contato', href: '#contato' },
]

export default function SiteHeader({ data }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null)

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
      if (target) target.scrollIntoView({ behavior: 'smooth' })
      setMenuOpen(false)
      setOpenDropdown(null)
    }
  }

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setOpenDropdown(label)
  }

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 200)
  }

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-900/5'
          : 'bg-white'
      }`}
      role="banner"
    >
      {/* ====== BARRA INSTITUCIONAL AZUL — todos os tamanhos ====== */}
      <div className={`bg-blue-900 text-white text-center transition-all duration-500 ${scrolled ? 'py-1 text-[11px] sm:text-xs' : 'py-1.5 text-xs sm:text-sm'} font-semibold tracking-wide`}>
        Secretaria Municipal de Educação — São Sebastião da Boa Vista/PA
      </div>

      {/* ====== LINHA DAS LOGOS ====== */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-500 ${
          scrolled ? 'h-14 sm:h-16' : 'h-20 sm:h-24'
        }`}>
          {/* Logos centralizadas no mobile, à esquerda no desktop */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-4 sm:gap-5 group"
            aria-label="Voltar ao topo"
          >
            <img
              src="/logo-semed.png"
              alt="SEMED"
              className={`w-auto object-contain transition-all duration-500 ${scrolled ? 'h-10 sm:h-12' : 'h-16 sm:h-20'}`}
            />
            <div className={`w-px bg-slate-300 flex-shrink-0 transition-all duration-500 ${scrolled ? 'h-7 sm:h-9' : 'h-12 sm:h-16'}`} />
            <img
              src="/logo-prefeitura.png"
              alt="Prefeitura de São Sebastião da Boa Vista"
              className={`w-auto object-contain transition-all duration-500 ${scrolled ? 'h-10 sm:h-12' : 'h-16 sm:h-20'}`}
            />
          </a>

          {/* ====== MENU DESKTOP COM DROPDOWNS ====== */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" aria-label="Navegação principal">
            {desktopNav.map((item, i) => {
              const isActive = item.href === `#${activeSection}`
              const hasChildren = item.children && item.children.length > 0
              const isDropdownOpen = openDropdown === item.label

              return (
                <div
                  key={i}
                  className="relative"
                  onMouseEnter={() => hasChildren && handleDropdownEnter(item.label)}
                  onMouseLeave={() => hasChildren && handleDropdownLeave()}
                >
                  <a
                    href={item.href}
                    onClick={(e) => {
                      if (hasChildren && item.href === '#') {
                        e.preventDefault()
                      } else {
                        handleNavClick(e, item.href)
                      }
                    }}
                    className={`relative inline-flex items-center gap-1 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-blue-800 bg-blue-50'
                        : 'text-slate-600 hover:text-blue-800 hover:bg-blue-50/70'
                    }`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {item.label}
                    {hasChildren && <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />}
                  </a>

                  {/* Dropdown submenu */}
                  {hasChildren && (
                    <div className={`absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-slate-100 overflow-hidden transition-all duration-200 ${
                      isDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                    }`}>
                      {item.children!.map((child, j) => (
                        <a
                          key={j}
                          href={child.href}
                          onClick={(e) => {
                            handleNavClick(e, child.href)
                            setOpenDropdown(null)
                          }}
                          className="block px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <Link
              href="/login"
              className="ml-3 inline-flex items-center gap-2 px-5 lg:px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-800 text-white hover:bg-blue-900 shadow-lg shadow-blue-800/20 hover:shadow-blue-800/30 transition-all duration-300"
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
    </header>

    {/* ====== MOBILE MENU — fora do header ====== */}
    <div
      className={`md:hidden fixed inset-0 z-[9999] transition-all duration-300 ${
        menuOpen ? 'visible' : 'invisible'
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <div
        className={`absolute top-0 right-0 h-full w-full sm:max-w-sm bg-white shadow-2xl transition-transform duration-300 overflow-y-auto ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Topo */}
        <div className="bg-white px-5 pt-2 pb-3 border-b border-slate-200">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              aria-label="Fechar menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-5">
            <img src="/logo-semed.png" alt="SEMED" className="h-16 w-auto object-contain" />
            <div className="w-px h-12 bg-slate-200 flex-shrink-0" />
            <img src="/logo-prefeitura.png" alt="Prefeitura" className="h-16 w-auto object-contain" />
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-center">
            <p className="text-sm text-blue-900 font-bold">Secretaria Municipal de Educação</p>
            <p className="text-[11px] text-slate-500 mt-0.5">São Sebastião da Boa Vista — Pará</p>
          </div>
        </div>

        {/* Links */}
        <nav className="px-3 py-2" aria-label="Menu mobile">
          <div className="divide-y divide-slate-100">
            {mobileNav.map((item, i) => (
              <a
                key={i}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="flex items-center px-4 py-2.5 text-[15px] font-medium text-slate-700 hover:text-blue-800 hover:bg-blue-50 active:bg-blue-100 transition-all duration-150"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-3 px-2 pb-4">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-800 text-white font-bold text-base shadow-lg shadow-blue-800/25 hover:bg-blue-900 transition-all duration-200"
            >
              Entrar
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </nav>
      </div>
    </div>
    </>
  )
}
