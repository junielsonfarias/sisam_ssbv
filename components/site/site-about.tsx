'use client'

import { Target, Eye, Heart } from 'lucide-react'

interface SiteAboutProps {
  data: any
}

export default function SiteAbout({ data }: SiteAboutProps) {
  const title = data?.title || 'Sobre a SEMED'
  const description = data?.description ||
    'A Secretaria Municipal de Educação de São Sebastião da Boa Vista atua na gestão das escolas públicas municipais, promovendo educação de qualidade.'
  const paragraphs = data?.paragraphs || [
    'Atuamos na gestão das escolas municipais, formação de professores, desenvolvimento de políticas educacionais e acompanhamento pedagógico.',
    'Com o compromisso de transformar vidas pela educação, investimos em tecnologia, formação continuada e infraestrutura escolar.'
  ]
  const mission = data?.mission || 'Garantir educação pública de qualidade, inclusiva e equitativa, promovendo o desenvolvimento integral dos estudantes de São Sebastião da Boa Vista.'
  const vision = data?.vision || 'Ser referência em educação municipal na região do Marajó, reconhecida pela excelência no ensino e valorização dos profissionais da educação.'
  const values = data?.values || 'Compromisso com a qualidade do ensino, transparência na gestão, valorização dos profissionais, inclusão e respeito à diversidade.'

  const cards = [
    { icon: Target, title: 'Missão', text: mission, accent: 'border-l-blue-700', iconBg: 'bg-blue-50', iconText: 'text-blue-700' },
    { icon: Eye, title: 'Visão', text: vision, accent: 'border-l-blue-500', iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
    { icon: Heart, title: 'Valores', text: values, accent: 'border-l-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  ]

  return (
    <section id="sobre" className="relative py-12 sm:py-28 bg-white overflow-hidden" aria-labelledby="about-title">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #1e40af 1px, transparent 0)',
        backgroundSize: '48px 48px'
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two-column layout: image placeholder + text */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-12 lg:gap-20 items-center mb-20">
          {/* Left - Image placeholder */}
          <div className="hidden lg:block relative" aria-hidden="true">
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 400 300" className="w-full h-full p-12 opacity-30">
                  {/* School building */}
                  <rect x="100" y="100" width="200" height="150" rx="8" fill="#1e40af" opacity="0.3" />
                  <rect x="130" y="130" width="40" height="50" rx="4" fill="#1e40af" opacity="0.2" />
                  <rect x="230" y="130" width="40" height="50" rx="4" fill="#1e40af" opacity="0.2" />
                  <rect x="175" y="170" width="50" height="80" rx="4" fill="#1e40af" opacity="0.25" />
                  {/* Roof */}
                  <path d="M80 105 L200 40 L320 105" fill="none" stroke="#1e40af" strokeWidth="4" opacity="0.3" />
                  {/* Flag */}
                  <line x1="200" y1="40" x2="200" y2="15" stroke="#1e40af" strokeWidth="2" opacity="0.3" />
                  <rect x="200" y="15" width="25" height="15" rx="2" fill="#f59e0b" opacity="0.3" />
                </svg>
              </div>
            </div>
            {/* Decorative accent */}
            <div className="hidden sm:block absolute -bottom-4 -right-4 w-24 h-24 bg-amber-100 rounded-2xl -z-10" />
            <div className="hidden sm:block absolute -top-4 -left-4 w-16 h-16 bg-blue-100 rounded-2xl -z-10" />
          </div>

          {/* Right - Text content */}
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-3">Quem somos</p>
            <h2 id="about-title" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              {title}
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed mb-6">
              {description}
            </p>
            {paragraphs.map((p: string, i: number) => (
              <p key={i} className="text-slate-600 leading-relaxed mb-4 last:mb-0">
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Mission, Vision, Values - horizontal cards with left accent border */}
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl p-5 sm:p-8 border border-slate-100 border-l-4 ${card.accent} hover:shadow-lg hover:shadow-slate-900/5 transition-all duration-300`}
            >
              <div className={`w-12 h-12 ${card.iconBg} rounded-2xl flex items-center justify-center mb-5`}>
                <card.icon className={`w-6 h-6 ${card.iconText}`} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
