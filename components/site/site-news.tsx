'use client'

import { Calendar, ArrowRight, Newspaper } from 'lucide-react'

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

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function SiteNews({ data }: SiteNewsProps) {
  const title = data?.title || 'Noticias e Atualizacoes'
  const subtitle = data?.subtitle || 'Fique por dentro das novidades do SISAM'
  const news = data?.news || defaultNews

  if (!news || news.length === 0) {
    return (
      <section id="noticias" className="py-20 sm:py-28 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">{title}</h2>
          <div className="mt-10 bg-white rounded-2xl p-12 border border-slate-100">
            <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Nenhuma noticia disponivel no momento.</p>
            <p className="text-slate-400 text-sm mt-2">Volte em breve para conferir as novidades.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="noticias" className="py-20 sm:py-28 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">{title}</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* News Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.slice(0, 6).map((item: any, i: number) => (
            <article
              key={i}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              {/* Color Bar */}
              <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />

              <div className="p-6">
                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                  <Calendar className="w-4 h-4" />
                  {formatDate(item.date)}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {item.title}
                </h3>

                {/* Excerpt */}
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-4">
                  {item.excerpt}
                </p>

                {/* Read More */}
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all">
                  Ler mais
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
