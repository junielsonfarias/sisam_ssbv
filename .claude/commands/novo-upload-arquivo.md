Crie um sistema de upload de arquivos com validacao no padrao SISAM.

Entrada: $ARGUMENTS (tipos aceitos e tamanho maximo)
Exemplo: "xlsx,csv,pdf max:10mb destino:importacao"

## 1. Validacao de upload (`lib/api-helpers.ts`)
```typescript
const ALLOWED_TYPES = {
  excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
  csv: ['text/csv', 'application/csv'],
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/webp'],
}

const MAX_FILE_SIZES = {
  excel: 10 * 1024 * 1024,  // 10MB
  csv: 5 * 1024 * 1024,     // 5MB
  pdf: 20 * 1024 * 1024,    // 20MB
  image: 5 * 1024 * 1024,   // 5MB
}

export function validarArquivoUpload(
  arquivo: File,
  tiposPermitidos: (keyof typeof ALLOWED_TYPES)[] = ['excel'],
  maxSize?: number
): string | null {
  if (!arquivo || arquivo.size === 0) return 'Arquivo vazio'

  const tiposAceitos = tiposPermitidos.flatMap(t => ALLOWED_TYPES[t])
  if (!tiposAceitos.includes(arquivo.type)) {
    return `Tipo de arquivo nao permitido. Aceitos: ${tiposPermitidos.join(', ')}`
  }

  const limiteMax = maxSize || Math.max(...tiposPermitidos.map(t => MAX_FILE_SIZES[t]))
  if (arquivo.size > limiteMax) {
    return `Arquivo muito grande. Maximo: ${(limiteMax / 1024 / 1024).toFixed(0)}MB`
  }

  return null // OK
}
```

## 2. API Route com FormData
```typescript
export const POST = withAuth(['administrador'], async (request, usuario) => {
  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File

  if (!arquivo) {
    return NextResponse.json({ mensagem: 'Arquivo nao fornecido' }, { status: 400 })
  }

  const erroUpload = validarArquivoUpload(arquivo, ['excel'])
  if (erroUpload) {
    return NextResponse.json({ mensagem: erroUpload }, { status: 400 })
  }

  const arrayBuffer = await arquivo.arrayBuffer()
  // Processar arquivo...

  return NextResponse.json({ mensagem: 'Arquivo processado', linhas: dados.length })
})
```

## 3. Leitura de Excel (`lib/excel-reader.ts`)
```typescript
import ExcelJS from 'exceljs'

export async function lerPlanilha(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(buffer))
  const sheet = workbook.worksheets[0]
  if (!sheet || sheet.rowCount < 2) return []

  const headers: string[] = []
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString().trim() || `col_${colNumber}`
  })

  const dados: Record<string, unknown>[] = []
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i)
    const obj: Record<string, unknown> = {}
    row.eachCell((cell, colNumber) => {
      obj[headers[colNumber - 1]] = cell.value
    })
    if (Object.values(obj).some(v => v !== null && v !== undefined && v !== '')) {
      dados.push(obj)
    }
  }
  return dados
}
```

## 4. Export CSV (`lib/export-csv.ts`)
```typescript
export function gerarCSV(dados: Record<string, any>[], colunas: { chave: string; label: string }[]): string {
  const header = colunas.map(c => c.label).join(';')
  const linhas = dados.map(item =>
    colunas.map(c => {
      const val = item[c.chave]
      if (val === null || val === undefined) return ''
      return String(val).replace(/;/g, ',').replace(/\n/g, ' ')
    }).join(';')
  )
  return [header, ...linhas].join('\n')
}
```

## 5. Frontend — Input de arquivo
```tsx
<label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-indigo-400 transition-colors">
  <Upload className="w-5 h-5 text-gray-400" />
  <span className="text-sm text-gray-500">{arquivo ? arquivo.name : 'Selecionar arquivo'}</span>
  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
</label>
```

## 6. Vercel — maxDuration para uploads pesados
```typescript
export const maxDuration = 300 // 5 minutos
```
