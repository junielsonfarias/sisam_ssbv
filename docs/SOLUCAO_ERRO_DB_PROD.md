# 🔧 Solução para Erro de Conexão com Banco de Dados em Produção

## ❌ Erro Reportado

```
POST /api/auth/login 500 (Internal Server Error)
Erro no login: {mensagem: 'Erro ao conectar com o banco de dados', erro: 'DB_ERROR'}
```

## 🔍 Diagnóstico

O erro `DB_ERROR` pode ter várias causas:

1. **Variáveis de ambiente não configuradas** no Vercel
2. **Credenciais incorretas** (DB_HOST, DB_USER, DB_PASSWORD)
3. **Banco de dados pausado** (Supabase)
4. **Configuração SSL incorreta**
5. **Problemas de rede/firewall**

## ✅ Solução Passo a Passo

### 1. Verificar Health Check

Acesse: `https://sisam-ssbv-junielsonfarias.vercel.app/api/health`

Esta rota retorna:
- Status das variáveis de ambiente
- Status da conexão com o banco
- Erros específicos e sugestões

**O que procurar:**
```json
{
  "status": "error",
  "checks": {
    "database": "error"
  },
  "config": {
    "db_host": "missing",  // ❌ PROBLEMA AQUI
    "db_password": "missing"  // ❌ PROBLEMA AQUI
  }
}
```

### 2. Verificar Variáveis de Ambiente no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `sisam-ssbv`
3. Vá em **Settings** → **Environment Variables**
4. Verifique se TODAS as variáveis estão configuradas:

```
✅ DB_HOST=aws-0-us-east-1.pooler.supabase.com
✅ DB_PORT=6543
✅ DB_NAME=postgres
✅ DB_USER=postgres.cjxejpgtuuqnbczpbdfe
✅ DB_PASSWORD=[sua-senha]
✅ DB_SSL=true
✅ JWT_SECRET=[chave-com-pelo-menos-20-caracteres]
✅ NODE_ENV=production
```

**IMPORTANTE:**
- Certifique-se de que as variáveis estão configuradas para **Production** (não apenas Preview/Development)
- Após adicionar/editar variáveis, faça um novo deploy

### 3. Verificar Configuração do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Verifique se o projeto está **ATIVO** (não pausado)
4. Vá em **Settings** → **Database**
5. Copie as credenciais do **Connection Pooler**:

**Para Connection Pooler (RECOMENDADO para Vercel):**
- Host: `aws-0-us-east-1.pooler.supabase.com` (ou similar)
- Port: `6543`
- User: `postgres.[PROJECT-REF]`
- Database: `postgres`
- Password: (sua senha)
- Mode: **Session** ou **Transaction**

### 4. Verificar Logs do Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto
3. Vá em **Deployments** → Selecione o último deploy
4. Clique em **Functions** → Selecione `api/auth/login`
5. Veja os logs para identificar o erro específico:

**Logs úteis:**
- `Variáveis de ambiente não configuradas: DB_HOST, DB_PASSWORD`
- `Erro ao criar pool PostgreSQL: ...`
- `Código do erro: ECONNREFUSED`

### 5. Testar Conexão Manualmente

Você pode usar o script de teste:

```bash
node scripts/test-db-connection.js
```

Ou usar a rota de health check diretamente no navegador.

## 🔄 Após Corrigir as Variáveis

1. **Salve as variáveis** no Vercel Dashboard
2. **Faça um novo deploy**:
   - Vá em **Deployments**
   - Clique nos **3 pontos** do último deploy
   - Selecione **Redeploy**

Ou simplesmente faça um novo commit e push:

```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

## 🆘 Se o Problema Persistir

### Verificar se o Supabase está acessível

Teste a conexão diretamente:

```bash
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

### Verificar Firewall/Ip Allowlist

1. No Supabase Dashboard
2. Vá em **Settings** → **Database**
3. Verifique **Connection Pooling**
4. Certifique-se de que não há restrições de IP

### Verificar Senha

- Senhas com caracteres especiais podem precisar ser escapadas
- Use aspas simples no Vercel se necessário
- Certifique-se de que não há espaços extras

## 📝 Melhorias Implementadas

As seguintes melhorias foram aplicadas ao código:

1. ✅ Validação prévia de variáveis de ambiente antes de tentar conectar
2. ✅ Mensagens de erro mais específicas e úteis
3. ✅ Melhor tratamento de erros de configuração
4. ✅ Logs mais detalhados para debug

## 🎯 Próximos Passos

Após verificar e corrigir as variáveis de ambiente:

1. Verifique o health check: `/api/health`
2. Teste o login novamente
3. Verifique os logs do Vercel para confirmar que a conexão está funcionando

