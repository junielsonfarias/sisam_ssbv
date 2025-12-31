# 🔍 Descobrir URL do Vercel e Configurar Projeto

## ⚠️ Situação Atual

O teste de produção retornou: **"The deployment could not be found on Vercel"**

Isso significa que o projeto não está deployado ou a URL está incorreta.

## 📋 Passo a Passo

### 1. Verificar se o Projeto Existe

1. Acesse: https://vercel.com/dashboard
2. Faça login com sua conta
3. Procure o projeto `sisam-ssbv` na lista

**Cenário A: Projeto existe**
- Anote a URL do projeto (ex: `https://sisam-ssbv-seu-usuario.vercel.app`)
- Pule para [Passo 2: Testar com a URL correta](#2-testar-com-a-url-correta)

**Cenário B: Projeto não existe**
- Prossiga para criar o projeto

---

### 2. Criar Projeto no Vercel (Se não existir)

#### Opção 1: Via Dashboard (RECOMENDADO)

1. Clique em **Add New...** → **Project**

2. **Import Git Repository**:
   - Conecte sua conta do GitHub (se ainda não conectou)
   - Selecione o repositório: `junielsonfarias/sisam_ssbv`
   - Clique em **Import**

3. **Configure Project**:
   - **Project Name**: `sisam-ssbv` (ou outro nome)
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (deixe como está)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (padrão)
   - **Install Command**: `npm install`

4. **Environment Variables**:
   Clique em **Environment Variables** e adicione:

   | Nome | Valor |
   |------|-------|
   | `DB_HOST` | `db.cjxejpgtuuqnbczpbdfe.supabase.co` |
   | `DB_PORT` | `5432` |
   | `DB_NAME` | `postgres` |
   | `DB_USER` | `postgres` |
   | `DB_PASSWORD` | `Master@sisam&&` |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | `9a6b48526c17f76ff1dc471519ff9c95ab3b576c9571d59863de73a7a69e80a0` |
   | `NODE_ENV` | `production` |

5. Clique em **Deploy**

6. Aguarde ~2-5 minutos para o deploy finalizar

7. Clique em **Visit** para ver a URL final

#### Opção 2: Via CLI

```bash
# 1. Instalar Vercel CLI (se não tiver)
npm install -g vercel

# 2. Fazer login
vercel login

# 3. Fazer deploy
vercel --prod

# Siga as instruções:
# - Set up and deploy? → Y (Sim)
# - Which scope? → Selecione seu usuário
# - Link to existing project? → N (Não, se for novo)
# - What's your project's name? → sisam-ssbv
# - In which directory is your code located? → . (ponto)
# - Override settings? → N (Não)
```

---

### 3. Testar com a URL Correta

Depois de descobrir ou criar o projeto:

```bash
# Teste automático com URL específica
npm run testar-login-producao-auto -- https://sua-url-real.vercel.app

# Ou teste interativo
npm run testar-login-producao
# Digite a URL quando solicitado
```

---

## 🔍 Como Descobrir a URL do Seu Projeto

### Via Dashboard:

1. Acesse: https://vercel.com/dashboard
2. Clique no projeto
3. A URL está no topo da página: `https://[projeto]-[usuario].vercel.app`

### Via CLI:

```bash
vercel list
```

Isso mostrará todos os seus projetos e suas URLs.

---

## 📋 Checklist Completo

- [ ] Verificar se projeto existe no Vercel Dashboard
- [ ] Se não existe, criar projeto via Dashboard ou CLI
- [ ] Configurar as 8 variáveis de ambiente
- [ ] Fazer deploy (automático após configurar)
- [ ] Aguardar deploy finalizar (~2-5 minutos)
- [ ] Anotar a URL final do projeto
- [ ] Testar login com: `npm run testar-login-producao-auto -- [URL]`
- [ ] Verificar se login funciona
- [ ] Verificar se logo aparece

---

## ⚠️ Variáveis de Ambiente Obrigatórias

Certifique-se de adicionar TODAS as 8 variáveis:

```
DB_HOST=db.cjxejpgtuuqnbczpbdfe.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Master@sisam&&
DB_SSL=true
JWT_SECRET=9a6b48526c17f76ff1dc471519ff9c95ab3b576c9571d59863de73a7a69e80a0
NODE_ENV=production
```

---

## 🎯 Resultado Esperado

Após configurar corretamente:

```bash
npm run testar-login-producao-auto -- https://sua-url.vercel.app
```

Deve mostrar:

```
✅ API Online
✅ Banco de Dados Conectado
✅ Personalização Funcionando
✅ Login Funcionando

🎉🎉🎉 TUDO FUNCIONANDO PERFEITAMENTE! 🎉🎉🎉
```

---

## 🆘 Problemas Comuns

### Erro: "Failed to deploy"

**Causa**: Erro durante o build

**Solução**:
1. Veja os logs no Vercel Dashboard
2. Verifique se todas as dependências estão instaladas
3. Teste o build localmente: `npm run build`

### Erro: "Database connection failed"

**Causa**: Variáveis de ambiente não configuradas

**Solução**:
1. Verifique se TODAS as 8 variáveis estão no Vercel
2. Verifique se os valores estão corretos
3. Refaça o deploy após adicionar variáveis

### Deploy funcionando mas login falha

**Causa**: Usuário admin não existe no banco

**Solução**:
```bash
npm run seed-supabase
```

---

## 📞 Comandos Úteis

```bash
# Listar projetos
vercel list

# Ver logs do último deploy
vercel logs [url-do-projeto]

# Ver variáveis de ambiente
vercel env ls production

# Fazer novo deploy
vercel --prod

# Testar produção
npm run testar-login-producao-auto -- [url]
```

---

## 📝 Próximos Passos

1. ✅ Descubra ou crie o projeto no Vercel
2. ✅ Configure as variáveis de ambiente
3. ✅ Aguarde o deploy finalizar
4. ✅ Teste com o script: `npm run testar-login-producao-auto -- [URL]`
5. ✅ Se tudo funcionar, compartilhe a URL com os usuários!

---

## 💡 Dica

Salve a URL do seu projeto em um local seguro:
- Arquivo `.env.local` (local): `NEXT_PUBLIC_APP_URL=https://...`
- Documentação interna
- README do projeto

