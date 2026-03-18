'use client'

import { useState, useEffect } from 'react'
import { Menu, X, GraduationCap, LogIn } from 'lucide-react'
import Link from 'next/link'

interface SiteHeaderProps {
  data: any
}

const defaultNav = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Servicos', href: '#servicos' },
  { label: 'Escolas', href: '#escolas' },
  { label: 'Noticias', href: '#noticias' },
  { label: 'Contato', href: '#contato' },
]

export default function SiteHeader({ data }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = data?.nav || defaultNav
  const logoText = data?.logoText || 'SEMED'
  const logoSubtext = data?.logoSubtext || 'Secretaria Municipal de Educacao'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-3"
          >
            <div className={`p-2 rounded-lg ${scrolled ? 'bg-blue-600' : 'bg-white/20'} transition-colors duration-300`}>
              <GraduationCap className={`w-7 h-7 ${scrolled ? 'text-white' : 'text-white'}`} />
            </div>
            <div>
              <span className={`text-xl font-bold tracking-tight ${scrolled ? 'text-slate-800' : 'text-white'} transition-colors duration-300`}>
                {logoText}
              </span>
              <p className={`text-xs hidden sm:block ${scrolled ? 'text-slate-500' : 'text-blue-200'} transition-colors duration-300`}>
                {logoSubtext}
              </p>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item: any, i: number) => (
              <a
                key={i}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  scrolled
                    ? 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              className={`ml-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                scrolled
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/25'
                  : 'bg-white text-blue-700 hover:bg-blue-50 shadow-md shadow-black/10'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Acessar Sistema
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
            }`}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-xl">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item: any, i: number) => (
              <a
                key={i}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="block px-4 py-3 rounded-lg text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 mt-3 px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Acessar Sistema
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
