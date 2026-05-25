# Runbooks Operacionais — SISAM/Educatec

Playbooks para incidentes comuns. Use a Status Page (`/status`) primeiro
para entender o que está degradado antes de aplicar runbooks específicos.

---

## 1. Login não funciona / "Erro de conexão"

**Sintomas:** usuários relatam não conseguir entrar, ou erro 500 ao fazer login.

**Diagnóstico:**
1. Acesse `/status` — verifica se Banco e Auth estão verdes
2. Acesse `/api/health` — retorna métricas básicas
3. Veja logs no Sentry (filtro: route=`/api/auth/login`, env=production)

**Soluções por causa:**

| Causa provável | Solução |
|---|---|
| Pool de conexões esgotado | Reduzir tráfego ou aumentar pool no `database/connection.ts` |
| Banco lento (> 1s) | Ver índices em uso (`pg_stat_user_indexes`) |
| JWT_SECRET ausente | Conferir env var no Vercel — bloqueia em prod se faltar |
| Rate limit excessivo | Verificar `lib/rate-limiter*.ts` (5/15min é o padrão) |
| Redis Upstash indisponível | App degrada para rate-limit em memória (não fatal) |

**Comando para verificar pool em tempo real:**
```sql
SELECT * FROM pg_stat_activity WHERE datname = current_database();
```

---

## 2. Importação de resultados travada / timeout

**Sintomas:** progresso de importação parou, importação ficou em status `processando`.

**Diagnóstico:**
1. `SELECT * FROM importacoes WHERE status = 'processando' ORDER BY criado_em DESC;`
2. Comparar `criado_em` com hora atual — se > 5min, está pendurada

**Soluções:**

```sql
-- Cancelar importação travada
UPDATE importacoes
   SET status = 'erro', mensagem_erro = 'Timeout - cancelada manualmente'
 WHERE id = '<uuid>';

-- Limpar processamento parcial (se necessário)
DELETE FROM resultados_consolidados WHERE importacao_id = '<uuid>';
```

**Prevenção:**
- Importações > 10MB devem ser quebradas em arquivos menores
- Vercel limit é 300s — mover para fila assíncrona se passar (TODO Fase 5+)

---

## 3. FICAI não detecta novos casos

**Sintomas:** Sabe-se que há alunos com infrequência alta, mas FICAI não abre caso.

