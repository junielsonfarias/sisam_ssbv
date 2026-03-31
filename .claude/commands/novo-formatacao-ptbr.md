Crie helpers de formatacao para pt-BR no padrao SISAM.

Entrada: $ARGUMENTS ("completo" ou tipo especifico: "datas", "numeros", "textos")

## 1. Formatacao de datas
```typescript
// Formatacao basica
new Date().toLocaleDateString('pt-BR') // "31/03/2026"
new Date().toLocaleString('pt-BR')     // "31/03/2026, 10:30:00"

// Formatacao customizada com Intl
function formatarData(data: string | Date, formato: 'curta' | 'longa' | 'completa' = 'curta'): string {
  const dt = typeof data === 'string' ? new Date(data) : data
  if (isNaN(dt.getTime())) return '-'

  const opcoes: Intl.DateTimeFormatOptions = {
    curta: { day: '2-digit', month: '2-digit', year: 'numeric' },
    longa: { day: '2-digit', month: 'long', year: 'numeric' },
    completa: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' },
  }[formato]

  return dt.toLocaleDateString('pt-BR', opcoes)
}

// Timezone Belem/PA (UTC-3)
function formatarDataHoraLocal(timestamp: string | Date): { data: string; hora: string } {
  const dt = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const partes = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Belem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(dt)
  const get = (type: string) => partes.find(p => p.type === type)?.value || '00'
  return {
    data: \`\${get('year')}-\${get('month')}-\${get('day')}\`,
    hora: \`\${get('hour')}:\${get('minute')}:\${get('second')}\`
  }
}
```

## 2. Formatacao de numeros
```typescript
// Nota com cor
function notaColor(n: number | null): string {
  if (n === null) return 'text-gray-400'
  if (n >= 7) return 'text-blue-800 dark:text-blue-300'
  if (n >= 5) return 'text-amber-600'
  return 'text-red-600'
}

function notaBg(n: number | null): string {
  if (n === null) return ''
  if (n >= 7) return 'bg-blue-50 dark:bg-blue-900/20'
  if (n >= 5) return 'bg-amber-50 dark:bg-amber-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}

// Formatacao de nota pt-BR
function formatarNota(n: number | null): string {
  if (n === null || n === undefined) return '-'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// Porcentagem com cor
function freqColor(p: number | null): string {
  if (p === null) return 'text-gray-400'
  if (p >= 75) return 'text-blue-800'
  if (p >= 50) return 'text-amber-600'
  return 'text-red-600'
}

// CPF com mascara
function cpfMask(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3)
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6)
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9)
}

// Telefone com mascara
function telefoneMask(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2)
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
}
```

## 3. Formatacao de textos
```typescript
// Serie escolar
function formatSerie(serie: string | null | undefined): string {
  if (!serie) return '-'
  const num = serie.replace(/[^0-9]/g, '')
  if (num) return \`\${num}o Ano\`
  return serie
}

// Truncar texto
function truncar(texto: string, max: number = 50): string {
  if (texto.length <= max) return texto
  return texto.slice(0, max) + '...'
}

// Primeira letra maiuscula
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
}

// Pluralizar
function pluralizar(count: number, singular: string, plural?: string): string {
  return count === 1 ? \`\${count} \${singular}\` : \`\${count} \${plural || singular + 's'}\`
}
```

## 4. Formatacao para tabelas/CSV
```typescript
// Numero formatado para tabela
(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// CSV separador ponto-e-virgula (padrao Excel pt-BR)
colunas.map(col => valores[col]).join(';')

// BOM UTF-8 para Excel entender acentos
const BOM = '\uFEFF'
```

## O que deu certo
- `toLocaleDateString('pt-BR')` — funciona em server e client
- `Intl.DateTimeFormat` com timezone — correto para Belem (UTC-3)
- Funções `notaColor/notaBg/freqColor` — sistema visual consistente
- `cpfMask/telefoneMask` — mascara enquanto digita (onChange)
- Separador `;` no CSV — Excel pt-BR abre correto automaticamente
- BOM no CSV — acentos funcionam sem configuracao extra
