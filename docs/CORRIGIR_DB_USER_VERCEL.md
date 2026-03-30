# 🔧 Corrigir Erro "Tenant or user not found" na Vercel

## ❌ Erro Identificado

```json
{
  "database_error": {
    "code": "XX000",
    "message": "Tenant or user not found"
  }
}
```

## 🔍 Causa

O erro `XX000: Tenant or user not found` indica que o **`DB_USER`** está configurado incorretamente na Vercel.

Para o **Supabase Connection Pooler**, o formato do usuário deve ser:
```
postgres.[PROJECT-REF]
```

Onde `[PROJECT-REF]` é o identificador do seu projeto Supabase.

## ✅ Solução

### 1. Identificar o Project Reference

**IMPORTANTE**: O Project Reference pode ser encontrado de duas formas:

**Método 1 - Via URL do Supabase:**
- Acesse: https://supabase.com/dashboard
- Selecione seu projeto
- A URL será: `https://[PROJECT-REF].supabase.co`
- O Project Reference é a parte antes de `.supabase.co`

**Método 2 - Via Connection Pooler:**
- Acesse: https://supabase.com/dashboard
- Selecione seu projeto
- Vá em **Settings** → **Database** → **Connection Pooling**
- O usuário mostrado será: `postgres.[PROJECT-REF]`
- Copie o Project Reference daí

**Exemplo:**
- Se o usuário do pooler é `postgres.cjxejpgtuuqnbczpbdfe`
- Então o Project Reference é: `cjxejpgtuuqnbczpbdfe`

### 2. Configurar DB_USER Corretamente na Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Encontre a variável `DB_USER`
5. **Altere para**: `postgres.cjxejpgtuuqnbczpbdfe`
6. Certifique-se de que está configurada para **Production** (e Preview/Development se necessário)
7. Clique em **Save**

### 3. Verificar Todas as Variáveis

Certifique-se de que TODAS as variáveis estão configuradas corretamente:

```
✅ DB_HOST=aws-0-us-east-1.pooler.supabase.com
✅ DB_PORT=6543
✅ DB_NAME=postgres
✅ DB_USER=postgres.cjxejpgtuuqnbczpbdfe  ← CORRIGIR ESTA!
✅ DB_PASSWORD=SUA_SENHA_AQUI
✅ DB_SSL=true
✅ JWT_SECRET=[sua-chave-secreta]
✅ NODE_ENV=production
```

### 4. Obter Credenciais Corretas do Supabase

**PASSO A PASSO COMPLETO:**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Role até a seção **Connection Pooling**
5. Selecione o modo **Transaction** (porta 6543) - recomendado para Vercel
6. Você verá uma string de conexão como:
   ```
   postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
7. **Extraia as informações:**
   - **Host**: A parte após `@` e antes de `:6543` (ex: `aws-0-us-east-1.pooler.supabase.com`)
   - **Port**: `6543`
   - **Database**: `postgres`
   - **User**: A parte após `postgres://` e antes de `:` (ex: `postgres.cjxejpgtuuqnbczpbdfe`)
   - **Password**: Sua senha do banco

**Exemplo de credenciais extraídas:**
```
Host: aws-0-us-east-1.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.cjxejpgtuuqnbczpbdfe  ← DEVE incluir o project ref!
Password: SUA_SENHA_AQUI
```

**⚠️ ATENÇÃO**: 
- O `User` **DEVE** incluir o project reference: `postgres.[PROJECT-REF]`
- **NÃO** use apenas `postgres` - isso só funciona na conexão direta (porta 5432)

### 5. Fazer Novo Deploy

Após corrigir as variáveis:

1. Vá em **Deployments** na Vercel
2. Clique nos três pontos (...) do último deploy
3. Selecione **Redeploy**
4. Ou faça um novo commit para trigger automático

### 6. Verificar Novamente

Após o deploy, acesse: `https://[seu-dominio]/api/health`

Deve retornar:
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "jwt": "ok"
  }
}
```

## ⚠️ Importante

- **NÃO use** a conexão direta (porta 5432) na Vercel
- **SEMPRE use** o Connection Pooler (porta 6543) para produção
- O `DB_USER` **DEVE** incluir o project reference: `postgres.cjxejpgtuuqnbczpbdfe`
- O `DB_NAME` **SEMPRE** é `postgres` no Supabase (não `sisam`)

## 🔄 Diferença entre Conexões

### Conexão Direta (porta 5432) - NÃO usar na Vercel
```
DB_HOST=db.cjxejpgtuuqnbczpbdfe.supabase.co
DB_PORT=5432
DB_USER=postgres  ← Sem project ref
```

### Connection Pooler (porta 6543) - USAR na Vercel
```
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.cjxejpgtuuqnbczpbdfe  ← COM project ref!
```

## ✅ Checklist

- [ ] `DB_USER` está como `postgres.cjxejpgtuuqnbczpbdfe`
- [ ] `DB_HOST` aponta para o pooler (pooler.supabase.com)
- [ ] `DB_PORT` é `6543`
- [ ] `DB_NAME` é `postgres`
- [ ] Todas as variáveis estão configuradas para Production
- [ ] Novo deploy foi feito após corrigir
- [ ] Health check retorna `"database": "ok"`

