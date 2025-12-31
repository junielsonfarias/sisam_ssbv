# 📋 Comandos para Criar Repositório no GitHub

Guia rápido com todos os comandos necessários para criar e configurar o repositório `Sisam_ssbv` no GitHub.

## 🚀 Passo a Passo Completo

### 1. Preparar Repositório Local

Execute o script de preparação:

**Windows (PowerShell):**
```powershell
.\scripts\prepare-github.ps1
```

**Linux/Mac:**
```bash
bash scripts/prepare-github.sh
```

### 2. Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Preencha:
   - **Repository name**: `Sisam_ssbv`
   - **Description**: `Sistema de Análise de Provas - SSBV`
   - **Visibility**: Private (recomendado)
   - **NÃO** marque "Initialize with README"
3. Clique em **"Create repository"**

### 3. Conectar e Enviar Código

Execute os seguintes comandos no terminal (dentro do diretório do projeto):

```bash
# Fazer primeiro commit
git commit -m "Initial commit: Sistema SISAM completo - Versão 1.0.0"

# Renomear branch para main (se necessário)
git branch -M main

# Adicionar remote (substitua SEU-USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU-USUARIO/Sisam_ssbv.git

# Enviar código para GitHub
git push -u origin main
```

### 4. Verificar

Acesse: `https://github.com/SEU-USUARIO/Sisam_ssbv`

Você deve ver todos os arquivos do projeto.

## 🔐 Configurações Adicionais

### Adicionar Descrição ao Repositório

No GitHub, vá em **Settings** > **General** e adicione:
- **Description**: Sistema de Análise de Provas - SSBV
- **Website**: (se tiver)
- **Topics**: `sisam`, `nextjs`, `postgresql`, `education`

### Configurar Branch Protection (Opcional)

1. Vá em **Settings** > **Branches**
2. Adicione regra para `main`:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging

### Adicionar Colaboradores

1. Vá em **Settings** > **Collaborators**
2. Clique em **"Add people"**
3. Adicione membros da equipe

## 📦 Tags de Versão

Para criar uma tag de versão:

```bash
# Criar tag
git tag -a v1.0.0 -m "Versão 1.0.0 - Release inicial"

# Enviar tags
git push origin --tags
```

## 🔄 Workflow de Desenvolvimento

### Criar Nova Feature

```bash
# Criar branch
git checkout -b feature/nome-da-feature

# Fazer alterações e commits
git add .
git commit -m "feat: adiciona funcionalidade X"

# Enviar para GitHub
git push origin feature/nome-da-feature

# Criar Pull Request no GitHub
```

### Atualizar Código

```bash
# Atualizar branch main
git checkout main
git pull origin main

# Atualizar sua branch
git checkout feature/sua-branch
git merge main
```

## 🆘 Problemas Comuns

### Erro: "remote origin already exists"

```bash
# Remover remote existente
git remote remove origin

# Adicionar novamente
git remote add origin https://github.com/SEU-USUARIO/Sisam_ssbv.git
```

### Erro: "failed to push some refs"

```bash
# Fazer pull primeiro
git pull origin main --allow-unrelated-histories

# Depois push
git push -u origin main
```

### Esqueceu de adicionar arquivo ao commit

```bash
# Adicionar arquivo
git add arquivo-esquecido.js

# Fazer commit amending
git commit --amend --no-edit

# Force push (cuidado!)
git push -f origin main
```

## ✅ Checklist Final

- [ ] Repositório criado no GitHub
- [ ] Código enviado com sucesso
- [ ] README visível no GitHub
- [ ] .gitignore funcionando (sem arquivos sensíveis)
- [ ] Branch protection configurada (opcional)
- [ ] Colaboradores adicionados (se necessário)
- [ ] Tags de versão criadas (opcional)

## 📞 Próximos Passos

Após criar o repositório:
1. Configure CI/CD (GitHub Actions já está configurado)
2. Configure deploy automático (opcional)
3. Adicione issues e projetos (opcional)
4. Configure Dependabot para atualizações de segurança

