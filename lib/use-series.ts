import { useState, useEffect, useCallback } from 'react'

interface SerieEscolar {
  id: string
  codigo: string
  nome: string
  etapa: string
  ordem: number
}

let cachedSeries: SerieEscolar[] | null = null
let fetchPromise: Promise<SerieEscolar[]> | null = null

/**
 * Hook para carregar series_escolares e fornecer função de formatação.
 * Cache global para evitar múltiplas requisições na mesma sessão.
 *
 * Uso:
 *   const { formatSerie, series, carregado } = useSeries()
 *   formatSerie("1")    // "1º Ano"
 *   formatSerie("CRE")  // "Creche"
 *   formatSerie("1º Ano") // "1º Ano" (já formatado, retorna igual)
 */
export function useSeries() {
  const [series, setSeries] = useState<SerieEscolar[]>(cachedSeries || [])
  const [carregado, setCarregado] = useState(!!cachedSeries)

  useEffect(() => {
    if (cachedSeries) {
      setSeries(cachedSeries)
      setCarregado(true)
      return
    }

    if (!fetchPromise) {
      fetchPromise = fetch('/api/admin/series-escolares')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const arr = Array.isArray(data) ? data : data.series || []
          cachedSeries = arr
          return arr
        })
        .catch(() => {
          cachedSeries = []
          return []
        })
    }

    fetchPromise.then(arr => {
      setSeries(arr)
      setCarregado(true)
    })
  }, [])

  const formatSerie = useCallback((serie: string | null | undefined): string => {
    if (!serie) return '-'

    // Se já é um nome completo conhecido, retorna direto
    const matchByNome = series.find(s => s.nome === serie)
    if (matchByNome) return matchByNome.nome

    // Extrair número da série (ex: "1", "1º Ano" → "1")
    const num = serie.replace(/[^0-9]/g, '')

    // Tentar match por código
    const matchByCodigo = series.find(s => s.codigo === num || s.codigo === serie)
    if (matchByCodigo) return matchByCodigo.nome

    // Tentar match por nome parcial para EJA, Creche, Pré
    const lower = serie.toLowerCase()
    if (lower.includes('creche')) {
      const m = series.find(s => s.codigo === 'CRE')
      if (m) return m.nome
    }
    if (lower.includes('pré') || lower.includes('pre')) {
      if (lower.includes('ii') || lower.includes('2')) {
        const m = series.find(s => s.codigo === 'PRE2')
        if (m) return m.nome
      } else {
        const m = series.find(s => s.codigo === 'PRE1')
        if (m) return m.nome
      }
    }
    if (lower.includes('eja')) {
      const ejaNum = serie.replace(/[^0-9]/g, '')
      const m = series.find(s => s.codigo === `EJA${ejaNum}`)
      if (m) return m.nome
    }

    // Fallback: retorna o valor original
    return serie
  }, [series])

  /**
   * Retorna a ordem da série para ordenação.
   */
  const getOrdem = useCallback((serie: string | null | undefined): number => {
    if (!serie) return 99
    const num = serie.replace(/[^0-9]/g, '')
    const match = series.find(s => s.codigo === num || s.codigo === serie || s.nome === serie)
    return match?.ordem ?? 99
  }, [series])

  return { formatSerie, getOrdem, series, carregado }
}
