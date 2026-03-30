'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown, School, Users, BookOpen, GraduationCap, PenTool, Globe, Star } from 'lucide-react'
import Link from 'next/link'

interface SiteHeroProps {
  data: any
}

export default function SiteHero({ data }: SiteHeroProps) {
  const [visible, setVisible] = useState(false)

  const title = data?.title || 'Transformando vidas pela educação'
  const subtitle = data?.subtitle || 'SEMED - São Sebastião da Boa Vista'
  const description = data?.description ||
    'A Secretaria Municipal de Educação trabalha para garantir uma educação inclusiva, equitativa e de qualidade, promovendo oportunidades de aprendizagem ao longo da vida para todos os alunos do município.'
  const ctaPrimary = data?.ctaPrimary || { label: 'Portal do Educador', href: '/login' }
  const ctaSecondary = data?.ctaSecondary || { label: 'Consultar Boletim', href: '/boletim' }

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleScrollDown = () => {
    const sobre = document.querySelector('#sobre')
    if (sobre) sobre.scrollIntoView({ behavior: 'smooth' })
  }

  const gridIcons = [
    { icon: School, label: 'Escolas' },
    { icon: Users, label: 'Alunos' },
    { icon: BookOpen, label: 'Ensino' },
    { icon: GraduationCap, label: 'Formação' },
    { icon: PenTool, label: 'Avaliação' },
    { icon: Globe, label: 'Inclusão' },
    { icon: Star, label: 'Qualidade' },
    { icon: GraduationCap, label: 'SEMED' },
    { icon: BookOpen, label: 'Currículo' },
  ]

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-blue-50/60 to-white pt-20" aria-label="Seção principal">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #1e40af 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      {/* Decorative blurs */}
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-50/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <div className={`transition-all duration-1000 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-sm font-semibold mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-700 animate-pulse" />
              {subtitle}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900">
              {title}
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-slate-500 mb-10 leading-relaxed max-w-xl">
              {description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-16">
              <Link
                href={ctaPrimary.href}
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-blue-800 text-white font-bold rounded-full text-lg hover:bg-blue-900 transition-all duration-300 shadow-lg shadow-blue-800/25 hover:shadow-blue-800/40 hover:-translate-y-0.5"
              >
                {ctaPrimary.label}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href={ctaSecondary.href}
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-200 text-slate-700 font-semibold rounded-full text-lg hover:border-blue-300 hover:text-blue-800 hover:bg-blue-50/50 transition-all duration-300"
              >
                {ctaSecondary.label}
              </Link>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-10 sm:gap-14 border-t border-slate-200/80 pt-8">
              {[
                { value: '30+', label: 'Escolas' },
                { value: '5.000+', label: 'Alunos' },
                { value: '200+', label: 'Turmas' },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{stat.value}</p>
                  <p className="text-sm font-medium text-slate-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Icon grid illustration (desktop only) */}
          <div className={`hidden lg:block transition-all duration-1000 delay-300 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`} aria-hidden="true">
            <div className="relative w-full max-w-md mx-auto">
              {/* Background circle */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-blue-50/30 rounded-3xl" />

              {/* 3x3 Icon Grid */}
              <div className="relative grid grid-cols-3 gap-4 p-8">
                {gridIcons.map((item, i) => {
                  const Icon = item.icon
                  const isCenter = i === 4
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-500 ${
                        isCenter
                          ? 'bg-blue-800 text-white shadow-xl shadow-blue-800/30'
                          : 'bg-white border border-slate-100 text-slate-600 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-700/10 hover:-translate-y-1'
                      }`}
                    >
                      <Icon className={`w-7 h-7 ${isCenter ? 'text-white' : 'text-blue-800'}`} />
                      <span className={`text-xs font-bold ${isCenter ? 'text-blue-100' : 'text-slate-500'}`}>{item.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Decorative dots */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-amber-400 rounded-full opacity-60" />
              <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-blue-400 rounded-full opacity-40" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <button
        onClick={handleScrollDown}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-slate-300 hover:text-blue-700 transition-colors animate-bounce"
        aria-label="Rolar para baixo"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  )
}
