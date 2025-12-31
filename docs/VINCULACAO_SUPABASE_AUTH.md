# 🔗 Vinculação Supabase Auth com Tabela Usuarios

## ✅ Status da Vinculação

**Usuário Administrador vinculado:**
- **Email**: `admin@sisam.com`
- **UID Supabase Auth**: `61748894-2c35-461b-b34e-ebfc552bbbcd`
- **ID na tabela usuarios**: `8146154b-8faa-4329-9d2d-33ef16ed9c2b`
- **Status**: ✅ Vinculado com sucesso

## 📋 O que foi feito

1. **Adicionada coluna `auth_uid`** na tabela `usuarios`
   - Tipo: `UUID`
   - Referência: `auth.users(id)`
   - Permite NULL (usuários podem não ter vinculação com Auth)

2. **Criado índice** para melhor performance:
   - `idx_usuarios_auth_uid`

3. **Vinculação realizada**:
   - Usuário `admin@sisam.com` vinculado ao UID `61748894-2c35-461b-b34e-ebfc552bbbcd`

## 🔍 Verificar Vinculação

Para verificar se um usuário está vinculado:

```sql
SELECT 
  u.id,
  u.nome,
  u.email,
  u.tipo_usuario,
  u.auth_uid,
  au.email as auth_email
FROM usuarios u
LEFT JOIN auth.users au ON u.auth_uid = au.id
WHERE u.email = 'admin@sisam.com';
```

## 🔧 Como Vincular Outros Usuários

### Via SQL

```sql
-- Vincular um usuário existente ao Supabase Auth
UPDATE usuarios 
SET auth_uid = '[UID_DO_SUPABASE_AUTH]'
WHERE email = '[EMAIL_DO_USUARIO]';
```

### Via Painel Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **Users**
4. Copie o UID do usuário
5. Execute o SQL acima no SQL Editor

## 📝 Estrutura da Tabela

A tabela `usuarios` agora possui:

```sql
CREATE TABLE usuarios (
    id UUID PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(20) NOT NULL,
    polo_id UUID,
    escola_id UUID,
    auth_uid UUID REFERENCES auth.users(id),  ← NOVA COLUNA
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP,
    atualizado_em TIMESTAMP
);
```

## ⚠️ Notas Importantes

1. **A coluna `auth_uid` é opcional**: Usuários podem existir sem vinculação ao Supabase Auth
2. **Foreign Key**: Se o usuário for deletado do `auth.users`, o `auth_uid` será definido como NULL (ON DELETE SET NULL)
3. **Índice criado**: Para melhor performance em consultas que usam `auth_uid`

## ✅ Benefícios da Vinculação

- Permite usar recursos do Supabase Auth (Row Level Security, etc.)
- Facilita integração futura com autenticação do Supabase
- Mantém compatibilidade com o sistema atual de autenticação JWT
- Permite migração gradual para Supabase Auth se necessário

