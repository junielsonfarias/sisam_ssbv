'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { AlunoBusca, INPUT_CLS } from './types'

/**
 * Buscador de aluno com debounce (350ms, mínimo 2 chars) e
 * AbortController por digitação. Usado por ModalEntrega e
 * AbaDistribuicoes. Estado da busca é interno; o resultado
 * (aluno selecionado) é externalizado via `selecionado` + `onSelecionar`.
 */
interface Props {
  selecionado: AlunoBusca | null
  onSelecionar: (a: AlunoBusca | null) => void
  placeholder?: string
}

export function BuscadorAluno({ selecionado, onSelecionar, placeholder }: Props) {
  const [busca, setBusca] = useState('')
  const [resultado, setResultado] = useState<AlunoBusca[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (selecionado) return
    if (busca.trim().length < 2) {
      setResultado([])
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(
          `/api/admin/alunos?busca=${encodeURIComponent(busca.trim())}&limite=15`,
          { signal: controller.signal }
        )
        const data = await res.json()
        const lista: AlunoBusca[] = Array.isArray(data) ? data : data.alunos || []
        setResultado(lista)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResultado([])
      } finally {
        setBuscando(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [busca, selecionado])

  if (selecionado) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-teal-700 dark:text-teal-300 truncate">{selecionado.nome}</p>
          <p className="text-xs text-teal-600 dark:text-teal-400">
            {selecionado.codigo && `#${selecionado.codigo}`}
            {selecionado.serie && ` • ${selecionado.serie}`}
            {selecionado.escola_nome && ` • ${selecionado.escola_nome}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { onSelecionar(null); setBusca('') }}
          className="p-1 rounded text-teal-600 hover:bg-teal-100"
          aria-label="Limpar aluno selecionado"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={placeholder || 'Buscar aluno por nome ou matrícula...'}
        className={`${INPUT_CLS} w-full pl-9`}
        autoComplete="off"
      />
      {(buscando || resultado.length > 0) && (
        <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-slate-800">
          {buscando && resultado.length === 0 && (
            <p className="text-xs text-gray-400 p-3 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
            </p>
          )}
          {resultado.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onSelecionar(a); setBusca(''); setResultado([]) }}
              className="w-full text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-sm border-b border-gray-100 dark:border-slate-700 last:border-0"
            >
              <p className="font-semibold text-gray-800 dark:text-gray-200">{a.nome}</p>
              <p className="text-xs text-gray-400">{a.codigo || ''} {a.serie && `• ${a.serie}`}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
