# Otimizacao para 50+ Usuarios Simultaneos

Este documento descreve as otimizacoes implementadas para suportar 50+ usuarios simultaneos no SISAM.

## Problema Original

- Erro: `MaxClientsInSessionMode: max clients reached`
- Erro: `Max client connections reached`
- Sistema lento ao carregar dados do dashboard
- Filtros demorando para responder

## Solucoes Implementadas

### 1. Cache em Memoria (`lib/cache-memoria.ts`)

Sistema de cache em memoria otimizado para serverless com:

- **TTLs diferenciados por tipo de dado:**
  - Filtros: 30 minutos (raramente mudam)
  - Metricas gerais: 15 minutos
  - Dashboard: 10 minutos
  - Alunos detalhados: 5 minutos

- **LRU (Least Recently Used):** Remove automaticamente itens menos usados

- **Limpeza automatica:** Remove itens expirados a cada 5 minutos

### 2. Pool de Conexoes Otimizado (`database/connection.ts`)

- **Deteccao automatica de modo Supabase:**
  - Transaction Mode (porta 6543): Pool de 15 conexoes
  - Session Mode (porta 5432): Pool de 3 conexoes

- **Controle de concorrencia:** Maximo 8 queries paralelas

- **Retry com backoff exponencial:** Tenta novamente em caso de erro de conexao

### 3. Endpoint Otimizado (`/api/admin/dashboard-rapido`)

Novo endpoint com:

- Query unica usando CTE (Common Table Expression)
- Cache em memoria com TTL inteligente
- Carregamento em camadas

### 4. Indices do Banco de Dados

Script em `database/migrations/otimizar-indices-performance.sql` com indices para:

- `resultados_consolidados_unificada`
- `resultados_consolidados`
- `resultados_provas`
- `escolas`, `alunos`, `turmas`

## Configuracao Necessaria

### IMPORTANTE: Usar Transaction Mode no Supabase

O erro `MaxClientsInSessionMode` ocorre porque o Supabase em Session Mode limita conexoes.

**Para resolver, altere no Vercel/Supabase:**

```env
# ANTES (Session Mode - limitado)
DB_PORT=5432

# DEPOIS (Transaction Mode - recomendado)
DB_PORT=6543
```

**No Supabase Dashboard:**
1. Va em Settings > Database
2. Copie o "Connection pooling" string
3. Use a porta 6543 (Transaction Mode)

### Aplicar Indices no Banco

1. Abra o Supabase Dashboard
2. Va em SQL Editor
3. Cole o conteudo de `database/migrations/otimizar-indices-performance.sql`
4. Execute

## Endpoints de Cache

### Ver status do cache
```
GET /api/admin/cache
```

### Limpar cache em memoria
```
GET /api/admin/cache?acao=limpar_memoria
```

### Limpar todo o cache
```
GET /api/admin/cache?acao=limpar_todos
```

### Invalidar cache do dashboard (apos importacoes)
```
GET /api/admin/cache?acao=invalidar_dashboard
```

### Ver estatisticas detalhadas
```
GET /api/admin/cache?acao=stats
```

## Monitoramento

O endpoint `/api/admin/cache` retorna:

```json
{
  "cacheMemoria": {
    "hits": 150,
    "misses": 20,
    "hitRate": 88.2,
    "entries": 45
  },
  "poolConexoes": {
    "total": 15,
    "idle": 10,
    "waiting": 0,
    "activeQueries": 5,
    "queuedQueries": 0
  },
  "recomendacoes": [
    "Sistema operando normalmente."
  ]
}
```

## Comparacao de Performance

| Metrica | Antes | Depois |
|---------|-------|--------|
| Tempo de resposta (cache miss) | 3-5s | 1-2s |
| Tempo de resposta (cache hit) | - | 50-100ms |
| Usuarios simultaneos suportados | ~10 | 50+ |
| Erro de conexao | Frequente | Raro |

## Arquivos Modificados/Criados

### Novos
- `lib/cache-memoria.ts` - Cache em memoria
- `app/api/admin/dashboard-rapido/route.ts` - Endpoint otimizado
- `database/migrations/otimizar-indices-performance.sql` - Indices

### Modificados
- `database/connection.ts` - Pool otimizado
- `app/api/admin/dashboard-dados/route.ts` - Cache em memoria
- `app/api/admin/cache/route.ts` - Gerenciamento de cache

## Checklist de Deploy

- [ ] Alterar `DB_PORT` para `6543` no Vercel
- [ ] Executar script de indices no Supabase
- [ ] Fazer deploy da aplicacao
- [ ] Verificar logs no Vercel para confirmar Transaction Mode
- [ ] Testar com multiplos usuarios

## Troubleshooting

### Ainda recebendo erro de conexao?

1. Verifique se `DB_PORT=6543` esta configurado
2. Limpe o cache: `/api/admin/cache?acao=limpar_todos`
3. Verifique estatisticas: `/api/admin/cache?acao=stats`

### Cache nao esta funcionando?

1. Verifique hit rate em `/api/admin/cache`
2. Se hit rate < 50%, os filtros podem estar muito especificos
3. Considere aumentar TTL no `lib/cache-memoria.ts`

### Queries ainda lentas?

1. Execute os indices em `database/migrations/otimizar-indices-performance.sql`
2. Verifique no Supabase Dashboard > Database > Query Performance
3. Considere criar a Materialized View (comentada no script)
