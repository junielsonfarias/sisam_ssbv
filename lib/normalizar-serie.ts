/**
 * Normaliza o formato da série para o padrão do sistema
 * Converte: "8º", "9º", "8º ano", "9º ano" -> "8º Ano", "9º Ano"
 */
export function normalizarSerie(serie: string | null | undefined): string | null {
  if (!serie) return null
  
  const serieTrim = serie.trim()
  
  // Se já está no formato correto "Xº Ano", retornar normalizado
  const matchFormatado = serieTrim.match(/^(\d+)º\s*ano$/i)
  if (matchFormatado) {
    return `${matchFormatado[1]}º Ano`
  }
  
  // Extrair número da série
  const match = serieTrim.match(/^(\d+)/)
  if (!match) return serieTrim // Se não encontrar número, retornar como está
  
  const numero = parseInt(match[1])
  
  // Normalizar para "Xº Ano"
  if (numero >= 1 && numero <= 9) {
    return `${numero}º Ano`
  }
  
  // Se não for um número válido de série, retornar como está
  return serieTrim
}

/**
 * Normaliza série para comparação (remove acentos e espaços extras)
 */
export function normalizarSerieParaComparacao(serie: string | null | undefined): string {
  if (!serie) return ''
  return normalizarSerie(serie)?.trim().toUpperCase() || ''
}

