import { useState, useEffect } from 'react'
import type { EscolaSimples } from '@/lib/types/common'

let cachedEscolas: EscolaSimples[] | null = null
let fetchPromise: Promise<EscolaSimples[]> | null = null

/**
 * Hook para carregar lista de escolas com cache global.
 * Evita múltiplas requisições na mesma sessão.
 *
 * Uso:
 *   const { escolas, carregando } = useEscolas()
 *   const { escolas } = useEscolas({ poloId: '...' }) // filtrar por polo
 */
export function useEscolas(opts?: { poloId?: string; desabilitado?: boolean }) {
  const [escolas, setEscolas] = useState<EscolaSimples[]>(cachedEscolas || [])
  const [carregando, setCarregando] = useState(!cachedEscolas)

  useEffect(() => {
    if (opts?.desabilitado) return

    if (cachedEscolas && !opts?.poloId) {
      setEscolas(cachedEscolas)
      setCarregando(false)
      return
    }

    const url = opts?.poloId
      ? `/api/admin/escolas?polo_id=${opts.poloId}`
      : '/api/admin/escolas'

    // Sem polo: usa cache global
    if (!opts?.poloId) {
      if (!fetchPromise) {
        fetchPromise = fetch(url)
          .then(r => r.ok ? r.json() : [])
          .then(data => {
            const arr = Array.isArray(data) ? data : []
            cachedEscolas = arr
            return arr
          })
          .catch(() => [])
      }
      fetchPromise.then(arr => {
        setEscolas(arr)
        setCarregando(false)
      })
    } else {
      // Com polo: sem cache
      fetch(url)
        .then(r => r.ok ? r.json() : [])
        .then(data => setEscolas(Array.isArray(data) ? data : []))
        .catch(() => setEscolas([]))
        .finally(() => setCarregando(false))
    }
  }, [opts?.poloId, opts?.desabilitado])

  return { escolas, carregando }
}
