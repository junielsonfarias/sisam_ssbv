# 📦 Guia de Configuração do Repositório GitHub

Este guia explica como criar e configurar o repositório `Sisam_ssbv` no GitHub.

## 🚀 Passo a Passo

### 1. Criar Repositório no GitHub

1. Acesse [GitHub](https://github.com)
2. Clique em **"New repository"** ou **"+"** > **"New repository"**
3. Preencha os dados:
   - **Repository name**: `Sisam_ssbv`
   - **Description**: `Sistema de Análise de Provas - SSBV`
   - **Visibility**: Escolha (Private recomendado para projetos internos)
   - **NÃO** marque "Initialize with README" (já temos um)
   - **NÃO** adicione .gitignore ou license (já temos)
4. Clique em **"Create repository"**

### 2. Configurar Repositório Local

Execute os seguintes comandos no terminal, dentro do diretório do projeto:

```bash
# Verificar se git está inicializado
git status

# Se não estiver inicializado:
git init

# Adicionar arquivos
git add .

# Fazer primeiro commit
git commit -m "Initial commit: Sistema SISAM completo"

# Adicionar remote do GitHub
git remote add origin https://github.com/SEU-USUARIO/Sisam_ssbv.git

# Renomear branch para main (se necessário)
git branch -M main

# Enviar para GitHub
git push -u origin main
```

### 3. Estrutura de Branches Recomendada

```bash
# Branch principal (produção)
git checkout -b main

# Branch de desenvolvimento
git checkout -b develop

# Branch para features
git checkout -b feature/nome-da-feature
```

### 4. Configurar .gitignore

O arquivo `.gitignore` já está configurado, mas verifique se contém:

```
# Arquivos sensíveis
.env
.env.local
.env.production

# Dependências
node_modules/

# Build
.next/
out/
dist/

# Logs
*.log
npm-debug.log*

# Sistema
.DS_Store
Thumbs.db
```

### 5. Proteger Branch Main (Opcional)

No GitHub:
1. Vá em **Settings** > **Branches**
2. Adicione regra para `main`:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

### 6. Configurar Secrets (Para CI/CD)

Se usar GitHub Actions:
1. Vá em **Settings** > **Secrets and variables** > **Actions**
2. Adicione secrets:
   - `DB_HOST`
   - `DB_PASSWORD`
   - `JWT_SECRET`
   - Etc.

### 7. Adicionar Colaboradores

1. Vá em **Settings** > **Collaborators**
2. Adicione membros da equipe
3. Defina permissões (Admin, Write, Read)

## 📝 Boas Práticas

### Commits

Use mensagens descritivas:
```bash
git commit -m "feat: adiciona funcionalidade de exportação"
git commit -m "fix: corrige erro de autenticação"
git commit -m "docs: atualiza README"
```

### Tags de Versão

```bash
# Criar tag
git tag -a v1.0.0 -m "Versão 1.0.0 - Release inicial"

# Enviar tags
git push origin --tags
```

### Pull Requests

- Sempre crie PRs para mudanças na branch `main`
- Use templates de PR (opcional)
- Solicite revisão antes de mergear

## 🔄 Workflow Recomendado

```bash
# 1. Criar branch para feature
git checkout -b feature/nova-funcionalidade

# 2. Fazer alterações e commits
git add .
git commit -m "feat: implementa nova funcionalidade"

# 3. Enviar para GitHub
git push origin feature/nova-funcionalidade

# 4. Criar Pull Request no GitHub
# 5. Após aprovação, mergear na main
```

## 📊 GitHub Actions (CI/CD - Opcional)

Crie `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run build
    - run: npm run lint
```

## 🔐 Segurança

- ✅ Nunca commite arquivos `.env`
- ✅ Use GitHub Secrets para dados sensíveis
- ✅ Revise dependências regularmente
- ✅ Ative Dependabot para atualizações de segurança

## 📞 Próximos Passos

Após configurar o repositório:
1. Configure CI/CD (opcional)
2. Configure deploy automático (opcional)
3. Adicione documentação adicional
4. Configure issues e projetos (opcional)

