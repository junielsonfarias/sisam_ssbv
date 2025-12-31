# 🔍 Verificar Credenciais do Supabase Connection Pooler

## ⚠️ Erro Atual

```
"database_error": {
  "code": "XX000",
  "message": "Tenant or user not found"
}
```

Este erro indica que o **`DB_USER`** na Vercel está incorreto para o Connection Pooler.

## ✅ Formato Correto do DB_USER

Para o **Supabase Connection Pooler**, o formato do usuário DEVE ser:

```
postgres.[PROJECT-REF]
```

**NÃO** use apenas `postgres` - isso só funciona na conexão direta (porta 5432).

## 🔍 Como Obter as Credenciais Corretas

### 1. Acesse o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Database**

### 2. Obter Connection Pooler Credentials

1. Role até a seção **Connection Pooling**
2. Selecione o modo **Transaction** (recomendado para aplicações)
3. Copie as credenciais que aparecem:

**Exemplo de credenciais do Connection Pooler:**
```
Host: aws-0-us-east-1.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.[PROJECT-REF]  ← IMPORTANTE: Deve incluir o project ref!
Password: [sua-senha]
```

### 3. Identificar o Project Reference

O Project Reference pode ser encontrado em:
- URL do projeto: `https://[PROJECT-REF].supabase.co`
- Ou no formato do usuário do pooler: `postgres.[PROJECT-REF]`

**Exemplos:**
- Se o URL é `https://cjxejpgtuuqnbczpbdfe.supabase.co`, o project ref é `cjxejpgtuuqnbczpbdfe`
- O usuário do pooler seria: `postgres.cjxejpgtuuqnbczpbdfe`

## 📝 Configuração na Vercel

Configure as seguintes variáveis de ambiente na Vercel:

```
DB_HOST=[host-do-pooler]  ← Ex: aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.[PROJECT-REF]  ← DEVE incluir o project ref!
DB_PASSWORD=[sua-senha]
DB_SSL=true
JWT_SECRET=[sua-chave-secreta]
NODE_ENV=production
```

## ⚠️ Diferenças Importantes

### Conexão Direta (porta 5432) - NÃO usar na Vercel
```
DB_HOST=db.[PROJECT-REF].supabase.co
DB_PORT=5432
DB_USER=postgres  ← Sem project ref
```

### Connection Pooler (porta 6543) - USAR na Vercel
```
DB_HOST=aws-0-[REGION].pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.[PROJECT-REF]  ← COM project ref!
```

## 🔧 Passos para Corrigir

1. ✅ Acesse o Supabase Dashboard
2. ✅ Vá em Settings → Database → Connection Pooling
3. ✅ Copie o **User** completo (deve ser `postgres.[PROJECT-REF]`)
4. ✅ Copie o **Host** do pooler
5. ✅ Vá na Vercel → Settings → Environment Variables
6. ✅ Atualize `DB_USER` com o valor completo: `postgres.[PROJECT-REF]`
7. ✅ Atualize `DB_HOST` com o host do pooler
8. ✅ Certifique-se de que `DB_PORT=6543`
9. ✅ Faça um novo deploy
10. ✅ Teste novamente: `https://[seu-dominio]/api/health`

## ✅ Verificação

Após corrigir, o health check deve retornar:

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "jwt": "ok"
  }
}
```

