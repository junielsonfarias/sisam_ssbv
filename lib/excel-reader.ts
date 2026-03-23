/**
 * Wrapper centralizado para leitura de arquivos Excel/CSV
 *
 * Abstrai a biblioteca de leitura (exceljs) para que rotas de importação
 * não dependam diretamente da lib. Se precisar trocar a lib no futuro,
 * basta alterar este arquivo.
 *
 * @module lib/excel-reader
 */

export interface ExcelRow {
  [key: string]: string | number | null | undefined
}

/**
 * Carrega ExcelJS sob demanda (evita 450KB no bundle principal)
 */
async function getExcelJS() {
  const ExcelJS = (await import('exceljs')).default
  return ExcelJS
}

/**
 * Lê um arquivo Excel/CSV a partir de um ArrayBuffer e retorna
 * os dados como array de objetos (similar ao antigo XLSX.utils.sheet_to_json).
 *
 * @param buffer - ArrayBuffer do arquivo
 * @param options - Opções de leitura
 * @returns Array de objetos com chaves = cabeçalhos da primeira linha
 */
export async function lerPlanilha(
  buffer: ArrayBuffer,
  options?: { sheetIndex?: number }
): Promise<ExcelRow[]> {
  const ExcelJS = await getExcelJS()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(buffer) as any)

  const sheetIndex = options?.sheetIndex ?? 0
  const worksheet = workbook.worksheets[sheetIndex]

  if (!worksheet || worksheet.rowCount === 0) {
    return []
  }

  // Extrair cabeçalhos da primeira linha
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.text?.trim() || `col_${colNumber}`
  })

  if (headers.length === 0) {
    return []
  }

  // Extrair dados das linhas restantes
  const dados: ExcelRow[] = []
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum)

    // Pular linhas completamente vazias
    let hasData = false
    const rowObj: ExcelRow = {}

    headers.forEach((header, idx) => {
      const cell = row.getCell(idx + 1)
      let value: string | number | null = null

      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'number') {
          value = cell.value
        } else if (typeof cell.value === 'object' && 'result' in cell.value) {
          // Célula com fórmula — usar resultado
          value = String(cell.value.result ?? '')
        } else {
          value = String(cell.value).trim()
        }
        if (value !== '' && value !== null) hasData = true
      }

      // Defval '' para manter compatibilidade com xlsx.sheet_to_json({ defval: '' })
      rowObj[header] = value ?? ''
    })

    if (hasData) {
      dados.push(rowObj)
    }
  }

  return dados
}

/**
 * Retorna os nomes das abas de uma planilha Excel
 */
export async function listarAbas(buffer: ArrayBuffer): Promise<string[]> {
  const ExcelJS = await getExcelJS()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(buffer) as any)
  return workbook.worksheets.map(ws => ws.name)
}
