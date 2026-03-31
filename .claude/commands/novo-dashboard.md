Crie um dashboard completo com KPIs, graficos e filtros no padrao SISAM.

Entrada: $ARGUMENTS (nome do dashboard e KPIs desejados)
Exemplo: "Dashboard Escolar kpis:alunos,turmas,frequencia,media graficos:barras,pizza,evolucao"

## 1. Estrutura da Pagina

### Header com gradiente
```tsx
<div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white">
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-3">
      <div className="bg-white/10 p-2 rounded-lg"><BarChart3 className="w-6 h-6" /></div>
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-300 text-sm">Visao geral do sistema</p>
      </div>
    </div>
    <div className="flex gap-2">{/* filtros */}</div>
  </div>
</div>
```

### KPI Cards (grid responsivo)
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
  {kpis.map(kpi => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
          <kpi.icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.valor}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
        </div>
      </div>
    </div>
  ))}
</div>
```

### Graficos (Recharts)
```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

// Barras
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={dados}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
    <YAxis tick={{ fontSize: 12 }} />
    <Tooltip />
    <Bar dataKey="valor" fill="#4f46e5" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>

// Pizza
<PieChart><Pie data={dados} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="valor">
  {dados.map((_, i) => <Cell key={i} fill={CORES[i]} />)}
</Pie></PieChart>
```

## 2. Filtros
- Selects para: ano_letivo, escola, polo, periodo
- Busca textual com debounce
- Botao "Limpar filtros"
- Persistir filtros no URL (searchParams)

## 3. Tabela de dados (abaixo dos graficos)
- Desktop: tabela com sort e paginacao
- Mobile: cards
- Export CSV

## 4. Loading states
- Skeleton ou spinner para cada card/grafico individualmente
- Nao bloquear toda a pagina por um grafico lento

## 5. Cache
- Usar `withRedisCache` no endpoint da API
- Botao "Atualizar" no header para forcar refresh
- Incluir `_cache.origem` na resposta

## 6. Cores padrao para graficos
```typescript
const CORES = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
```
