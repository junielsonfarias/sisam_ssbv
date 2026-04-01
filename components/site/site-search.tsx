'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, School, Newspaper, FileText, HelpCircle, ArrowRight } from 'lucide-react'

/** Categorias de resultado de busca */
type CategoriaResultado = 'escolas' | 'noticias' | 'publicacoes' | 'faq' | 'menu'

interface ResultadoBusca {
  categoria: CategoriaResultado
  titulo: string
  descricao?: string
  href?: string
}

interface SiteSearchProps {
  aberto: boolean
  onFechar: () => void
  escolas?: Array<{ nome?: string; name?: string; endereco?: string; address?: string }>
  menuItems?: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>
  faqPerguntas?: Array<{ pergunta: string; resposta: string }>
}

/** Ícones por categoria */
const iconeCategoria: Record<CategoriaResultado, typeof School> = {
  escolas: School,
  noticias: Newspaper,
  publicacoes: FileText,
  faq: HelpCircle,
  menu: ArrowRight,
}

/** Labels em PT-BR */
const labelCategoria: Record<CategoriaResultado, string> = {
  escolas: 'Escolas',
  noticias: 'Notícias',
  publicacoes: 'Publicações',
  faq: 'Perguntas Frequentes',
  menu: 'Navegação',
}

export default function SiteSearch({ aberto, onFechar, escolas = [], menuItems = [], faqPerguntas = [] }: SiteSearchProps) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Buscar resultados localmente
  const buscar = useCallback((query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setResultados([])
      return
    }

    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const encontrados: ResultadoBusca[] = []

    // Buscar nas escolas
    escolas.forEach(e => {
      const nome = e.nome || e.name || ''
      const endereco = e.endereco || e.address || ''
      const textoNorm = (nome + ' ' + endereco).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (textoNorm.includes(q)) {
        encontrados.push({ categoria: 'escolas', titulo: nome, descricao: endereco, href: '#escolas' })
      }
    })

    // Buscar no menu
    menuItems.forEach(item => {
      const labelNorm = item.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (labelNorm.includes(q)) {
        encontrados.push({ categoria: 'menu', titulo: item.label, href: item.href })
      }
      item.children?.forEach(child => {
        const childNorm = child.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (childNorm.includes(q)) {
          encontrados.push({ categoria: 'menu', titulo: child.label, href: child.href })
        }
      })
    })

    // Buscar no FAQ
    faqPerguntas.forEach(faq => {
      const textoNorm = (faq.pergunta + ' ' + faq.resposta).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (textoNorm.includes(q)) {
        encontrados.push({ categoria: 'faq', titulo: faq.pergunta, descricao: faq.resposta.substring(0, 100) + '...', href: '#faq' })
      }
    })

    setResultados(encontrados.slice(0, 20))
  }, [escolas, menuItems, faqPerguntas])

  // Focar input ao abrir
  useEffect(() => {
    if (aberto) {
      setTermo('')
      setResultados([])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [aberto])

  // Fechar com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aberto) {
        onFechar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aberto, onFechar])

  // Atalho Ctrl+K / Cmd+K (gerenciado pelo header — aqui só captura para fechar)
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [aberto])

  const handleChangeTermo = (valor: string) => {
    setTermo(valor)
    buscar(valor)
  }

  const handleClickResultado = (href?: string) => {
    onFechar()
    if (href?.startsWith('#')) {
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else if (href) {
      window.location.href = href
    }
  }

  // Agrupar resultados por categoria
  const agrupados = resultados.reduce<Record<CategoriaResultado, ResultadoBusca[]>>((acc, r) => {
    if (!acc[r.categoria]) acc[r.categoria] = []
    acc[r.categoria].push(r)
    return acc
  }, {} as Record<CategoriaResultado, ResultadoBusca[]>)

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh] sm:pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Busca no site"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onFechar}
        aria-hidden="true"
      />

      {/* Modal de busca */}
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Campo de busca */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={termo}
            onChange={(e) => handleChangeTermo(e.target.value)}
            placeholder="Buscar escolas, notícias, perguntas..."
            className="flex-1 bg-transparent text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            aria-label="Termo de busca"
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
              ESC
            </kbd>
            <button
              onClick={onFechar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Fechar busca"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto">
          {termo.length >= 2 && resultados.length === 0 && (
            <div className="px-5 py-10 text-center">
              <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Nenhum resultado encontrado para &quot;{termo}&quot;
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Tente buscar por escolas, serviços ou perguntas frequentes
              </p>
            </div>
          )}

          {termo.length < 2 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Digite pelo menos 2 caracteres para buscar
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['Matrícula', 'Boletim', 'Escolas', 'Horário'].map(sugestao => (
                  <button
                    key={sugestao}
                    onClick={() => handleChangeTermo(sugestao)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {Object.entries(agrupados).map(([categoria, items]) => {
            const Icone = iconeCategoria[categoria as CategoriaResultado]
            const label = labelCategoria[categoria as CategoriaResultado]
            return (
              <div key={categoria} className="border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                <div className="px-5 py-2 bg-slate-50 dark:bg-slate-900/50">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Icone className="w-3.5 h-3.5" />
                    {label}
                  </p>
                </div>
                {items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleClickResultado(item.href)}
                    className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Icone className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        {item.titulo}
                      </p>
                      {item.descricao && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {item.descricao}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {/* Rodapé */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {resultados.length > 0 ? `${resultados.length} resultado(s)` : 'Busca no site'}
          </p>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <kbd className="px-1.5 py-0.5 font-mono font-semibold bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
              Ctrl
            </kbd>
            +
            <kbd className="px-1.5 py-0.5 font-mono font-semibold bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
              K
            </kbd>
            para buscar
          </div>
        </div>
      </div>
    </div>
  )
}
