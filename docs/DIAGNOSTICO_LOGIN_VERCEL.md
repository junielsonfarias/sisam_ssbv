# 🔍 Diagnóstico de Erro 500 no Login - Vercel

## ✅ Correções Aplicadas

1. **Melhor tratamento de erros**: A rota de login agora retorna mensagens de erro mais específicas
2. **Rota de Health Check**: Criada rota `/api/health` para verificar configurações
3. **Validação de JWT_SECRET**: Verifica se o JWT_SECRET está configurado antes de gerar token

## 🔍 Como Diagnosticar o Problema

### 1. Verificar Health Check

Acesse: `https://[seu-dominio-vercel].vercel.app/api/health`

Esta rota retorna:
- Status das configurações (DB_HOST, DB_PORT, etc.)
- Status da conexão com o banco
- Status do JWT_SECRET
- Erros específicos se houver

**Exemplo de resposta OK:**
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "jwt": "ok"
  },
  "config": {
    "db_host": "configured",
    "db_port": "configured",
    "db_name": "configured",
    "db_user": "configured",
    "db_password": "configured",
    "jwt_secret": "configured"
  }
}
```

**Exemplo de resposta com erro:**
```json
{
  "status": "error",
  "checks": {
    "database": "error",
    "jwt": "error"
  },
  "database_error": {
    "code": "ECONNREFUSED",
    "message": "..."
  }
}
```

### 2. Verificar Variáveis de Ambiente na Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Verifique se TODAS as variáveis estão configuradas:

```
✅ DB_HOST=aws-0-us-east-1.pooler.supabase.com
✅ DB_PORT=6543
✅ DB_NAME=postgres
✅ DB_USER=postgres.cjxejpgtuuqnbczpbdfe
✅ DB_PASSWORD=SUA_SENHA_AQUI
✅ DB_SSL=true
✅ JWT_SECRET=[sua-chave-com-pelo-menos-20-caracteres]
✅ NODE_ENV=production
```

### 3. Verificar Logs da Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Deployments** → Selecione o último deploy
4. Clique em **Functions** → Selecione `api/auth/login`
5. Veja os logs para identificar o erro específico

### 4. Erros Comuns e Soluções

#### Erro: `JWT_NOT_CONFIGURED`
**Causa**: JWT_SECRET não está configurado ou é muito curto (< 20 caracteres)

**Solução**:
1. Gere uma chave segura:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Adicione na Vercel: `JWT_SECRET=[chave-gerada]`
3. Faça um novo deploy

#### Erro: `DB_CONNECTION_REFUSED` ou `DB_HOST_NOT_FOUND`
**Causa**: Credenciais do banco incorretas ou host errado

**Solução**:
1. Verifique se está usando o **Connection Pooler** (porta 6543)
2. Verifique se o `DB_USER` inclui o project reference: `postgres.cjxejpgtuuqnbczpbdfe`
3. Verifique se o `DB_HOST` está correto (deve ser do pooler, não da conexão direta)

#### Erro: `DB_AUTH_ERROR` (código 28P01)
**Causa**: Usuário ou senha incorretos

**Solução**:
1. Verifique as credenciais no Supabase Dashboard
2. Certifique-se de que a senha está correta (sem espaços extras)
3. Verifique se o usuário está no formato correto: `postgres.cjxejpgtuuqnbczpbdfe`

#### Erro: `DB_NETWORK_ERROR` (ENETUNREACH)
**Causa**: Problema de rede (já corrigido no código, mas pode ocorrer se variáveis estiverem erradas)

**Solução**:
1. Verifique se está usando IPv4 (já configurado no código)
2. Verifique se o host está correto

## 📋 Checklist de Configuração

- [ ] Todas as variáveis de ambiente estão configuradas na Vercel
- [ ] `DB_HOST` aponta para o Connection Pooler (porta 6543)
- [ ] `DB_USER` inclui o project reference: `postgres.cjxejpgtuuqnbczpbdfe`
- [ ] `DB_PASSWORD` está correto (sem espaços extras)
- [ ] `JWT_SECRET` tem pelo menos 20 caracteres
- [ ] `NODE_ENV=production` está configurado
- [ ] Health check (`/api/health`) retorna status "ok"
- [ ] Logs da Vercel não mostram erros de conexão

## 🚀 Após Corrigir

1. Aguarde o novo deploy (ou faça um deploy manual)
2. Teste o health check: `https://[seu-dominio]/api/health`
3. Tente fazer login novamente
4. Se ainda houver erro, verifique os logs da Vercel para ver a mensagem específica

## 📝 Notas

- Os erros agora retornam códigos específicos (`JWT_NOT_CONFIGURED`, `DB_CONNECTION_REFUSED`, etc.)
- A rota `/api/health` ajuda a diagnosticar problemas de configuração
- Os logs da Vercel mostram detalhes completos dos erros

