'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, BookMarked, AlertCircle, Loader2 } from 'lucide-react'

interface Habilidade {
  codigo: string
  descricao: string
  componente_id: string | null
  ano: number | null
}

interface Props {
  /** Codigos atualmente selecionados (controlled). */
  valor: string[]
  onChange: (codigos: string[]) => void
  /** Disciplina selecionada — filtra automaticamente o componente BNCC. */
  disciplinaId?: string | null
  /** Turma — usada para inferir etapa (AI vs AF) pela serie. */
  turmaId?: string | null
  /** Sobrescreve mapeamento da disciplina, ex: "LP_AI". */
  componenteId?: string | null
  /** Limite visual de chips. */
  maxSelecionadas?: number
  /** Texto exibido acima do controle. */
  label?: string
  /** Permite ocultar texto descritivo dos chips selecionados. */
  modoCompacto?: boolean
}

/**
 * Seletor de habilidades BNCC reutilizavel.
 *
 * Recursos:
 *  - Busca por texto livre (codigo ou descricao) com debounce.
 *  - Filtro automatico pelo componente BNCC mapeado a partir da
 *    disciplina + serie da turma.
 *  - Chips de selecao com codigo + tooltip da descricao.
 *  - Estado controlled — pai fornece `valor` e recebe `onChange`.
 *
 * Backend: /api/professor/bncc/habilidades
 */
