# ⚡ Instruções Rápidas - Configuração Supabase

## ✅ Status Atual

- ✅ Schema do banco aplicado no Supabase
- ✅ Todas as tabelas criadas
- ⏳ Configurar `.env` com credenciais
- ⏳ Criar usuário administrador

## 🚀 Passos Rápidos

### 1. Obter Credenciais do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Role até **Connection string**
5. Selecione **URI**
6. Copie as informações:

```
Host: db.[PROJECT-REF].supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [sua senha]
```

### 2. Configurar `.env`

Crie/edite o arquivo `.env` na raiz do projeto:

```env
DB_HOST=db.[SEU-PROJECT-REF].supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[SUA-SENHA-SUPABASE]
DB_SSL=true

JWT_SECRET=[gere uma chave com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]

NODE_ENV=development
```

### 3. Criar Usuário Administrador

```bash
npm run seed-supabase
```

### 4. Testar

```bash
npm run dev
```

Acesse: `http://localhost:3000`

Login:
- Email: `admin@sisam.com`
- Senha: `admin123`

## 📝 Para Produção (Vercel)

Quando for para produção, use o **Connection Pooler**:

1. No Supabase: **Settings** → **Database** → **Connection Pooling**
2. Copie as credenciais do Pooler
3. Configure na Vercel:

```
DB_HOST=aws-0-[REGION].pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.[PROJECT-REF]
DB_PASSWORD=[SUA-SENHA]
DB_SSL=true
```

## ✅ Checklist

- [ ] Credenciais do Supabase obtidas
- [ ] Arquivo `.env` configurado
- [ ] `npm run seed-supabase` executado
- [ ] `npm run dev` funcionando
- [ ] Login realizado com sucesso

