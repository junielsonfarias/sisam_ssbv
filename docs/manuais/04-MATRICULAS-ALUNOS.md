# Manual 04 — Matriculas e Cadastro de Alunos

**Publico-alvo:** Administrador, Tecnico, Escola

---

## Visao Geral

O modulo de matriculas permite cadastrar novos alunos e vincula-los a turmas. O processo e feito atraves de um **assistente em 4 etapas** que guia o usuario desde a selecao da escola ate a confirmacao da matricula.

**Caminho no menu:** Gestor Escolar > Matriculas e Vagas > **Matriculas**

**URL:** `/admin/matriculas`

---

## 1. Iniciando o Processo de Matricula

1. No menu lateral, clique em **"Matriculas e Vagas"** > **"Matriculas"**
2. A pagina exibira o titulo **"Matriculas 2026"** (ou ano letivo vigente)
3. O campo **"Ano"** no topo permite alterar o ano letivo se necessario

<!-- SCREENSHOT: Pagina inicial de matriculas -->

O assistente possui **4 etapas** indicadas no topo da pagina:

```
[1. Escola] → [2. Serie] → [3. Turma] → [4. Alunos]
```

---

## 2. Etapa 1 — Selecionar Escola

1. Uma lista de escolas sera exibida
2. Clique na escola desejada para seleciona-la
3. A escola selecionada ficara destacada

<!-- SCREENSHOT: Selecao de escola -->

> **Usuarios tipo Escola:** Sua escola ja vira pre-selecionada automaticamente.

---

## 3. Etapa 2 — Selecionar Serie

1. Apos selecionar a escola, as **series disponiveis** serao exibidas
2. Clique na serie desejada (ex: "5o Ano", "1o Ano", etc.)

<!-- SCREENSHOT: Selecao de serie -->

As series disponiveis dependem das turmas ja cadastradas na escola selecionada.

---

## 4. Etapa 3 — Selecionar Turma

1. As turmas da serie selecionada serao exibidas
2. Cada turma mostra:
   - Nome e codigo
   - Turno (Matutino/Vespertino/Noturno)
   - **Capacidade** e **matriculados atuais** (ex: 18/30)
3. Clique na turma desejada

<!-- SCREENSHOT: Selecao de turma -->

> **Dica:** Turmas com vagas disponiveis serao destacadas. Turmas lotadas aparecerão com indicador vermelho.

---

## 5. Etapa 4 — Adicionar Alunos

Esta e a etapa principal. Voce pode **buscar alunos existentes** no sistema ou **cadastrar novos alunos**.

<!-- SCREENSHOT: Tela de adicao de alunos -->

### Opcao A: Buscar Aluno Existente

1. No campo de busca, digite o **nome**, **codigo** ou **CPF** do aluno
2. Os resultados aparecerao abaixo
3. Clique no botao **"Adicionar"** ao lado do aluno desejado
4. O aluno sera adicionado a lista de matricula

> Alunos que ja estao matriculados em outra turma do mesmo ano letivo serao sinalizados.

### Opcao B: Cadastrar Novo Aluno

1. Clique no botao **"Novo Aluno"** ou **"Adicionar manualmente"**
2. Preencha os campos:

| Campo | Obrigatorio | Descricao |
|-------|:-----------:|-----------|
| **Nome completo** | Sim | Nome completo do aluno |
| **CPF** | Nao | CPF do aluno (se disponivel) |
| **Data de Nascimento** | Nao | Formato: DD/MM/AAAA |
| **PCD** | Nao | Marque se o aluno e Pessoa com Deficiencia |
| **Serie Individual** | Apenas multisserie | Serie do aluno (se turma multisserie) |

3. Clique em **"Adicionar"**

### Lista de alunos para matricula

Conforme voce adiciona alunos, eles aparecem em uma lista na parte inferior:

```
Nome                    | CPF            | Nascimento | PCD | Acao
Maria Silva Santos      | 123.456.789-00 | 15/03/2015 |     | [Remover]
Joao Pedro Oliveira     |                | 22/07/2016 | Sim | [Remover]
Ana Beatriz Costa       | 987.654.321-00 |            |     | [Remover]
```

- Para remover um aluno da lista, clique em **"Remover"**
- Voce pode adicionar **varios alunos** de uma vez antes de confirmar

---

## 6. Confirmando a Matricula

1. Revise a lista de alunos
2. Verifique se a **escola**, **serie** e **turma** estao corretas (exibidas no topo)
3. Clique em **"Matricular Alunos"**

<!-- SCREENSHOT: Tela de confirmacao -->

### Resultado:
Apos a confirmacao, o sistema exibira um resumo:

```
Matricula realizada com sucesso!

Escola: EMEF Nossa Senhora de Lourdes
Turma: 5o Ano A — Matutino
Alunos matriculados: 3
Erros: 0
```

- **Sucesso**: Alunos matriculados com a situacao "Cursando"
- **Erros**: Casos de duplicidade ou dados invalidos serao listados

4. Clique em **"Nova Matricula"** para matricular mais alunos ou volte ao Dashboard

---

## 7. Gerenciando Alunos Ja Matriculados

### Acessando a lista de alunos
**Caminho:** Gestor Escolar > Cadastros > **Alunos**

<!-- SCREENSHOT: Lista de alunos -->

### Filtros:
| Filtro | Descricao |
|--------|-----------|
| **Turma** | Filtrar por turma especifica |
| **Serie** | Filtrar por serie |
| **Ano Letivo** | Filtrar por ano |
| **Pesquisar** | Buscar por nome, codigo ou CPF |

### Acoes por aluno:
- **Editar**: Alterar dados cadastrais (nome, CPF, data de nascimento, PCD)
- **Historico**: Ver todo o historico de matriculas e situacoes do aluno
- **Excluir**: Remover o aluno (somente se nao houver notas ou frequencia lancadas)

---

## 8. Transferencias

Para transferir um aluno para outra escola ou turma:

**Caminho:** Gestor Escolar > Matriculas e Vagas > **Transferencias**

1. Busque o aluno pelo nome ou codigo
2. Selecione o tipo de transferencia:
   - **Interna**: Dentro da mesma escola (troca de turma)
   - **Externa**: Para outra escola da rede
   - **Saida**: Para fora da rede municipal
3. Selecione a turma/escola de destino (quando aplicavel)
4. Informe a data e o motivo
5. Confirme a transferencia

> A situacao do aluno sera automaticamente alterada para **"Transferido"** na turma de origem.

---

## Dicas Importantes

- Sempre verifique se o **ano letivo** esta correto antes de iniciar a matricula
- Alunos **transferidos** ou **evadidos** podem ser rematriculados em outra turma
- O **CPF** nao e obrigatorio, mas e recomendado para evitar duplicidade de cadastro
- Em turmas **multisserie**, certifique-se de informar a **serie individual** de cada aluno
- Apos matricular, o aluno ja aparece disponivel para lancamento de notas e frequencia
- Nao e possivel matricular o mesmo aluno na mesma turma duas vezes no mesmo ano
