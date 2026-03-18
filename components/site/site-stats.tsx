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
            // Ease out cubic
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
  const title = data?.title || 'SISAM em Numeros'
  const subtitle = data?.subtitle || 'Acompanhe o alcance da nossa plataforma educacional'

  const items = [
    {
      icon: School,
      value: stats.escolas || 0,
      label: 'Escolas Cadastradas',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    {
      icon: Users,
      value: stats.alunos || 0,
      label: 'Alunos Matriculados',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-600',
    },
    {
      icon: BookOpen,
      value: stats.turmas || 0,
      label: 'Turmas Ativas',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
    {
      icon: GraduationCap,
      value: stats.professores || 0,
      label: 'Professores',
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-600',
    },
  ]

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">{title}</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-14 h-14 ${item.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                <item.icon className={`w-7 h-7 ${item.textColor}`} />
              </div>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-2">
                <AnimatedCounter target={item.value} />
              </p>
              <p className="text-sm sm:text-base text-slate-500 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
