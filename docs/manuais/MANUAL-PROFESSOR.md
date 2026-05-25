# Manual do Professor — SISAM/Educatec

Para o perfil **professor** — acesso ao seu portal pedagógico (PWA mobile + desktop).

---

## 1. Acesso

- Login no `/login` com e-mail institucional
- 2FA opcional (recomendado)
- Você verá o portal do professor com suas turmas

---

## 2. Dashboard

URL: `/professor/dashboard`

Mostra:
- Suas turmas e disciplinas atribuídas
- Avisos da escola
- Alunos em risco (notas baixas + faltas)
- Atalhos rápidos

---

## 3. Minhas Turmas

URL: `/professor/turmas`

Lista de turmas onde você leciona, com:
- Quantidade de alunos
- Disciplina(s)
- Horário semanal

Clique em uma turma para ver os alunos.

---

## 4. Frequência (Chamada)

### 4.1 Diária (anos iniciais)
URL: `/professor/frequencia-diaria`
1. Selecionar turma + data
2. Marcar P (Presente) ou F (Falta) para cada aluno
3. **Salvar** ao final
4. Pode editar até o final do dia

### 4.2 Por hora-aula (6º ao 9º)
URL: `/professor/frequencia-hora-aula`
1. Selecionar turma + disciplina + data + hora-aula
2. Marcar presença
3. Salvar

> **Importante:** lance a chamada DIARIAMENTE. O sistema FICAI usa esses dados para detectar evasão.

---

## 5. Notas

URL: `/professor/notas`

**Lançar nota:**
1. Turma + disciplina + bimestre
2. Tabela com todos alunos — digitar nota (0-10)
3. Salvar — pais recebem notificação automática (se habilitado)

**Para anos iniciais e Ed. Infantil:** use **Avaliação Descritiva**:
1. `/professor/avaliacoes-descritivas`
2. Por aluno, escrever texto descritivo + conceito (Plenamente Satisfatório / Satisfatório / Em Desenvolvimento / Insuficiente)
3. Vincular habilidades BNCC avaliadas

---

## 6. Diário de Classe

URL: `/professor/diario`

**Por dia/turma/disciplina, registrar:**
- **Conteúdo ministrado** (obrigatório)
- **Metodologia** usada
- **Recursos didáticos**
- **Atividades** (lista estruturada)
- **Observações gerais** da aula
- **Observações individuais** por aluno (opcional)
- **Habilidades BNCC** trabalhadas (vincular)

**Status:**
- `rascunho` — você pode editar
- `publicado` — visível para gestão escolar
- `assinado` — bloqueado, imutável (assinatura formal)

---

## 7. Planos de Aula

URL: `/professor/planos`

- Criar planos por turma + disciplina + período
- Objetivos, metodologia, recursos
- Vincular habilidades BNCC
- Compartilhar com coordenação

---

## 8. Tarefas para a turma

URL: `/professor/tarefas`

- Criar tarefas com prazo
- Descrição + arquivos anexos
- Visível para alunos/responsáveis no portal deles
- Marcar entregas recebidas

---

## 9. Comunicados

URL: `/professor/comunicados`

- Avisar a turma sobre atividades, eventos
- Responsáveis recebem notificação
- Cópia para coordenação

---

## 10. Mensagens (chat com responsáveis)

URL: `/professor/mensagens`

- Conversa 1-a-1 com responsável de cada aluno
- Útil para questões individuais (comportamento, dificuldade)
- Histórico preservado para auditoria

---

## 11. QR Code de presença (para alunos)

URL: `/professor/qr-presenca`

- Gera QR efêmero
- Aluno escaneia com celular → presença marcada automaticamente
- Útil para turmas grandes

---

## 12. Consulta BNCC

URL: `/admin/bncc`

- Buscar habilidades por etapa, ano, componente
- Busca full-text em português
- Vincular ao planejar aulas e atividades

---

## 13. Relatórios da minha turma

URL: `/professor/relatorio`

- Mapa de notas
- Mapa de frequência
- Alunos abaixo da média
- Conselho de classe

---

## 14. Educação Infantil (se você leciona)

URL: `/professor/ed-infantil/portfolio`

**Portfólio do aluno:**
- Foto, vídeo, áudio, atividade ou observação
- Vincular ao campo de experiência BNCC (Eu/Outro/Nós, Corpo, Traços, Escuta, Espaços)
- Marcar visibilidade para responsável

**Relatórios pedagógicos** (semestrais):
- `/professor/ed-infantil/relatorio`
- Texto por campo BNCC
- Status: rascunho → publicado → entregue

---

## 15. AEE (se você é professor AEE)

URL: `/admin/aee`

- Plano Educacional Individualizado (PEI) por aluno PNE
- Registrar atendimentos (sessões)
- Atualizar progresso

---

## 16. Em caso de problema

- `/status` — verifica se sistema está OK
- Falar com gestor escolar / SEMED
- Bug? Reporte ao administrador com print + URL

---

## Boas práticas pedagógicas no sistema

✅ **Lance chamada DIARIAMENTE** — base do FICAI
✅ **Lance notas até 1 semana após avaliação** — pais acompanham
✅ **Registre o diário regularmente** — base para acompanhamento pedagógico
✅ **Vincule habilidades BNCC** — ajuda na progressão curricular
✅ **Use observações individuais com cuidado** — texto será visto pela gestão
✅ **Para Ed. Infantil: foque em portfólio** mais que avaliação numérica
✅ **Comunicados: claros e objetivos** — pais recebem notificação push

---

## URLs essenciais

| URL | Para que |
|---|---|
| `/professor/dashboard` | Início |
| `/professor/turmas` | Suas turmas |
| `/professor/frequencia-diaria` | Chamada |
| `/professor/notas` | Lançar notas |
| `/professor/diario` | Diário de classe |
| `/professor/planos` | Planos de aula |
| `/professor/comunicados` | Avisar turma |
| `/admin/bncc` | Consulta BNCC |
| `/perfil/seguranca` | Gerenciar 2FA |
