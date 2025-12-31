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

if (Add-VercelEnv -Name "DB_HOST" -Value "db.cjxejpgtuuqnbczpbdfe.supabase.co") { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_PORT" -Value "5432") { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_NAME" -Value "postgres") { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_USER" -Value "postgres") { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_PASSWORD" -Value "Master@sisam&&") { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "DB_SSL" -Value "true") { $sucessos++ } else { $erros++ }
if (Add-VercelEnv -Name "JWT_SECRET" -Value "9a6b48526c17f76ff1dc471519ff9c95ab3b576c9571d59863de73a7a69e80a0") { $sucessos++ } else { $erros++ }
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

