'use client'

import { Target, Eye, Heart, BookOpen, Users, TrendingUp } from 'lucide-react'

interface SiteAboutProps {
  data: any
}

export default function SiteAbout({ data }: SiteAboutProps) {
  const title = data?.title || 'Sobre a SEMED'
  const description = data?.description ||
    'A Secretaria Municipal de Educacao de Sao Sebastiao da Boa Vista - SEMED e o orgao responsavel por planejar, coordenar, executar e avaliar a politica educacional do municipio, garantindo o acesso e a permanencia de criancas e jovens na escola.'
  const paragraphs = data?.paragraphs || [
    'Atuamos na gestao das escolas municipais de educacao infantil e ensino fundamental, promovendo formacao continuada dos profissionais da educacao, acompanhamento pedagogico e programas de inclusao escolar.',
    'Com o compromisso de oferecer uma educacao publica de qualidade, a SEMED investe em infraestrutura, tecnologia educacional e valorizacao dos educadores para transformar a realidade da educacao no municipio.'
  ]
  const mission = data?.mission || 'Garantir educacao publica de qualidade, promovendo o desenvolvimento integral dos alunos por meio de politicas educacionais inclusivas e inovadoras.'
  const vision = data?.vision || 'Ser referencia em educacao municipal na regiao do Marajo, assegurando o pleno desenvolvimento dos alunos e a valorizacao dos profissionais da educacao.'
  const values = data?.values || 'Compromisso com a qualidade do ensino, inclusao e equidade, transparencia na gestao publica, valorizacao do profissional da educacao e respeito a diversidade.'

  const cards = [
    { icon: Target, title: 'Missao', text: mission, color: 'emerald' },
    { icon: Eye, title: 'Visao', text: vision, color: 'blue' },
    { icon: Heart, title: 'Valores', text: values, color: 'amber' },
  ]

  return (
    <section id="sobre" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top section with accent bar */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start mb-20">
          {/* Left - Title with accent */}
          <div>
            <div className="flex items-start gap-4 mb-8">
              <div className="w-1.5 h-20 bg-gradient-to-b from-emerald-500 to-emerald-300 rounded-full flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-3">Quem somos</p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
                  {title}
                </h2>
              </div>
            </div>
            <p className="text-lg text-slate-500 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Right - Content card */}
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
            {paragraphs.map((p: string, i: number) => (
              <p key={i} className="text-slate-600 leading-relaxed mb-4 last:mb-0">
                {p}
              </p>
            ))}
            {/* Mini stats inside */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-200">
              {[
                { icon: Users, label: 'Usuarios', value: '500+' },
                { icon: BookOpen, label: 'Avaliacoes', value: '1.000+' },
                { icon: TrendingUp, label: 'Eficiencia', value: '95%' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                    <stat.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-lg font-extrabold text-slate-800">{stat.value}</p>
                  <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mission, Vision, Values cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, i) => {
            const colorMap: Record<string, { border: string; iconBg: string; iconText: string }> = {
              emerald: { border: 'border-t-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
              blue: { border: 'border-t-blue-500', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
              amber: { border: 'border-t-amber-500', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
            }
            const colors = colorMap[card.color]
            return (
              <div
                key={i}
                className={`bg-white rounded-2xl p-8 border border-slate-100 border-t-4 ${colors.border} shadow-sm hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-300`}
              >
                <div className={`w-14 h-14 ${colors.iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                  <card.icon className={`w-7 h-7 ${colors.iconText}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
                <p className="text-slate-500 leading-relaxed">{card.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
