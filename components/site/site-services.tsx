'use client'

import {
  ClipboardCheck,
  School,
  Fingerprint,
  Camera,
  BarChart3,
  UserCircle,
} from 'lucide-react'

interface SiteServicesProps {
  data: any
}

const defaultServices = [
  {
    icon: 'School',
    title: 'Educacao Infantil e Fundamental',
    description:
      'Gestao das escolas municipais de educacao infantil e ensino fundamental (1 ao 9 ano), garantindo acesso e qualidade de ensino.',
  },
  {
    icon: 'ClipboardCheck',
    title: 'Acompanhamento Pedagogico',
    description:
      'Monitoramento continuo do desempenho dos alunos com avaliacoes diagnosticas, analises por disciplina e niveis de aprendizagem.',
  },
  {
    icon: 'UserCircle',
    title: 'Formacao de Professores',
    description:
      'Programas de formacao continuada para os profissionais da educacao, visando a melhoria constante das praticas pedagogicas.',
  },
  {
    icon: 'Fingerprint',
    title: 'Frequencia e Permanencia',
    description:
      'Controle digital de frequencia escolar com alertas de infrequencia e acoes para garantir a permanencia dos alunos na escola.',
  },
  {
    icon: 'BarChart3',
    title: 'Gestao por Resultados',
    description:
      'Dashboards e relatorios detalhados que permitem a tomada de decisoes baseadas em dados sobre o desempenho educacional do municipio.',
  },
  {
    icon: 'Camera',
    title: 'Inclusao e Acessibilidade',
    description:
      'Programas voltados para alunos PCD e atendimento especializado, promovendo a inclusao e o respeito a diversidade em todas as escolas.',
  },
]

const iconMap: Record<string, any> = {
  ClipboardCheck,
  School,
  Fingerprint,
  Camera,
  BarChart3,
  UserCircle,
}

export default function SiteServices({ data }: SiteServicesProps) {
  const title = data?.title || 'Nossos Servicos'
  const subtitle = data?.subtitle || 'Ferramentas completas para a gestao educacional moderna'
  const services = data?.services || defaultServices

  return (
    <section id="servicos" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">O que oferecemos</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">{title}</h2>
          {/* Emerald underline decoration */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-1 bg-emerald-300 rounded-full" />
            <div className="w-16 h-1 bg-emerald-500 rounded-full" />
            <div className="w-8 h-1 bg-emerald-300 rounded-full" />
          </div>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Services Grid - 3x2 */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service: any, i: number) => {
            const Icon = iconMap[service.icon] || ClipboardCheck
            return (
              <div
                key={i}
                className="group relative bg-white rounded-2xl p-8 border border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-2"
              >
                {/* Icon circle */}
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-emerald-600 group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-500">
                  <Icon className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors duration-500" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-500 leading-relaxed">{service.description}</p>

                {/* Bottom accent line that appears on hover */}
                <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
