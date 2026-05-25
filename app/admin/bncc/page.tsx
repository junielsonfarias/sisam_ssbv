'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, BookOpen, Filter, Loader2 } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Etapa { id: string; nome: string; ordem: number }
interface Componente { id: string; nome: string; abreviatura: string | null; area_id: string | null }
interface Habilidade {
  codigo: string
  descricao: string
  componente_id: string | null
  etapa_id: string | null
  ano: number | null
  campo_experiencia: string | null
  faixa_etaria: string | null
}

export default function BnccPage() {
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [habilidades, setHabilidades] = useState<Habilidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [buscando, setBuscando] = useState(false)

  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroComponente, setFiltroComponente] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    carregarEstrutura()
  }, [])

  useEffect(() => {
    const t = setTimeout(carregarHabilidades, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEtapa, filtroAno, filtroComponente, busca])

  const carregarEstrutura = async () => {
    try {
      const res = await fetch('/api/admin/bncc/estrutura')
      if (res.ok) {
        const data = await res.json()
        setEtapas(data.etapas || [])
        setComponentes(data.componentes || [])
      }
    } finally {
      setCarregando(false)
    }
  }

  const carregarHabilidades = async () => {
    setBuscando(true)
    try {
      const params = new URLSearchParams()
      if (filtroEtapa) params.set('etapa', filtroEtapa)
      if (filtroAno) params.set('ano', filtroAno)
      if (filtroComponente) params.set('componenteId', filtroComponente)
      if (busca.trim()) params.set('busca', busca.trim())
      params.set('limite', '200')

      const res = await fetch(`/api/admin/bncc/habilidades?${params}`)
      if (res.ok) {
        const data = await res.json()
        setHabilidades(data.habilidades || [])
      }
    } finally {
      setBuscando(false)
    }
  }

  const componentesFiltrados = useMemo(() => {
    if (!filtroEtapa) return componentes
    if (filtroEtapa === 'EI') return componentes.filter((c) => c.id.startsWith('EI_'))
    if (filtroEtapa === 'EF_AI') return componentes.filter((c) => c.id.endsWith('_AI'))
    if (filtroEtapa === 'EF_AF') return componentes.filter((c) => c.id.endsWith('_AF'))
    return componentes
  }, [componentes, filtroEtapa])

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'professor', 'escola']}>
        <LoadingSpinner centered />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'professor', 'escola']}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            BNCC — Base Nacional Comum Curricular
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Consulta às habilidades oficiais da BNCC para uso em planos de aula, questões e avaliações.
          </p>
        </header>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Etapa</label>
              <select
                value={filtroEtapa}
                onChange={(e) => { setFiltroEtapa(e.target.value); setFiltroComponente(''); setFiltroAno('') }}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano</label>
              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
                disabled={filtroEtapa === 'EI'}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">Todos</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((a) => <option key={a} value={a}>{a}º ano</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Componente</label>
              <select
                value={filtroComponente}
                onChange={(e) => setFiltroComponente(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {componentesFiltrados.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Buscar texto / código</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Ex: leitura, EF01LP01..."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de habilidades */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Habilidades ({habilidades.length})
            </h2>
            {buscando && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
          </div>

          {habilidades.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center italic">
              Nenhuma habilidade encontrada com esses filtros.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {habilidades.map((h) => (
                <li key={h.codigo} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs font-semibold px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded flex-shrink-0">
                      {h.codigo}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                        {h.descricao}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-gray-500 dark:text-gray-400">
                        {h.etapa_id && <span>{h.etapa_id}</span>}
                        {h.ano && <span>• {h.ano}º ano</span>}
                        {h.componente_id && <span>• {h.componente_id}</span>}
                        {h.campo_experiencia && <span>• Campo: {h.campo_experiencia}</span>}
                        {h.faixa_etaria && <span>• Faixa: {h.faixa_etaria}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Fonte oficial: <a href="http://basenacionalcomum.mec.gov.br" target="_blank" rel="noopener" className="text-indigo-600 dark:text-indigo-400 hover:underline">basenacionalcomum.mec.gov.br</a>
          {' · '} Para adicionar mais habilidades (Ciências, História, Geografia, Arte, etc.), edite os arquivos em <code>database/bncc-data/</code> e rode <code>npm run seed-bncc</code>.
        </p>
      </div>
    </ProtectedRoute>
  )
}
