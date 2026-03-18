'use client'

import { Calendar, ArrowRight, Newspaper, BookOpen } from 'lucide-react'

interface SiteNewsProps {
  data: any
}

const defaultNews = [
  {
    date: '2026-03-15',
    title: 'Abertura das Avaliacoes do 1o Bimestre',
    excerpt: 'As avaliacoes municipais do primeiro bimestre de 2026 ja estao disponiveis no sistema para todas as escolas da rede.',
  },
  {
    date: '2026-03-10',
    title: 'Novo Modulo de Reconhecimento Facial',
    excerpt: 'O SISAM agora conta com tecnologia de reconhecimento facial para registro automatico de frequencia escolar.',
  },
  {
    date: '2026-02-28',
    title: 'Capacitacao de Gestores Escolares',
    excerpt: 'Foram realizadas sessoes de treinamento com gestores e coordenadores para utilizacao das novas funcionalidades.',
  },
]

const gradientColors = [
  'from-emerald-400 to-emerald-600',
  'from-blue-400 to-blue-600',
  'from-amber-400 to-amber-600',
  'from-purple-400 to-purple-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
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
  const title = data?.title || 'Noticias e Atualizacoes'
  const subtitle = data?.subtitle || 'Fique por dentro das novidades do SISAM'
  const news = data?.news || defaultNews

  if (!news || news.length === 0) {
    return (
      <section id="noticias" className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">Noticias</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">{title}</h2>
          <div className="mt-12 bg-white rounded-2xl p-16 border border-slate-100 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <Newspaper className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg font-medium">Nenhuma noticia disponivel no momento.</p>
            <p className="text-slate-400 text-sm mt-2">Volte em breve para conferir as novidades.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="noticias" className="py-24 sm:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with "Ver todas" */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">Novidades</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-2">{title}</h2>
            <p className="text-lg text-slate-500 max-w-xl">{subtitle}</p>
          </div>
          <a
            href="#"
            className="hidden sm:inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors mt-4 sm:mt-0"
          >
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* News Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.slice(0, 6).map((item: any, i: number) => (
            <article
              key={i}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-500 hover:-translate-y-1"
            >
              {/* Image placeholder area with gradient */}
              <div className={`relative h-48 bg-gradient-to-br ${gradientColors[i % gradientColors.length]} flex items-center justify-center`}>
                <BookOpen className="w-12 h-12 text-white/30" />
                {/* Date badge */}
                <div className="absolute top-4 left-4 bg-white rounded-xl px-3 py-2 text-center shadow-lg">
                  <p className="text-lg font-extrabold text-slate-900 leading-none">{formatDay(item.date)}</p>
                  <p className="text-xs font-bold text-emerald-600 uppercase">{formatMonth(item.date)}</p>
                </div>
              </div>

              <div className="p-6">
                {/* Date text */}
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(item.date)}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors duration-300 line-clamp-2">
                  {item.title}
                </h3>

                {/* Excerpt */}
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-5">
                  {item.excerpt}
                </p>

                {/* Read More */}
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 group-hover:gap-3 transition-all duration-300">
                  Ler mais
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Mobile "Ver todas" */}
        <div className="flex justify-center mt-10 sm:hidden">
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-emerald-200 text-emerald-600 font-semibold hover:bg-emerald-50 transition-colors"
          >
            Ver todas as noticias
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
