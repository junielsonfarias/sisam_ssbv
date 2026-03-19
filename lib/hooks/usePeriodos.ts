import { useState, useEffect } from 'react'
import type { Periodo } from '@/lib/types/common'

/**
 * Hook para carregar períodos letivos por ano.
 *
 * Uso:
 *   const { periodos, carregando } = usePeriodos(anoLetivo)
 */
export function usePeriodos(anoLetivo?: string) {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const ano = anoLetivo || new Date().getFullYear().toString()
    setCarregando(true)

    fetch(`/api/admin/periodos-letivos?ano_letivo=${ano}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setPeriodos(Array.isArray(data) ? data : []))
      .catch(() => setPeriodos([]))
      .finally(() => setCarregando(false))
  }, [anoLetivo])

  return { periodos, carregando }
}
