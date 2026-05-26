'use client'

/**
 * Contexto global de ano letivo selecionado.
 *
 * Persiste em localStorage para sobreviver entre navegações e reloads.
 * Carrega lista de anos disponíveis de `/api/admin/anos-letivos` na primeira
 * montagem; se a chamada falhar, opera com fallback (ano atual ± 2 anos).
 *
 * Uso:
 * ```tsx
 * const { anoLetivo, setAnoLetivo, anosDisponiveis } = useAnoLetivo()
 * ```
 *
 * Para seletor pronto: `<AnoLetivoSelect />`
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'sisam-ano-letivo'

export interface AnoLetivoRef {
  id: string
  ano: string
  ativo?: boolean
  status?: string
}

interface AnoLetivoContextValue {
  /** Ano atualmente selecionado (string ex: "2026"). */
  anoLetivo: string
  setAnoLetivo: (ano: string) => void
  /** Lista de anos disponíveis carregada da API (ou fallback). */
  anosDisponiveis: AnoLetivoRef[]
  /** Encontra o objeto AnoLetivoRef do ano selecionado (para endpoints que exigem UUID). */
  anoLetivoRef: AnoLetivoRef | null
  carregando: boolean
}

const AnoLetivoContext = createContext<AnoLetivoContextValue | null>(null)

function gerarFallback(): AnoLetivoRef[] {
  const atual = new Date().getFullYear()
  return [atual + 1, atual, atual - 1, atual - 2].map((y) => ({
    id: '',
    ano: String(y),
  }))
}

export function AnoLetivoProvider({ children }: { children: React.ReactNode }) {
  const [anoLetivo, setAnoLetivoState] = useState<string>(() => {
    if (typeof window === 'undefined') return String(new Date().getFullYear())
    return localStorage.getItem(STORAGE_KEY) || String(new Date().getFullYear())
  })
  const [anosDisponiveis, setAnosDisponiveis] = useState<AnoLetivoRef[]>(gerarFallback)
  const [carregando, setCarregando] = useState(true)

  // Carrega anos disponíveis da API uma única vez
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/anos-letivos', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: unknown) => {
        if (!Array.isArray(d) || d.length === 0) return
        const anos: AnoLetivoRef[] = d.map((a: { id: string; ano: string | number; status?: string; ativo?: boolean }) => ({
          id: a.id,
          ano: String(a.ano),
          status: a.status,
          ativo: a.ativo,
        }))
        setAnosDisponiveis(anos)
        // Se o ano salvo não existe na lista, escolhe ativo ou mais recente
        const valido = anos.find((a) => a.ano === anoLetivo)
        if (!valido) {
          const ativo = anos.find((a) => a.ativo || a.status === 'ativo')
          const escolhido = ativo?.ano || anos[0]?.ano
          if (escolhido) setAnoLetivoState(escolhido)
        }
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') {
          console.warn('[AnoLetivoProvider] Falha ao carregar anos, usando fallback', e)
        }
      })
      .finally(() => setCarregando(false))
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setAnoLetivo = useCallback((ano: string) => {
    setAnoLetivoState(ano)
    try { localStorage.setItem(STORAGE_KEY, ano) } catch { /* storage indisponível */ }
  }, [])

  const anoLetivoRef = useMemo(
    () => anosDisponiveis.find((a) => a.ano === anoLetivo) || null,
    [anosDisponiveis, anoLetivo]
  )

  const value = useMemo<AnoLetivoContextValue>(
    () => ({ anoLetivo, setAnoLetivo, anosDisponiveis, anoLetivoRef, carregando }),
    [anoLetivo, setAnoLetivo, anosDisponiveis, anoLetivoRef, carregando]
  )

  return <AnoLetivoContext.Provider value={value}>{children}</AnoLetivoContext.Provider>
}

/**
 * Hook para acessar o ano letivo global. Lança se chamado fora do Provider.
 */
export function useAnoLetivo(): AnoLetivoContextValue {
  const ctx = useContext(AnoLetivoContext)
  if (!ctx) {
    throw new Error('useAnoLetivo precisa estar dentro de <AnoLetivoProvider>')
  }
  return ctx
}

/**
 * Hook tolerante — retorna null se fora do Provider (útil para componentes
 * reutilizados em layouts sem o Provider, como portais públicos).
 */
export function useAnoLetivoOptional(): AnoLetivoContextValue | null {
  return useContext(AnoLetivoContext)
}

/**
 * Componente reutilizável de seletor de ano letivo.
 * Exibe `<select>` com todos os anos disponíveis, controlado pelo contexto.
 */
export function AnoLetivoSelect({
  className,
  showLabel = false,
}: {
  className?: string
  showLabel?: boolean
}) {
  const { anoLetivo, setAnoLetivo, anosDisponiveis } = useAnoLetivo()
  const baseCls = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none'

  return (
    <label className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Ano letivo:</span>
      )}
      <select
        value={anoLetivo}
        onChange={(e) => setAnoLetivo(e.target.value)}
        className={className ?? baseCls}
        title="Ano letivo"
      >
        {anosDisponiveis.map((a) => (
          <option key={a.ano} value={a.ano}>
            {a.ano}
            {a.ativo || a.status === 'ativo' ? ' (ativo)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
