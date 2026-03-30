'use client'

import { useState } from 'react'
import {
  School,
  ClipboardCheck,
  Fingerprint,
  FileText,
  UserCircle,
  Camera,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface SiteServicesProps {
  data: any
}

const defaultServices = [
  {
    icon: 'FileText',
    title: 'Boletim Online',
    description: 'Consulte notas, frequência e desempenho escolar dos alunos da rede municipal.',
    href: '/boletim',
  },
  {
    icon: 'ClipboardCheck',
    title: 'Pré-Matrícula',
    description: 'Realize a pré-matrícula dos alunos na rede municipal de ensino.',
    href: '/matricula',
  },
  {
    icon: 'MessageSquare',
    title: 'Ouvidoria',
    description: 'Canal de comunicação para sugestões, elogios e reclamações sobre a educação municipal.',
    href: '/ouvidoria',
  },
  {
    icon: 'School',
    title: 'Gestão Escolar',
    description: 'Sistema de gerenciamento das escolas, matrículas, turmas e acompanhamento da rede de ensino.',
  },
  {
    icon: 'Fingerprint',
    title: 'Frequência Digital',
    description: 'Controle de frequência escolar com reconhecimento facial e relatórios em tempo real.',
  },
  {
    icon: 'UserCircle',
    title: 'Portal do Professor',
    description: 'Portal para educadores com lançamento de notas, frequência e planejamento pedagógico.',
  },
]

const iconMap: Record<string, any> = {
  School,
  ClipboardCheck,
  Fingerprint,
  FileText,
  UserCircle,
  Camera,
  MessageSquare,
}

export default function SiteServices({ data }: SiteServicesProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const title = data?.title || 'Nossos Serviços'
  const subtitle = data?.subtitle || 'Ferramentas modernas para a gestão educacional do município'
  const services = data?.services || defaultServices

  return (
    <section id="servicos" className="py-10 sm:py-16 lg:py-20 bg-white" aria-labelledby="services-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">O que oferecemos</p>
          <h2 id="services-title" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">{title}</h2>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-1 bg-blue-300 rounded-full" />
            <div className="w-16 h-1 bg-blue-700 rounded-full" />
            <div className="w-8 h-1 bg-blue-300 rounded-full" />
          </div>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service: any, i: number) => {
            const Icon = iconMap[service.icon] || ClipboardCheck
            const hasLink = !!service.href
            const Wrapper = hasLink ? Link : 'div'
            const wrapperProps = hasLink ? { href: service.href } : {}

            return (
              <Wrapper
                key={i}
                {...wrapperProps as any}
                className={`group relative bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-700/5 transition-all duration-300 hover:-translate-y-1 ${i >= 3 && !mobileExpanded ? 'hidden sm:block' : ''} ${hasLink ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-800 group-hover:border-blue-800 transition-all duration-300">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-800 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-900 transition-colors flex items-center gap-2">
                      {service.title}
                      {hasLink && <ExternalLink className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </h3>
                    <p className="text-slate-500 leading-relaxed text-sm line-clamp-2">{service.description}</p>
                  </div>
                </div>
                {hasLink && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold text-blue-700 group-hover:text-blue-900 transition-colors">
                      Acessar serviço →
                    </span>
                  </div>
                )}
              </Wrapper>
            )
          })}
        </div>
        {!mobileExpanded && (
          <div className="flex justify-center mt-6 sm:hidden">
            <button
              onClick={() => setMobileExpanded(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-blue-200 text-blue-800 font-semibold hover:bg-blue-50 transition-colors"
            >
              Ver mais serviços
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
