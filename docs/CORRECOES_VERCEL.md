# 🔧 Correções para Deploy na Vercel

## ✅ Problemas Corrigidos

### 1. Erro: Dynamic Server Usage
**Problema**: Rotas API tentando ser renderizadas estaticamente, mas usando `request.cookies`.

**Solução**: Adicionado `export const dynamic = 'force-dynamic'` em todas as 28 rotas API.

**Arquivos corrigidos**:
- Todas as rotas em `app/api/**/route.ts`

### 2. Erro: ENETUNREACH (IPv6)
**Problema**: Tentativa de conexão IPv6 ao Supabase durante o build, causando `ENETUNREACH`.

**Solução**: Forçado uso de IPv4 em produção para conexões Supabase.

**Arquivo corrigido**:
- `database/connection.ts` - Adicionado `config.family = 4` para produção

## 📋 Configuração Necessária na Vercel

### Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no painel da Vercel:

```
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.cjxejpgtuuqnbczpbdfe
DB_PASSWORD=SUA_SENHA_AQUI
DB_SSL=true
JWT_SECRET=[mesmo JWT_SECRET do .env local]
NODE_ENV=production
```

**⚠️ IMPORTANTE**: 
- Use o **Connection Pooler** (porta 6543) para produção
- O usuário deve incluir o project reference: `postgres.cjxejpgtuuqnbczpbdfe`
- Use IPv4 (já configurado no código)

### Como Obter Credenciais do Connection Pooler

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: `cjxejpgtuuqnbczpbdfe`
3. Vá em **Settings** → **Database**
4. Role até **Connection Pooling**
5. Copie as credenciais do **Connection Pooler** (porta 6543)

## 🚀 Próximos Passos

1. ✅ Código corrigido e enviado para o GitHub
2. ⏳ Configure as variáveis de ambiente na Vercel
3. ⏳ Faça um novo deploy
4. ⏳ Verifique se o deploy foi bem-sucedido

## 📝 Notas

- Os erros de "Dynamic server usage" eram apenas avisos durante o build e não impediam o deploy
- O erro de conexão IPv6 foi corrigido forçando IPv4 em produção
- Todas as rotas API agora são renderizadas dinamicamente (correto para APIs que usam cookies)

