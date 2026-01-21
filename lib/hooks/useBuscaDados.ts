'use client'

import { useState, useCallback, useRef } from 'react'

export interface UseBuscaDadosOptions<T> {
  /** URL base para a requisicao */
  endpoint: string
  /** Transformar dados antes de retornar */
  transformar?: (dados: any) => T
  /** Callback ao iniciar busca */
  onInicio?: () => void
  /** Callback ao completar busca com sucesso */
  onSucesso?: (dados: T) => void
  /** Callback em caso de erro */
  onErro?: (erro: Error) => void
}

export interface UseBuscaDadosResult<T> {
  /** Dados retornados pela busca */
  dados: T | null
  /** Indica se esta carregando */
  carregando: boolean
  /** Erro da ultima busca */
  erro: Error | null
  /** Indica se ja fez pelo menos uma busca */
  pesquisou: boolean
  /** Funcao para executar a busca */
  buscar: (params?: Record<string, string | number | undefined>) => Promise<T | null>
  /** Limpar dados e erro */
  limpar: () => void
}

/**
 * Hook para busca de dados com controle de estado
 * Gerencia carregamento, erro e dados de forma padronizada
 *
 * @example
 * const { dados, carregando, buscar } = useBuscaDados<Escola[]>({
 *   endpoint: '/api/escolas',
 *   transformar: (data) => data.escolas
 * })
 *
 * const handlePesquisar = () => {
 *   buscar({ serie: '5º Ano', com_estatisticas: 'true' })
 * }
 */
export function useBuscaDados<T>({
  endpoint,
  transformar,
  onInicio,
  onSucesso,
  onErro
}: UseBuscaDadosOptions<T>): UseBuscaDadosResult<T> {
  const [dados, setDados] = useState<T | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<Error | null>(null)
  const [pesquisou, setPesquisou] = useState(false)

  // Ref para evitar race conditions
  const requestIdRef = useRef(0)

  const buscar = useCallback(async (
    params?: Record<string, string | number | undefined>
  ): Promise<T | null> => {
    const currentRequestId = ++requestIdRef.current

    try {
      setCarregando(true)
      setErro(null)
      onInicio?.()

      // Construir URL com parametros
      const url = new URL(endpoint, window.location.origin)
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value))
          }
        })
      }

      const response = await fetch(url.toString())

      // Verificar se ainda e a requisicao mais recente
      if (currentRequestId !== requestIdRef.current) {
        return null
      }

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const dadosBrutos = await response.json()
      const dadosTransformados = transformar ? transformar(dadosBrutos) : dadosBrutos as T

      setDados(dadosTransformados)
      setPesquisou(true)
      onSucesso?.(dadosTransformados)

      return dadosTransformados
    } catch (error) {
      // Verificar se ainda e a requisicao mais recente
      if (currentRequestId !== requestIdRef.current) {
        return null
      }

      const erroCapturado = error instanceof Error ? error : new Error('Erro desconhecido')
      setErro(erroCapturado)
      onErro?.(erroCapturado)
      return null
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setCarregando(false)
      }
    }
  }, [endpoint, transformar, onInicio, onSucesso, onErro])

  const limpar = useCallback(() => {
    setDados(null)
    setErro(null)
    setPesquisou(false)
  }, [])

  return {
    dados,
    carregando,
    erro,
    pesquisou,
    buscar,
    limpar
  }
}

export default useBuscaDados
