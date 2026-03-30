# 🔧 Como Corrigir Variáveis no Vercel - Guia Passo a Passo

## 🎯 Problema
O sistema não consegue se conectar ao banco de dados em produção devido a variáveis de ambiente incorretas ou ausentes.

## ✅ Solução: Configurar Manualmente no Dashboard do Vercel

### Passo 1: Acessar o Projeto no Vercel

1. Acesse: https://vercel.com/junielsonfarias/sisam-ssbv/settings/environment-variables
2. Faça login com sua conta do GitHub
3. Você verá a lista de variáveis de ambiente

---

### Passo 2: Verificar e Corrigir TODAS as Variáveis

**IMPORTANTE:** As variáveis devem ter EXATAMENTE esses nomes e valores:

#### 1. DB_HOST
- **Nome:** `DB_HOST` (EXATO, sem espaços)
- **Valor:** `db.cjxejpgtuuqnbczpbdfe.supabase.co`
- **Ambiente:** ✅ Production

#### 2. DB_PORT
- **Nome:** `DB_PORT` (EXATO, sem espaços)
- **Valor:** `5432`
- **Ambiente:** ✅ Production

#### 3. DB_NAME
- **Nome:** `DB_NAME` (EXATO, sem espaços)
- **Valor:** `postgres`
- **Ambiente:** ✅ Production

#### 4. DB_USER
- **Nome:** `DB_USER` (EXATO, sem espaços)
- **Valor:** `postgres`
- **Ambiente:** ✅ Production

#### 5. DB_PASSWORD
- **Nome:** `DB_PASSWORD` (EXATO, sem espaços)
- **Valor:** `SUA_SENHA_AQUI`
- **Ambiente:** ✅ Production

#### 6. DB_SSL
- **Nome:** `DB_SSL` (EXATO, sem espaços)
- **Valor:** `true`
- **Ambiente:** ✅ Production

#### 7. JWT_SECRET
- **Nome:** `JWT_SECRET` (EXATO, sem espaços)
- **Valor:** `sisam2024_producao_jwt_secret_key_super_secure_random_string_2024`
- **Ambiente:** ✅ Production

#### 8. NODE_ENV
- **Nome:** `NODE_ENV` (EXATO, sem espaços)
- **Valor:** `production`
- **Ambiente:** ✅ Production

---

### Passo 3: Como Adicionar/Editar Cada Variável

#### Se a variável NÃO EXISTE:
1. Clique em **"Add New"**
2. Digite o **Nome** exato (ex: `DB_HOST`)
3. Cole o **Valor** exato (ex: `db.cjxejpgtuuqnbczpbdfe.supabase.co`)
4. Marque **APENAS "Production"** (desmarque Preview e Development)
5. Clique em **"Save"**

#### Se a variável JÁ EXISTE mas está ERRADA:
1. Clique nos **três pontinhos (⋯)** ao lado da variável
2. Clique em **"Edit"**
3. Verifique se o **Nome** está correto
4. Corrija o **Valor** se necessário
5. Verifique se **"Production"** está marcado
6. Clique em **"Save"**

#### Se a variável tem NOME ERRADO (ex: "USUARIO_DO_BANCO"):
1. Clique nos **três pontinhos (⋯)** ao lado da variável
2. Clique em **"Remove"**
3. Confirme a remoção
4. Adicione novamente com o NOME CORRETO seguindo as instruções acima

---

### Passo 4: Verificar Tudo Está Correto

Após adicionar/corrigir todas as variáveis, você deve ver na lista:

```
✅ DB_HOST          = db.cjxejpgtuuqnbczpbdfe.supabase.co    [Production]
✅ DB_PORT          = 5432                                   [Production]
✅ DB_NAME          = postgres                               [Production]
✅ DB_USER          = postgres                               [Production]
✅ DB_PASSWORD      = ••••••••••••                           [Production]
✅ DB_SSL           = true                                   [Production]
✅ JWT_SECRET       = ••••••••••••                           [Production]
✅ NODE_ENV         = production                             [Production]
```

---

### Passo 5: Fazer Redeploy (OBRIGATÓRIO!)

**MUITO IMPORTANTE:** Após alterar variáveis, você DEVE fazer redeploy!

1. Vá para: https://vercel.com/junielsonfarias/sisam-ssbv/deployments
2. Clique no **último deployment** (o mais recente)
3. Clique no botão **"⋯" (três pontinhos)** no canto superior direito
4. Clique em **"Redeploy"**
5. **NÃO marque** "Use existing Build Cache"
6. Clique em **"Redeploy"** para confirmar
7. **Aguarde 2-3 minutos** até aparecer "Ready"

---

### Passo 6: Testar o Login

Depois que o deploy mostrar **"Ready"**, teste:

1. Acesse: https://sisam-ssbv.vercel.app/login
2. Tente fazer login com:
   - **Email:** `admin@sisam.com`
   - **Senha:** `Admin@123`

#### Resultado Esperado:
- ✅ Login bem-sucedido
- ✅ Redirecionamento para o dashboard

#### Se ainda falhar:
1. Pressione **F12** para abrir o Console do navegador
2. Veja o erro exato
3. Copie e envie a mensagem de erro

---

## 🔍 Verificação Adicional

Após o redeploy, você pode verificar se as variáveis foram aplicadas:

1. Acesse: https://sisam-ssbv.vercel.app/api/debug-env
2. Verifique se todas as variáveis aparecem como `exists: true`

---

## ⚠️ ERROS COMUNS

### Erro 1: "DB_HOST_NOT_FOUND"
- **Causa:** `DB_HOST` não está configurado ou tem nome errado
- **Solução:** Verifique se o nome é EXATAMENTE `DB_HOST` (sem espaços, sem underscores extras)

### Erro 2: "Variável não aparece"
- **Causa:** Não marcou "Production" ao salvar
- **Solução:** Edite a variável e marque "Production"

### Erro 3: "Login funciona local mas não em produção"
- **Causa:** Esqueceu de fazer Redeploy após alterar variáveis
- **Solução:** Sempre faça Redeploy após qualquer mudança em variáveis

### Erro 4: "ENOTFOUND" ou "ECONNREFUSED"
- **Causa:** Valor de `DB_HOST` está incorreto ou com espaços extras
- **Solução:** Copie e cole exatamente: `db.cjxejpgtuuqnbczpbdfe.supabase.co`

---

## 📋 Checklist Final

Antes de fazer Redeploy, confirme:

- [ ] Todas as 8 variáveis foram adicionadas
- [ ] Todos os nomes estão EXATOS (sem typos)
- [ ] Todos os valores estão corretos (sem espaços extras)
- [ ] Todas têm "Production" marcado
- [ ] Removeu variáveis duplicadas ou com nomes errados
- [ ] Fez Redeploy SEM usar cache
- [ ] Aguardou deploy terminar (Status: Ready)
- [ ] Testou o login na URL de produção

---

## 🆘 Precisa de Ajuda?

Se após seguir TODOS os passos acima o erro persistir:

1. Tire um **print screen** da lista de variáveis no Vercel
2. Copie o **erro exato** do console do navegador (F12)
3. Envie ambos para análise

---

**IMPORTANTE:** Não pule nenhum passo! Cada detalhe é crucial para o funcionamento correto.

