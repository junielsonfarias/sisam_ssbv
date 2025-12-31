# 🔍 Como Verificar o Hostname Correto do Supabase

## Problema: `ENOTFOUND` ao conectar

Se você está recebendo o erro `ENOTFOUND`, significa que o DNS não está conseguindo resolver o hostname. Isso pode acontecer por:

1. **Hostname incorreto** - O hostname pode estar errado ou incompleto
2. **Região incorreta** - A região do pooler pode estar errada
3. **Projeto pausado** - O projeto Supabase pode estar pausado
4. **Connection Pooling não habilitado** - O pooler pode não estar configurado

## ✅ Passo a Passo para Verificar

### 1. Verificar se o Projeto está Ativo

1. Acesse: https://supabase.com/dashboard/project/uosydcxfrbnhhasbyhqr
2. Verifique se o projeto está **ativo** (não pausado)
3. Se estiver pausado, clique em **Resume** para reativar

### 2. Obter o Hostname Correto

#### Opção A: Connection Pooling (Recomendado para Aplicações)

1. No Supabase Dashboard, vá em **Settings** → **Database**
2. Role até **Connection Pooling**
3. Se não estiver habilitado, clique em **Enable Connection Pooling**
4. Selecione **Transaction mode** ou **Session mode**
5. Copie o **hostname** que aparece

**Formato esperado:**
```
aws-0-[REGIAO].pooler.supabase.com
```

**Exemplos:**
- `aws-0-us-east-1.pooler.supabase.com` (Estados Unidos - Leste)
- `aws-0-us-west-1.pooler.supabase.com` (Estados Unidos - Oeste)
- `aws-0-sa-east-1.pooler.supabase.com` (Brasil - São Paulo)
- `aws-0-eu-west-1.pooler.supabase.com` (Europa - Irlanda)

**Configuração para Pooler:**
- **DB_HOST**: `aws-0-[REGIAO].pooler.supabase.com`
- **DB_PORT**: `6543`
- **DB_USER**: `postgres.uosydcxfrbnhhasbyhqr`
- **DB_NAME**: `postgres`

#### Opção B: Direct Connection (Para Testes)

1. No Supabase Dashboard, vá em **Settings** → **Database**
2. Role até **Connection string**
3. Selecione **URI** ou **Session mode**
4. Copie o hostname da connection string

**Formato esperado:**
```
db.uosydcxfrbnhhasbyhqr.supabase.co
```

**Configuração para Direct:**
- **DB_HOST**: `db.uosydcxfrbnhhasbyhqr.supabase.co`
- **DB_PORT**: `5432`
- **DB_USER**: `postgres`
- **DB_NAME**: `postgres`

### 3. Verificar se o Hostname Resolve

No PowerShell, teste se o hostname resolve:

```powershell
# Testar hostname direto
nslookup db.uosydcxfrbnhhasbyhqr.supabase.co

# Testar hostname do pooler (substitua [REGIAO])
nslookup aws-0-us-east-1.pooler.supabase.com
```

Se retornar `Non-existent domain`, o hostname está incorreto.

### 4. Verificar Região do Projeto

1. No Supabase Dashboard, vá em **Settings** → **General**
2. Veja a **Region** do projeto
3. Use essa região no hostname do pooler

**Mapeamento de Regiões:**
- **US East (N. Virginia)**: `us-east-1`
- **US West (Oregon)**: `us-west-1`
- **South America (São Paulo)**: `sa-east-1`
- **Europe (Ireland)**: `eu-west-1`
- **Asia Pacific (Singapore)**: `ap-southeast-1`

## 🔧 Configurar na Vercel

Após descobrir o hostname correto:

### Via CLI:

```powershell
# Remover variável antiga
vercel env rm DB_HOST production --yes

# Adicionar nova (sem espaços ou quebras de linha!)
echo "db.uosydcxfrbnhhasbyhqr.supabase.co" | vercel env add DB_HOST production
```

### Via Dashboard:

1. Acesse: https://vercel.com/junielson-farias-projects/sisam-ssbv/settings/environment-variables
2. Edite `DB_HOST`
3. **IMPORTANTE**: Certifique-se de que não há espaços ou quebras de linha no final
4. Cole o hostname exatamente como aparece no Supabase
5. Salve e faça redeploy

## ⚠️ Problemas Comuns

### Hostname com `\r\n` no final

**Sintoma:** `ENOTFOUND db.uosydcxfrbnhhasbyhqr.supabase.co\r\n`

**Solução:** 
- O código já foi corrigido para remover `\r\n` automaticamente
- Mas verifique na Vercel se não há espaços extras

### Pooler não habilitado

**Sintoma:** Hostname do pooler não resolve

**Solução:**
- Use a conexão direta primeiro (porta 5432)
- Depois habilite o Connection Pooling no Supabase
- Então configure o pooler

### Projeto pausado

**Sintoma:** `ENOTFOUND` mesmo com hostname correto

**Solução:**
- Acesse o Supabase Dashboard
- Verifique se o projeto está ativo
- Se estiver pausado, reative-o

## 📝 Checklist

- [ ] Projeto Supabase está ativo (não pausado)
- [ ] Hostname verificado no Supabase Dashboard
- [ ] Hostname testado com `nslookup` (resolve corretamente)
- [ ] Variável `DB_HOST` configurada na Vercel **sem espaços ou quebras de linha**
- [ ] `DB_NAME` configurado como `postgres` (não `sisam`)
- [ ] `DB_PORT` correto (5432 para direto, 6543 para pooler)
- [ ] `DB_USER` correto (`postgres` para direto, `postgres.[PROJECT-REF]` para pooler)
- [ ] Redeploy feito após alterações

