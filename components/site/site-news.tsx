'use client'

import { Calendar, ArrowRight, Newspaper, BookOpen } from 'lucide-react'

interface SiteNewsProps {
  data: any
}

const defaultNews = [
  {
    date: '2026-03-15',
    title: 'Abertura das Avaliações do 1º Bimestre',
    excerpt: 'As avaliações municipais do primeiro bimestre de 2026 já estão disponíveis no sistema para todas as escolas da rede.',
  },
  {
    date: '2026-03-10',
    title: 'Novo Módulo de Reconhecimento Facial',
    excerpt: 'O sistema agora conta com tecnologia de reconhecimento facial para registro automático de frequência escolar.',
  },
  {
    date: '2026-02-28',
    title: 'Capacitação de Gestores Escolares',
    excerpt: 'Foram realizadas sessões de treinamento com gestores e coordenadores para utilização das novas funcionalidades.',
  },
]

const gradientColors = [
  'from-blue-700 to-blue-900',
  'from-blue-500 to-blue-700',
  'from-amber-500 to-amber-700',
]

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDay(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', { day: '2-digit' })
  } catch {
    return ''
  }
}

function formatMonth(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
  } catch {
    return ''
  }
}

export default function SiteNews({ data }: SiteNewsProps) {
  const title = data?.title || 'Notícias e Atualizações'
  const subtitle = data?.subtitle || 'Fique por dentro das novidades da rede municipal de ensino'
  const news = data?.news || defaultNews

  if (!news || news.length === 0) {
    return (
      <section id="noticias" className="py-20 sm:py-28 bg-slate-50" aria-labelledby="news-title-empty">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">Notícias</p>
          <h2 id="news-title-empty" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">{title}</h2>
          <div className="mt-12 bg-white rounded-2xl p-16 border border-slate-100 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
              <Newspaper className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg font-semibold">Em breve</p>
            <p className="text-slate-400 text-sm mt-2">Novas notícias serão publicadas aqui.</p>
          </div>
        </div>
      </section>
    )
  }

  const featured = news[0]
  const secondary = news.slice(1, 3)

  return (
    <section id="noticias" className="py-8 sm:py-20 lg:py-24 bg-slate-50" aria-labelledby="news-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-4">Novidades</p>
            <h2 id="news-title" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">{title}</h2>
            <p className="text-base sm:text-lg text-slate-500 max-w-xl leading-relaxed">{subtitle}</p>
          </div>
          <a
            href="#"
            className="hidden sm:inline-flex items-center gap-2 text-blue-800 font-semibold hover:text-blue-900 transition-colors mt-4 sm:mt-0"
          >
            Ver todas as notícias
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Featured + Secondary layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Featured article (large) */}
          <article className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-300">
            {/* Image area */}
            <div className={`relative h-40 sm:h-64 lg:h-80 bg-gradient-to-br ${gradientColors[0]} flex items-center justify-center`}>
              <BookOpen className="w-16 h-16 text-white/20" />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              {/* Date badge */}
              <div className="absolute top-4 left-4 bg-white rounded-xl px-3 py-2 text-center shadow-lg">
                <p className="text-xl font-extrabold text-slate-900 leading-none">{formatDay(featured.date)}</p>
                <p className="text-xs font-bold text-blue-800 uppercase">{formatMonth(featured.date)}</p>
              </div>
            </div>
            <div className="p-4 sm:p-8">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(featured.date)}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-800 transition-colors duration-300 line-clamp-2">
                {featured.title}
              </h3>
              <p className="text-slate-500 leading-relaxed line-clamp-3 mb-6">
                {featured.excerpt}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-800 group-hover:gap-3 transition-all duration-300">
                Ler mais
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </article>

          {/* Secondary articles */}
          <div className="flex flex-col gap-6">
            {secondary.map((item: any, i: number) => (
              <article
                key={i}
                className="group flex-1 bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-300 flex flex-col sm:flex-row"
              >
                {/* Image area */}
                <div className={`hidden sm:flex relative sm:h-auto sm:w-48 flex-shrink-0 bg-gradient-to-br ${gradientColors[(i + 1) % gradientColors.length]} items-center justify-center`}>
                  <BookOpen className="w-10 h-10 text-white/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent sm:bg-gradient-to-r" />
                  {/* Date badge */}
                  <div className="absolute top-3 left-3 bg-white rounded-lg px-2.5 py-1.5 text-center shadow-md">
                    <p className="text-sm font-extrabold text-slate-900 leading-none">{formatDay(item.date)}</p>
                    <p className="text-[10px] font-bold text-blue-800 uppercase">{formatMonth(item.date)}</p>
                  </div>
                </div>
                <div className="p-4 sm:p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <Calendar className="w-3 h-3" />
                    {formatDate(item.date)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-800 transition-colors duration-300 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-3">
                    {item.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-800 group-hover:gap-3 transition-all duration-300">
                    Ler mais
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Mobile "Ver todas" */}
        <div className="flex justify-center mt-10 sm:hidden">
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-blue-200 text-blue-800 font-semibold hover:bg-blue-50 transition-colors"
          >
            Ver todas as notícias
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
