'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Menu, X, ArrowRight, ChevronDown, Search } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import SiteSearch from '@/components/site/site-search'

interface MenuItem {
  label: string
  href: string
  ordem?: number
  visivel?: boolean
  abrir_nova_aba?: boolean
  children?: MenuItem[]
}

interface SiteHeaderProps {
  data: any
  menuData?: {
    logo_semed_url?: string
    logo_prefeitura_url?: string
    items?: MenuItem[]
  }
  escolas?: Array<{ nome?: string; name?: string; endereco?: string; address?: string }>
  faqPerguntas?: Array<{ pergunta: string; resposta: string }>
}

// Menu padrão caso não haja configuração no banco
const defaultMenuItems: MenuItem[] = [
  { label: 'Sobre', href: '#sobre' },
  {
    label: 'Serviços', href: '#servicos',
    children: [
      { label: 'Boletim Online', href: '/boletim' },
      { label: 'Pré-Matrícula', href: '/matricula' },
      { label: 'Ouvidoria', href: '/ouvidoria' },
    ],
  },
  { label: 'Escolas', href: '#escolas' },
  { label: 'Notícias', href: '#noticias' },
  {
    label: 'Institucional', href: '#',
    children: [
      { label: 'Publicações', href: '/publicacoes' },
      { label: 'Transparência', href: '/transparencia' },
      { label: 'Eventos', href: '/eventos' },
    ],
  },
  { label: 'Contato', href: '#contato' },
]

