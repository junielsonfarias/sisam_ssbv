import { useState, useEffect } from 'react'
import type { TurmaSimples } from '@/lib/types/common'

/**
 * Hook para carregar turmas filtradas por escola e ano letivo.
 * Recarrega automaticamente quando escola ou ano mudam.
 *
 * Uso:
 *   const { turmas, carregando } = useTurmas(escolaId, anoLetivo)
 */
export function useTurmas(escolaId?: string, anoLetivo?: string) {
  const [turmas, setTurmas] = useState<TurmaSimples[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!escolaId) {
      setTurmas([])
      return
    }

    setCarregando(true)
    const ano = anoLetivo || new Date().getFullYear().toString()

    fetch(`/api/admin/turmas?escolas_ids=${escolaId}&ano_letivo=${ano}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setTurmas(Array.isArray(data) ? data : []))
      .catch(() => setTurmas([]))
      .finally(() => setCarregando(false))
  }, [escolaId, anoLetivo])

  return { turmas, carregando }
}
