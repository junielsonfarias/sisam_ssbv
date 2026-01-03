# Script para limpar cache do Next.js no Windows
Write-Host "Limpando cache do Next.js..." -ForegroundColor Yellow

# Remover pasta .next
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ Pasta .next removida" -ForegroundColor Green
} else {
    Write-Host "✓ Pasta .next não encontrada" -ForegroundColor Gray
}

# Remover cache do node_modules
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ Cache do node_modules removido" -ForegroundColor Green
} else {
    Write-Host "✓ Cache do node_modules não encontrado" -ForegroundColor Gray
}

Write-Host "`nCache limpo com sucesso! Execute 'npm run build' ou 'npm run dev' para reconstruir." -ForegroundColor Green
