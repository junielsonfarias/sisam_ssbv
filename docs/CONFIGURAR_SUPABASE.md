# 🔧 Configuração do Supabase para SISAM

Este guia explica como configurar corretamente o banco de dados Supabase para o sistema SISAM.

## 📋 Passo 1: Obter as Credenciais do Supabase

### 1.1 Acessar o Supabase

1. Acesse: https://supabase.com
2. Faça login na sua conta
3. Selecione seu projeto (ou crie um novo)

### 1.2 Obter Connection String (Recomendado: Pooler)

**Para aplicações (RECOMENDADO):**

1. No menu lateral, vá em **Project Settings** (ícone de engrenagem)
2. Clique em **Database**
3. Role até **Connection Pooling**
4. Selecione **Transaction mode** ou **Session mode**
5. Copie a **Connection string** que aparece

**Formato esperado:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**OU use as informações separadas:**
- **Host**: `aws-0-[REGION].pooler.supabase.com` (exemplo: `aws-0-us-east-1.pooler.supabase.com`)
- **Port**: `6543` (porta do pooler)
- **Database**: `postgres`
- **User**: `postgres.[PROJECT-REF]` (exemplo: `postgres.wzpmbgemiykmoawgpmok`)
- **Password**: [a senha que você criou ao criar o projeto]

### 1.3 Alternativa: Direct Connection (Apenas para Migrations)

**⚠️ ATENÇÃO**: Use apenas para executar o schema SQL. Para a aplicação, use o Pooler!

1. No menu lateral, vá em **Project Settings** → **Database**
2. Role até **Connection string**
3. Selecione **URI** ou **Session mode**
4. Copie a connection string

**Formato:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**OU use as informações separadas:**
- **Host**: `db.[PROJECT-REF].supabase.co` (exemplo: `db.wzpmbgemiykmoawgpmok.supabase.co`)
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: [a senha que você criou]

## 📋 Passo 2: Executar o Schema SQL

### 2.1 No Supabase SQL Editor

1. No menu lateral do Supabase, clique em **SQL Editor**
2. Clique em **New query**
3. Abra o arquivo `database/schema.sql` do seu projeto
4. Copie TODO o conteúdo do arquivo
5. Cole no SQL Editor do Supabase
6. Clique em **Run** ou pressione `Ctrl+Enter`
7. Aguarde a execução (deve mostrar sucesso)

### 2.2 Verificar se as tabelas foram criadas

Execute esta query no SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Você deve ver todas as tabelas: `usuarios`, `polos`, `escolas`, `turmas`, `alunos`, etc.

## 📋 Passo 3: Configurar Variáveis na Vercel

### 3.1 Acessar Environment Variables

1. Acesse: https://vercel.com
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**

### 3.2 Adicionar Variáveis (USANDO POOLER - RECOMENDADO)

Adicione cada variável abaixo. **IMPORTANTE**: Marque todas para **Production**!

```
DB_HOST = aws-0-[REGION].pooler.supabase.com
DB_PORT = 6543
DB_NAME = postgres
DB_USER = postgres.[PROJECT-REF]
DB_PASSWORD = [sua senha do Supabase]
JWT_SECRET = [gere uma chave de 32+ caracteres]
NODE_ENV = production
```

**Exemplo real:**
```
DB_HOST = aws-0-us-east-1.pooler.supabase.com
DB_PORT = 6543
DB_NAME = postgres
DB_USER = postgres.wzpmbgemiykmoawgpmok
DB_PASSWORD = sua_senha_aqui
JWT_SECRET = sua_chave_jwt_aqui
NODE_ENV = production
```

### 3.3 Gerar JWT_SECRET

No PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ou use: https://generate-secret.vercel.app/32

## 📋 Passo 4: Fazer Redeploy

1. Na Vercel, vá em **Deployments**
2. Clique nos três pontos do último deploy
3. Clique em **Redeploy**
4. Aguarde o deploy concluir

## 📋 Passo 5: Verificar e Criar Admin

### 5.1 Verificar Status

Acesse:
```
GET https://sisam-ssbv-junielsonfarias.vercel.app/api/init
```

