/**
 * Fetch com timeout - evita requisições que ficam pendentes indefinidamente
 */

import { TIMEOUT, RETRY } from '@/lib/constants'

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = TIMEOUT.FETCH_DEFAULT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch com retry automático em caso de falha
 */
interface FetchWithRetryOptions extends FetchWithTimeoutOptions {
  retries?: number
  retryDelay?: number
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { retries = RETRY.MAX_TENTATIVAS, retryDelay = RETRY.DELAY_INICIAL, ...fetchOptions } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, fetchOptions)
    } catch (error: any) {
      lastError = error

      // Não fazer retry em erros de abort manual ou timeout
      if (error.message?.includes('timeout') || error.name === 'AbortError') {
        throw error
      }

      // Se não for a última tentativa, aguardar antes de tentar novamente
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}
