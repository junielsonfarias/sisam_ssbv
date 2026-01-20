'use client'

import { useState, useCallback, useMemo } from 'react'

export interface PaginacaoState {
  paginaAtual: number
  itensPorPagina: number
  totalItens: number
  totalPaginas: number
}

export interface UsePaginacaoOptions {
  itensPorPaginaInicial?: number
  paginaInicial?: number
}

export interface UsePaginacaoReturn {
  paginacao: PaginacaoState
  paginaAtual: number
  totalPaginas: number
  irParaPagina: (pagina: number) => void
  proximaPagina: () => void
  paginaAnterior: () => void
  primeiraPagina: () => void
  ultimaPagina: () => void
  setTotalItens: (total: number) => void
  setItensPorPagina: (itens: number) => void
  resetPaginacao: () => void
  temProximaPagina: boolean
  temPaginaAnterior: boolean
  indiceInicial: number
  indiceFinal: number
}

/**
 * Hook para gerenciar paginacao
 * Centraliza a logica de paginacao usada em varios componentes
 */
export function usePaginacao(options: UsePaginacaoOptions = {}): UsePaginacaoReturn {
  const {
    itensPorPaginaInicial = 10,
    paginaInicial = 1
  } = options

  const [paginaAtual, setPaginaAtual] = useState(paginaInicial)
  const [itensPorPagina, setItensPorPaginaState] = useState(itensPorPaginaInicial)
  const [totalItens, setTotalItensState] = useState(0)

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(totalItens / itensPorPagina))
  }, [totalItens, itensPorPagina])

  const irParaPagina = useCallback((pagina: number) => {
    const novaPagina = Math.max(1, Math.min(pagina, totalPaginas))
    setPaginaAtual(novaPagina)
  }, [totalPaginas])

  const proximaPagina = useCallback(() => {
    if (paginaAtual < totalPaginas) {
      setPaginaAtual(prev => prev + 1)
    }
  }, [paginaAtual, totalPaginas])

  const paginaAnterior = useCallback(() => {
    if (paginaAtual > 1) {
      setPaginaAtual(prev => prev - 1)
    }
  }, [paginaAtual])

  const primeiraPagina = useCallback(() => {
    setPaginaAtual(1)
  }, [])

  const ultimaPagina = useCallback(() => {
    setPaginaAtual(totalPaginas)
  }, [totalPaginas])

  const setTotalItens = useCallback((total: number) => {
    setTotalItensState(total)
    // Ajustar pagina atual se necessário
    const novoTotalPaginas = Math.max(1, Math.ceil(total / itensPorPagina))
    if (paginaAtual > novoTotalPaginas) {
      setPaginaAtual(novoTotalPaginas)
    }
  }, [itensPorPagina, paginaAtual])

  const setItensPorPagina = useCallback((itens: number) => {
    setItensPorPaginaState(itens)
    setPaginaAtual(1) // Resetar para primeira pagina ao mudar itens por pagina
  }, [])

  const resetPaginacao = useCallback(() => {
    setPaginaAtual(paginaInicial)
  }, [paginaInicial])

  const temProximaPagina = paginaAtual < totalPaginas
  const temPaginaAnterior = paginaAtual > 1

  const indiceInicial = (paginaAtual - 1) * itensPorPagina
  const indiceFinal = Math.min(indiceInicial + itensPorPagina, totalItens)

  const paginacao: PaginacaoState = useMemo(() => ({
    paginaAtual,
    itensPorPagina,
    totalItens,
    totalPaginas
  }), [paginaAtual, itensPorPagina, totalItens, totalPaginas])

  return {
    paginacao,
    paginaAtual,
    totalPaginas,
    irParaPagina,
    proximaPagina,
    paginaAnterior,
    primeiraPagina,
    ultimaPagina,
    setTotalItens,
    setItensPorPagina,
    resetPaginacao,
    temProximaPagina,
    temPaginaAnterior,
    indiceInicial,
    indiceFinal
  }
}

export default usePaginacao
