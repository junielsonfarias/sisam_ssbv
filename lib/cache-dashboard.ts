import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const CACHE_DIR = path.join(process.cwd(), 'config', 'cache')
const CACHE_META_FILE = path.join(CACHE_DIR, 'cache-meta.json')

interface CacheMeta {
  ultimaAtualizacao: string
  caches: Record<string, {
    arquivo: string
    criadoEm: string
    expiraEm: string // Data de expiração (criadoEm + 1 hora)
    tamanho: number
    filtros: Record<string, any>
  }>
}

// Tempo de expiração do cache: 1 hora em milissegundos
const CACHE_EXPIRATION_MS = 60 * 60 * 1000 // 1 hora

interface CacheOptions {
  filtros?: Record<string, any>
  tipoUsuario?: string
  usuarioId?: string | number
  poloId?: string | number | null
  escolaId?: string | number | null
}

// Garantir que o diretorio de cache existe
function garantirDiretorioCache(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

// Gerar chave unica para o cache baseada nos filtros
function gerarChaveCache(options: CacheOptions): string {
  const dados = JSON.stringify({
    ...options.filtros,
    tipoUsuario: options.tipoUsuario,
    poloId: options.poloId,
    escolaId: options.escolaId
  })
  return crypto.createHash('md5').update(dados).digest('hex')
}

// Carregar metadados do cache
function carregarMeta(): CacheMeta {
  garantirDiretorioCache()

  if (fs.existsSync(CACHE_META_FILE)) {
    try {
      const conteudo = fs.readFileSync(CACHE_META_FILE, 'utf-8')
      return JSON.parse(conteudo)
    } catch (error) {
      console.error('Erro ao carregar metadados do cache:', error)
    }
  }

  return {
    ultimaAtualizacao: new Date().toISOString(),
    caches: {}
  }
}

// Salvar metadados do cache
function salvarMeta(meta: CacheMeta): void {
  garantirDiretorioCache()
  fs.writeFileSync(CACHE_META_FILE, JSON.stringify(meta, null, 2))
}

// Verificar se o cache existe e eh valido (não expirado)
export function verificarCache(options: CacheOptions): boolean {
  const chave = gerarChaveCache(options)
  const meta = carregarMeta()

  if (!meta.caches[chave]) {
    return false
  }

  const cacheInfo = meta.caches[chave]
  const arquivoCache = path.join(CACHE_DIR, cacheInfo.arquivo)

  if (!fs.existsSync(arquivoCache)) {
    return false
  }

  // Verificar se o cache expirou
  const agora = new Date()
  const expiraEm = new Date(cacheInfo.expiraEm || cacheInfo.criadoEm)
  
  if (agora > expiraEm) {
    console.log(`Cache expirado: ${cacheInfo.arquivo} (criado em ${cacheInfo.criadoEm})`)
    // Remover cache expirado
    try {
      fs.unlinkSync(arquivoCache)
      delete meta.caches[chave]
      salvarMeta(meta)
    } catch (error) {
      console.error('Erro ao remover cache expirado:', error)
    }
    return false
  }

  // Calcular tempo restante
  const tempoRestante = Math.floor((expiraEm.getTime() - agora.getTime()) / 1000 / 60)
  console.log(`Cache válido: ${cacheInfo.arquivo} (expira em ${tempoRestante} minutos)`)
  
  return true
}

// Carregar dados do cache
export function carregarCache<T>(options: CacheOptions): T | null {
  const chave = gerarChaveCache(options)
  const meta = carregarMeta()

  if (!meta.caches[chave]) {
    return null
  }

  const cacheInfo = meta.caches[chave]
  const arquivoCache = path.join(CACHE_DIR, cacheInfo.arquivo)

  if (!fs.existsSync(arquivoCache)) {
    return null
  }

  try {
    const conteudo = fs.readFileSync(arquivoCache, 'utf-8')
    console.log(`Cache carregado: ${cacheInfo.arquivo} (${(cacheInfo.tamanho / 1024).toFixed(2)} KB)`)
    return JSON.parse(conteudo) as T
  } catch (error) {
    console.error('Erro ao carregar cache:', error)
    return null
  }
}

// Salvar dados no cache
export function salvarCache<T>(options: CacheOptions, dados: T, tipo: string = 'dashboard'): void {
  garantirDiretorioCache()

  const chave = gerarChaveCache(options)
  const nomeArquivo = `${tipo}-${chave}.json`
  const arquivoCache = path.join(CACHE_DIR, nomeArquivo)

  const conteudo = JSON.stringify(dados)
  fs.writeFileSync(arquivoCache, conteudo)

  const agora = new Date()
  const expiraEm = new Date(agora.getTime() + CACHE_EXPIRATION_MS)

  const meta = carregarMeta()
  meta.ultimaAtualizacao = agora.toISOString()
  meta.caches[chave] = {
    arquivo: nomeArquivo,
    criadoEm: agora.toISOString(),
    expiraEm: expiraEm.toISOString(),
    tamanho: Buffer.byteLength(conteudo, 'utf-8'),
    filtros: options.filtros || {}
  }
  salvarMeta(meta)

  const tamanhoKB = (Buffer.byteLength(conteudo, 'utf-8') / 1024).toFixed(2)
  console.log(`Cache salvo: ${nomeArquivo} (${tamanhoKB} KB) - Expira em ${expiraEm.toLocaleString('pt-BR')}`)
}

// Limpar todos os caches
export function limparTodosOsCaches(): void {
  garantirDiretorioCache()

  const meta = carregarMeta()

  // Remover todos os arquivos de cache
  for (const [chave, info] of Object.entries(meta.caches)) {
    const arquivoCache = path.join(CACHE_DIR, info.arquivo)
    if (fs.existsSync(arquivoCache)) {
      fs.unlinkSync(arquivoCache)
      console.log(`Cache removido: ${info.arquivo}`)
    }
  }

  // Resetar metadados
  salvarMeta({
    ultimaAtualizacao: new Date().toISOString(),
    caches: {}
  })

  console.log('Todos os caches foram limpos')
}

// Obter informacoes sobre os caches
export function obterInfoCaches(): CacheMeta & { totalCaches: number; tamanhoTotal: number } {
  const meta = carregarMeta()
  const totalCaches = Object.keys(meta.caches).length
  const tamanhoTotal = Object.values(meta.caches).reduce((acc, c) => acc + c.tamanho, 0)

  return {
    ...meta,
    totalCaches,
    tamanhoTotal
  }
}

// Limpar cache especifico
export function limparCacheEspecifico(options: CacheOptions): boolean {
  const chave = gerarChaveCache(options)
  const meta = carregarMeta()

  if (!meta.caches[chave]) {
    return false
  }

  const cacheInfo = meta.caches[chave]
  const arquivoCache = path.join(CACHE_DIR, cacheInfo.arquivo)

  if (fs.existsSync(arquivoCache)) {
    fs.unlinkSync(arquivoCache)
  }

  delete meta.caches[chave]
  meta.ultimaAtualizacao = new Date().toISOString()
  salvarMeta(meta)

  return true
}

// Limpar caches expirados automaticamente
export function limparCachesExpirados(): number {
  garantirDiretorioCache()
  const meta = carregarMeta()
  const agora = new Date()
  let removidos = 0

  for (const [chave, cacheInfo] of Object.entries(meta.caches)) {
    const expiraEm = new Date(cacheInfo.expiraEm || cacheInfo.criadoEm)
    
    if (agora > expiraEm) {
      const arquivoCache = path.join(CACHE_DIR, cacheInfo.arquivo)
      if (fs.existsSync(arquivoCache)) {
        try {
          fs.unlinkSync(arquivoCache)
          removidos++
          console.log(`Cache expirado removido: ${cacheInfo.arquivo}`)
        } catch (error) {
          console.error(`Erro ao remover cache expirado ${cacheInfo.arquivo}:`, error)
        }
      }
      delete meta.caches[chave]
    }
  }

  if (removidos > 0) {
    meta.ultimaAtualizacao = new Date().toISOString()
    salvarMeta(meta)
    console.log(`Total de caches expirados removidos: ${removidos}`)
  }

  return removidos
}

// Obter informações sobre cache específico
export function obterInfoCache(options: CacheOptions): {
  existe: boolean
  criadoEm?: string
  expiraEm?: string
  tempoRestante?: number // em minutos
  tamanho?: number
} | null {
  const chave = gerarChaveCache(options)
  const meta = carregarMeta()

  if (!meta.caches[chave]) {
    return { existe: false }
  }

  const cacheInfo = meta.caches[chave]
  const agora = new Date()
  const expiraEm = new Date(cacheInfo.expiraEm || cacheInfo.criadoEm)
  const tempoRestante = Math.max(0, Math.floor((expiraEm.getTime() - agora.getTime()) / 1000 / 60))

  return {
    existe: true,
    criadoEm: cacheInfo.criadoEm,
    expiraEm: cacheInfo.expiraEm || cacheInfo.criadoEm,
    tempoRestante,
    tamanho: cacheInfo.tamanho
  }
}
