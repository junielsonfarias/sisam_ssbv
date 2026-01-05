# 🔧 Configurar .env para Supabase

## ✅ Credenciais do Projeto

- **Project Reference**: `cjxejpgtuuqnbczpbdfe`
- **Host**: `db.cjxejpgtuuqnbczpbdfe.supabase.co`
- **Port**: `5432`
- **Database**: `postgres` (Supabase sempre usa "postgres")
- **User**: `postgres`
- **Password**: `Master@sisam&&`

## 📝 Configuração do Arquivo `.env`

Crie ou edite o arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# Supabase - Configuração do Banco de Dados
DB_HOST=db.cjxejpgtuuqnbczpbdfe.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Master@sisam&&
DB_SSL=true

# JWT Secret (gere uma chave segura)
JWT_SECRET=sua-chave-secreta-super-segura-aqui-altere-esta-chave

# Ambiente
NODE_ENV=development
```

## 🔑 Gerar JWT_SECRET

Execute no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e cole no lugar de `sua-chave-secreta-super-segura-aqui-altere-esta-chave`.

## ✅ Verificar Configuração

Após configurar o `.env`, teste a conexão:

```bash
npm run testar-conexao-supabase
```

## 🚀 Próximos Passos

1. ✅ Schema aplicado no Supabase
2. ⏳ Configurar `.env` (copie o conteúdo acima)
3. ⏳ Executar `npm run seed-supabase` para criar usuário admin
4. ⏳ Executar `npm run dev` para iniciar o servidor

