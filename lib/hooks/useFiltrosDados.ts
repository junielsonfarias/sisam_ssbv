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
 * Suporta persistencia no localStorage
 */
export function useFiltrosDados(options: UseFiltrosDadosOptions = {}) {
  const { persistir = true, storageKey = FILTROS_STORAGE_KEY } = options

  const [filtros, setFiltros] = useState<FiltrosDadosState>(FILTROS_INICIAIS)
  const [abaAtiva, setAbaAtiva] = useState<string>('visao_geral')
  const [filtrosCarregados, setFiltrosCarregados] = useState(false)

  // Carregar filtros do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== 'undefined' && persistir && !filtrosCarregados) {
      try {
        const filtrosSalvos = localStorage.getItem(storageKey)
        if (filtrosSalvos) {
          const parsed = JSON.parse(filtrosSalvos)
          setFiltros(prev => ({
            ...prev,
            serie: parsed.serie || '',
            anoLetivo: parsed.anoLetivo || '',
            presenca: parsed.presenca || '',
            nivel: parsed.nivel || '',
            faixaMedia: parsed.faixaMedia || '',
            disciplina: parsed.disciplina || '',
            tipoEnsino: parsed.tipoEnsino || ''
          }))
          if (parsed.abaAtiva) {
            setAbaAtiva(parsed.abaAtiva)
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar filtros do localStorage:', e)
      }
      setFiltrosCarregados(true)
    }
  }, [persistir, storageKey, filtrosCarregados])

  // Salvar filtros no localStorage quando mudarem
  useEffect(() => {
    if (typeof window !== 'undefined' && persistir && filtrosCarregados) {
      try {
        const dadosParaSalvar = {
          serie: filtros.serie,
          anoLetivo: filtros.anoLetivo,
          presenca: filtros.presenca,
          nivel: filtros.nivel,
          faixaMedia: filtros.faixaMedia,
          disciplina: filtros.disciplina,
          tipoEnsino: filtros.tipoEnsino,
          abaAtiva: abaAtiva
        }
        localStorage.setItem(storageKey, JSON.stringify(dadosParaSalvar))
      } catch (e) {
        console.warn('Erro ao salvar filtros no localStorage:', e)
      }
    }
  }, [filtros, abaAtiva, persistir, storageKey, filtrosCarregados])

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
