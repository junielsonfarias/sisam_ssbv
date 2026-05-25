# Backup e Restore — SISAM/Educatec

Scripts para fazer backup e restaurar o banco PostgreSQL/Supabase.

---

## Scripts disponíveis

| Script | Plataforma | Uso |
|---|---|---|
| `backup.js` | **Todas** (recomendado) | `npm run backup` ou `node scripts/backup/backup.js` |
| `restore.js` | **Todas** (recomendado) | `node scripts/backup/restore.js ./backups/arquivo.dump` |
| `backup-database.sh` | Linux/macOS (legado) | `npm run backup` (chama o .sh em sistemas com bash) |
| `restore-database.sh` | Linux/macOS (legado) | `npm run restore` |

> Os scripts `.js` substituem os `.sh` com mais robustez. Os `.sh` foram mantidos para compatibilidade com scripts/CI existentes.

---

## Pré-requisitos

1. **PostgreSQL client tools** instalado (fornece `pg_dump` e `pg_restore`):
   - **Windows:** baixe em https://www.postgresql.org/download/windows/ e marque "Command Line Tools" no instalador
   - **Linux:** `sudo apt install postgresql-client` (Debian/Ubuntu) ou `sudo dnf install postgresql` (Fedora)
   - **macOS:** `brew install libpq && brew link --force libpq`

2. **Variáveis de ambiente** configuradas em `.env.local`:
   ```
   DB_HOST=...
   DB_PORT=6543
   DB_NAME=postgres
   DB_USER=...
   DB_PASSWORD=...
   DB_SSL=true
   ```

---

## Uso básico

### Fazer um backup

```bash
npm run backup
# ou
node scripts/backup/backup.js
```

Saída esperada:

```
[2026-05-25T18:00:00.000Z] INFO  Iniciando backup {"db":"postgres","host":"...","port":"6543","dest":"..."}
[2026-05-25T18:00:42.000Z] INFO  Backup concluído {"duracaoSegundos":"42.1","tamanhoMB":"15.34"}
[2026-05-25T18:00:42.100Z] INFO  Rotação concluída {"removidos":2,"preservados":28,"retencaoDias":30}
```

O arquivo é salvo em `./backups/sisam-YYYY-MM-DDTHH-MM-SS.dump` (formato custom pg_dump, compactado).

### Restaurar de um backup

```bash
node scripts/backup/restore.js ./backups/sisam-2026-05-25T18-00-00.dump
```

O script pede confirmação interativa antes de executar. Para automação (cron), defina `RESTORE_NO_CONFIRM=true`.

> **Atenção:** o restore usa `--clean --if-exists`, que DROPA o conteúdo existente do banco antes de aplicar. Não rode em produção sem ter certeza absoluta.

---

## Customização

| Variável | Padrão | Descrição |
|---|---|---|
| `BACKUP_DIR` | `./backups` | Onde salvar os arquivos |
| `BACKUP_RETENTION_DAYS` | `30` | Quantos dias manter (arquivos mais antigos são deletados após o backup) |
| `RESTORE_NO_CONFIRM` | `false` | Pular confirmação interativa do restore |

Exemplos:

```bash
BACKUP_DIR=/mnt/nas/backups node scripts/backup/backup.js
BACKUP_RETENTION_DAYS=7 node scripts/backup/backup.js
```

---

## Agendamento automatizado

### Linux/macOS — cron

Edite o crontab com `crontab -e` e adicione:

```cron
# Backup diário às 2h da manhã, log em /var/log/sisam-backup.log
0 2 * * * cd /caminho/do/projeto && node scripts/backup/backup.js >> /var/log/sisam-backup.log 2>&1
```

### Windows — Task Scheduler

1. Abra "Agendador de Tarefas" (Task Scheduler)
2. "Criar Tarefa Básica"
3. Acionador: diariamente, 02:00
4. Ação: "Iniciar um programa"
   - **Programa/script:** `node`
   - **Argumentos:** `scripts\backup\backup.js`
   - **Iniciar em:** `C:\caminho\completo\do\projeto`
5. Marcar "Executar com privilégios mais altos" se necessário

### CI/CD — GitHub Actions

Exemplo de workflow em `.github/workflows/backup.yml`:

```yaml
name: Backup do banco
on:
  schedule:
    - cron: '0 5 * * *' # 5h UTC = 2h Brasília
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: sudo apt-get install -y postgresql-client
      - run: npm ci
      - run: node scripts/backup/backup.js
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_PORT: ${{ secrets.DB_PORT }}
          DB_NAME: ${{ secrets.DB_NAME }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          DB_SSL: 'true'
      - uses: actions/upload-artifact@v4
        with:
          name: backup-${{ github.run_id }}
          path: backups/*.dump
          retention-days: 30
```

---

## Validação pós-backup

O script `backup.js` faz duas validações automáticas:

1. **Tamanho mínimo:** rejeita arquivos < 1 KB (sinal de falha silenciosa)
2. **Magic header:** confere se os 5 primeiros bytes são `PGDMP` (assinatura do formato custom pg_dump)

Para validação completa periódica (teste de restore em ambiente isolado), recomenda-se um job mensal:

```bash
# Em ambiente de teste isolado:
DB_NAME=sisam_teste_restore node scripts/backup/restore.js ./backups/<mais-recente>.dump
```

---

## Recuperação em incidente

1. **Identifique o backup correto:** procure em `./backups/` o arquivo mais próximo da data desejada
2. **Pare a aplicação** (se estiver rodando)
3. **Restore** com `node scripts/backup/restore.js <arquivo>`
4. **Verifique integridade:** consulte tabelas críticas (`SELECT COUNT(*) FROM usuarios`, etc.)
5. **Religue a aplicação**
6. **Documente o incidente** (data, causa, backup usado, tempo total) para o time

---

## Observações importantes

- O Supabase Pro oferece backup automatizado nativo com retenção de 7 dias e PITR. Este script é útil mesmo nesse caso, como camada adicional ou para download local.
- O formato `custom` (`-F c`) suporta restore parcial (apenas uma tabela ou schema) com `pg_restore --table=...`.
- Para backups muito grandes, considere usar `-j` (jobs paralelos) no backup também (atualmente apenas no restore).
- **Nunca commite o diretório `./backups/`** — ele já está no `.gitignore`.
