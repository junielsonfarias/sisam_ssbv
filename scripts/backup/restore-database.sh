#!/bin/bash

# Script de Restauração do Banco de Dados SISAM
# Uso: ./restore-database.sh <arquivo-backup.dump>

if [ -z "$1" ]; then
    echo "❌ Erro: Especifique o arquivo de backup"
    echo "Uso: ./restore-database.sh <arquivo-backup.dump>"
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-sisam}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erro: Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER o banco de dados atual!"
echo "📦 Banco: $DB_NAME"
echo "💾 Backup: $BACKUP_FILE"
read -p "Deseja continuar? (sim/não): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo "🔄 Restaurando backup..."

# Criar backup antes de restaurar
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
PRE_RESTORE_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).dump"
echo "💾 Criando backup de segurança antes da restauração..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$PRE_RESTORE_BACKUP"

# Restaurar backup
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Restauração concluída com sucesso!"
    echo "💾 Backup de segurança criado em: $PRE_RESTORE_BACKUP"
else
    echo "❌ Erro ao restaurar backup!"
    exit 1
fi

