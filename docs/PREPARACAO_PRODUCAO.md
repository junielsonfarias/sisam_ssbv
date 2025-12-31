# 🚀 Preparação para Produção - SISAM

Guia completo para preparar o sistema SISAM para ambiente de produção.

## ✅ Checklist de Preparação

### 1. Variáveis de Ambiente

- [ ] Arquivo `.env` configurado com valores de produção
- [ ] `JWT_SECRET` é forte e único (mínimo 32 caracteres)
- [ ] `DB_PASSWORD` é forte
- [ ] `NODE_ENV=production`
- [ ] Arquivo `.env` não está no repositório

### 2. Banco de Dados

- [ ] PostgreSQL instalado e rodando
- [ ] Banco de dados `sisam` criado
- [ ] Schema executado (`database/schema.sql`)
- [ ] Usuário administrador criado
- [ ] Backup configurado
- [ ] Migrations executadas

### 3. Segurança

- [ ] Senha do administrador alterada
- [ ] HTTPS configurado (certificado SSL)
- [ ] Firewall configurado
- [ ] Logs de erro configurados
- [ ] Rate limiting configurado (opcional)

### 4. Performance

- [ ] Build de produção testado (`npm run build`)
- [ ] Cache configurado (se necessário)
- [ ] CDN configurado (opcional)
- [ ] Monitoramento configurado

### 5. Documentação

- [ ] README atualizado
- [ ] Documentação de deploy criada
- [ ] Credenciais documentadas (em local seguro)

## 🔧 Passos Detalhados

### Passo 1: Verificar Pronto para Produção

```bash
npm run verificar-producao
```

Este script verifica automaticamente:
- Variáveis de ambiente
- Conexão com banco
- Tabelas existentes
- Usuário administrador

### Passo 2: Gerar JWT_SECRET Seguro

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e adicione ao `.env`:
```env
JWT_SECRET=resultado_gerado_aqui
```

### Passo 3: Configurar Banco de Dados

```bash
# Criar usuário específico para produção
sudo -u postgres psql
CREATE USER sisam_prod WITH PASSWORD 'senha_forte_aqui';
GRANT ALL PRIVILEGES ON DATABASE sisam TO sisam_prod;
\q
```

### Passo 4: Build de Produção

```bash
npm run build
npm run start  # Testar localmente
```

### Passo 5: Configurar Backup Automático

Configure um cron job ou agendador de tarefas para backups regulares:

```bash
# Exemplo de cron (diariamente às 2h)
0 2 * * * /caminho/para/projeto/npm run backup
```

## 🔐 Segurança Adicional

### Headers de Segurança

Configure headers HTTP de segurança no servidor web (Nginx/Apache):

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Rate Limiting

Considere implementar rate limiting para APIs:
- Login: máximo 5 tentativas por minuto
- Importação: máximo 1 por hora por usuário

## 📊 Monitoramento

### Logs

Configure logs estruturados:
- Erros de aplicação
- Acessos
- Operações críticas

### Métricas

Monitore:
- Uso de CPU e memória
- Tempo de resposta
- Taxa de erro
- Uso do banco de dados

## 🔄 Atualizações

### Processo de Atualização

1. Fazer backup do banco
2. Testar em ambiente de staging
3. Fazer deploy em horário de baixo tráfego
4. Monitorar logs após deploy
5. Ter plano de rollback pronto

## 🆘 Plano de Contingência

### Backup e Restore

```bash
# Backup
npm run backup

# Restore
npm run restore backup-file.dump
```

### Rollback

1. Reverter código para versão anterior
2. Restaurar backup do banco (se necessário)
3. Reiniciar aplicação

## 📞 Suporte

Para problemas em produção:
1. Verificar logs
2. Verificar status do banco
3. Verificar variáveis de ambiente
4. Contatar equipe de desenvolvimento
