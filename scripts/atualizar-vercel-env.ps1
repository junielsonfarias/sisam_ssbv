# Script PowerShell para atualizar variáveis de ambiente na Vercel
# Execute: .\scripts\atualizar-vercel-env.ps1

Write-Host "🔧 Atualização de Variáveis de Ambiente na Vercel`n" -ForegroundColor Cyan

$projectRef = "uosydcxfrbnhhasbyhqr"

Write-Host "📋 Informações do Projeto Supabase:" -ForegroundColor Yellow
Write-Host "   Project REF: $projectRef"
Write-Host "   Direct Host: db.$projectRef.supabase.co`n"

# Solicitar informações
$usarPooler = Read-Host "Usar Connection Pooler? (s/n) [s]"
if ([string]::IsNullOrWhiteSpace($usarPooler)) { $usarPooler = "s" }

if ($usarPooler -eq "s" -or $usarPooler -eq "sim") {
    $regiao = Read-Host "Região do Supabase (ex: us-east-1, sa-east-1) [us-east-1]"
    if ([string]::IsNullOrWhiteSpace($regiao)) { $regiao = "us-east-1" }
    $dbHost = "aws-0-$regiao.pooler.supabase.com"
    $dbPort = "6543"
    $dbUser = "postgres.$projectRef"
} else {
    $dbHost = "db.$projectRef.supabase.co"
    $dbPort = "5432"
    $dbUser = "postgres"
}

$dbName = Read-Host "DB_NAME [postgres]"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "postgres" }

$dbPassword = Read-Host "DB_PASSWORD (senha do Supabase)" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$gerarJwt = Read-Host "Gerar novo JWT_SECRET? (s/n) [n]"
if ([string]::IsNullOrWhiteSpace($gerarJwt)) { $gerarJwt = "n" }

if ($gerarJwt -eq "s" -or $gerarJwt -eq "sim") {
    $jwtSecret = -join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    Write-Host "`n✅ Novo JWT_SECRET gerado`n" -ForegroundColor Green
} else {
    $jwtSecret = $null
}

Write-Host "`n📝 Variáveis que serão atualizadas:" -ForegroundColor Yellow
Write-Host "   DB_HOST=$dbHost"
Write-Host "   DB_PORT=$dbPort"
Write-Host "   DB_NAME=$dbName"
Write-Host "   DB_USER=$dbUser"
Write-Host "   DB_PASSWORD=***"
if ($jwtSecret) {
    Write-Host "   JWT_SECRET=$($jwtSecret.Substring(0, 20))..."
} else {
    Write-Host "   JWT_SECRET=(mantido atual)"
}
Write-Host "   NODE_ENV=production`n"

$confirmar = Read-Host "Deseja continuar? (s/n)"
if ($confirmar -ne "s" -and $confirmar -ne "sim") {
    Write-Host "`n❌ Atualização cancelada." -ForegroundColor Red
    exit
}

Write-Host "`n🚀 Atualizando variáveis na Vercel...`n" -ForegroundColor Cyan

# Atualizar variáveis
$variaveis = @(
    @{key="DB_HOST"; value=$dbHost},
    @{key="DB_PORT"; value=$dbPort},
    @{key="DB_NAME"; value=$dbName},
    @{key="DB_USER"; value=$dbUser},
    @{key="DB_PASSWORD"; value=$dbPasswordPlain}
)

if ($jwtSecret) {
    $variaveis += @{key="JWT_SECRET"; value=$jwtSecret}
}

$variaveis += @{key="NODE_ENV"; value="production"}

foreach ($var in $variaveis) {
    Write-Host "   Atualizando $($var.key)..." -ForegroundColor Yellow
    try {
        # Remover variável antiga
        vercel env rm $var.key production --yes 2>$null
        
        # Adicionar nova variável
        $var.value | vercel env add $var.key production
        Write-Host "   ✅ $($var.key) atualizado" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Erro ao atualizar $($var.key)" -ForegroundColor Red
        Write-Host "      Configure manualmente: vercel env add $($var.key) production" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Variáveis atualizadas!`n" -ForegroundColor Green
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Faça um redeploy: vercel --prod"
Write-Host "   2. Verifique: https://sisam-ssbv-junielsonfarias.vercel.app/api/init"
Write-Host "   3. Teste login: https://sisam-ssbv-junielsonfarias.vercel.app/login"
Write-Host "      Email: admin@sisam.com | Senha: admin123`n"

