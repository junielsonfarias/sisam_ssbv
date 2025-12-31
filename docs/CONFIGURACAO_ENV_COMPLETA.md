# 🔧 Configuração Completa de Ambiente - SISAM

## 📊 Status do Banco de Dados Supabase

✅ **Tabelas do SISAM verificadas:**
- `usuarios` ✅
- `polos` ✅
- `escolas` ✅
- `turmas` ✅
- `alunos` ✅
- `questoes` ✅
- `resultados_provas` ✅
- `resultados_consolidados` ✅
- `importacoes` ✅
- `personalizacao` ✅

✅ **Usuário administrador:** Criado e ativo
- Email: `admin@sisam.com`
- Tipo: `administrador`

✅ **Configuração de personalização:** Configurada

## 🔑 Credenciais do Projeto Supabase

- **Project Reference**: `cjxejpgtuuqnbczpbdfe`
- **Project URL**: `https://cjxejpgtuuqnbczpbdfe.supabase.co`
- **Password**: `Master@sisam&&`

## 📝 Configuração Automática

Execute o comando para configurar automaticamente:

```bash
npm run configurar-env-producao
```

Este comando criará:
- `.env` - Configuração para PRODUÇÃO (Connection Pooler)
- `.env.local` - Configuração para DESENVOLVIMENTO (Direct Connection)

## 🔧 Configuração Manual

### Para PRODUÇÃO (.env)

Use o **Connection Pooler** (porta 6543) para produção na Vercel:

```env
# Supabase - Connection Pooler (PRODUÇÃO)
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.cjxejpgtuuqnbczpbdfe  ← IMPORTANTE: com project ref!
DB_PASSWORD=Master@sisam&&
DB_SSL=true
JWT_SECRET=[gere uma chave com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
NODE_ENV=production
```

### Para DESENVOLVIMENTO (.env.local)

Use a **conexão direta** (porta 5432) para desenvolvimento local:

```env
# Supabase - Direct Connection (DESENVOLVIMENTO)
DB_HOST=db.cjxejpgtuuqnbczpbdfe.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres  ← Sem project ref para conexão direta
DB_PASSWORD=Master@sisam&&
DB_SSL=true
JWT_SECRET=[gere uma chave com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
NODE_ENV=development
```

## ⚠️ Diferenças Importantes

| Aspecto | Produção (Pooler) | Desenvolvimento (Direct) |
|---------|-------------------|--------------------------|
| **Host** | `aws-0-[REGION].pooler.supabase.com` | `db.[REF].supabase.co` |
| **Port** | `6543` | `5432` |
| **User** | `postgres.[PROJECT-REF]` | `postgres` |
| **Quando usar** | Vercel/Serverless | Desenvolvimento local |

## 🚀 Como Usar

### Desenvolvimento Local

1. O arquivo `.env.local` será usado automaticamente pelo Next.js
2. Execute: `npm run dev`
3. Acesse: `http://localhost:3000`
4. Login: `admin@sisam.com` / `admin123`

### Produção (Vercel)

1. Configure as variáveis de ambiente na Vercel:
   - Acesse: https://vercel.com/dashboard
   - Seu projeto → Settings → Environment Variables
   - Adicione todas as variáveis do `.env` (formato produção)
2. Faça o deploy
3. Teste: `https://[seu-dominio]/api/health`

## ✅ Verificação

### Testar Conexão Local

```bash
npm run testar-conexao-supabase
```

### Testar Health Check em Produção

Acesse: `https://[seu-dominio]/api/health`

Deve retornar:
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "jwt": "ok"
  }
}
```

## 📋 Checklist

- [ ] Arquivo `.env` configurado para produção (Connection Pooler)
- [ ] Arquivo `.env.local` configurado para desenvolvimento (Direct Connection)
- [ ] `DB_USER` em produção inclui project ref: `postgres.cjxejpgtuuqnbczpbdfe`
- [ ] `DB_USER` em desenvolvimento é apenas: `postgres`
- [ ] `JWT_SECRET` gerado e configurado
- [ ] Variáveis de ambiente configuradas na Vercel (produção)
- [ ] Teste de conexão local passou
- [ ] Health check em produção retorna "ok"

## 🔐 Segurança

- ⚠️ **NUNCA** commite arquivos `.env` ou `.env.local` no Git
- ✅ Eles já estão no `.gitignore`
- ✅ Use `.env.example` como referência (sem valores reais)

