# 📋 Como Obter Credenciais do Connection Pooler - Passo a Passo

## 🎯 Objetivo

Obter as credenciais corretas do **Supabase Connection Pooler** para configurar na Vercel.

## 📝 Passo a Passo Detalhado

### 1. Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto do SISAM

### 2. Navegar até Connection Pooling

1. No menu lateral, clique em **Settings** (⚙️)
2. Clique em **Database**
3. Role a página até encontrar a seção **Connection Pooling**

### 3. Selecionar Transaction Mode

1. Na seção **Connection Pooling**, você verá diferentes modos
2. Selecione **Transaction mode** (porta 6543)
3. Este é o modo recomendado para aplicações serverless como Vercel

### 4. Copiar as Credenciais

Você verá uma string de conexão no formato:

```
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Exemplo real:**
```
postgres://postgres.cjxejpgtuuqnbczpbdfe:SUA_SENHA_AQUI@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 5. Extrair Cada Parte

**DB_HOST:**
- A parte após `@` e antes de `:6543`
- Exemplo: `aws-0-us-east-1.pooler.supabase.com`

**DB_PORT:**
- Sempre `6543` para Transaction mode

**DB_NAME:**
- Sempre `postgres` no Supabase

**DB_USER:**
- A parte após `postgres://` e antes de `:`
- **IMPORTANTE**: Deve incluir o project reference!
- Exemplo: `postgres.cjxejpgtuuqnbczpbdfe`
- ❌ **NÃO** use apenas `postgres`

**DB_PASSWORD:**
- A parte após `:` e antes de `@`
- Exemplo: `SUA_SENHA_AQUI`

### 6. Configurar na Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione/Atualize cada variável:

```
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.cjxejpgtuuqnbczpbdfe
DB_PASSWORD=SUA_SENHA_AQUI
DB_SSL=true
JWT_SECRET=[sua-chave-secreta]
NODE_ENV=production
```

5. Certifique-se de marcar para **Production** (e Preview/Development se necessário)
6. Clique em **Save**

### 7. Fazer Novo Deploy

1. Vá em **Deployments**
2. Clique nos três pontos (...) do último deploy
3. Selecione **Redeploy**
4. Ou faça um novo commit para trigger automático

### 8. Verificar

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

## ⚠️ Erros Comuns

### Erro: "Tenant or user not found" (XX000)

**Causa**: `DB_USER` está como `postgres` em vez de `postgres.[PROJECT-REF]`

**Solução**: 
- Verifique se o `DB_USER` inclui o project reference
- Formato correto: `postgres.cjxejpgtuuqnbczpbdfe`
- Formato errado: `postgres`

### Erro: "Connection refused" ou "Host not found"

**Causa**: `DB_HOST` está incorreto ou usando conexão direta

**Solução**:
- Use o host do **Connection Pooler**: `aws-0-[REGION].pooler.supabase.com`
- **NÃO** use o host da conexão direta: `db.[PROJECT-REF].supabase.co`

### Erro: "Password authentication failed"

**Causa**: Senha incorreta

**Solução**:
- Verifique a senha no Supabase Dashboard
- Certifique-se de copiar sem espaços extras
- Se necessário, redefina a senha em Settings → Database

## 📊 Resumo das Diferenças

| Tipo | Host | Port | User | Quando Usar |
|------|------|------|------|-------------|
| **Conexão Direta** | `db.[REF].supabase.co` | `5432` | `postgres` | Desenvolvimento local (IPv6) |
| **Pooler Session** | `aws-0-[REGION].pooler.supabase.com` | `5432` | `postgres.[REF]` | Servidores persistentes (IPv4) |
| **Pooler Transaction** | `aws-0-[REGION].pooler.supabase.com` | `6543` | `postgres.[REF]` | **Vercel/Serverless (IPv4)** ✅ |

## ✅ Checklist Final

- [ ] Acessei o Supabase Dashboard
- [ ] Naveguei até Settings → Database → Connection Pooling
- [ ] Selecionei Transaction mode (porta 6543)
- [ ] Copiei o `DB_HOST` do pooler
- [ ] Copiei o `DB_USER` completo (com project ref)
- [ ] Copiei o `DB_PASSWORD`
- [ ] Configurei todas as variáveis na Vercel
- [ ] Marquei para Production
- [ ] Fiz um novo deploy
- [ ] Testei o `/api/health` e retornou "ok"

