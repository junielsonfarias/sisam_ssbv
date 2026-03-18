'use client'

import { Target, Eye, BookOpen, Users } from 'lucide-react'

interface SiteAboutProps {
  data: any
}

export default function SiteAbout({ data }: SiteAboutProps) {
  const title = data?.title || 'Sobre o SISAM'
  const description = data?.description ||
    'O SISAM - Sistema de Avaliacao Municipal e uma plataforma tecnologica desenvolvida para transformar a gestao educacional do municipio, oferecendo ferramentas modernas de avaliacao, acompanhamento e analise de desempenho escolar.'
  const paragraphs = data?.paragraphs || [
    'Desenvolvido com as mais recentes tecnologias, o sistema permite que gestores, coordenadores e professores acompanhem em tempo real o desempenho dos alunos, identifiquem areas de melhoria e tomem decisoes baseadas em dados concretos.',
    'Com modulos integrados de avaliacao, frequencia digital e gestao escolar, o SISAM representa um marco na modernizacao da educacao publica municipal.'
  ]
  const mission = data?.mission || 'Promover a excelencia educacional por meio da tecnologia, fornecendo ferramentas que capacitem gestores e educadores a tomar decisoes informadas para a melhoria continua do ensino.'
  const vision = data?.vision || 'Ser referencia em tecnologia educacional municipal, contribuindo para uma educacao publica de qualidade acessivel a todos os alunos.'

  return (
    <section id="sobre" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two Columns */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">
          {/* Text Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              Conheca nossa plataforma
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-6 leading-tight">
              {title}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              {description}
            </p>
            {paragraphs.map((p: string, i: number) => (
              <p key={i} className="text-slate-500 leading-relaxed mb-4">
                {p}
              </p>
            ))}
          </div>

          {/* Illustration (SVG) */}
          <div className="relative">
            <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-8 flex items-center justify-center">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                {/* Background shapes */}
                <rect x="40" y="60" width="200" height="260" rx="16" fill="#3B82F6" opacity="0.1" />
                <rect x="60" y="80" width="200" height="260" rx="16" fill="#3B82F6" opacity="0.15" />
                {/* Main card */}
                <rect x="80" y="100" width="240" height="200" rx="16" fill="white" stroke="#3B82F6" strokeWidth="2" />
                {/* Chart bars */}
                <rect x="110" y="220" width="30" height="50" rx="4" fill="#3B82F6" opacity="0.3" />
                <rect x="150" y="190" width="30" height="80" rx="4" fill="#3B82F6" opacity="0.5" />
                <rect x="190" y="170" width="30" height="100" rx="4" fill="#3B82F6" opacity="0.7" />
                <rect x="230" y="150" width="30" height="120" rx="4" fill="#3B82F6" />
                <rect x="270" y="160" width="30" height="110" rx="4" fill="#10B981" />
                {/* Header line */}
                <rect x="110" y="120" width="120" height="8" rx="4" fill="#CBD5E1" />
                <rect x="110" y="136" width="80" height="6" rx="3" fill="#E2E8F0" />
                {/* Decorative circles */}
                <circle cx="330" cy="80" r="30" fill="#3B82F6" opacity="0.1" />
                <circle cx="60" cy="350" r="25" fill="#10B981" opacity="0.15" />
                {/* Trend line */}
                <path d="M 120 240 L 160 210 L 200 195 L 240 170 L 280 175" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                {/* Users icon area */}
                <circle cx="300" cy="120" r="20" fill="#EEF2FF" stroke="#3B82F6" strokeWidth="1.5" />
                <circle cx="300" cy="115" r="6" fill="#3B82F6" />
                <path d="M 290 130 Q 300 136 310 130" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
              </svg>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 sm:bottom-4 sm:right-0 bg-white rounded-xl shadow-xl border border-slate-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">+500</p>
                <p className="text-xs text-slate-500">Usuarios ativos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mission & Vision Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-5">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Missao</h3>
            <p className="text-slate-600 leading-relaxed">{mission}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mb-5">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Visao</h3>
            <p className="text-slate-600 leading-relaxed">{vision}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