export default function SiteHeader({ data, menuData, escolas = [], faqPerguntas = [] }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null)

  // Atalho Ctrl+K / Cmd+K para abrir busca
  const handleAtalhosBusca = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setBuscaAberta(prev => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleAtalhosBusca)
    return () => window.removeEventListener('keydown', handleAtalhosBusca)
  }, [handleAtalhosBusca])

  // Configuração do menu dinâmico
  const logoSemedUrl = menuData?.logo_semed_url || '/'
  const logoPrefeituraUrl = menuData?.logo_prefeitura_url || 'https://saosebastiaodaboavista.pa.gov.br'

  // Itens do menu: do banco (filtrados por visível) ou fallback
  const rawItems = menuData?.items?.length ? menuData.items : defaultMenuItems
  const desktopNav = rawItems
    .filter(item => item.visivel !== false)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map(item => ({
      ...item,
      children: item.children
        ?.filter(c => c.visivel !== false)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)) || [],
    }))

  // Menu mobile: lista plana com itens + filhos
  const mobileNav = desktopNav.reduce<MenuItem[]>((acc, item) => {
    acc.push(item)
    if (item.children?.length) {
      item.children.forEach(child => acc.push(child))
    }
    return acc
  }, [])

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

  const isExternal = (href: string) => href.startsWith('http')

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg shadow-slate-900/5'
          : 'bg-white dark:bg-slate-900'
      }`}
      role="banner"
    >
      {/* ====== BARRA INSTITUCIONAL AZUL ====== */}
      <div className={`bg-blue-900 text-white text-center transition-all duration-500 ${scrolled ? 'py-1 text-[11px] sm:text-xs' : 'py-1.5 text-xs sm:text-sm'} font-semibold tracking-wide`}>
        Secretaria Municipal de Educação — São Sebastião da Boa Vista/PA
      </div>

      {/* ====== LINHA DAS LOGOS ====== */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-500 ${
          scrolled ? 'h-14 sm:h-16' : 'h-20 sm:h-24'
        }`}>
          {/* Logos — cada uma com seu link próprio */}
          <div className="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-4 sm:gap-5 group">
            <a
              href={logoSemedUrl}
              onClick={(e) => {
                if (logoSemedUrl === '/' || logoSemedUrl.startsWith('#')) {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }}
              target={isExternal(logoSemedUrl) ? '_blank' : undefined}
              rel={isExternal(logoSemedUrl) ? 'noopener noreferrer' : undefined}
              aria-label="SEMED — Ir para página inicial"
              className="flex-shrink-0"
            >
              <Image
                src="/logo-semed.png"
                alt="SEMED"
                width={80}
                height={80}
                className={`w-auto object-contain transition-all duration-500 hover:opacity-80 ${scrolled ? 'h-10 sm:h-12' : 'h-16 sm:h-20'}`}
              />
            </a>
            <div className={`w-px bg-slate-300 dark:bg-slate-600 flex-shrink-0 transition-all duration-500 ${scrolled ? 'h-7 sm:h-9' : 'h-12 sm:h-16'}`} />
            <a
              href={logoPrefeituraUrl}
              target={isExternal(logoPrefeituraUrl) ? '_blank' : '_self'}
              rel={isExternal(logoPrefeituraUrl) ? 'noopener noreferrer' : undefined}
              aria-label="Prefeitura de São Sebastião da Boa Vista"
              className="flex-shrink-0"
            >
              <Image
                src="/logo-prefeitura.png"
                alt="Prefeitura de São Sebastião da Boa Vista"
                width={80}
                height={80}
                className={`w-auto object-contain transition-all duration-500 hover:opacity-80 ${scrolled ? 'h-10 sm:h-12' : 'h-16 sm:h-20'}`}
              />
            </a>
          </div>

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
                      if (hasChildren && (item.href === '#' || !item.href)) {
                        e.preventDefault()
                      } else {
                        handleNavClick(e, item.href)
                      }
                    }}
                    target={item.abrir_nova_aba ? '_blank' : undefined}
                    rel={item.abrir_nova_aba ? 'noopener noreferrer' : undefined}
                    className={`relative inline-flex items-center gap-1 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'
                        : 'text-slate-600 dark:text-slate-300 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50/70 dark:hover:bg-blue-900/20'
                    }`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {item.label}
                    {hasChildren && <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />}
                  </a>

                  {/* Dropdown submenu */}
                  {hasChildren && (
                    <div className={`absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-900/10 border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-200 ${
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
                          target={child.abrir_nova_aba ? '_blank' : undefined}
                          rel={child.abrir_nova_aba ? 'noopener noreferrer' : undefined}
                          className="block px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <button
              onClick={() => setBuscaAberta(true)}
              className="ml-2 p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              aria-label="Buscar no site (Ctrl+K)"
              title="Buscar (Ctrl+K)"
            >
              <Search className="w-5 h-5" />
            </button>
            <Link
              href="/login"
              className="ml-1 inline-flex items-center gap-2 px-5 lg:px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-800 text-white hover:bg-blue-900 shadow-lg shadow-blue-800/20 hover:shadow-blue-800/30 transition-all duration-300"
            >
              Entrar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>

          {/* Mobile: Busca + Menu */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setBuscaAberta(true)}
              className="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Buscar no site"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* ====== MOBILE MENU ====== */}
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
        className={`absolute top-0 right-0 h-full w-full sm:max-w-sm bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 overflow-y-auto ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Topo */}
        <div className="bg-white dark:bg-slate-900 px-5 pt-2 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Fechar menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-5">
            <a href={logoSemedUrl} target={isExternal(logoSemedUrl) ? '_blank' : undefined} rel={isExternal(logoSemedUrl) ? 'noopener noreferrer' : undefined}>
              <Image src="/logo-semed.png" alt="SEMED" width={64} height={64} className="h-16 w-auto object-contain" />
            </a>
            <div className="w-px h-12 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            <a href={logoPrefeituraUrl} target={isExternal(logoPrefeituraUrl) ? '_blank' : undefined} rel={isExternal(logoPrefeituraUrl) ? 'noopener noreferrer' : undefined}>
              <Image src="/logo-prefeitura.png" alt="Prefeitura" width={64} height={64} className="h-16 w-auto object-contain" />
            </a>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 text-center">
            <p className="text-sm text-blue-900 dark:text-blue-300 font-bold">Secretaria Municipal de Educação</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">São Sebastião da Boa Vista — Pará</p>
          </div>
        </div>

        {/* Links */}
        <nav className="px-3 py-2" aria-label="Menu mobile">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {mobileNav.map((item, i) => (
              <a
                key={i}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                target={item.abrir_nova_aba ? '_blank' : undefined}
                rel={item.abrir_nova_aba ? 'noopener noreferrer' : undefined}
                className="flex items-center px-4 py-2.5 text-[15px] font-medium text-slate-700 dark:text-slate-200 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100 dark:active:bg-blue-900/50 transition-all duration-150"
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

    {/* Modal de busca */}
    <SiteSearch
      aberto={buscaAberta}
      onFechar={() => setBuscaAberta(false)}
      escolas={escolas}
      menuItems={desktopNav}
      faqPerguntas={faqPerguntas}
    />
    </>
  )
}
