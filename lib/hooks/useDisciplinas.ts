import { useState, useEffect } from 'react'
import type { Disciplina } from '@/lib/types/common'

let cachedDisciplinas: Disciplina[] | null = null
let fetchPromise: Promise<Disciplina[]> | null = null

/**
 * Hook para carregar disciplinas escolares com cache global.
 *
 * Uso:
 *   const { disciplinas, carregando } = useDisciplinas()
 */
export function useDisciplinas() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>(cachedDisciplinas || [])
  const [carregando, setCarregando] = useState(!cachedDisciplinas)

  useEffect(() => {
    if (cachedDisciplinas) {
      setDisciplinas(cachedDisciplinas)
      setCarregando(false)
      return
    }

    if (!fetchPromise) {
      fetchPromise = fetch('/api/admin/disciplinas-escolares')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const arr = Array.isArray(data) ? data : []
          cachedDisciplinas = arr
          return arr
        })
        .catch(() => [])
    }

    fetchPromise.then(arr => {
      setDisciplinas(arr)
      setCarregando(false)
    })
  }, [])

  return { disciplinas, carregando }
}
