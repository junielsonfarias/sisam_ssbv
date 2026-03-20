#!/bin/bash
set -e

# SISAM - Atualizador
# Uso: sisam update  ou  sudo bash /opt/sisam/deploy/update.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="/opt/sisam"
APP_USER="sisam"
BRANCH="main"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
log_error() { echo -e "${RED}[ERRO]${NC} $1"; }

echo -e "${CYAN}=== SISAM - Atualizador ===${NC}"
echo ""

# Verificar root
if [ "$EUID" -ne 0 ]; then
  log_error "Execute como root: sudo sisam update"
  exit 1
fi

cd "$APP_DIR"

# Backup antes de atualizar
log_info "Fazendo backup antes de atualizar..."
if [ -f "$APP_DIR/deploy/backup.sh" ]; then
  sudo -u "$APP_USER" bash "$APP_DIR/deploy/backup.sh" || log_warn "Backup falhou, continuando..."
fi

# Salvar hash atual para rollback
CURRENT_HASH=$(git rev-parse HEAD)
log_info "Versão atual: ${CURRENT_HASH:0:8}"

# Atualizar código
log_info "Baixando atualizações..."
sudo -u "$APP_USER" git fetch origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  log_info "Sistema já está na versão mais recente."
  exit 0
fi

sudo -u "$APP_USER" git pull origin "$BRANCH"
NEW_HASH=$(git rev-parse HEAD)
log_info "Nova versão: ${NEW_HASH:0:8}"

# Instalar dependências (se package.json mudou)
log_info "Verificando dependências..."
sudo -u "$APP_USER" npm ci --production=false 2>&1 | tail -3

# Executar novas migrações
log_info "Executando migrações..."
source "${APP_DIR}/.env.local"
for migration in database/migrations/*.sql; do
  if [ -f "$migration" ]; then
    PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -f "$migration" 2>/dev/null || true
  fi
done

# Rebuild
log_info "Recompilando aplicação..."
sudo -u "$APP_USER" bash -c "cd ${APP_DIR} && npm run build" 2>&1 | tail -5

if [ $? -ne 0 ]; then
  log_error "Build falhou! Revertendo para versão anterior..."
  sudo -u "$APP_USER" git checkout "$CURRENT_HASH"
  sudo -u "$APP_USER" bash -c "cd ${APP_DIR} && npm run build" 2>&1 | tail -3
  sudo -u "$APP_USER" pm2 restart sisam
  log_error "Rollback concluído. Versão restaurada: ${CURRENT_HASH:0:8}"
  exit 1
fi

# Reiniciar
log_info "Reiniciando aplicação..."
sudo -u "$APP_USER" pm2 restart sisam

echo ""
echo -e "${GREEN}✅ Atualização concluída!${NC}"
echo "   De: ${CURRENT_HASH:0:8} → Para: ${NEW_HASH:0:8}"
echo ""