**Resposta esperada (sucesso):**
```json
{
  "ambiente": "production",
  "variaveis_configuradas": {
    "DB_HOST": true,
    "DB_NAME": true,
    "DB_USER": true,
    "DB_PASSWORD": true,
    "DB_PORT": true
  },
  "valores_reais": {
    "DB_HOST": "aws-0-us-east-1.pooler.supabase.com",
    "DB_NAME": "postgres",
    "DB_USER": "postgres.wzpmbgemiykmoawgpmok",
    "DB_PORT": "6543",
    "DB_PASSWORD": "***"
  },
  "admin_existe": false
}
```

### 5.2 Criar Usuário Admin

Se tudo estiver OK, crie o admin:

```
POST https://sisam-ssbv-junielsonfarias.vercel.app/api/init
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "mensagem": "Usuário administrador criado com sucesso!",
  "usuario": {
    "email": "admin@sisam.com",
    "nome": "Administrador"
  },
  "credenciais": {
    "email": "admin@sisam.com",
    "senha": "admin123"
  }
}
```

### 5.3 Testar Login

1. Acesse: https://sisam-ssbv-junielsonfarias.vercel.app/login
2. Use as credenciais:
   - **Email**: `admin@sisam.com`
   - **Senha**: `admin123`

## 🔍 Solução de Problemas

### Erro: `ENOTFOUND`

**Causa**: Hostname não encontrado (DNS)

**Soluções**:
1. ✅ Verifique se o `DB_HOST` está correto
2. ✅ Use o hostname do **Connection Pooler** (porta 6543) para aplicações
3. ✅ Certifique-se de que o projeto Supabase está **ativo** (não pausado)
4. ✅ No Supabase: **Settings** → **Database** → **Connection Pooling**

### Erro: `ECONNREFUSED`

**Causa**: Conexão recusada

**Soluções**:
1. ✅ Verifique se a porta está correta (6543 para pooler, 5432 para direto)
2. ✅ Use **Connection Pooler** (porta 6543) para aplicações
3. ✅ Verifique se o firewall permite conexões

### Erro: `28P01` (Autenticação falhou)

**Causa**: Credenciais incorretas

**Soluções**:
1. ✅ Verifique se `DB_USER` e `DB_PASSWORD` estão corretos
2. ✅ Para pooler, o `DB_USER` deve ser `postgres.[PROJECT-REF]`
3. ✅ Para direto, o `DB_USER` deve ser apenas `postgres`
4. ✅ Verifique se a senha não tem caracteres especiais que precisam ser escapados

### Erro: `database "sisam" does not exist`

**Causa**: Banco de dados não existe

**Soluções**:
1. ✅ No Supabase, o banco padrão é `postgres`, não `sisam`
2. ✅ Configure `DB_NAME = postgres` na Vercel
3. ✅ Execute o schema SQL no banco `postgres` (não precisa criar outro banco)

## 📝 Checklist Final

- [ ] Projeto criado no Supabase
- [ ] Schema SQL executado no Supabase (SQL Editor)
- [ ] Credenciais do **Connection Pooler** obtidas
- [ ] Variáveis configuradas na Vercel:
  - [ ] DB_HOST (hostname do pooler)
  - [ ] DB_PORT (6543)
  - [ ] DB_NAME (postgres)
  - [ ] DB_USER (postgres.[PROJECT-REF])
  - [ ] DB_PASSWORD (senha do Supabase)
  - [ ] JWT_SECRET (gerado)
  - [ ] NODE_ENV (production)
- [ ] Todas marcadas para **Production**
- [ ] Redeploy feito
- [ ] Status verificado (`/api/init`)
- [ ] Usuário admin criado
- [ ] Login testado com sucesso

## 🎯 Diferença entre Pooler e Direct Connection

### Connection Pooler (Porta 6543) - RECOMENDADO
- ✅ Otimizado para aplicações
- ✅ Melhor performance
- ✅ Gerencia conexões automaticamente
- ✅ Hostname: `aws-0-[REGION].pooler.supabase.com`
- ✅ User: `postgres.[PROJECT-REF]`

### Direct Connection (Porta 5432)
- ⚠️ Use apenas para migrations
- ⚠️ Limite de conexões simultâneas
- ⚠️ Hostname: `db.[PROJECT-REF].supabase.co`
- ⚠️ User: `postgres`

**Para o SISAM, sempre use o Connection Pooler (porta 6543)!**

