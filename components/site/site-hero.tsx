'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown, School, Users, BarChart3, BookOpen, Award, GraduationCap } from 'lucide-react'
import Link from 'next/link'

interface SiteHeroProps {
  data: any
}

export default function SiteHero({ data }: SiteHeroProps) {
  const [visible, setVisible] = useState(false)

  const title = data?.title || 'Educacao publica de qualidade para todos'
  const subtitle = data?.subtitle || 'SEMED - Sao Sebastiao da Boa Vista'
  const description = data?.description ||
    'A Secretaria Municipal de Educacao trabalha para garantir uma educacao inclusiva, equitativa e de qualidade, promovendo oportunidades de aprendizagem ao longo da vida para todos os alunos do municipio.'
  const ctaPrimary = data?.ctaPrimary || { label: 'Portal do Educador', href: '/login' }
  const ctaSecondary = data?.ctaSecondary || { label: 'Conheca a SEMED', href: '#sobre' }

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleScrollDown = () => {
    const sobre = document.querySelector('#sobre')
    if (sobre) sobre.scrollIntoView({ behavior: 'smooth' })
  }

  const floatingCards = [
    { icon: School, label: 'Nossas Escolas', color: 'from-emerald-400 to-emerald-500', delay: '0s' },
    { icon: Users, label: 'Nossos Alunos', color: 'from-blue-400 to-blue-500', delay: '0.5s' },
    { icon: BookOpen, label: 'Ensino', color: 'from-amber-400 to-amber-500', delay: '1s' },
    { icon: Award, label: 'Qualidade', color: 'from-purple-400 to-purple-500', delay: '1.5s' },
  ]

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-20">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #059669 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }} />

      {/* Decorative shapes */}
      <div className="absolute top-32 right-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-60" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-60" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-40" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 lg:py-0">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center">
          {/* Left content - 60% */}
          <div className={`lg:col-span-3 transition-all duration-1000 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Secretaria Municipal de Educacao
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              <span className="text-slate-900">{title.includes('qualidade') ? 'Educacao publica de ' : ''}</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500">{title.includes('qualidade') ? 'qualidade' : title}</span>
              <span className="text-slate-900">{title.includes('qualidade') ? ' para todos' : ''}</span>
            </h1>

            {/* Subtitle badge */}
            <p className="text-lg sm:text-xl text-slate-500 mb-8 leading-relaxed max-w-2xl">
              {description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
              <Link
                href={ctaPrimary.href}
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-full text-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
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
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-200 text-slate-700 font-semibold rounded-full text-lg hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300"
              >
                {ctaSecondary.label}
              </a>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-8 sm:gap-12">
              {[
                { value: '30+', label: 'Escolas' },
                { value: '5.000+', label: 'Alunos' },
                { value: '200+', label: 'Turmas' },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stat.value}</p>
                  <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - floating cards */}
          <div className={`lg:col-span-2 hidden lg:block relative transition-all duration-1000 delay-300 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}>
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Central circle */}
              <div className="absolute inset-16 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/50 flex items-center justify-center">
                <div className="text-center">
                  <GraduationCap className="w-16 h-16 text-emerald-500 mx-auto mb-2" />
                  <span className="text-lg font-extrabold text-emerald-700">SEMED</span>
                </div>
              </div>

              {/* Floating cards */}
              {floatingCards.map((card, i) => {
                const positions = [
                  'top-0 left-4',
                  'top-4 right-0',
                  'bottom-4 right-4',
                  'bottom-0 left-0',
                ]
                return (
                  <div
                    key={i}
                    className={`absolute ${positions[i]} bg-white rounded-2xl p-4 shadow-xl shadow-slate-900/10 border border-slate-100 flex items-center gap-3 hover:-translate-y-1 transition-transform duration-300`}
                    style={{
                      animation: `float 6s ease-in-out infinite`,
                      animationDelay: card.delay,
                    }}
                  >
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{card.label}</span>
                  </div>
                )
              })}

              {/* Decorative ring */}
              <div className="absolute inset-8 rounded-full border-2 border-dashed border-emerald-200/40 animate-spin" style={{ animationDuration: '30s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <button
        onClick={handleScrollDown}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-slate-400 hover:text-emerald-500 transition-colors animate-bounce"
      >
        <ChevronDown className="w-8 h-8" />
      </button>

      {/* Float animation keyframes via inline style */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </section>
  )
}
