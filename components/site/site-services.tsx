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
    icon: 'ClipboardCheck',
    title: 'Avaliacoes Municipais',
    description:
      'Sistema completo de avaliacoes padronizadas com analise de desempenho por niveis de proficiencia, questoes e descritores.',
  },
  {
    icon: 'School',
    title: 'Gestor Escolar',
    description:
      'Gestao integrada de escolas, turmas, matriculas e transferencias com painel administrativo completo.',
  },
  {
    icon: 'Fingerprint',
    title: 'Frequencia Digital',
    description:
      'Registro de presenca digital com controle por hora-aula, relatorios de frequencia e alertas de infrequencia.',
  },
  {
    icon: 'Camera',
    title: 'Reconhecimento Facial',
    description:
      'Tecnologia de reconhecimento facial para registro automatico de presenca, integrada ao sistema de frequencia.',
  },
  {
    icon: 'BarChart3',
    title: 'Relatorios e Analises',
    description:
      'Dashboards interativos, relatorios detalhados por escola, turma e aluno com exportacao em PDF e graficos.',
  },
  {
    icon: 'UserCircle',
    title: 'Portal do Aluno',
    description:
      'Acesso individual para consulta de notas, frequencia e desempenho nas avaliacoes municipais.',
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

const colorVariants = [
  { bg: 'bg-blue-100', text: 'text-blue-600', border: 'hover:border-blue-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'hover:border-emerald-200' },
  { bg: 'bg-purple-100', text: 'text-purple-600', border: 'hover:border-purple-200' },
  { bg: 'bg-rose-100', text: 'text-rose-600', border: 'hover:border-rose-200' },
  { bg: 'bg-amber-100', text: 'text-amber-600', border: 'hover:border-amber-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'hover:border-cyan-200' },
]

export default function SiteServices({ data }: SiteServicesProps) {
  const title = data?.title || 'Nossos Servicos'
  const subtitle = data?.subtitle || 'Ferramentas completas para a gestao educacional moderna'
  const services = data?.services || defaultServices

  return (
    <section id="servicos" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">{title}</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service: any, i: number) => {
            const variant = colorVariants[i % colorVariants.length]
            const Icon = iconMap[service.icon] || ClipboardCheck
            return (
              <div
                key={i}
                className={`group relative bg-white rounded-2xl p-8 border border-slate-100 ${variant.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`w-14 h-14 ${variant.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${variant.text}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{service.title}</h3>
                <p className="text-slate-500 leading-relaxed">{service.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
