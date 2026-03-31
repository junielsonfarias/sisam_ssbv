'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Filter, ChevronLeft, ChevronRight, Building2, Calendar, ArrowRight, Download } from 'lucide-react'
import SiteHeader from '@/components/site/site-header'
import SiteFooter from '@/components/site/site-footer'

interface Publicacao {
  id: string
  tipo: string
  numero: string | null
  titulo: string
  descricao: string | null
  orgao: string
  data_publicacao: string
  ano_referencia: string | null
  url_arquivo: string | null
}

const TIPOS_DOCUMENTO = ['Portaria', 'Resolução', 'Decreto', 'Calendário Escolar', 'Ata', 'Parecer', 'Ofício', 'Edital', 'Comunicado']
const ORGAOS = ['SEMED', 'CACSFUNDEB', 'CAE', 'CME', 'Prefeitura Municipal']

const BADGE_COLORS: Record<string, string> = {
  'Portaria': 'bg-blue-100 text-blue-700',
  'Resolução': 'bg-purple-100 text-purple-700',
  'Decreto': 'bg-red-100 text-red-700',
  'Calendário Escolar': 'bg-blue-100 text-blue-700',
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

export default function PublicacoesPublicPage() {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroOrgao, setFiltroOrgao] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [total, setTotal] = useState(0)

  const anos = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i))

  const fetchPublicacoes = useCallback(async () => {
    try {
      setCarregando(true)
      const params = new URLSearchParams({ page: String(pagina), limit: '12' })
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (filtroOrgao) params.set('orgao', filtroOrgao)
      if (filtroAno) params.set('ano', filtroAno)

      const res = await fetch(`/api/publicacoes?${params}`)
      if (!res.ok) throw new Error('Erro')
      const data = await res.json()
      setPublicacoes(data.publicacoes || [])
      setTotalPaginas(data.totalPaginas || 1)
      setTotal(data.total || 0)
    } catch {
      setPublicacoes([])
    } finally {
      setCarregando(false)
    }
  }, [pagina, filtroTipo, filtroOrgao, filtroAno])

  useEffect(() => {
    fetchPublicacoes()
  }, [fetchPublicacoes])

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader data={{}} />

      {/* Hero */}
      <div className="pt-32 pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-4">Transparência</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Publicações Oficiais
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Portarias, resoluções, decretos e outros documentos oficiais da Secretaria Municipal de Educação
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Filtros */}
        <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-600">
            <Filter className="w-4 h-4" />
            Filtrar publicações
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={filtroTipo}
              onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1) }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Todos os tipos</option>
              {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filtroOrgao}
              onChange={(e) => { setFiltroOrgao(e.target.value); setPagina(1) }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Todos os órgãos</option>
              {ORGAOS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select
              value={filtroAno}
              onChange={(e) => { setFiltroAno(e.target.value); setPagina(1) }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Todos os anos</option>
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Resultado */}
        {carregando ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-slate-400 font-medium">Carregando publicações...</p>
          </div>
        ) : publicacoes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg font-semibold">Nenhuma publicação encontrada</p>
            <p className="text-slate-400 text-sm mt-2">Tente ajustar os filtros para encontrar o que procura.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-6">{total} publicação(ões) encontrada(s)</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicacoes.map((pub) => (
                <article
                  key={pub.id}
                  className="group bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-xl hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${BADGE_COLORS[pub.tipo] || 'bg-slate-100 text-slate-700'}`}>
                      {pub.tipo}
                    </span>
                    {pub.numero && (
                      <span className="text-xs font-mono text-slate-400">{pub.numero}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
                    {pub.titulo}
                  </h3>
                  {pub.descricao && (
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-4">{pub.descricao}</p>
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
                  {pub.url_arquivo ? (
                    <a
                      href={pub.url_arquivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Baixar documento
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Documento sem arquivo anexo</span>
                  )}
                </article>
              ))}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina <= 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="text-sm text-slate-500">
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina >= totalPaginas}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <SiteFooter data={{}} />
    </div>
  )
}
