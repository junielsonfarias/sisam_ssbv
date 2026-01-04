# 🔧 Solução para Erro MaxClientsInSessionMode

## ❌ Problema

Erro: `MaxClientsInSessionMode: max clients reached - in Session mode max clients are limited to pool_size`

Este erro ocorre quando:
- O Supabase Connection Pooler está em **Session mode**
- Muitas conexões simultâneas estão sendo criadas
- O limite de conexões do pool é atingido

## ✅ Soluções Implementadas

### 1. Redução do Pool Size

**Antes:**
```typescript
max: isSupabase ? 5 : 10
```

**Depois:**
```typescript
max: isSupabase ? 2 : 10  // Apenas 2 conexões simultâneas
min: 0  // Não manter conexões idle
```

**Por quê?**
- Connection Pooler em Session mode tem limite geralmente de 15-20 conexões
- Com múltiplas instâncias serverless (Vercel), cada uma pode ter até 2 conexões
- Isso permite até 7-10 instâncias simultâneas sem atingir o limite

### 2. Retry Automático com Backoff Exponencial

Implementado sistema de retry que:
- Detecta erro `MaxClientsInSessionMode`
- Aguarda com backoff exponencial (100ms, 200ms, 400ms)
- Tenta novamente até 3 vezes
- Reduz drasticamente a taxa de erro

### 3. Configurações Otimizadas para Serverless

```typescript
idleTimeoutMillis: 10000,  // Fechar conexões idle rapidamente
allowExitOnIdle: true,     // Permite que processo termine quando não há conexões
connectionTimeoutMillis: 20000,  // Reduzido para respostas mais rápidas
query_timeout: 30000,      // Timeout para queries individuais
```

### 4. Liberação Rápida de Conexões

- `min: 0` - Não mantém conexões idle
- `idleTimeoutMillis: 10000` - Fecha conexões não utilizadas em 10 segundos
- `allowExitOnIdle: true` - Importante para serverless/Vercel

## 📊 Melhorias de Performance

### Cache
O sistema de cache JSON implementado anteriormente reduz drasticamente a necessidade de conexões:
- Dados cacheados não requerem conexão ao banco
- Reduz carga geral no pool
- Melhora tempo de resposta

### Queries Otimizadas
- Queries devem ser rápidas (< 30 segundos)
- Evitar queries muito complexas
- Usar índices apropriados

## 🔍 Monitoramento

Para monitorar o uso do pool:

```typescript
import pool from '@/database/connection'

// Verificar status do pool
console.log({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount
})
```

## 🚨 Se o Problema Persistir

### Opção 1: Usar Transaction Mode (Recomendado)

Transaction mode tem limite maior de conexões (até 200):

1. No Supabase Dashboard → Settings → Database
2. Connection Pooling → Use **Transaction Mode**
3. Use porta `6543` (Transaction mode)
4. Atualize `DB_PORT=6543` no Vercel

**Vantagens:**
- Limite muito maior (200 conexões)
- Melhor para serverless
- Mais eficiente

**Desvantagens:**
- Não suporta prepared statements
- Não suporta algumas funcionalidades de sessão

### Opção 2: Aumentar Pool Size no Supabase

Se estiver no plano pago:
1. Supabase Dashboard → Settings → Database
2. Connection Pooling → Ajustar `pool_size`
3. Padrão: 15-20, pode aumentar se necessário

### Opção 3: Usar Direct Connection para Operações Específicas

Para operações que não precisam de pool (migrations, scripts):
- Use Direct Connection (porta 5432)
- Host: `db.[PROJECT-REF].supabase.co`
- User: `postgres` (sem prefixo)

**⚠️ NÃO use para a aplicação em produção!**

## 📝 Checklist de Configuração

- [x] Pool size reduzido para 2 conexões
- [x] Retry automático implementado
- [x] Timeouts otimizados
- [x] Conexões idle fechadas rapidamente
- [x] Cache implementado para reduzir carga
- [ ] Usar Transaction Mode (opcional, mas recomendado)
- [ ] Monitorar logs para erros recorrentes

## 🎯 Resultados Esperados

- ✅ Redução drástica de erros MaxClientsInSessionMode
- ✅ Melhor tempo de resposta (< 2 segundos)
- ✅ Suporte a mais usuários simultâneos
- ✅ Menos carga no banco de dados

