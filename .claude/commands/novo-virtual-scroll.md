Crie lista virtualizada para renderizar 1000+ itens sem travar o mobile.

Entrada: $ARGUMENTS (tipo de lista, ex: "alunos", "resultados", "tabela")

## Por que Virtual Scroll?
- 1.800 alunos renderizados = ~3.600 DOM nodes = lento em celulares
- Virtual scroll: renderiza APENAS ~20 itens visiveis
- De ~200ms render para ~5ms (40x mais rapido)

## 1. Instalar
```bash
npm install @tanstack/react-virtual
```

## 2. Lista Virtualizada
```typescript
'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualListProps<T> {
  items: T[]
  alturaItem: number  // altura de cada item em px
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  alturaContainer?: number | string  // default: 600px
}

export function VirtualList<T>({
  items,
  alturaItem,
  renderItem,
  className = '',
  alturaContainer = 600
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => alturaItem,
    overscan: 5,  // renderiza 5 itens extras acima/abaixo
  })

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: typeof alturaContainer === 'number' ? alturaContainer : alturaContainer }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 3. Uso — Lista de alunos
```typescript
<VirtualList
  items={alunos}
  alturaItem={64}
  alturaContainer="calc(100vh - 200px)"
  renderItem={(aluno, index) => (
    <div className={`flex items-center px-4 py-3 border-b border-gray-100 dark:border-slate-700
                     ${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-800/50'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{aluno.nome}</p>
        <p className="text-xs text-gray-500">{aluno.codigo} — {aluno.serie}</p>
      </div>
      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{aluno.situacao}</span>
    </div>
  )}
/>
```

## 4. Tabela Virtualizada
```typescript
export function VirtualTable<T>({
  items, colunas, alturaLinha = 48
}: { items: T[]; colunas: { key: string; label: string; width?: string }[]; alturaLinha?: number }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => alturaLinha,
    overscan: 10,
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Header fixo */}
      <div className="flex bg-slate-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600">
        {colunas.map(col => (
          <div key={col.key} className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400"
            style={{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Body virtualizado */}
      <div ref={parentRef} style={{ height: 'calc(100vh - 300px)', overflow: 'auto' }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map(row => {
            const item = items[row.index] as Record<string, any>
            return (
              <div key={row.key}
                className="flex items-center border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: row.size, transform: `translateY(${row.start}px)` }}>
                {colunas.map(col => (
                  <div key={col.key} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 truncate"
                    style={{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }}>
                    {item[col.key] ?? '-'}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

## Quando usar
| Itens | Solucao |
|-------|---------|
| < 100 | Renderizar tudo (sem virtualizacao) |
| 100-500 | Paginacao server-side |
| 500-5000 | **Virtual scroll** |
| 5000+ | Virtual scroll + paginacao server-side |

## Performance comparada
| Alunos | Sem virtual | Com virtual |
|--------|-------------|-------------|
| 100 | 15ms | 15ms (nao precisa) |
| 500 | 80ms | 8ms |
| 1.800 | 250ms | 8ms |
| 5.000 | 700ms+ | 8ms |
