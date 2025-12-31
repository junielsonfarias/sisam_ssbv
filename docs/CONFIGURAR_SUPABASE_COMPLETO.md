# 🚀 Configuração Completa do Supabase para SISAM

Este guia completo explica como configurar o Supabase para desenvolvimento local e produção.

## ✅ Status da Configuração

O schema do banco de dados já foi aplicado no Supabase! Todas as tabelas foram criadas com sucesso.

## 📋 Passo 1: Obter Credenciais do Supabase

### 1.1 Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione seu projeto

### 1.2 Obter Credenciais para Desenvolvimento Local (Direct Connection)

1. No menu lateral, vá em **Settings** → **Database**
2. Role até **Connection string**
3. Selecione **URI**
4. Copie a connection string ou use as informações separadas:

**Informações necessárias:**
- **Host**: `db.[PROJECT-REF].supabase.co` (exemplo: `db.uosydcxfrbnhhasbyhqr.supabase.co`)
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: [a senha que você criou ao criar o projeto]

### 1.3 Obter Credenciais para Produção (Connection Pooler)

1. No menu lateral, vá em **Settings** → **Database**
2. Role até **Connection Pooling**
3. Selecione **Transaction mode** ou **Session mode**
4. Copie as informações:

**Informações necessárias:**
- **Host**: `aws-0-[REGION].pooler.supabase.com` (exemplo: `aws-0-us-east-1.pooler.supabase.com`)
- **Port**: `6543`
- **Database**: `postgres`
- **User**: `postgres.[PROJECT-REF]` (exemplo: `postgres.uosydcxfrbnhhasbyhqr`)
- **Password**: [a senha que você criou]

## 📋 Passo 2: Configurar o Arquivo `.env`

### 2.1 Criar o arquivo `.env`

Na raiz do projeto, crie um arquivo `.env` (se não existir):

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

### 2.2 Configurar para Desenvolvimento Local

Edite o arquivo `.env` com as credenciais do Supabase (Direct Connection):

```env
# Supabase - Desenvolvimento Local
DB_HOST=db.[SEU-PROJECT-REF].supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[SUA-SENHA-SUPABASE]
DB_SSL=true

# JWT Secret (gere uma chave segura)
JWT_SECRET=sua-chave-secreta-super-segura-aqui

# Ambiente
NODE_ENV=development
```

**Substitua:**
- `[SEU-PROJECT-REF]` pelo Project Reference do seu Supabase
- `[SUA-SENHA-SUPABASE]` pela senha do seu projeto Supabase
- `sua-chave-secreta-super-segura-aqui` por uma chave JWT segura

**Gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Configurar para Produção (Vercel)

Quando for para produção, configure as variáveis de ambiente na Vercel usando o Connection Pooler:

```
DB_HOST=aws-0-[REGION].pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.[PROJECT-REF]
DB_PASSWORD=[SUA-SENHA-SUPABASE]
DB_SSL=true
JWT_SECRET=[SUA-CHAVE-JWT]
NODE_ENV=production
```

## 📋 Passo 3: Criar Usuário Administrador

Após configurar o `.env`, execute o script para criar o usuário administrador:

```bash
npm run seed-supabase
```

Isso criará o usuário:
- **Email**: `admin@sisam.com`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere a senha após o primeiro acesso!

## 📋 Passo 4: Testar a Conexão

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse: `http://localhost:3000`

Faça login com:
- Email: `admin@sisam.com`
- Senha: `admin123`

## 📋 Passo 5: Verificar Tabelas no Supabase

Para verificar se todas as tabelas foram criadas:

1. Acesse o Supabase Dashboard
2. Vá em **Table Editor**
3. Você deve ver as seguintes tabelas:
   - `usuarios`
   - `polos`
   - `escolas`
   - `turmas`
   - `alunos`
   - `questoes`
   - `resultados_provas`
   - `resultados_consolidados`
   - `importacoes`
   - `personalizacao` (se já foi criada)

Ou execute no SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## 🔧 Configurações Automáticas

O sistema detecta automaticamente quando está conectando ao Supabase e:
- ✅ Habilita SSL automaticamente
- ✅ Aumenta o timeout de conexão para 15 segundos
- ✅ Configura o pool de conexões adequadamente

## 📝 Resumo dos Comandos

```bash
# 1. Configurar .env com credenciais do Supabase

# 2. Criar usuário administrador
npm run seed-supabase

# 3. Iniciar servidor de desenvolvimento
npm run dev

# 4. Acessar o sistema
# http://localhost:3000
```

## 🚀 Próximos Passos

1. ✅ Schema aplicado no Supabase
2. ⏳ Configurar `.env` com suas credenciais
3. ⏳ Executar `npm run seed-supabase`
4. ⏳ Testar conexão com `npm run dev`
5. ⏳ Fazer login e alterar senha do admin

## ⚠️ Importante

- **NUNCA** commite o arquivo `.env` no Git
- O arquivo `.env` está no `.gitignore` e não será versionado
- Mantenha suas credenciais seguras
- Use o Connection Pooler apenas em produção
- Use Direct Connection para desenvolvimento local

## 🆘 Troubleshooting

### Erro: "connect ECONNREFUSED"
- Verifique se o `DB_HOST` está correto
- Verifique se o projeto Supabase está ativo (não pausado)
- Verifique se a porta está correta (5432 para direct, 6543 para pooler)

### Erro: "password authentication failed"
- Verifique se o `DB_PASSWORD` está correto
- Verifique se o `DB_USER` está correto

### Erro: "database does not exist"
- O Supabase usa sempre o banco `postgres`
- Verifique se `DB_NAME=postgres` no `.env`

### Erro: "relation does not exist"
- Execute o schema SQL no Supabase SQL Editor
- Ou verifique se a migration foi aplicada corretamente

