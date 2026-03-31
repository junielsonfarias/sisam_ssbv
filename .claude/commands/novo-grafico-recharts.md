Crie graficos com Recharts integrado ao dark mode no padrao SISAM.

Entrada: $ARGUMENTS (tipo: "barras", "pizza", "linha", "radar" ou "completo")

## 1. Import dinamico (evita SSR errors)
```typescript
import dynamic from 'next/dynamic'

const GraficoBarras = dynamic(() => import('./GraficoBarras'), { ssr: false })
```

## 2. CSS vars para cores de graficos (`globals.css`)
```css
:root {
  --chart-grid: #e5e7eb;
  --chart-text: #6b7280;
  --chart-tooltip-bg: #ffffff;
  --chart-tooltip-border: #e5e7eb;
}
.dark {
  --chart-grid: #334155;
  --chart-text: #94a3b8;
  --chart-tooltip-bg: #1e293b;
  --chart-tooltip-border: #475569;
}
```

## 3. Paleta de cores padrao
```typescript
const CORES = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

// Cores por disciplina (SISAM)
const CORES_DISCIPLINA = {
  LP: '#3b82f6',      // Azul
  MAT: '#10b981',     // Verde
  CH: '#f59e0b',      // Amarelo
  CN: '#8b5cf6',      // Roxo
  PROD: '#ec4899',    // Rosa
}
```

## 4. Grafico de Barras
```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function GraficoBarras({ dados, dataKey = 'valor', nameKey = 'nome' }: { dados: any[]; dataKey?: string; nameKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dados} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 12, fill: 'var(--chart-text)' }} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--chart-text)' }} domain={[0, 10]} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {dados.map((_, i) => (
            <Cell key={i} fill={CORES[i % CORES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

## 5. Grafico de Pizza/Donut
```tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

function GraficoPizza({ dados, innerRadius = 60, outerRadius = 80 }: { dados: { nome: string; valor: number }[]; innerRadius?: number; outerRadius?: number }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={dados} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={outerRadius}
          dataKey="valor" nameKey="nome" paddingAngle={2}>
          {dados.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: '8px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

## 6. Grafico de Linha (evolucao)
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function GraficoLinha({ dados, linhas }: { dados: any[]; linhas: { key: string; cor: string; nome: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: 'var(--chart-text)' }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'var(--chart-text)' }} />
        <Tooltip contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', borderRadius: '8px' }} />
        <Legend />
        {linhas.map(l => (
          <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.cor} name={l.nome}
            strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

## 7. Container com titulo e acoes
```tsx
<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
      <BarChart3 className="w-4 h-4 text-indigo-600" />
      Titulo do Grafico
    </h3>
    <button onClick={exportar} className="text-xs text-indigo-600 hover:text-indigo-800">
      Exportar
    </button>
  </div>
  <GraficoBarras dados={dados} />
</div>
```

## 8. Largura responsiva baseada em dados
```typescript
// Calcular largura minima baseada na quantidade de barras
const largura = Math.max(400, Math.min(550, dados.length * 45))
```

## O que deu certo
- **`ssr: false`** no dynamic import — ZERO erros de hydration com Recharts
- **CSS vars** para cores do grid/tooltip — dark mode automatico
- **`ResponsiveContainer width="100%"`** — adapta a qualquer container
- **`radius={[4, 4, 0, 0]}`** nas barras — visual moderno
- **Tooltip customizado** — combina com dark mode
- **Paleta de 8 cores** — suficiente para maioria dos graficos, visualmente distinta
