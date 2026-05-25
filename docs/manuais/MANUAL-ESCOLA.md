# Manual do Gestor Escolar — SISAM/Educatec

Para o perfil **escola** (diretor, vice-diretor, secretário escolar) — acesso aos dados da sua escola.

---

## 1. Acesso

- Login: e-mail institucional + senha
- 2FA: opcional (recomendado)
- Após login: dashboard com indicadores da sua escola

---

## 2. Dashboard da Escola

URL: `/escola/dashboard`

Mostra:
- Total de alunos por turma/série
- Frequência média atual
- Alunos com baixa frequência (alerta)
- Casos FICAI abertos
- Notas pendentes de lançamento
- Comunicados recentes

---

## 3. Gestão de Alunos

URL: `/escola/alunos`

**Cadastrar novo aluno:**
1. Botão "Novo Aluno"
2. Dados pessoais (nome, CPF, data nasc.)
3. Filiação (pai, mãe)
4. Vincular ao responsável existente OU criar novo
5. Definir turma + série
6. Se PNE: marcar e preencher dados AEE

**Pré-matrícula online:**
- Comunidade pode pré-matricular em `/matricula`
- Você revisa e aprova/recusa

---

## 4. Frequência

### 4.1 Diária
- `/admin/frequencia-diaria` (anos iniciais)
- Marcar P (Presente) ou F (Falta) por aluno por data

### 4.2 Hora-aula (6º-9º anos)
- `/admin/frequencia-hora-aula`
- Por disciplina + hora-aula

### 4.3 Bimestral (resumo)
- Lançar % por bimestre por aluno

### 4.4 Justificativas
- Atestado médico ou outro motivo
- Marcar como justificada não conta como falta

---

## 5. Notas

URL: `/admin/notas-escolares`

- Por bimestre, por disciplina, por turma
- Lançamento individual ou em massa via planilha
- Notas de recuperação separadas
- Boletim final calcula automaticamente

**Para anos iniciais e Ed. Infantil:** usar **Avaliação Descritiva** em vez de nota numérica.

---

## 6. Diário de Classe

URL: `/professor/diario` (compartilhado com professor)

- Conteúdo ministrado por aula
- Atividades realizadas (JSON estruturado)
- Observações individuais por aluno
- Vincular habilidades BNCC trabalhadas
- Status: rascunho → publicado → assinado

---

## 7. Comunicados

URL: `/admin/comunicados`

- Enviar para turma inteira ou aluno específico
- Reunião de pais, eventos, avisos urgentes
- Responsáveis recebem notificação push (se ativaram)

---

## 8. Transferências

URL: `/admin/transferencias`

**Sair da escola:**
1. Selecionar aluno → "Transferir"
2. Escola destino (se conhecida)
3. Motivo
4. Emitir **Guia de Transferência** formal (PDF com código de validação)

**Receber transferência:**
- Importar dados via histórico do aluno
- Confirmar matrícula na escola

---

## 9. AEE (Atendimento Educacional Especializado)

URL: `/admin/aee`

- Cadastrar Sala de Recursos
- Vincular alunos PNE (com laudo médico)
- Criar Plano Educacional Individualizado (PEI) anual
- Registrar atendimentos (sessões)

---

## 10. Conselho de Classe

URL: `/admin/conselho-classe`

- Identificar alunos em risco
- Recomendações para recuperação
- Atas formais

---

## 11. PNAE (Alimentação)

URL: `/admin/pnae`

- Visualizar cardápio publicado pela SEMED
- Registrar refeições servidas diariamente (importante para FNDE!)
- Cadastrar restrições alimentares dos alunos (alergias, dietas)

---

## 12. PDDE (Recursos Financeiros)

URL: `/admin/pdde`

- Registrar verbas recebidas (PDDE Básico, Qualidade, etc.)
- Lançar despesas com fornecedor, nota fiscal, categoria
- Saldo atualizado automaticamente
- Prestação de contas formal: fora do escopo atual (futuro)

---

## 13. PNLD (Livro Didático)

URL: `/admin/pnld`

- Receber livros enviados pelo FNDE → atualizar estoque
- Entregar para alunos → registrar com tombamento
- Devolução: marcar como devolvido / extraviado / danificado
- Estoque atualizado em tempo real

---

## 14. PNATE (Transporte)

URL: `/admin/pnate`

- Visualizar rotas que atendem sua escola
- Lista de alunos que usam transporte
- Veículos com vistoria vencida (alerta)

---

## 15. Bolsa Família

URL: `/admin/bolsa-familia`

- Identificar beneficiários da sua escola
- Verificar frequência (60% ou 75% conforme idade)
- Gerar mapa bimestral para envio Sistema Presença

---

## 16. Patrimônio

URL: `/admin/patrimonio`

- Inventário de bens da escola
- Solicitar transferência ou manutenção
- Etiqueta de tombamento (QR code)

---

## 17. Biblioteca

URL: `/admin/biblioteca`

- Catálogo da biblioteca escolar
- Empréstimo para alunos e servidores
- Devolução, renovação, reservas

---

## 18. Ordens de Serviço (manutenção)

URL: `/admin/ordens-servico`

**Abrir OS para SEMED:**
1. "Nova OS"
2. Tipo (predial, elétrica, TI, etc.)
3. Prioridade (baixa → urgente)
4. Descrição + fotos
5. SEMED recebe e atende

**Acompanhar:**
- Timeline de comentários
- Status (aberta → em_atendimento → concluída)
- Avalie o serviço com 1-5 estrelas

---

## 19. FICAI (Busca Ativa Escolar)

URL: `/admin/ficai`

**Quando aparecer caso:**
1. Ler motivo e dias de falta
2. Contatar responsável imediatamente (telefone/visita)
3. Registrar ação na timeline (tipo + descrição)
4. Atualizar status: `contato_responsavel`
5. Se aluno voltar em 7 dias → `aluno_retornou`
6. Se não voltar → ofício ao Conselho Tutelar → `encaminhado_conselho_tutelar`

**Detalhes legais:** Base ECA Art. 56.

---

## 20. Histórico Escolar e Declarações

URL: `/admin/historico-escolar`

Gerar PDF formal com **código de validação único**:
- Histórico escolar completo
- Declarações (matrícula, frequência, conclusão)

Responsáveis também podem solicitar declarações pelo portal deles.

---

## 21. Em caso de dúvida ou problema

- `/status` — verifica se algo está fora do ar
- Ler `docs/RUNBOOKS.md` para problemas conhecidos
- Contatar suporte SEMED (admin)

---

## Boas práticas

- **Lançar frequência DIARIAMENTE** — FICAI depende disso para detectar evasão
- **Lançar notas ATÉ 7 DIAS** após avaliação — responsáveis acompanham
- **Atualizar status de OS** quando atendida — economiza retrabalho
- **Manter cadastro de alunos atualizado** — endereço, telefone, responsável
- **Treinar sucessor** ao deixar a escola — não perder conhecimento operacional

---

## URLs úteis

| URL | Descrição |
|---|---|
| `/escola/dashboard` | Dashboard da escola |
| `/escola/alunos` | Lista de alunos |
| `/admin/notas-escolares` | Lançamento de notas |
| `/admin/frequencia-diaria` | Frequência diária |
| `/admin/ficai` | FICAI |
| `/admin/pnae` | Alimentação escolar |
| `/admin/ordens-servico` | OS para SEMED |
| `/perfil/seguranca` | Gerenciar seu 2FA |
| `/meus-dados` | LGPD pessoal |
