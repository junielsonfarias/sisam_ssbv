Crie skeleton loaders por componente (nao generico) no padrao moderno.

Entrada: $ARGUMENTS (tipo: "card", "tabela", "formulario", "grafico", "dashboard" ou "todos")

## Principio: Cada componente tem SEU skeleton

Em vez de 1 skeleton generico pra pagina inteira, cada area carrega independente.
O usuario ve a ESTRUTURA imediatamente — conteudo aparece progressivamente.

## 1. Skeleton Base
```typescript
// components/ui/skeleton.tsx
'use client'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
  const roundedClass = {
    sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-full'
  }[rounded]

  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 ${roundedClass} ${className}`} />
  )
}
```

## 2. Skeleton de KPI Card
```typescript
export function SkeletonKPI() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8" rounded="lg" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}
```

## 3. Skeleton de Tabela
```typescript
export function SkeletonTabela({ linhas = 5, colunas = 4 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-700">
        <Skeleton className="h-6 w-40" />
      </div>
      {/* Rows */}
      <div className="p-4 space-y-3">
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {Array.from({ length: colunas }).map((_, j) => (
              <Skeleton key={j} className={`h-4 ${j === 0 ? 'flex-1' : `w-${16 + j * 4}`}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 4. Skeleton de Grafico
```typescript
export function SkeletonGrafico({ altura = 300 }: { altura?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <div className="flex justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex items-end gap-2 justify-around" style={{ height: altura }}>
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} rounded="sm" />
        ))}
      </div>
    </div>
  )
}
```

## 5. Skeleton de Formulario
```typescript
export function SkeletonFormulario({ campos = 6 }: { campos?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: campos }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-10 w-full" rounded="lg" />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6 gap-3">
        <Skeleton className="h-10 w-24" rounded="lg" />
        <Skeleton className="h-10 w-24" rounded="lg" />
      </div>
    </div>
  )
}
```

## 6. Dashboard completo com skeletons independentes
```typescript
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Skeleton className="h-24 w-full" rounded="xl" />

      {/* KPIs — cada um carrega separado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonKPI key={i} />)}
      </div>

      {/* Graficos — carregam independentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonGrafico />
        <SkeletonGrafico altura={250} />
      </div>

      {/* Tabela */}
      <SkeletonTabela linhas={5} colunas={4} />
    </div>
  )
}
```

## 7. Uso com Suspense (Next.js 14)
```typescript
import { Suspense } from 'react'

// Cada componente envolvido em Suspense individual
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
  <Suspense fallback={<SkeletonKPI />}>
    <KPIAlunos />
  </Suspense>
  <Suspense fallback={<SkeletonKPI />}>
    <KPITurmas />
  </Suspense>
</div>

<Suspense fallback={<SkeletonGrafico />}>
  <GraficoDesempenho />
</Suspense>

<Suspense fallback={<SkeletonTabela />}>
  <TabelaAlunos />
</Suspense>
```

## Regras
- NUNCA um skeleton generico pra pagina inteira
- Cada area carrega e mostra resultado INDEPENDENTE
- `animate-pulse` (nao spin) — padrao do mercado
- Dark mode: `bg-gray-200 dark:bg-slate-700`
- Skeleton deve ter MESMAS dimensoes do conteudo real (evita layout shift)
- Usar Suspense boundaries individuais quando possivel
