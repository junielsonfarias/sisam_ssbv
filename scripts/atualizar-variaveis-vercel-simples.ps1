# Script PowerShell para atualizar variáveis no Vercel
# Uso: .\scripts\atualizar-variaveis-vercel-simples.ps1

Write-Host "🚀 Atualizando variáveis de ambiente no Vercel..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Vercel CLI está instalado
try {
    $version = vercel --version
    Write-Host "✅ Vercel CLI $version instalado" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI não está instalado!" -ForegroundColor Red
    Write-Host "💡 Instale com: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

# Verificar login
Write-Host ""
Write-Host "🔐 Verificando login..." -ForegroundColor Cyan
try {
    vercel whoami 2>$null
    Write-Host "✅ Você está logado no Vercel" -ForegroundColor Green
} catch {
    Write-Host "❌ Você não está logado!" -ForegroundColor Red
    Write-Host "💡 Execute: vercel login" -ForegroundColor Yellow
    exit 1
}

# Linkar projeto
Write-Host ""
Write-Host "🔗 Linkando projeto..." -ForegroundColor Cyan
vercel link --yes 2>$null

# Remover variáveis antigas
Write-Host ""
Write-Host "🗑️  Removendo variáveis antigas..." -ForegroundColor Cyan
$variaveisAntigas = @(
    "USUARIO_DO_BANCO_DE_DADOS",
    "NOME_DO_BANCO_DE_DADOS",
    "SENHA_DO_BANCO_DE_DADOS"
)

foreach ($var in $variaveisAntigas) {
    Write-Host "   Removendo $var..." -ForegroundColor Yellow
    vercel env rm $var production --yes 2>$null
}

# Adicionar variáveis corretas
Write-Host ""
Write-Host "➕ Adicionando variáveis corretas..." -ForegroundColor Cyan
Write-Host "   (Pode levar alguns minutos)" -ForegroundColor Yellow
Write-Host ""

# Função para adicionar variável
function Add-VercelEnv {
    param (
        [string]$Name,
        [string]$Value
    )
    
    Write-Host "   Adicionando $Name..." -ForegroundColor Cyan
    
    # Remover se já existir
    vercel env rm $Name production --yes 2>$null | Out-Null
    
    # Adicionar nova
    $Value | vercel env add $Name production 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $Name adicionada" -ForegroundColor Green
        return $true
    } else {
        Write-Host "   ❌ Erro ao adicionar $Name" -ForegroundColor Red
        return $false
    }
}

# Adicionar cada variável
$sucessos = 0
$erros = 0

# Validar que as variáveis de ambiente locais existem
$requiredVars = @("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET")
$missingVars = $requiredVars | Where-Object { -not $env:($_) -and -not [System.Environment]::GetEnvironmentVariable($_) }

# Carregar .env se existir
$envFile = Join-Path $PSScriptRoot "../.env"
if (Test-Path $envFile) {
    Write-Host "   Carregando .env..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

# Revalidar após carregar .env
$missingVars = $requiredVars | Where-Object { -not [System.Environment]::GetEnvironmentVariable($_) }
if ($missingVars.Count -gt 0) {
    Write-Host "❌ Variáveis de ambiente ausentes: $($missingVars -join ', ')" -ForegroundColor Red
    Write-Host "   Configure um arquivo .env local ou exporte as variáveis antes de executar." -ForegroundColor Yellow
    exit 1
}

if (Add-VercelEnv -Name "DB_HOST" -Value $env:DB_HOST) { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_PORT" -Value ($env:DB_PORT ?? "5432")) { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_NAME" -Value ($env:DB_NAME ?? "postgres")) { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_USER" -Value ($env:DB_USER ?? "postgres")) { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_PASSWORD" -Value $env:DB_PASSWORD) { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_SSL" -Value ($env:DB_SSL ?? "true")) { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "JWT_SECRET" -Value $env:JWT_SECRET) { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "NODE_ENV" -Value "production") { $sucessos++ } else { $erros++ }

# Resumo
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Resumo:" -ForegroundColor Yellow
Write-Host "   ✅ Variáveis adicionadas: $sucessos" -ForegroundColor Green
Write-Host "   ❌ Erros: $erros" -ForegroundColor Red

if ($erros -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Algumas variáveis falharam." -ForegroundColor Yellow
    Write-Host "   Adicione-as manualmente no Vercel Dashboard." -ForegroundColor Yellow
}

# Fazer redeploy
if ($sucessos -gt 0) {
    Write-Host ""
    Write-Host "🚀 Fazendo redeploy..." -ForegroundColor Cyan
    Write-Host "   (Isso pode levar ~2 minutos)" -ForegroundColor Yellow
    
    vercel --prod --yes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Deploy concluído com sucesso!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Erro no deploy automático." -ForegroundColor Yellow
        Write-Host "   Execute manualmente: vercel --prod --yes" -ForegroundColor Yellow
    }
}

# Instruções finais
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Aguarde ~2 minutos para o deploy finalizar" -ForegroundColor White
Write-Host "   2. Teste o login:" -ForegroundColor White
Write-Host "      npm run testar-login-producao-auto -- https://sisam-ssbv.vercel.app" -ForegroundColor Cyan
Write-Host "   3. Se funcionar, está pronto! 🎉" -ForegroundColor White
Write-Host ""

