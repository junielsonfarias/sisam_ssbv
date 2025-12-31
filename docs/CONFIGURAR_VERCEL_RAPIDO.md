# ⚡ Configuração Rápida da Vercel

## 🎯 Método 1: Script Automático (Recomendado)

### Windows (PowerShell):
```powershell
.\scripts\atualizar-vercel-env.ps1
```

### Linux/Mac:
```bash
npm run atualizar-vercel
```

O script irá solicitar:
- Tipo de conexão (Pooler ou Direta)
- Região do Supabase (se usar Pooler)
- Senha do Supabase
- Se deseja gerar novo JWT_SECRET

## 🎯 Método 2: Manual via CLI

### 1. Obter Credenciais do Supabase

**No Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/uosydcxfrbnhhasbyhqr
2. Vá em **Settings** → **Database**
3. Role até **Connection Pooling**
4. Copie o **hostname** do pooler (ex: `aws-0-us-east-1.pooler.supabase.com`)

### 2. Configurar Variáveis na Vercel

Execute os comandos abaixo substituindo os valores:

```bash
# DB_HOST (use o hostname do pooler)
echo "aws-0-us-east-1.pooler.supabase.com" | vercel env add DB_HOST production

# DB_PORT (6543 para pooler, 5432 para direto)
echo "6543" | vercel env add DB_PORT production

# DB_NAME
echo "postgres" | vercel env add DB_NAME production

# DB_USER (postgres.[PROJECT-REF] para pooler)
echo "postgres.uosydcxfrbnhhasbyhqr" | vercel env add DB_USER production

# DB_PASSWORD (sua senha do Supabase)
echo "SUA_SENHA_AQUI" | vercel env add DB_PASSWORD production

# JWT_SECRET (gere uma chave)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | vercel env add JWT_SECRET production

# NODE_ENV
echo "production" | vercel env add NODE_ENV production
```

### 3. Fazer Redeploy

```bash
vercel --prod
```

## 🎯 Método 3: Via Dashboard da Vercel

1. Acesse: https://vercel.com/junielson-farias-projects/sisam-ssbv/settings/environment-variables

2. Para cada variável, clique em **Add** e configure:

| Variável | Valor | Ambiente |
|----------|-------|----------|
| `DB_HOST` | `aws-0-[REGION].pooler.supabase.com` | Production |
| `DB_PORT` | `6543` | Production |
| `DB_NAME` | `postgres` | Production |
| `DB_USER` | `postgres.uosydcxfrbnhhasbyhqr` | Production |
| `DB_PASSWORD` | [sua senha do Supabase] | Production |
| `JWT_SECRET` | [gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`] | Production |
| `NODE_ENV` | `production` | Production |

3. **IMPORTANTE**: Marque todas para **Production**!

4. Faça um redeploy na Vercel

## 🔍 Verificar Configuração

Após configurar, verifique:

```bash
# Ver variáveis configuradas
vercel env ls

# Verificar status da aplicação
curl https://sisam-ssbv-junielsonfarias.vercel.app/api/init
```

## ✅ Testar Login

1. Acesse: https://sisam-ssbv-junielsonfarias.vercel.app/login
2. Use as credenciais:
   - **Email**: `admin@sisam.com`
   - **Senha**: `admin123`

## 🆘 Solução de Problemas

### Erro: `ENOTFOUND`
- Verifique se o `DB_HOST` está correto
- Use o hostname do **Connection Pooler** (porta 6543)

### Erro: `ECONNREFUSED`
- Verifique se a porta está correta (6543 para pooler)
- Certifique-se de usar o pooler para aplicações

### Erro: `28P01` (Autenticação)
- Verifique se `DB_USER` e `DB_PASSWORD` estão corretos
- Para pooler, o `DB_USER` deve ser `postgres.[PROJECT-REF]`

## 📝 Notas Importantes

- **Sempre use Connection Pooler** (porta 6543) para aplicações em produção
- **Nunca use** a conexão direta (porta 5432) para aplicações
- A conexão direta é apenas para migrations e operações administrativas
- O `DB_NAME` no Supabase é sempre `postgres` (não precisa criar outro banco)

