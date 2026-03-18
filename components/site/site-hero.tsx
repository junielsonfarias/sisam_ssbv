'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface SiteHeroProps {
  data: any
}

export default function SiteHero({ data }: SiteHeroProps) {
  const [visible, setVisible] = useState(false)

  const title = data?.title || 'SISAM'
  const subtitle = data?.subtitle || 'Sistema de Avaliacao Municipal'
  const description = data?.description ||
    'Plataforma integrada para gestao educacional, acompanhamento de desempenho escolar e avaliacao de aprendizagem do municipio.'
  const ctaPrimary = data?.ctaPrimary || { label: 'Acessar o Sistema', href: '/login' }
  const ctaSecondary = data?.ctaSecondary || { label: 'Saiba Mais', href: '#sobre' }

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleScrollDown = () => {
    const sobre = document.querySelector('#sobre')
    if (sobre) sobre.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-800 via-blue-800 to-blue-900" />

      {/* Decorative Shapes */}
      <svg className="absolute top-0 left-0 w-full h-full opacity-10" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <circle cx="200" cy="150" r="300" fill="white" />
        <circle cx="1000" cy="600" r="250" fill="white" />
        <circle cx="600" cy="400" r="150" fill="white" />
        <circle cx="100" cy="700" r="100" fill="white" />
        <circle cx="900" cy="100" r="80" fill="white" />
      </svg>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      {/* Gradient Overlay at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />

      {/* Content */}
      <div className={`relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1000 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-blue-200 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Plataforma Educacional Municipal
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-4">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-blue-200 mb-6">
          {subtitle}
        </p>

        {/* Description */}
        <p className="text-lg sm:text-xl text-blue-100/80 max-w-3xl mx-auto mb-10 leading-relaxed">
          {description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={ctaPrimary.href}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-bold rounded-xl text-lg hover:bg-blue-50 transition-all duration-200 shadow-xl shadow-black/20 hover:shadow-2xl hover:-translate-y-0.5"
          >
            {ctaPrimary.label}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href={ctaSecondary.href}
            onClick={(e) => {
              if (ctaSecondary.href.startsWith('#')) {
                e.preventDefault()
                const target = document.querySelector(ctaSecondary.href)
                if (target) target.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl text-lg hover:bg-white/10 hover:border-white/50 transition-all duration-200"
          >
            {ctaSecondary.label}
          </a>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <button
        onClick={handleScrollDown}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-white/60 hover:text-white transition-colors animate-bounce"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  )
}
