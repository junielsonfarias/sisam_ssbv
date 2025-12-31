# 🚀 Configurar Vercel AGORA - Guia Rápido

## ✅ Status Atual

- ✅ Projeto vinculado à Vercel: `sisam-ssbv`
- ✅ Schema do banco criado no Supabase
- ✅ Usuário admin criado: `admin@sisam.com` / `admin123`
- ⚠️ Variáveis de ambiente precisam ser atualizadas

## 🎯 Passo a Passo Rápido

### Opção 1: Script PowerShell (Mais Fácil)

```powershell
.\scripts\atualizar-vercel-env.ps1
```

O script irá perguntar:
1. Usar Connection Pooler? (s) - **Responda: s**
2. Região? - **Responda: us-east-1** (ou a região do seu projeto)
3. DB_PASSWORD - **Cole sua senha do Supabase**
4. Gerar JWT_SECRET? - **Responda: s** (para gerar novo)

### Opção 2: Comandos Manuais

**1. Descobrir a região do Supabase:**
- Acesse: https://supabase.com/dashboard/project/uosydcxfrbnhhasbyhqr/settings/database
- Veja em **Connection Pooling** → o hostname mostra a região
- Exemplo: `aws-0-us-east-1.pooler.supabase.com` → região é `us-east-1`

**2. Configurar variáveis (substitua [REGIAO] e [SENHA]):**

```powershell
# Gerar JWT_SECRET primeiro
$jwt = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Configurar variáveis
"aws-0-[REGIAO].pooler.supabase.com" | vercel env add DB_HOST production
"6543" | vercel env add DB_PORT production
"postgres" | vercel env add DB_NAME production
"postgres.uosydcxfrbnhhasbyhqr" | vercel env add DB_USER production
"[SENHA_DO_SUPABASE]" | vercel env add DB_PASSWORD production
$jwt | vercel env add JWT_SECRET production
"production" | vercel env add NODE_ENV production
```

**3. Fazer redeploy:**
```powershell
vercel --prod
```

### Opção 3: Via Dashboard (Mais Visual)

1. **Acesse:** https://vercel.com/junielson-farias-projects/sisam-ssbv/settings/environment-variables

2. **Para cada variável:**
   - Clique em **Add**
   - Digite o nome da variável
   - Cole o valor
   - Marque **Production**
   - Clique em **Save**

3. **Variáveis necessárias:**

```
DB_HOST = aws-0-[REGIAO].pooler.supabase.com
DB_PORT = 6543
DB_NAME = postgres
DB_USER = postgres.uosydcxfrbnhhasbyhqr
DB_PASSWORD = [sua senha do Supabase]
JWT_SECRET = [gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
NODE_ENV = production
```

4. **Após adicionar todas, faça redeploy:**
   - Vá em **Deployments**
   - Clique nos três pontos do último deploy
   - Clique em **Redeploy**

## 🔍 Como Descobrir a Região do Supabase

1. Acesse: https://supabase.com/dashboard/project/uosydcxfrbnhhasbyhqr
2. Vá em **Settings** → **Database**
3. Role até **Connection Pooling**
4. Veja o hostname: `aws-0-[REGIAO].pooler.supabase.com`
5. A região está no lugar de `[REGIAO]`

**Regiões comuns:**
- `us-east-1` - Estados Unidos (Leste)
- `us-west-1` - Estados Unidos (Oeste)
- `sa-east-1` - Brasil (São Paulo)
- `eu-west-1` - Europa (Irlanda)

## ✅ Verificar se Funcionou

Após configurar e fazer redeploy:

1. **Verificar status:**
   ```
   https://sisam-ssbv-junielsonfarias.vercel.app/api/init
   ```
   Deve retornar JSON com `admin_existe: true`

2. **Testar login:**
   ```
   https://sisam-ssbv-junielsonfarias.vercel.app/login
   ```
   - Email: `admin@sisam.com`
   - Senha: `admin123`

## 🆘 Problemas Comuns

### "ENOTFOUND"
- ❌ `DB_HOST` está errado ou incompleto
- ✅ Use o hostname completo do pooler

### "ECONNREFUSED"
- ❌ Porta errada ou usando conexão direta
- ✅ Use porta `6543` (pooler)

### "28P01" (Autenticação)
- ❌ `DB_USER` ou `DB_PASSWORD` errados
- ✅ Para pooler: `DB_USER` = `postgres.uosydcxfrbnhhasbyhqr`

## 📞 Precisa de Ajuda?

Consulte:
- `docs/CONFIGURAR_SUPABASE.md` - Guia completo
- `docs/CONFIGURAR_VERCEL_RAPIDO.md` - Métodos alternativos

