# Como Verificar e Corrigir Variáveis de Ambiente na Vercel

## 🔍 Problema Identificado

O sistema mostra que as variáveis estão configuradas (`true`), mas os valores são `localhost` e `sisam` (valores padrão). Isso indica que:

1. **As variáveis podem estar vazias** (definidas mas sem valor)
2. **As variáveis podem ter valores incorretos**
3. **As variáveis podem não estar marcadas para Production**

## ✅ Passo a Passo para Corrigir

### 1. Acessar Configurações da Vercel

1. Acesse: https://vercel.com
2. Faça login
3. Selecione o projeto `sisam-ssbv`
4. Vá em **Settings** → **Environment Variables**

### 2. Verificar Cada Variável

Para cada variável abaixo, verifique:

#### DB_HOST
- **Nome**: `DB_HOST`
- **Valor**: Deve ser o host do seu banco PostgreSQL (ex: `xxxxx.xxxxx.xxxxx.com`)
- **NÃO pode ser**: `localhost`, `127.0.0.1`, ou vazio
- **Ambientes**: Marque **Production** ✅

#### DB_PORT
- **Nome**: `DB_PORT`
- **Valor**: Geralmente `5432` ou a porta do seu provedor
- **NÃO pode ser**: vazio
- **Ambientes**: Marque **Production** ✅

#### DB_NAME
- **Nome**: `DB_NAME`
- **Valor**: Nome do banco de dados (ex: `verceldb`, `sisam`)
- **NÃO pode ser**: vazio
- **Ambientes**: Marque **Production** ✅

#### DB_USER
- **Nome**: `DB_USER`
- **Valor**: Usuário do banco (ex: `default`, `postgres`)
- **NÃO pode ser**: vazio
- **Ambientes**: Marque **Production** ✅

#### DB_PASSWORD
- **Nome**: `DB_PASSWORD`
- **Valor**: Senha do banco
- **NÃO pode ser**: vazio
- **Ambientes**: Marque **Production** ✅

#### JWT_SECRET
- **Nome**: `JWT_SECRET`
- **Valor**: Chave secreta de pelo menos 32 caracteres
- **NÃO pode ser**: vazio
- **Ambientes**: Marque **Production** ✅

#### NODE_ENV
- **Nome**: `NODE_ENV`
- **Valor**: `production`
- **Ambientes**: Marque **Production** ✅

### 3. Remover Variáveis com Valores Incorretos

Se encontrar variáveis com valores incorretos (como `localhost` ou vazias):

1. Clique nos **três pontos** ao lado da variável
2. Clique em **Delete**
3. Adicione novamente com o valor correto

### 4. Adicionar Variáveis Corretas

Para cada variável:

1. Clique em **Add New**
2. Digite o **Name** (ex: `DB_HOST`)
3. Digite o **Value** (o valor real do seu banco)
4. Marque **Production** ✅
5. Clique em **Save**

### 5. Fazer Redeploy

**IMPORTANTE**: Após adicionar/alterar variáveis:

1. Vá em **Deployments**
2. Clique nos **três pontos** do último deploy
3. Clique em **Redeploy**
4. Aguarde o deploy concluir

## 🔍 Verificar Após Redeploy

Após o redeploy, acesse:

```
GET https://sisam-ssbv-junielsonfarias.vercel.app/api/init
```

Agora você verá:
- `valores_reais`: Os valores reais de cada variável
- `aviso`: Se houver problema com DB_HOST

### Exemplo de Resposta Esperada

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
    "DB_HOST": "xxxxx.xxxxx.xxxxx.com",
    "DB_NAME": "verceldb",
    "DB_USER": "default",
    "DB_PORT": "5432",
    "DB_PASSWORD": "***"
  },
  "host": "xxxxx.xxxxx.xxxxx.com",
  "database": "verceldb"
}
```

## ⚠️ Problemas Comuns

### Problema 1: Variável existe mas está vazia

**Sintoma**: `variaveis_configuradas.DB_HOST = true` mas `valores_reais.DB_HOST = "não configurado ou vazio"`

**Solução**: 
1. Delete a variável
2. Adicione novamente com o valor correto
3. Faça redeploy

### Problema 2: Variável não marcada para Production

**Sintoma**: Variável existe mas não funciona em produção

**Solução**: 
1. Edite a variável
2. Marque **Production** ✅
3. Faça redeploy

### Problema 3: DB_HOST ainda é localhost

**Sintoma**: `valores_reais.DB_HOST = "localhost"`

**Solução**: 
1. Verifique se `DB_HOST` tem o valor correto (não localhost)
2. Se estiver correto, pode ser cache - faça redeploy
3. Verifique se não há outra variável `DB_HOST` com valor localhost

## 📝 Checklist Final

Antes de testar o login, verifique:

- [ ] Todas as 7 variáveis estão configuradas
- [ ] Todas estão marcadas para **Production**
- [ ] `DB_HOST` não é `localhost` ou vazio
- [ ] `DB_NAME` não é vazio
- [ ] `DB_USER` não é vazio
- [ ] `DB_PASSWORD` não é vazio
- [ ] `JWT_SECRET` tem pelo menos 32 caracteres
- [ ] `NODE_ENV = production`
- [ ] Redeploy foi feito após configurar variáveis

## 🚀 Após Configurar Corretamente

1. Faça um **Redeploy manual**
2. Aguarde o deploy concluir
3. Acesse `/api/init` (GET) para verificar
4. Se tudo estiver OK, acesse `/api/init` (POST) para criar o usuário
5. Teste o login com `admin@sisam.com` / `admin123`

