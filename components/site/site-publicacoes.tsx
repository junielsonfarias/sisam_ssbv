'use client'

import { useState } from 'react'
import { FileText, ArrowRight, Building2, Calendar } from 'lucide-react'
import Link from 'next/link'

interface SitePublicacoesProps {
  publicacoes: any[]
}

const BADGE_COLORS: Record<string, string> = {
  'Portaria': 'bg-blue-100 text-blue-700',
  'Resolução': 'bg-purple-100 text-purple-700',
  'Decreto': 'bg-red-100 text-red-700',
  'Calendário Escolar': 'bg-blue-100 text-blue-900',
  'Ata': 'bg-amber-100 text-amber-700',
  'Parecer': 'bg-teal-100 text-teal-700',
  'Ofício': 'bg-orange-100 text-orange-700',
  'Edital': 'bg-pink-100 text-pink-700',
  'Comunicado': 'bg-cyan-100 text-cyan-700',
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function SitePublicacoes({ publicacoes }: SitePublicacoesProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false)

  if (!publicacoes || publicacoes.length === 0) {
    return (
      <section id="publicacoes" className="py-20 sm:py-28 bg-white" aria-labelledby="pub-title-empty">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">Transparência</p>
          <h2 id="pub-title-empty" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Publicações Oficiais
          </h2>
          <div className="mt-12 bg-slate-50 rounded-2xl p-16 border border-slate-100 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg font-semibold">Em breve</p>
            <p className="text-slate-400 text-sm mt-2">Publicações oficiais serão disponibilizadas aqui.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="publicacoes" className="py-8 sm:py-20 lg:py-24 bg-white" aria-labelledby="pub-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">Transparência</p>
            <h2 id="pub-title" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
              Publicações Oficiais
            </h2>
            <p className="text-base sm:text-lg text-slate-500 max-w-xl leading-relaxed">
              Portarias, resoluções, decretos e outros documentos oficiais da educação municipal
            </p>
          </div>
          <Link
            href="/publicacoes"
            className="hidden sm:inline-flex items-center gap-2 text-blue-800 font-semibold hover:text-blue-900 transition-colors mt-4 sm:mt-0"
          >
            Ver todas as publicações
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicacoes.map((pub: any, i: number) => (
            <article
              key={pub.id || i}
              className={`group bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-100 hover:shadow-xl hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-300 ${i >= 4 && !mobileExpanded ? 'hidden md:block' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${BADGE_COLORS[pub.tipo] || 'bg-slate-100 text-slate-700'}`}>
                  {pub.tipo}
                </span>
                {pub.numero && (
                  <span className="text-xs font-mono text-slate-400">{pub.numero}</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-800 transition-colors duration-300 line-clamp-2">
                {pub.titulo}
              </h3>
              {pub.descricao && (
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-4">{pub.descricao}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {pub.orgao}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(pub.data_publicacao)}
                </span>
              </div>
              {pub.url_arquivo && (
                <a
                  href={pub.url_arquivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-800 group-hover:gap-3 transition-all duration-300"
                >
                  Ver documento
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </article>
          ))}
        </div>
        {!mobileExpanded && publicacoes.length > 4 && (
          <div className="flex justify-center mt-6 md:hidden">
            <button
              onClick={() => setMobileExpanded(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-blue-200 text-blue-800 font-semibold hover:bg-blue-50 transition-colors"
            >
              Ver mais publicações
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        )}

        {/* Mobile link */}
        <div className="flex justify-center mt-10 sm:hidden">
          <Link
            href="/publicacoes"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-blue-200 text-blue-800 font-semibold hover:bg-blue-50 transition-colors"
          >
            Ver todas as publicações
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
