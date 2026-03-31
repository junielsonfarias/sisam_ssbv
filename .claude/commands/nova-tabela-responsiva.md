Crie uma tabela de dados responsiva com desktop table + mobile cards no padrao SISAM.

Entrada: $ARGUMENTS (nome e colunas)
Exemplo: "Alunos colunas:nome,serie,turma,escola,situacao(badge),media(nota)"

## Padrao Dual: Desktop Table + Mobile Cards

### Desktop (hidden em mobile)
```tsx
<div className="hidden sm:block overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
        <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Nome</th>
        <th className="text-center px-3 py-3 font-semibold">Serie</th>
        {/* mais colunas */}
      </tr>
    </thead>
    <tbody>
      {dados.map(item => (
        <tr key={item.id} className="border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{item.nome}</td>
          <td className="text-center px-3 py-3">{item.serie}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Mobile Cards (hidden em desktop)
```tsx
<div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
  {dados.map(item => (
    <div key={item.id} className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-slate-800 dark:text-white">{item.nome}</span>
        <Badge variante={item.situacao === 'ativo' ? 'success' : 'error'}>{item.situacao}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {/* valores em mini-cards */}
        <div className="text-center py-1.5 rounded-lg bg-gray-50 dark:bg-slate-700">
          <div className="text-[9px] text-slate-400 font-medium">Serie</div>
          <div className="text-sm font-bold text-slate-700 dark:text-white">{item.serie}</div>
        </div>
      </div>
    </div>
  ))}
</div>
```

## Formatacao de valores

### Nota (colorida)
```typescript
function notaColor(n: number | null) {
  if (n === null) return 'text-gray-400'
  if (n >= 7) return 'text-blue-800 dark:text-blue-300'
  if (n >= 5) return 'text-amber-600'
  return 'text-red-600'
}
function notaBg(n: number | null) {
  if (n === null) return ''
  if (n >= 7) return 'bg-blue-50 dark:bg-blue-900/20'
  if (n >= 5) return 'bg-amber-50 dark:bg-amber-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}
```

### Badge de status
```typescript
const badgeClasses = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}
```

### Presenca
```tsx
av.presenca === 'P'
  ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900">Presente</span>
  : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Faltou</span>
```

## Paginacao
```tsx
<div className="flex items-center justify-between mt-4 text-sm">
  <span className="text-gray-500 dark:text-gray-400">{total} registros</span>
  <div className="flex gap-1">
    <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
      className="px-3 py-1 rounded border border-gray-300 dark:border-slate-600 disabled:opacity-50">Anterior</button>
    <span className="px-3 py-1">{pagina}/{totalPaginas}</span>
    <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}
      className="px-3 py-1 rounded border border-gray-300 dark:border-slate-600 disabled:opacity-50">Proxima</button>
  </div>
</div>
```

## Busca e Filtros (acima da tabela)
```tsx
<div className="flex flex-col sm:flex-row gap-3 mb-4">
  <input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
    className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700" />
  <select value={filtro} onChange={e => setFiltro(e.target.value)}
    className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700">
    <option value="">Todos</option>
  </select>
</div>
```

## Estado vazio
```tsx
{dados.length === 0 && (
  <div className="text-center py-12 text-slate-400">
    <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
    <p>Nenhum registro encontrado</p>
  </div>
)}
```
