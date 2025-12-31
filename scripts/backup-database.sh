#!/bin/bash

# Script de Backup do Banco de Dados SISAM
# Uso: ./backup-database.sh

# Configurações
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-sisam}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Nome do arquivo de backup
BACKUP_FILE="$BACKUP_DIR/sisam_$DATE.dump"

echo "🔄 Iniciando backup do banco de dados..."
echo "📦 Banco: $DB_NAME"
echo "💾 Arquivo: $BACKUP_FILE"

# Executar backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Obter tamanho do arquivo
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup concluído com sucesso!"
    echo "📊 Tamanho: $FILE_SIZE"
    echo "📍 Local: $BACKUP_FILE"
    
    # Remover backups antigos (manter últimos 30 dias)
    echo "🧹 Removendo backups antigos (mais de 30 dias)..."
    find "$BACKUP_DIR" -name "sisam_*.dump" -mtime +30 -delete
    echo "✅ Limpeza concluída!"
else
    echo "❌ Erro ao criar backup!"
    exit 1
fi

