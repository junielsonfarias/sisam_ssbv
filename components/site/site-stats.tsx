'use client'

import { useEffect, useRef, useState } from 'react'
import { School, Users, BookOpen, GraduationCap } from 'lucide-react'

interface SiteStatsProps {
  data: any
  stats: {
    escolas: number
    alunos: number
    turmas: number
    professores: number
  }
}

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const start = Date.now()
          const animate = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{count.toLocaleString('pt-BR')}</span>
}

export default function SiteStats({ data, stats }: SiteStatsProps) {
  const title = data?.title || 'Educatec em Numeros'
  const subtitle = data?.subtitle || 'Acompanhe o alcance da nossa plataforma educacional'

  const items = [
    {
      icon: School,
      value: stats.escolas || 0,
      label: 'Escolas Cadastradas',
    },
    {
      icon: Users,
      value: stats.alunos || 0,
      label: 'Alunos Matriculados',
    },
    {
      icon: BookOpen,
      value: stats.turmas || 0,
      label: 'Turmas Ativas',
    },
    {
      icon: GraduationCap,
      value: stats.professores || 0,
      label: 'Professores',
    },
  ]

  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      {/* Colored glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-4">Nossos numeros</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">{title}</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {items.map((item, i) => (
            <div
              key={i}
              className="relative group text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-500"
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-500/30 transition-colors duration-300">
                <item.icon className="w-8 h-8 text-emerald-400" />
              </div>

              {/* Number */}
              <p className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">
                <AnimatedCounter target={item.value} />
              </p>

              {/* Label */}
              <p className="text-sm sm:text-base font-medium text-slate-400">{item.label}</p>

              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
