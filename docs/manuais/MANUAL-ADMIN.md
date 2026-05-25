# Manual do Administrador — SISAM/Educatec

Este manual cobre as principais tarefas do perfil **administrador** ou **técnico** (acesso total ao sistema).

---

## 1. Primeiro acesso

1. Receba o link `https://educatec.seu-municipio.gov.br/login`
2. Use seu e-mail institucional e senha temporária
3. **Você será obrigado a configurar 2FA** (Google Authenticator ou Authy):
   - Escaneie o QR code
   - Guarde os **10 códigos de backup** em local seguro
   - Confirme com o código de 6 dígitos
4. Acesso liberado ao painel principal

---

## 2. Painel Estratégico (Dashboard SEMED)

URL: `/admin/dashboard-semed`

**O que mostra:**
- Total de alunos, escolas, professores, servidores
- Alunos PNE (AEE) e Bolsa Família
- Frequência média e infrequentes
- Casos FICAI abertos
- Taxa de aprovação/reprovação
- IDEB projetado (estimativa interna)
- Programas: refeições PNAE, alunos PNATE, PDDE executado
- Ordens de Serviço abertas e urgentes
- Comparativo entre escolas (frequência, média, PNE, alertas FICAI)

**Quando usar:** reuniões semanais com Secretário(a), prestação de contas, identificação de escolas em risco.

---

## 3. Gestão de Escolas e Polos

### 3.1 Cadastrar nova escola
1. `/admin/escolas` → "Nova Escola"
2. Preencha: código INEP, nome, polo, endereço, gestor
3. Defina modalidades atendidas (regular, EJA, Ed. Infantil)

### 3.2 Cadastrar polo
1. `/admin/polos` → "Novo Polo"
2. Coordenador, escolas vinculadas

---

## 4. Gestão de Usuários

### 4.1 Cadastrar professor
1. `/admin/usuarios` → "Novo Usuário"
2. Tipo: `professor`, vincular à(s) escola(s)
3. **Senha** deve ter ≥ 12 caracteres com maiúscula, número, símbolo
4. Professor terá que ativar 2FA opcionalmente

### 4.2 Resetar senha de usuário
1. Localize o usuário em `/admin/usuarios`
2. "Editar" → "Resetar senha" → nova senha temporária

### 4.3 Resetar 2FA de usuário (se perder acesso ao app autenticador)
Como admin, no SQL:
```sql
DELETE FROM usuarios_2fa WHERE usuario_id = '<uuid>';
```
Próximo login do usuário pedirá reconfiguração.

### 4.4 Desabilitar usuário (saída ou afastamento)
1. `/admin/usuarios` → marca como inativo
2. Login bloqueado mas histórico preservado

---

## 5. FICAI — Busca Ativa Escolar

URL: `/admin/ficai` *(quando UI for construída)*

**Workflow:**
1. Sistema detecta automaticamente alunos com infrequência (cron diário)
2. Casos abertos aparecem com status `aberto`
3. Escola contata responsável → registra ação → atualiza status para `contato_responsavel`
4. Se aluno não retornar em 7 dias → status `encaminhado_conselho_tutelar`
5. Se Conselho Tutelar não resolver → `encaminhado_ministerio_publico`
6. Aluno retornou? → status `aluno_retornou` ou `concluido_resolvido`

**Detecção manual:**
```bash
POST /api/admin/ficai/detectar
Body: { "anoLetivo": "2026" }
```

Detalhes em `docs/OPERACAO-FICAI.md`.

---

## 6. Programas Federais

### PNAE (Alimentação)
- `/admin/pnae` — cadastrar cardápios, nutricionistas, restrições alimentares
- Registro diário de refeições servidas (para prestação FNDE)

### PNATE (Transporte)
- `/admin/pnate` — veículos (com vistoria), motoristas (CNH), rotas, paradas
- Alertas automáticos quando CNH/vistoria vencem em < 60 dias

### PNLD (Livro Didático)
- `/admin/pnld` — catálogo de títulos do PNLD, estoque por escola, distribuição

### PDDE (Recursos Financeiros)
- `/admin/pdde` — orçamentos recebidos por verba, despesas
- Saldo automático calculado em tempo real

### Bolsa Família
- `/admin/bolsa-familia` — marcador beneficiário em alunos
- Gerar mapas bimestrais → exportar CSV no padrão Sistema Presença MEC

