# Script PowerShell para preparar repositorio para GitHub
# Uso: .\scripts\prepare-github.ps1

Write-Host "Preparando repositorio para GitHub..." -ForegroundColor Cyan

# Verificar se git esta inicializado
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
}

# Verificar se .env.example existe
if (-not (Test-Path ".env.example")) {
    Write-Host "Arquivo .env.example nao encontrado. Criando..." -ForegroundColor Yellow
    $envExample = @"
# Configuracoes do Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sisam
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

# Chave secreta para JWT (OBRIGATORIO: altere em producao!)
JWT_SECRET=sua-chave-secreta-aqui-altere-em-producao

# Ambiente
NODE_ENV=development
"@
    $envExample | Out-File -FilePath ".env.example" -Encoding UTF8
}

# Verificar se .env esta no .gitignore
$gitignorePath = ".gitignore"
if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath -ErrorAction SilentlyContinue
    if ($gitignoreContent -notcontains ".env") {
        Write-Host "Adicionando .env ao .gitignore..." -ForegroundColor Yellow
        Add-Content $gitignorePath "`n.env"
    }
}

# Adicionar arquivos
Write-Host "Adicionando arquivos ao Git..." -ForegroundColor Cyan
git add .

# Verificar status
Write-Host "`nStatus do repositorio:" -ForegroundColor Cyan
git status --short

Write-Host "`nPreparacao concluida!" -ForegroundColor Green
Write-Host "`nProximos passos:" -ForegroundColor Yellow
Write-Host "1. Crie o repositorio no GitHub: https://github.com/new"
Write-Host "2. Nome: Sisam_ssbv"
Write-Host "3. Execute os comandos:" -ForegroundColor Cyan
Write-Host "   git commit -m 'Initial commit: Sistema SISAM completo'"
Write-Host "   git branch -M main"
Write-Host "   git remote add origin https://github.com/SEU-USUARIO/Sisam_ssbv.git"
Write-Host "   git push -u origin main"
Write-Host "`nConsulte docs/COMANDOS_GITHUB.md para mais detalhes" -ForegroundColor Cyan
