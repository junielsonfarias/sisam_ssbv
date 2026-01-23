'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FILTROS_STORAGE_KEY } from '@/lib/dados/constants'

export interface FiltrosDadosState {
  poloId: string
  escolaId: string
  serie: string
  turmaId: string
  anoLetivo: string
  presenca: string
  nivel: string
  faixaMedia: string
  disciplina: string
  tipoEnsino: string
}

export interface UseFiltrosDadosOptions {
  persistir?: boolean
  storageKey?: string
}

const FILTROS_INICIAIS: FiltrosDadosState = {
  poloId: '',
  escolaId: '',
  serie: '',
  turmaId: '',
  anoLetivo: '',
  presenca: '',
  nivel: '',
  faixaMedia: '',
  disciplina: '',
  tipoEnsino: ''
}

/**
 * Hook para gerenciar estado de filtros do painel de dados
 * Por padrão, NÃO persiste filtros entre navegações (sempre inicia limpo)
 */
export function useFiltrosDados(options: UseFiltrosDadosOptions = {}) {
  const { persistir = false, storageKey = FILTROS_STORAGE_KEY } = options

  const [filtros, setFiltros] = useState<FiltrosDadosState>(FILTROS_INICIAIS)
  const [abaAtiva, setAbaAtiva] = useState<string>('visao_geral')
  const [filtrosCarregados, setFiltrosCarregados] = useState(false)

  // Limpar filtros do localStorage ao iniciar (sempre começar com filtros limpos)
  useEffect(() => {
    if (typeof window !== 'undefined' && !filtrosCarregados) {
      try {
        // Sempre limpar filtros persistidos para garantir estado inicial limpo
        localStorage.removeItem(storageKey)
      } catch (e) {
        console.warn('Erro ao limpar filtros do localStorage:', e)
      }
      setFiltrosCarregados(true)
    }
  }, [storageKey, filtrosCarregados])

  // Atualizar um filtro especifico
  const setFiltro = useCallback(<K extends keyof FiltrosDadosState>(
    campo: K,
    valor: FiltrosDadosState[K]
  ) => {
    setFiltros(prev => {
      const novo = { ...prev, [campo]: valor }

      // Limpar filtros dependentes
      if (campo === 'poloId') {
        novo.escolaId = ''
        novo.turmaId = ''
      }
      if (campo === 'escolaId') {
        novo.turmaId = ''
      }
      if (campo === 'serie' && !valor) {
        novo.turmaId = ''
      }

      return novo
    })
  }, [])

  // Limpar todos os filtros
  const limparFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIAIS)
  }, [])

  // Verificar se tem filtros ativos
  const temFiltrosAtivos = useMemo(() => {
    return Object.values(filtros).some(v => v !== '')
  }, [filtros])

  // Contar quantidade de filtros ativos
  const qtdFiltrosAtivos = useMemo(() => {
    return Object.values(filtros).filter(v => v !== '').length
  }, [filtros])

  return {
    filtros,
    setFiltro,
    setFiltros,
    limparFiltros,
    temFiltrosAtivos,
    qtdFiltrosAtivos,
    abaAtiva,
    setAbaAtiva,
    filtrosCarregados
  }
}

export default useFiltrosDados
