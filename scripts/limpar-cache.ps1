# Script para limpar cache do Next.js e node_modules
Write-Host "Limpando cache do Next.js..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✓ Cache .next removido" -ForegroundColor Green
}

Write-Host "Limpando cache do npm..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "Reinstalando dependências..." -ForegroundColor Yellow
npm install

Write-Host "✓ Limpeza concluída! Execute 'npm run dev' para iniciar o servidor." -ForegroundColor Green

