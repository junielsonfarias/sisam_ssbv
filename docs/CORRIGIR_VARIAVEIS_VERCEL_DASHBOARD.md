image.png# 🔧 Corrigir Variáveis no Vercel Dashboard (PASSO A PASSO)

## 📋 Guia Rápido com Prints

### 1️⃣ Acessar o Dashboard

1. Acesse: **https://vercel.com/dashboard**
2. Faça login se necessário
3. Clique no projeto **sisam-ssbv**

---

### 2️⃣ Ir para Environment Variables

1. No menu lateral, clique em **Settings** (⚙️)
2. No menu Settings, clique em **Environment Variables**

---

### 3️⃣ Remover Variáveis com Nomes Errados

**Procure e remova estas 3 variáveis** (se existirem):

❌ `USUARIO_DO_BANCO_DE_DADOS`
❌ `NOME_DO_BANCO_DE_DADOS`  
❌ `SENHA_DO_BANCO_DE_DADOS`

**Como remover:**
- Clique nos **três pontinhos (⋯)** ao lado da variável
- Clique em **Delete**
- Confirme

---

### 4️⃣ Remover/Atualizar DB_HOST e DB_PORT

Se existirem estas variáveis com valores errados, remova-as:

❌ `DB_HOST` = `aws-0-us-east-1.pooler.s...` → **DELETAR**
❌ `DB_PORT` = `6543` → **DELETAR**

---

### 5️⃣ Adicionar Variáveis Corretas

Clique no botão **Add New** (ou **Add Variable**) e adicione cada variável abaixo:

#### Variável 1: DB_HOST
- **Name**: `DB_HOST`
- **Value**: `db.cjxejpgtuuqnbczpbdfe.supabase.co`
- **Environment**: Marque ✅ **Production**
- Clique em **Save**

#### Variável 2: DB_PORT
- **Name**: `DB_PORT`
- **Value**: `5432`
- **Environment**: Marque ✅ **Production**
- Clique em **Save**

#### Variável 3: DB_NAME
- **Name**: `DB_NAME`
- **Value**: `postgres`
- **Environment**: Marque ✅ **Production**
- Clique em **Save**

#### Variável 4: DB_USER
- **Name**: `DB_USER`
- **Value**: `postgres`
- **Environment**: Marque ✅ **Production**
- Clique em **Save**

#### Variável 5: DB_PASSWORD
- **Name**: `DB_PASSWORD`
- **Value**: `SUA_SENHA_AQUI`
- **Environment**: Marque ✅ **Production**
- Clique em **Save**

#### Variável 6: DB_SSL
- **Name**: `DB_SSL`
- **Value**: `true`
- **Environment**: Marque ✅ **Production**
- Clique em **Save**

#### Variável 7: JWT_SECRET
- **Name**: `JWT_SECRET`
- **Value**: `SEU_JWT_SECRET_AQUI`
- **Environment**: Marque ✅ **Production**
- Clique em **Save**

#### Variável 8: NODE_ENV
- **Name**: `NODE_ENV`
- **Value**: `production`
- **Environment**: Marque ✅ **Production**
- Clique em **Save**

---

### 6️⃣ Verificar Todas as Variáveis

Após adicionar, você deve ver **exatamente estas 8 variáveis**:

✅ `DB_HOST` = `db.cjxejpgtuuqnbczpbdfe.supabase.co`  
✅ `DB_PORT` = `5432`  
✅ `DB_NAME` = `postgres`  
✅ `DB_USER` = `postgres`  
✅ `DB_PASSWORD` = `SUA_SENHA_AQUI`  
✅ `DB_SSL` = `true`  
✅ `JWT_SECRET` = `SEU_JWT_SECRET_AQUI`  
✅ `NODE_ENV` = `production`

---

### 7️⃣ Fazer Redeploy

1. No menu lateral, clique em **Deployments**
2. Encontre o **último deployment** (primeiro da lista)
3. Clique nos **três pontinhos (⋯)** do deployment
4. Clique em **Redeploy**
5. Marque a opção **Use existing Build Cache** (para ser mais rápido)
6. Clique em **Redeploy** novamente para confirmar
7. **Aguarde ~2 minutos** para o deploy finalizar

---

### 8️⃣ Testar o Login

Após o deploy finalizar:

**Via Script (Recomendado):**
```bash
npm run testar-login-producao-auto -- https://sisam-ssbv.vercel.app
```

**Via Navegador:**
1. Acesse: https://sisam-ssbv.vercel.app
2. Faça login com:
   - Email: `admin@sisam.com`
   - Senha: `admin123`
3. Deve funcionar! 🎉

---

## ✅ Resultado Esperado

O script de teste deve mostrar:

```
✅ API Online
✅ Banco de Dados Conectado
✅ Personalização Funcionando
✅ Login Funcionando

🎉🎉🎉 TUDO FUNCIONANDO PERFEITAMENTE! 🎉🎉🎉
```

---

## 📝 Checklist

Use esta lista para garantir que fez tudo:

- [ ] Acessou o Vercel Dashboard
- [ ] Entrou no projeto sisam-ssbv
- [ ] Foi em Settings → Environment Variables
- [ ] Removeu variáveis com nomes errados (se existiam)
- [ ] Adicionou as 8 variáveis corretas
- [ ] Verificou que todas as 8 estão presentes
- [ ] Fez Redeploy do projeto
- [ ] Aguardou ~2 minutos para deploy finalizar
- [ ] Testou o login

---

## ⚠️ Dicas Importantes

### Copiar e Colar
- **Use Ctrl+C e Ctrl+V** para copiar os valores exatamente
- **Não digite manualmente** para evitar erros de digitação

### Caracteres Especiais
- A senha `SUA_SENHA_AQUI` tem caracteres especiais
- Copie e cole exatamente como está

### Environment
- **Sempre selecione Production** ao adicionar variáveis
- Se marcar Preview ou Development também, não tem problema

### Redeploy
- É **obrigatório** fazer redeploy para as variáveis terem efeito
- Sem redeploy, as mudanças não são aplicadas

---

## 🆘 Se Algo Der Errado

### Login ainda falha depois de tudo?

1. **Verifique os valores** no Dashboard:
   - Clique na variável para ver o valor completo
   - Confira se está exatamente como no guia

2. **Veja os logs do Vercel**:
   - Deployments → Último deploy → Runtime Logs
   - Procure por erros em `/api/auth/login`

3. **Me envie**:
   - Print da página Environment Variables (pode ocultar valores sensíveis)
   - Print ou texto dos logs de erro
   - Resultado do teste: `npm run testar-login-producao-auto`

---

## 💡 Por que isso é necessário?

O código JavaScript procura variáveis com nomes específicos:

```javascript
process.env.DB_USER     // ✅ CORRETO
process.env.DB_NAME     // ✅ CORRETO
process.env.DB_PASSWORD // ✅ CORRETO
```

Mas as variáveis estavam com nomes diferentes:

```javascript
process.env.USUARIO_DO_BANCO_DE_DADOS  // ❌ ERRADO
process.env.NOME_DO_BANCO_DE_DADOS     // ❌ ERRADO
process.env.SENHA_DO_BANCO_DE_DADOS    // ❌ ERRADO
```

Por isso o login falhava! 🔴

Agora, com os nomes corretos, tudo funcionará! ✅