---

## 7. RH Escolar

URL: `/admin/rh`

- **Servidores**: CPF, matrícula, vínculo (concursado/contrato/RPA/terceirizado)
- **Lotações**: vínculo escola + função + carga horária + vigência
- **Formações**: cursos, certificados, modalidade

> Não há ponto eletrônico nem folha de pagamento — adiados.

---

## 8. Patrimônio

URL: `/admin/patrimonio`

- Tombamento, descrição, categoria, valor, escola
- Movimentações: transferência entre escolas, manutenção, baixa
- Inventário por escola

---

## 9. Biblioteca

URL: `/admin/biblioteca`

- Acervo por escola
- Empréstimos (aluno ou servidor) com prazo de 14 dias
- Renovação +7 dias (máx 2 renovações)
- Reservas quando indisponível
- Status: emprestado / devolvido / atrasado / extraviado / danificado

---

## 10. Ordens de Serviço (Manutenção SEMED)

URL: `/admin/ordens-servico`

**Fluxo:**
1. Escola abre OS (manutenção predial, TI, mobiliário, etc.)
2. SEMED recebe → atualiza status para `em_analise` → `aprovada` → `em_atendimento`
3. SEMED conclui → escola avalia com 1-5 estrelas

**Priorização:** filtrar por `urgente` para atender primeiro.

---

## 11. Censo Escolar (Educacenso)

URL: `/admin/censo-escolar`

3 exportações CSV simplificadas:
- **Alunos** (matrículas + AEE)
- **Docentes** (vinculações)
- **Turmas** (composição)

**Importante:** CSV é para conferência manual. Para envio oficial INEP, use o portal Educacenso e ajuste campos conforme layout vigente.

---

## 12. Documentos Formais

Gerados pelo admin com **código de validação único** (verificável em `/validar/<codigo>`):

- **Histórico Escolar** — `POST /api/admin/documentos/historico`
- **Guia de Transferência** — `POST /api/admin/documentos/transferencia`
- **Declarações** (matrícula, frequência, conclusão)

Snapshot completo é preservado (anti-adulteração via hash SHA-256).

---

## 13. LGPD (Solicitações de Titulares)

URL: `/admin/lgpd/solicitacoes` *(quando UI for construída)*

3 tipos de solicitações que titulares podem fazer:
1. **Exportar dados** — gera JSON imediato
2. **Portabilidade** — formato interoperável
3. **Exclusão** — agendada com 15 dias de carência

---

## 14. Backup do Banco

Manual: `npm run backup`
Restore: `npm run restore -- <arquivo>`

Configurar cron diário (ver `scripts/backup/README.md`).

---

## 15. Monitoramento (Status Page)

URL pública: `/status` — qualquer pessoa verifica estado dos serviços.

Como admin, você pode registrar **incidentes manuais** ou **manutenções planejadas** via SQL ou painel.

---

## 16. Em caso de problema

1. Verifique `/status`
2. Consulte `docs/RUNBOOKS.md` para problemas comuns
3. Se tudo OK mas usuário relata erro: peça print + URL + horário
4. Acesse logs no Sentry (filtro por endpoint + timestamp)
5. Escalada: ver final do `RUNBOOKS.md`

---

## 17. Segurança e responsabilidades

Como administrador:
- Você tem **acesso total**. Use com responsabilidade.
- **NUNCA** compartilhe sua senha ou códigos 2FA
- Em caso de suspeita de invasão: trocar senha + revogar tokens
- Logs de auditoria registram suas ações (`logs_auditoria`)
- LGPD: trate dados pessoais conforme a Política de Privacidade

---

## Atalhos úteis

| URL | Para que serve |
|---|---|
| `/admin/dashboard` | Visão geral |
| `/admin/dashboard-semed` | KPIs estratégicos |
| `/admin/alunos` | CRUD alunos |
| `/admin/escolas` | CRUD escolas |
| `/admin/usuarios` | CRUD usuários |
| `/admin/bncc` | Consulta BNCC |
| `/admin/ficai` | Busca Ativa |
| `/admin/aee` | AEE/PNE |
| `/perfil/seguranca` | Gerenciar seu 2FA |
| `/meus-dados` | LGPD pessoal |
| `/status` | Status público |
| `/dados-abertos` | Portal cidadão |