**Diagnóstico:**
1. Verificar se cron está rodando: ver logs do endpoint `/api/admin/ficai/detectar`
2. Rodar manualmente:
   ```bash
   curl -X POST https://seu-dominio/api/admin/ficai/detectar-cron \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

**Causas possíveis:**

| Causa | Como diagnosticar | Solução |
|---|---|---|
| Cron não configurado | Sem agendamento ativo | Ver `docs/OPERACAO-FICAI.md` para configurar |
| Falta dados em `frequencia_diaria` | `SELECT COUNT(*) FROM frequencia_diaria WHERE data > NOW() - INTERVAL '30 days'` | Garantir que escolas estão lançando frequência |
| Aluno já tem caso aberto | `SELECT * FROM ficai_casos WHERE aluno_id=...` | Esperado — só 1 caso por aluno/ano |
| Critério não atingido | Verificar nos services (5 dias consecutivos OU 50% mensal) | Ajustar limites em `lib/services/ficai.service.ts` |

---

## 4. E-mails não enviam (recuperação senha / 2FA / notificações)

**Sintomas:** usuário não recebe e-mail de recuperação ou códigos.

**Diagnóstico:**
1. Acesse `/status` — verifica Resend
2. Confira logs no Resend Dashboard
3. Confira `RESEND_API_KEY` no Vercel

**Soluções:**

| Causa | Solução |
|---|---|
| `RESEND_API_KEY` ausente | Sistema entra em modo dry-run (loga e não envia). Configurar no Vercel |
| Domínio não verificado no Resend | Verificar DNS (SPF, DKIM) no provider |
| Quota Resend esgotada (3k/mês free) | Upgrade ou trocar provider |
| E-mail caindo em spam | Configurar SPF/DKIM + reputação do domínio |
| Usuário digitou e-mail errado | Pedir reconfirmação |

**Modo manual de envio (admin):**
- Recuperar senha: admin cria novo usuário ou reseta senha pelo painel `/admin/usuarios`
- 2FA: admin pode resetar 2FA do usuário via:
  ```sql
  DELETE FROM usuarios_2fa WHERE usuario_id = '<uuid>';
  ```
  Usuário será forçado a reconfigurar no próximo login.

---

## 5. Reconhecimento facial não funciona no terminal

**Sintomas:** terminal facial não reconhece alunos, mesmo com cadastro.

**Diagnóstico:**
1. Abrir DevTools → Network → ver se `/models/face-api/*` carregam
2. Verificar permissão de câmera no browser
3. Ver `consentimentos_faciais` para o aluno

**Causas:**

| Causa | Solução |
|---|---|
| Modelos face-api não cacheados | Limpar service worker e recarregar página |
| Sem consentimento LGPD | Coletar consentimento via fluxo /admin/dispositivos-faciais |
| Iluminação ruim | Treinar operadores sobre condições ideais |
| Embeddings desatualizados (foto antiga) | Recadastrar com foto recente |
| Threshold muito alto | Ajustar `FACE_DISTANCE_THRESHOLD` (default 0.6) |

---

## 6. Página `/dados-abertos` não carrega

**Sintomas:** página em branco ou erro ao acessar Portal de Transparência.

**Diagnóstico:**
1. `/api/publico/transparencia?recurso=resumo` → deve retornar JSON
2. Status do banco em `/status`
3. Logs Sentry filtrados por endpoint

**Causa comum:** queries pesadas timing out. Solução:
```sql
-- Criar índices se necessário
CREATE INDEX IF NOT EXISTS idx_freq_diaria_data ON frequencia_diaria(data);
CREATE INDEX IF NOT EXISTS idx_notas_ano ON notas_escolares(ano_letivo);
```

---

## 7. Backup falhou

**Sintomas:** cron de backup não executou ou arquivo está corrompido.

**Diagnóstico:**
1. Ver log do cron job (varia por plataforma)
2. Testar manualmente: `npm run backup`

**Validação de backup:**
```bash
# Verificar magic header (deve começar com "PGDMP")
hexdump -C backups/sisam-2026-05-25.dump | head -1

# Tentar restore em banco de teste
DB_NAME=teste_restore npm run restore -- backups/sisam-2026-05-25.dump
```

**Restore em emergência:**
```bash
# Pré-requisitos: pg_restore instalado, DB_* configuradas
node scripts/backup/restore.js ./backups/<arquivo>.dump
# Confirma com "sim" quando pedido
```

---

## 8. Dashboard SEMED demora muito ou não atualiza

**Sintomas:** `/admin/dashboard-semed` demora > 10s ou mostra dados antigos.

**Diagnóstico:**
1. Hard refresh (Ctrl+Shift+R) — pode ser cache do browser
2. Ver no Sentry latência da rota `/api/admin/kpis-semed`
3. Banco lento? `EXPLAIN ANALYZE` nas queries do `kpis-semed.service.ts`

**Otimização recomendada:** criar materialized view para KPIs agregados
(executar refresh a cada hora via cron). Fase 5+.

---

## 9. CI quebrou — type-check / build / testes

**Cenários comuns:**

| Falha | Causa típica | Solução |
|---|---|---|
| `tsc --noEmit` falha | Erro de tipos | Rodar local `npx tsc --noEmit` e corrigir |
| Build falha (`next build`) | Variável de ambiente faltando ou erro de runtime | Conferir `next.config.js` e env vars do CI |
| Vitest falha | Teste novo, mock errado, ou regressão real | Rodar local `npm run test` filtrando arquivo |
| Lighthouse < budget | Performance regressão (imagem pesada, JS bundle grande) | Analisar `next build` output, otimizar |
| `npm audit` aponta vulnerabilidade | Dependência com CVE | `npm audit fix` ou atualizar manualmente |

---

## 10. Disaster Recovery (perda total)

**Cenário:** banco corrompido / projeto Supabase indisponível.

**Procedimento:**

1. **Avaliar o dano:**
   - Banco perdido? Aplicação funciona? Apenas dados perdidos?
2. **Backup mais recente disponível?**
   - Backups Supabase Pro (se contratado) — restaurar via painel
   - Backups locais (cron) — restaurar via `npm run restore`
3. **Criar novo projeto Supabase** (se necessário):
   - Aplicar todas as 138 migrations em ordem
   - Restore do dump mais recente
4. **Atualizar env vars** no Vercel com novo `DB_HOST` etc.
5. **Comunicar usuários** via:
   - Banner no site
   - Página `/status` com incidente
   - E-mail (via lista do RH)
6. **Pós-mortem:** registrar causa, decisões, melhorias preventivas

**Meta:** RTO (Recovery Time Objective) = 4h | RPO (Recovery Point Objective) = 24h

---

## 11. Modo Manutenção planejada

Para janelas planejadas:

1. Criar incidente:
   ```sql
   INSERT INTO status_incidentes (tipo, severidade, titulo, descricao, servicos_afetados, status)
   VALUES ('manutencao_planejada', 'baixa', 'Manutenção noturna 02:00-04:00',
           'Atualização do banco. Sistema indisponível.',
           ARRAY['banco', 'api'], 'monitorando');
   ```
2. Avisar usuários com 24h+ antecedência via comunicado
3. Bloquear novas requisições (flag em `lib/cache/session.ts` ou middleware)
4. Executar manutenção
5. Atualizar incidente para `resolvido`:
   ```sql
   UPDATE status_incidentes SET status = 'resolvido', resolucao_em = NOW() WHERE id = ...;
   INSERT INTO status_atualizacoes (incidente_id, status, mensagem)
   VALUES ('<id>', 'resolvido', 'Manutenção concluída sem problemas.');
   ```

---

## Contatos de escalada

| Tipo | Quem | Como |
|---|---|---|
| Sistema fora do ar | DPO + Secretário(a) Educação | Telefone/WhatsApp |
| Vazamento de dados (LGPD) | DPO + Procurador Municipal | Imediato — protocolo ANPD |
| Incidente Conselho Tutelar | Coordenação SEMED | Conforme fluxo FICAI |
| Falha de pagamento (PDDE) | Setor financeiro SEMED | Protocolo formal |

Documentar contatos reais quando definidos com a SEMED.
