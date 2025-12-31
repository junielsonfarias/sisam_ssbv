# 🚀 Instruções: Configurar Vercel Manualmente

## ⚠️ Problema Identificado

O projeto local não está linkado ao projeto no Vercel.

## 📋 Solução: Configuração Manual

### Opção 1: Via Dashboard do Vercel (RECOMENDADO)

#### 1. Acesse o Dashboard

1. Vá para: https://vercel.com/dashboard
2. Faça login com sua conta
3. Localize o projeto `sisam-ssbv` (ou crie um novo se não existir)

#### 2. Configure as Variáveis de Ambiente

1. Clique no projeto
2. Vá em **Settings** → **Environment Variables**
3. Adicione cada variável abaixo:

**Variáveis Obrigatórias:**

| Nome | Valor | Ambiente |
|------|-------|----------|
| `DB_HOST` | `db.cjxejpgtuuqnbczpbdfe.supabase.co` | Production |
| `DB_PORT` | `5432` | Production |
| `DB_NAME` | `postgres` | Production |
| `DB_USER` | `postgres` | Production |
| `DB_PASSWORD` | `Master@sisam&&` | Production |
| `DB_SSL` | `true` | Production |
| `JWT_SECRET` | `9a6b48526c17f76ff1dc471519ff9c95ab3b576c9571d59863de73a7a69e80a0` | Production |
| `NODE_ENV` | `production` | Production |

**Como adicionar:**
- Clique em **Add New**
- Nome: (copie da tabela)
- Value: (copie da tabela)
- Environment: Selecione **Production**
- Clique em **Save**

#### 3. Fazer Deploy

Após adicionar todas as variáveis:

1. Vá em **Deployments**
2. Clique no último deployment
3. Clique nos 3 pontinhos (⋯)
4. Clique em **Redeploy**
5. Marque **Use existing Build Cache**
6. Clique em **Redeploy**

#### 4. Aguardar e Testar

1. Aguarde ~2 minutos para o deploy finalizar
2. Clique em **Visit** para abrir a aplicação
3. Teste o login:
   - Email: `admin@sisam.com`
   - Senha: `admin123`

---

### Opção 2: Via CLI do Vercel

#### 1. Fazer Login

```bash
vercel login
```

Siga as instruções para fazer login.

#### 2. Linkar o Projeto

```bash
vercel link
```

Quando perguntado:
- **Set up and deploy?** → `N` (Não)
- **Link to existing project?** → `Y` (Sim)
- **What's the name of your existing project?** → `sisam-ssbv`

Se o projeto não existir, crie um novo:
- **Set up and deploy?** → `Y` (Sim)
- **Which scope?** → Selecione seu usuário/organização
- **Link to existing project?** → `N` (Não)
- **What's your project's name?** → `sisam-ssbv`
- **In which directory is your code located?** → `.` (ponto)

#### 3. Adicionar Variáveis

Execute cada comando abaixo:

```bash
# DB_HOST
echo "db.cjxejpgtuuqnbczpbdfe.supabase.co" | vercel env add DB_HOST production

# DB_PORT
echo "5432" | vercel env add DB_PORT production

# DB_NAME
echo "postgres" | vercel env add DB_NAME production

# DB_USER
echo "postgres" | vercel env add DB_USER production

# DB_PASSWORD (atenção aos caracteres especiais)
vercel env add DB_PASSWORD production
# Quando pedir, digite: Master@sisam&&

# DB_SSL
echo "true" | vercel env add DB_SSL production

# JWT_SECRET
echo "9a6b48526c17f76ff1dc471519ff9c95ab3b576c9571d59863de73a7a69e80a0" | vercel env add JWT_SECRET production

# NODE_ENV
echo "production" | vercel env add NODE_ENV production
```

#### 4. Fazer Deploy

```bash
vercel --prod --yes
```

---

## 🔍 Verificar Configuração

### Listar Variáveis

```bash
vercel env ls production
```

Deve mostrar todas as 8 variáveis.

### Ver Logs do Deploy

1. Acesse: https://vercel.com/dashboard
2. Clique no projeto
3. Vá em **Deployments**
4. Clique no último deploy
5. Veja os logs

---

## ✅ Checklist

Após configurar, verifique:

- [ ] Todas as 8 variáveis estão no Vercel
- [ ] Deploy foi concluído com sucesso
- [ ] Aplicação está acessível
- [ ] Login funciona (admin@sisam.com / admin123)
- [ ] Logo aparece na tela de login
- [ ] Dashboard carrega corretamente

---

## 🆘 Problemas Comuns

### Erro: "Project not found"

**Solução**: Crie um novo projeto no dashboard do Vercel e conecte ao GitHub.

### Erro: "Invalid characters in password"

**Solução**: Use o dashboard do Vercel para adicionar a senha `DB_PASSWORD` manualmente.

### Erro: "Database connection failed"

**Solução**: Verifique se todas as variáveis estão corretas:
```bash
vercel env ls production
```

### Logo não aparece

**Solução**: 
1. Comprima a logo: https://tinypng.com/
2. Ou use URL externa: https://imgur.com/
3. Veja: [SOLUCAO_LOGIN_LOGO.md](SOLUCAO_LOGIN_LOGO.md)

---

## 📝 Próximos Passos

Após configurar o Vercel:

1. ✅ Teste o login em produção
2. ✅ Verifique se a logo aparece
3. ✅ Teste as funcionalidades principais
4. ✅ Se tudo funcionar, está pronto! 🎉

---

## 💡 Dicas

### Manter Sincronizado

Sempre que atualizar o `.env` localmente, atualize também no Vercel:

**Via Dashboard:**
1. Settings → Environment Variables
2. Encontre a variável
3. Clique em **Edit**
4. Atualize o valor
5. Faça um novo deploy

**Via CLI:**
```bash
vercel env rm NOME_VARIAVEL production
echo "novo_valor" | vercel env add NOME_VARIAVEL production
vercel --prod --yes
```

### Backup das Variáveis

Salve as variáveis em um local seguro (gerenciador de senhas):
- DB_PASSWORD
- JWT_SECRET

### Segurança

⚠️ **NUNCA** commite o arquivo `.env` no Git!

O `.gitignore` já está configurado, mas sempre verifique:
```bash
git status
```

Se `.env` aparecer, adicione ao `.gitignore`:
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## 📞 Suporte

Se precisar de ajuda:

1. **Verifique os logs**: https://vercel.com/dashboard → Deployments
2. **Teste localmente**: `npm run dev`
3. **Verifique as variáveis**: `vercel env ls production`
4. **Me envie**:
   - Print dos logs do Vercel
   - Mensagem de erro específica
   - Resultado de `vercel env ls production`

