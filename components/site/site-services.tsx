'use client'

import {
  School,
  ClipboardCheck,
  Fingerprint,
  FileText,
  UserCircle,
  Camera,
} from 'lucide-react'

interface SiteServicesProps {
  data: any
}

const defaultServices = [
  {
    icon: 'School',
    title: 'Gestão Escolar',
    description: 'Sistema completo para gerenciamento das escolas municipais, matrículas, turmas e acompanhamento de toda a rede de ensino.',
  },
  {
    icon: 'ClipboardCheck',
    title: 'Avaliação SISAM',
    description: 'Avaliações diagnósticas com análise por disciplina, níveis de aprendizagem e relatórios detalhados de desempenho.',
  },
  {
    icon: 'Fingerprint',
    title: 'Frequência Digital',
    description: 'Controle digital de frequência escolar com alertas de infrequência e ações para garantir a permanência dos alunos.',
  },
  {
    icon: 'FileText',
    title: 'Boletim Online',
    description: 'Consulta de boletim escolar online com notas, frequência e desempenho por disciplina acessível para pais e responsáveis.',
  },
  {
    icon: 'UserCircle',
    title: 'Portal do Professor',
    description: 'Portal dedicado para educadores com lançamento de notas, frequência, planejamento e acompanhamento pedagógico.',
  },
  {
    icon: 'Camera',
    title: 'Reconhecimento Facial',
    description: 'Tecnologia de reconhecimento facial para registro automático de frequência e identificação segura dos alunos.',
  },
]

const iconMap: Record<string, any> = {
  School,
  ClipboardCheck,
  Fingerprint,
  FileText,
  UserCircle,
  Camera,
}

export default function SiteServices({ data }: SiteServicesProps) {
  const title = data?.title || 'Nossos Serviços'
  const subtitle = data?.subtitle || 'Ferramentas modernas para a gestão educacional do município'
  const services = data?.services || defaultServices

  return (
    <section id="servicos" className="py-20 sm:py-28 bg-white" aria-labelledby="services-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">O que oferecemos</p>
          <h2 id="services-title" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">{title}</h2>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-1 bg-blue-300 rounded-full" />
            <div className="w-16 h-1 bg-blue-700 rounded-full" />
            <div className="w-8 h-1 bg-blue-300 rounded-full" />
          </div>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        </div>

        {/* Services Grid - 3x2 on desktop, 2x3 on tablet, 1 col on mobile */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service: any, i: number) => {
            const Icon = iconMap[service.icon] || ClipboardCheck
            return (
              <div
                key={i}
                className="group relative bg-white rounded-2xl p-8 border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-700/5 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Icon in colored circle */}
                <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 group-hover:bg-blue-800 group-hover:border-blue-800 group-hover:shadow-lg group-hover:shadow-blue-800/25 transition-all duration-300">
                  <Icon className="w-7 h-7 text-blue-800 group-hover:text-white transition-colors duration-300" />
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-blue-900 transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-500 leading-relaxed text-sm">{service.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
