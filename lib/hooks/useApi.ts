'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================================================
// REFRESH TOKEN INTERCEPTOR
// ============================================================================

/** Flag para evitar múltiplos refreshes simultâneos */
let refreshEmAndamento: Promise<boolean> | null = null

/**
 * Tenta renovar o token JWT via POST /api/auth/refresh.
 * Retorna true se a renovação foi bem-sucedida.
 */
async function tentarRefreshToken(): Promise<boolean> {
  // Se já existe um refresh em andamento, aguardar o resultado
  if (refreshEmAndamento) return refreshEmAndamento

  refreshEmAndamento = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      return res.ok
    } catch {
      return false
    } finally {
      refreshEmAndamento = null
    }
  })()

  return refreshEmAndamento
}

/**
 * Fetch com retry automático em caso de 401.
 * Se receber 401 e houver cookie de token, tenta refresh e repete a requisição.
 */
async function fetchComRefresh(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const res = await fetch(url, options)

  // Se não é 401, retornar normalmente
  if (res.status !== 401) return res

  // Tentar renovar o token
  const renovado = await tentarRefreshToken()
  if (!renovado) return res // Refresh falhou, manter 401

  // Repetir a requisição original com o novo token (cookie atualizado)
  return fetch(url, options)
}

interface UseApiOptions<T> {
  /** URL da API para fetch */
  url: string
  /** Valor padrao enquanto carrega */
  valorInicial?: T
  /** Se deve buscar automaticamente ao montar (default: true) */
  autoFetch?: boolean
  /** Dependencias que disparam re-fetch (como useEffect deps) */
  deps?: unknown[]
}

interface UseApiReturn<T> {
  /** Dados retornados pela API */
  dados: T
  /** Se esta carregando */
  carregando: boolean
  /** Mensagem de erro (null se OK) */
  erro: string | null
  /** Funcao para re-buscar dados */
  recarregar: () => Promise<void>
  /** Funcao para fazer POST/PUT/DELETE */
  mutar: (method: 'POST' | 'PUT' | 'DELETE', body?: unknown) => Promise<{ ok: boolean; dados?: unknown; mensagem?: string }>
  /** Se esta salvando (mutacao em andamento) */
  salvando: boolean
}

/**
 * Hook reutilizavel para fetch de dados de API.
 * Elimina boilerplate de useState+useEffect+fetch repetido em 20+ paginas.
 *
 * @example
 * // Busca simples
 * const { dados, carregando, erro, recarregar } = useApi<Aluno[]>({
 *   url: '/api/admin/alunos?ano_letivo=2026',
 *   valorInicial: [],
 * })
 *
 * @example
 * // Com dependencias (re-busca quando filtro muda)
 * const { dados, carregando } = useApi<Dashboard>({
 *   url: `/api/admin/dashboard?polo_id=${poloId}`,
 *   valorInicial: null,
 *   deps: [poloId],
 * })
 *
 * @example
 * // Com mutacao
 * const { dados, mutar, salvando } = useApi<Evento[]>({ url: '/api/admin/eventos' })
 * const salvar = () => mutar('POST', { titulo: 'Novo Evento' })
 */
export function useApi<T>({
  url,
  valorInicial,
  autoFetch = true,
  deps = [],
}: UseApiOptions<T>): UseApiReturn<T> {
  const [dados, setDados] = useState<T>(valorInicial as T)
  const [carregando, setCarregando] = useState(autoFetch)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const buscar = useCallback(async () => {
    // Cancelar request anterior se existir
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    setCarregando(true)
    setErro(null)

    try {
      const res = await fetchComRefresh(url, { signal: controller.signal })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.mensagem || `Erro ${res.status}`)
      }

      const data = await res.json()
      setDados(data)
    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError') return // Ignorar abort
      setErro((error as Error).message || 'Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }, [url])

  const recarregar = useCallback(async () => {
    await buscar()
  }, [buscar])

  const mutar = useCallback(async (
    method: 'POST' | 'PUT' | 'DELETE',
    body?: unknown
  ): Promise<{ ok: boolean; dados?: unknown; mensagem?: string }> => {
    setSalvando(true)
    try {
      const res = await fetchComRefresh(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        return { ok: false, mensagem: data.mensagem || `Erro ${res.status}` }
      }

      // Re-buscar dados apos mutacao bem sucedida
      await buscar()

      return { ok: true, dados: data, mensagem: data.mensagem }
    } catch (error: unknown) {
      return { ok: false, mensagem: (error as Error).message || 'Erro ao salvar' }
    } finally {
      setSalvando(false)
    }
  }, [url, buscar])

  // Auto-fetch ao montar
  useEffect(() => {
    if (autoFetch) {
      buscar()
    }

    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [autoFetch, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return { dados, carregando, erro, recarregar, mutar, salvando }
}

/**
 * Hook simples para POST/PUT/DELETE sem GET automatico.
 * Ideal para formularios que so enviam dados.
 *
 * @example
 * const { executar, salvando } = useMutacao('/api/admin/alunos')
 * const salvar = async () => {
 *   const { ok, mensagem } = await executar('POST', formData)
 *   if (ok) toast.success(mensagem)
 *   else toast.error(mensagem)
 * }
 */
export function useMutacao(url: string) {
  const [salvando, setSalvando] = useState(false)

  const executar = useCallback(async (
    method: 'POST' | 'PUT' | 'DELETE',
    body?: unknown
  ): Promise<{ ok: boolean; dados?: unknown; mensagem?: string }> => {
    setSalvando(true)
    try {
      const res = await fetchComRefresh(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = await res.json().catch(() => ({}))
      return {
        ok: res.ok,
        dados: data,
        mensagem: data.mensagem || (res.ok ? 'Sucesso' : `Erro ${res.status}`),
      }
    } catch (error: unknown) {
      return { ok: false, mensagem: (error as Error).message || 'Erro de conexao' }
    } finally {
      setSalvando(false)
    }
  }, [url])

  return { executar, salvando }
}