export default function SeletorBncc({
  valor,
  onChange,
  disciplinaId,
  turmaId,
  componenteId,
  maxSelecionadas = 30,
  label = 'Habilidades BNCC',
  modoCompacto = false,
}: Props) {
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [habilidades, setHabilidades] = useState<Habilidade[]>([])
  const [selecionadasInfo, setSelecionadasInfo] = useState<Habilidade[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  const [filtros, setFiltros] = useState<{ componente_id: string | null; etapa: string | null; serie_turma: string | null; ano: number | null }>({
    componente_id: null, etapa: null, serie_turma: null, ano: null,
  })
  // Refs para rolar o modal automaticamente ate a lista quando ela abre.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listaRef = useRef<HTMLDivElement | null>(null)

  // Quando a lista abre, rola o ancestral scrollavel (modal) ate
  // que a lista de habilidades fique visivel — evita o usuario ter
  // que rolar manualmente para enxergar as opcoes.
  useEffect(() => {
    if (!aberto) return
    const t = setTimeout(() => {
      const alvo = listaRef.current || containerRef.current
      alvo?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
    return () => clearTimeout(t)
  }, [aberto])

  // Debounce da busca (300ms)
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  // Carrega habilidades quando filtros mudam
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const params = new URLSearchParams()
      if (disciplinaId) params.set('disciplina_id', disciplinaId)
      if (turmaId) params.set('turma_id', turmaId)
      if (componenteId) params.set('componente_id', componenteId)
      if (buscaDebounced.trim().length >= 3) params.set('busca', buscaDebounced.trim())
      params.set('limite', '50')

      const res = await fetch(`/api/professor/bncc/habilidades?${params.toString()}`)
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.mensagem || 'Erro ao buscar habilidades')
      }
      const data = await res.json()
      setHabilidades(Array.isArray(data?.habilidades) ? data.habilidades : [])
      setFiltros(data?.filtros_aplicados || { componente_id: null, etapa: null, serie_turma: null, ano: null })
    } catch (err: any) {
      setErro(err.message || 'Erro ao buscar habilidades')
      setHabilidades([])
    } finally {
      setCarregando(false)
    }
  }, [disciplinaId, turmaId, componenteId, buscaDebounced])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Carregar descricoes das ja selecionadas que nao estao na lista atual
  // (ex: salvou anteriormente com outra disciplina).
  useEffect(() => {
    if (valor.length === 0) {
      setSelecionadasInfo([])
      return
    }
    const naLista = new Map<string, Habilidade>()
    habilidades.forEach(h => naLista.set(h.codigo, h))
    selecionadasInfo.forEach(h => { if (!naLista.has(h.codigo)) naLista.set(h.codigo, h) })

    const faltam = valor.filter(c => !naLista.has(c))
    if (faltam.length === 0) {
      // Mantem apenas selecionados em valor (na ordem de valor)
      setSelecionadasInfo(
        valor.map(c => naLista.get(c)).filter((h): h is Habilidade => !!h)
      )
      return
    }
    // Busca individual das que faltam (todas em uma chamada via busca por codigo)
    Promise.all(
      faltam.map(c =>
        fetch(`/api/professor/bncc/habilidades?busca=${encodeURIComponent(c)}&limite=1`)
          .then(r => r.ok ? r.json() : { habilidades: [] })
          .then(d => (d.habilidades || []).find((h: Habilidade) => h.codigo === c) || null)
          .catch(() => null)
      )
    ).then(extras => {
      const final = [...naLista.values()]
      extras.forEach(h => { if (h && !final.find(x => x.codigo === h.codigo)) final.push(h) })
      const map = new Map(final.map(h => [h.codigo, h]))
      setSelecionadasInfo(
        valor.map(c => map.get(c)).filter((h): h is Habilidade => !!h)
      )
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, habilidades])

  const adicionar = (codigo: string) => {
    if (valor.includes(codigo)) return
    if (valor.length >= maxSelecionadas) return
    onChange([...valor, codigo])
  }

  const remover = (codigo: string) => {
    onChange(valor.filter(c => c !== codigo))
  }

  const filtroAtivo = filtros.componente_id || filtros.etapa
  const lista = habilidades.filter(h => !valor.includes(h.codigo))

  return (
    <div ref={containerRef} className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <BookMarked className="h-4 w-4" />
            {label}
          </label>
          <span className="text-xs text-gray-400">
            {valor.length}/{maxSelecionadas}
          </span>
        </div>
      )}

      {/* Chips selecionados */}
      {valor.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valor.map(codigo => {
            const info = selecionadasInfo.find(h => h.codigo === codigo)
            return (
              <span
                key={codigo}
                className="inline-flex items-center gap-1.5 max-w-full px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-medium"
                title={info?.descricao || codigo}
              >
                <span className="font-mono">{codigo}</span>
                {info && !modoCompacto && (
                  <span className="font-normal opacity-80 truncate max-w-[160px] sm:max-w-[280px]">
                    — {info.descricao}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remover(codigo)}
                  aria-label={`Remover ${codigo}`}
                  className="hover:bg-indigo-200 dark:hover:bg-indigo-800/60 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Indicador de filtro automatico */}
      {filtroAtivo && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-1">
          <span>Filtrando por:</span>
          {filtros.componente_id && (
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{filtros.componente_id}</code>
          )}
          {filtros.etapa && !filtros.componente_id && (
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{filtros.etapa}</code>
          )}
          {filtros.ano != null && (
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{filtros.ano}º ano</code>
          )}
          {!filtros.ano && filtros.serie_turma && <span>(serie {filtros.serie_turma})</span>}
          {!carregando && habilidades.length > 0 && (
            <span className="text-gray-400">— {habilidades.length} habilidade(s)</span>
          )}
        </p>
      )}
      {!filtroAtivo && !disciplinaId && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Selecione uma disciplina acima para ver as habilidades da serie correta.
        </p>
      )}

      {/* Busca + lista in-flow (cresce dentro do modal scrollable em vez
          de flutuar absolute — em modais com overflow-y-auto, absolute
          escapa do retangulo do modal). */}
      <div className="space-y-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={e => { setBusca(e.target.value); if (!aberto) setAberto(true) }}
            onFocus={() => setAberto(true)}
            placeholder="Buscar habilidade (codigo ou texto)..."
            className="w-full pl-8 pr-9 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setAberto(v => !v)}
            aria-label={aberto ? 'Ocultar lista de habilidades' : 'Mostrar lista de habilidades'}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
          >
            <X className={`h-4 w-4 transition-transform ${aberto ? '' : 'rotate-45'}`} />
          </button>
        </div>

        {aberto && (
          <div
            ref={listaRef}
            role="listbox"
            style={{ maxHeight: '14rem' }}
            className="block w-full overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm scroll-mt-2 isolate"
          >
            {carregando && (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando habilidades...
              </div>
            )}
            {!carregando && erro && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {erro}
              </div>
            )}
            {!carregando && !erro && lista.length === 0 && (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 italic">
                {!disciplinaId
                  ? 'Selecione uma disciplina acima para listar as habilidades.'
                  : valor.length > 0 && habilidades.length === valor.length
                    ? 'Todas as habilidades disponiveis ja foram selecionadas.'
                    : busca.trim().length >= 3
                      ? 'Nenhuma habilidade encontrada para a busca.'
                      : 'Nenhuma habilidade encontrada para esse filtro.'}
              </div>
            )}
            {!carregando && !erro && lista.map((h, idx) => (
              <button
                key={h.codigo}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => adicionar(h.codigo)}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${idx > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <code className="font-mono text-xs px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded flex-shrink-0">
                    {h.codigo}
                  </code>
                  <span className="text-gray-700 dark:text-gray-300 leading-snug break-words">
                    {h.descricao}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
