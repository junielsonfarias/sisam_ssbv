# 🔧 Configurar Host Correto do Supabase no Vercel

## 🎯 Problema Identificado

O erro `ENOTFOUND db.cjxejpgtuuqnbczpbdfe.supabase.co` indica que o Vercel não consegue resolver o DNS desse host.

## ✅ Solução: Usar AWS-0 Pooler Host

O Supabase possui dois tipos de conexão:

### 1. **Direct Connection** (NÃO usar no Vercel)
- Host: `db.cjxejpgtuuqnbczpbdfe.supabase.co`
- Porta: `5432`
- ❌ Pode ter problemas de DNS/IPv6 no Vercel

### 2. **Connection Pooler** (✅ USAR no Vercel)
- Host: `aws-0-us-east-1.pooler.supabase.com`
- Porta: `6543`
- User: `postgres.cjxejpgtuuqnbczpbdfe`
- ✅ Projetado para aplicações serverless como Vercel

---

## 🔧 CORREÇÃO IMEDIATA

### Passo 1: Encontrar o Host Correto do Connection Pooler

1. Acesse: https://supabase.com/dashboard/project/cjxejpgtuuqnbczpbdfe/settings/database
2. Role até a seção **Connection Pooling**
3. Clique em **Connection Pooling**
4. Copie o **Host** (algo como `aws-0-us-east-1.pooler.supabase.com`)
5. Anote também a **Porta** (geralmente `6543`)
6. O **User** deve ser `postgres.cjxejpgtuuqnbczpbdfe` (postgres + ponto + project-ref)

---

### Passo 2: Atualizar Variáveis no Vercel

1. Acesse: https://vercel.com/junielsonfarias/sisam-ssbv/settings/environment-variables

2. **EDITE** a variável `DB_HOST`:
   - Clique nos três pontinhos → **Edit**
   - Novo valor: `aws-0-us-east-1.pooler.supabase.com` (ou o que você copiou do Supabase)
   - Certifique-se de que **Production** está marcado
   - **Save**

3. **EDITE** a variável `DB_PORT`:
   - Clique nos três pontinhos → **Edit**
   - Novo valor: `6543`
   - Certifique-se de que **Production** está marcado
   - **Save**

4. **EDITE** a variável `DB_USER`:
   - Clique nos três pontinhos → **Edit**
   - Novo valor: `postgres.cjxejpgtuuqnbczpbdfe`
   - Certifique-se de que **Production** está marcado
   - **Save**

5. **VERIFIQUE** as outras variáveis estão corretas:
   - `DB_NAME` = `postgres` ✅
   - `DB_PASSWORD` = `Master@sisam&&` ✅
   - `DB_SSL` = `true` ✅
   - `JWT_SECRET` = `sisam2024_producao_jwt_secret_key_super_secure_random_string_2024` ✅
   - `NODE_ENV` = `production` ✅

---

### Passo 3: Redeploy (OBRIGATÓRIO!)

1. Vá para: https://vercel.com/junielsonfarias/sisam-ssbv/deployments
2. Clique no **último deployment**
3. Clique nos **três pontinhos (⋯)** no canto superior direito
4. Clique em **"Redeploy"**
5. **NÃO marque** "Use existing Build Cache"
6. Clique em **"Redeploy"** para confirmar
7. **Aguarde 2-3 minutos** até aparecer "Ready"

---

### Passo 4: Testar

Após o deploy terminar:

```bash
npm run testar-health-producao
```

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

E então:

```bash
npm run testar-login-producao-auto -- https://sisam-ssbv.vercel.app
```

Deve retornar:

```
✅ API Online
✅ Banco de Dados Conectado
✅ Personalização Funcionando
✅ Login Funcionando

🎉🎉🎉 TUDO FUNCIONANDO PERFEITAMENTE! 🎉🎉🎉
```

---

## 📝 Resumo das Mudanças

### Antes (❌ Não funcionava no Vercel):
```
DB_HOST=db.cjxejpgtuuqnbczpbdfe.supabase.co
DB_PORT=5432
DB_USER=postgres
```

### Depois (✅ Funciona no Vercel):
```
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.cjxejpgtuuqnbczpbdfe
```

---

## 🎯 Por Que Isso Funciona?

1. **Connection Pooler** é otimizado para serverless (Vercel)
2. **DNS mais confiável** (AWS infrastructure)
3. **Melhor compatibilidade** com IPv4/IPv6
4. **Conexões mais rápidas** e estáveis
5. **Recomendado pelo Supabase** para prod

---

## 🔍 Se Ainda Não Funcionar

1. Verifique se o projeto Supabase está **ativo** (não pausado)
2. Certifique-se de que copiou o host **exato** do Supabase Dashboard
3. Confirme que o **User** tem o formato `postgres.[PROJECT-REF]`
4. Teste localmente primeiro:

```bash
npm run configurar-env-producao
npm run testar-conexao-supabase
```

---

## 📚 Documentação Oficial

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**IMPORTANTE:** O Connection Pooler é a forma RECOMENDADA pelo Supabase para conectar aplicações serverless como Vercel ao banco de dados PostgreSQL!

