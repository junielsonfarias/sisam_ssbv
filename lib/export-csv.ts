/**
 * Utilitário para exportação de dados em formato CSV compatível com Excel
 */

export interface ColunaCSV {
  campo: string
  titulo: string
}

/**
 * Exporta dados como arquivo CSV com BOM para compatibilidade com Excel
 */
export function exportarCSV(
  dados: Record<string, any>[],
  colunas: ColunaCSV[],
  nomeArquivo: string
): void {
  if (!dados || dados.length === 0) return

  // BOM para UTF-8 (Excel precisa disso para acentos)
  const BOM = '\uFEFF'

  // Header
  const header = colunas.map(c => escaparCampoCSV(c.titulo)).join(';')

  // Rows
  const rows = dados.map(item =>
    colunas.map(col => {
      const valor = item[col.campo]
      if (valor === null || valor === undefined) return ''
      if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
      return escaparCampoCSV(String(valor))
    }).join(';')
  )

  const csvContent = BOM + [header, ...rows].join('\r\n')

  // Criar blob e disparar download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${nomeArquivo}.csv`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Escapa um campo CSV: envolve em aspas se contém separador, aspas ou quebra de linha
 */
function escaparCampoCSV(valor: string): string {
  if (valor.includes(';') || valor.includes('"') || valor.includes('\n') || valor.includes('\r')) {
    return '"' + valor.replace(/"/g, '""') + '"'
  }
  return valor
}
