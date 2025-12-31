#!/bin/bash

# Script para preparar repositório para GitHub
# Uso: bash scripts/prepare-github.sh

echo "🚀 Preparando repositório para GitHub..."

# Verificar se git está inicializado
if [ ! -d ".git" ]; then
    echo "📦 Inicializando repositório Git..."
    git init
fi

# Verificar se .env.example existe
if [ ! -f ".env.example" ]; then
    echo "⚠️  Arquivo .env.example não encontrado. Criando..."
    cp .env .env.example 2>/dev/null || echo "# Adicione suas variáveis de ambiente aqui" > .env.example
fi

# Verificar se .env está no .gitignore
if ! grep -q "^\.env$" .gitignore; then
    echo "📝 Adicionando .env ao .gitignore..."
    echo ".env" >> .gitignore
fi

# Adicionar arquivos
echo "📋 Adicionando arquivos ao Git..."
git add .

# Verificar status
echo ""
echo "📊 Status do repositório:"
git status --short

echo ""
echo "✅ Preparação concluída!"
echo ""
echo "📝 Próximos passos:"
echo "1. Crie o repositório no GitHub: https://github.com/new"
echo "2. Nome: Sisam_ssbv"
echo "3. Execute os comandos:"
echo "   git commit -m 'Initial commit: Sistema SISAM completo'"
echo "   git branch -M main"
echo "   git remote add origin https://github.com/SEU-USUARIO/Sisam_ssbv.git"
echo "   git push -u origin main"
echo ""
echo "📖 Consulte docs/GITHUB_SETUP.md para mais detalhes"

