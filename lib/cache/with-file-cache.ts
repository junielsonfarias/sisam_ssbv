/**
 * Wrapper para file cache que elimina blocos repetidos de verificação/carregamento
 * Usado em rotas que verificam cache em arquivo antes de executar queries pesadas
 */

import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from './file'
import { createLogger } from '@/lib/logger'

const log = createLogger('WithFileCache')

interface FileCacheOptions {
  filtros?: Record<string, unknown>
  tipoUsuario?: string
  usuarioId?: string | number
  poloId?: string | number | null
  escolaId?: string | number | null
}

/**
 * Verifica cache em arquivo antes de executar fetcher.
 * Se cache existe e é válido, retorna dados do cache.
 * Caso contrário, executa fetcher, salva no cache e retorna.
 *
 * @param options Opções de cache (filtros, tipo usuario, etc)
 * @param tipo Identificador do tipo de cache (ex: 'dashboard', 'graficos')
 * @param forcarAtualizacao Se true, ignora cache existente
 * @param fetcher Função que busca os dados frescos
 * @returns Dados do cache ou do fetcher, com flag _cache indicando origem
 */
export async function withFileCache<T>(
  options: FileCacheOptions,
  tipo: string,
  forcarAtualizacao: boolean,
  fetcher: () => Promise<T>
): Promise<T & { _cache?: { origem: string } }> {
  // Limpar caches expirados (não crítico)
  try { limparCachesExpirados() } catch { /* ignorar */ }

  // Verificar cache existente
  if (!forcarAtualizacao) {
    try {
      if (verificarCache(options)) {
        const dadosCache = carregarCache<T>(options)
        if (dadosCache) {
          log.debug(`Cache ${tipo} encontrado`, { tipo })
          return { ...dadosCache, _cache: { origem: 'arquivo' } }
        }
      }
    } catch {
      log.debug(`Cache ${tipo} não disponível`)
    }
  }

  // Buscar dados frescos
  const dados = await fetcher()

  // Salvar no cache (não crítico)
  try {
    salvarCache(options, dados, tipo)
  } catch {
    log.debug(`Falha ao salvar cache ${tipo}`)
  }

  return { ...dados, _cache: { origem: 'banco' } }
}
