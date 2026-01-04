/**
 * Script para limpar caches expirados automaticamente
 * 
 * Este script pode ser executado manualmente ou configurado como cron job
 * para limpar caches expirados periodicamente.
 * 
 * Uso:
 *   node scripts/limpar-caches-expirados.js
 */

const fs = require('fs')
const path = require('path')

const CACHE_DIR = path.join(process.cwd(), 'config', 'cache')
const CACHE_META_FILE = path.join(CACHE_DIR, 'cache-meta.json')

function limparCachesExpirados() {
  console.log('🧹 Limpando caches expirados...\n')

  if (!fs.existsSync(CACHE_META_FILE)) {
    console.log('✅ Nenhum cache encontrado')
    return { removidos: 0, tamanhoLiberado: 0 }
  }

  try {
    const metaContent = fs.readFileSync(CACHE_META_FILE, 'utf-8')
    const meta = JSON.parse(metaContent)
    
    const agora = new Date()
    let removidos = 0
    let tamanhoLiberado = 0

    for (const [chave, cacheInfo] of Object.entries(meta.caches || {})) {
      const expiraEm = new Date(cacheInfo.expiraEm || cacheInfo.criadoEm)
      
      if (agora > expiraEm) {
        const arquivoCache = path.join(CACHE_DIR, cacheInfo.arquivo)
        
        if (fs.existsSync(arquivoCache)) {
          try {
            const stats = fs.statSync(arquivoCache)
            fs.unlinkSync(arquivoCache)
            removidos++
            tamanhoLiberado += cacheInfo.tamanho || stats.size
            console.log(`   ✅ Removido: ${cacheInfo.arquivo} (${(cacheInfo.tamanho / 1024).toFixed(2)} KB)`)
          } catch (error) {
            console.error(`   ❌ Erro ao remover ${cacheInfo.arquivo}:`, error.message)
          }
        }
        delete meta.caches[chave]
      }
    }

    if (removidos > 0) {
      meta.ultimaAtualizacao = new Date().toISOString()
      fs.writeFileSync(CACHE_META_FILE, JSON.stringify(meta, null, 2))
      console.log(`\n✅ ${removidos} cache(s) expirado(s) removido(s)`)
      console.log(`📦 Tamanho liberado: ${(tamanhoLiberado / 1024).toFixed(2)} KB`)
    } else {
      console.log('\n✅ Nenhum cache expirado encontrado')
    }

    // Mostrar estatísticas finais
    const totalCaches = Object.keys(meta.caches || {}).length
    const tamanhoTotal = Object.values(meta.caches || {}).reduce((acc, c) => acc + (c.tamanho || 0), 0)
    
    console.log(`\n📊 Estatísticas:`)
    console.log(`   - Total de caches: ${totalCaches}`)
    console.log(`   - Tamanho total: ${(tamanhoTotal / 1024).toFixed(2)} KB (${(tamanhoTotal / 1024 / 1024).toFixed(2)} MB)`)

    return { removidos, tamanhoLiberado }
  } catch (error) {
    console.error('❌ Erro ao limpar caches:', error)
    return { removidos: 0, tamanhoLiberado: 0, erro: error.message }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  limparCachesExpirados()
}

module.exports = { limparCachesExpirados }

