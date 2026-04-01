'use client'

import { useRef } from 'react'
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react'

interface Depoimento {
  texto: string
  autor: string
  papel: string
}

interface SiteTestimonialsProps {
  data?: {
    title?: string
    subtitle?: string
    depoimentos?: Depoimento[]
  }
}

const depoimentosPadrao: Depoimento[] = [
  {
    texto: 'O SISAM transformou a forma como acompanho o desempenho dos meus filhos. Agora consigo ver as notas e a frequência sem precisar ir até a escola. É muito prático!',
    autor: 'Maria das Graças',
    papel: 'Mãe de aluno',
  },
  {
    texto: 'Como professor, o sistema me ajudou muito no lançamento de notas e no acompanhamento da turma. A interface é simples e posso acessar pelo celular, até quando estou na comunidade ribeirinha.',
    autor: 'Carlos Eduardo',
    papel: 'Professor',
  },
  {
    texto: 'A SEMED de São Sebastião da Boa Vista está de parabéns. A qualidade do ensino melhorou muito nos últimos anos. Meu filho está aprendendo a ler com muita dedicação da professora.',
    autor: 'Ana Paula',
    papel: 'Mãe de aluno',
  },
  {
    texto: 'Trabalho na gestão escolar e o SISAM facilitou demais o controle de matrículas, transferências e relatórios. Antes era tudo no papel, agora temos tudo organizado digitalmente.',
    autor: 'Professora Raimunda',
    papel: 'Gestora escolar',
  },
  {
    texto: 'Graças ao acompanhamento pedagógico do SISAM, conseguimos identificar alunos com dificuldade de aprendizagem e intervir mais cedo. Os resultados foram muito positivos.',
    autor: 'Marcos Antônio',
    papel: 'Coordenador pedagógico',
  },
  {
    texto: 'O boletim online é uma maravilha! Antes eu tinha que esperar a reunião de pais para saber as notas. Agora acompanho tudo pelo celular e fico mais tranquila.',
    autor: 'Francisca Souza',
    papel: 'Mãe de aluno',
  },
]

function CardDepoimento({ depoimento }: { depoimento: Depoimento }) {
  return (
    <div className="flex-shrink-0 w-[300px] sm:w-auto bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-700/5 transition-all duration-300">
      {/* Ícone de citação */}
      <div className="mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <Quote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Estrelas decorativas */}
      <div className="flex gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} className="w-4 h-4 text-amber-400 fill-amber-400" />
        ))}
      </div>

      {/* Texto do depoimento */}
      <blockquote className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5 line-clamp-5">
        &ldquo;{depoimento.texto}&rdquo;
      </blockquote>

      {/* Autor */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
        {/* Avatar com iniciais */}
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
            {depoimento.autor.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{depoimento.autor}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{depoimento.papel}</p>
        </div>
      </div>
    </div>
  )
}

export default function SiteTestimonials({ data }: SiteTestimonialsProps) {
  const titulo = data?.title || 'O que dizem sobre nós'
  const subtitulo = data?.subtitle || 'Depoimentos de quem faz parte da rede municipal de educação'
  const depoimentos = data?.depoimentos?.length ? data.depoimentos : depoimentosPadrao

  const scrollRef = useRef<HTMLDivElement>(null)

  const rolarCarrossel = (direcao: 'esquerda' | 'direita') => {
    if (!scrollRef.current) return
    const larguraScroll = 320
    scrollRef.current.scrollBy({
      left: direcao === 'direita' ? larguraScroll : -larguraScroll,
      behavior: 'smooth',
    })
  }

  return (
    <section
      id="depoimentos"
      className="py-10 sm:py-16 lg:py-20 bg-slate-50 dark:bg-slate-900/50"
      aria-labelledby="depoimentos-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Quote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-blue-400">
              Depoimentos
            </p>
          </div>
          <h2
            id="depoimentos-title"
            className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4"
          >
            {titulo}
          </h2>
          <p className="text-sm sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {subtitulo}
          </p>
        </div>

        {/* Grid desktop (oculto em mobile) */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {depoimentos.map((dep, i) => (
            <CardDepoimento key={i} depoimento={dep} />
          ))}
        </div>

        {/* Carrossel mobile (oculto em desktop) */}
        <div className="sm:hidden">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-none"
            role="region"
            aria-label="Carrossel de depoimentos"
          >
            {depoimentos.map((dep, i) => (
              <div key={i} className="snap-start">
                <CardDepoimento depoimento={dep} />
              </div>
            ))}
          </div>

          {/* Controles do carrossel */}
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => rolarCarrossel('esquerda')}
              className="p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => rolarCarrossel('direita')}
              className="p-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              aria-label="Próximo depoimento"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
