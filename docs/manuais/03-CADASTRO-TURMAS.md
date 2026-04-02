# Manual 03 — Cadastro de Turmas

**Publico-alvo:** Administrador, Tecnico, Escola

---

## Visao Geral

O cadastro de turmas permite criar e gerenciar as turmas de cada escola, definindo serie, turno, tipo de avaliacao e capacidade. As turmas sao a base para matriculas, lancamento de notas e frequencia.

**Caminho no menu:** Gestor Escolar > Cadastros > **Turmas**

**URL:** `/admin/turmas`

---

## 1. Acessando a Lista de Turmas

1. No menu lateral, clique em **"Cadastros"** > **"Turmas"**
2. A pagina exibira filtros no topo e a lista de turmas abaixo

<!-- SCREENSHOT: Pagina de turmas com filtros -->

### Filtros disponiveis:

| Filtro | Descricao |
|--------|-----------|
| **Ano Letivo** | Selecione o ano (ex: 2026) |
| **Escola** | Filtre por escola (obrigatorio para tipo Escola) |
| **Serie** | Filtre por serie/ano escolar |
| **Pesquisar** | Busque por nome ou codigo da turma |

### Cartoes de resumo (KPIs):
- Total de turmas
- Total de alunos
- Turmas por serie
- Media de desempenho

---

## 2. Criando uma Nova Turma

1. Clique no botao **"+"** no canto superior direito
2. O formulario de criacao sera exibido

<!-- SCREENSHOT: Formulario de criacao de turma -->

### Campos do formulario:

| Campo | Obrigatorio | Descricao | Exemplo |
|-------|:-----------:|-----------|---------|
| **Nome da Turma** | Sim | Nome descritivo | "5o Ano A — Matutino" |
| **Codigo** | Sim | Codigo unico | "5A-MAT" |
| **Serie** | Sim | Serie/ano escolar (lista suspensa) | "5o Ano" |
| **Escola** | Sim | Escola onde a turma sera criada | "EMEF N. S. Lourdes" |
| **Turno** | Sim | Periodo de funcionamento | Matutino / Vespertino / Noturno |
| **Tipo de Avaliacao** | Sim | Forma de avaliacao da turma | Bimestral / Trimestral |
| **Multisserie** | Nao | Se a turma tem alunos de series diferentes | Marcar se aplicavel |
| **Capacidade** | Nao | Numero maximo de alunos | 30 |

3. Preencha todos os campos obrigatorios
4. Clique em **"Salvar"**

> **Sobre turmas Multisserie:** Em escolas ribeirinhas, e comum ter turmas com alunos de series diferentes (ex: 3o, 4o e 5o ano na mesma turma). Marque a opcao "Multisserie" neste caso.

---

## 3. Editando uma Turma

1. Na lista, localize a turma desejada
2. Clique no icone de **lapis** (editar)
3. Altere os campos necessarios
4. Clique em **"Salvar"**

> **Cuidado:** Alterar a **serie** de uma turma que ja possui alunos matriculados pode causar inconsistencias nas notas.

---

## 4. Visualizando Alunos da Turma

1. Clique no **cartao** ou no **nome** da turma
2. O painel de alunos sera exibido com a lista completa

<!-- SCREENSHOT: Lista de alunos da turma -->

### Informacoes exibidas por aluno:
- Nome completo
- Codigo do aluno
- Situacao (Cursando, Aprovado, Reprovado, Transferido, etc.)
- Data de nascimento

---

## 5. Alterando a Situacao de um Aluno

Quando um aluno muda de situacao (transferencia, aprovacao, reprovacao, etc.):

1. Na lista de alunos da turma, clique no **nome do aluno**
2. O modal de **Situacao do Aluno** sera exibido

<!-- SCREENSHOT: Modal de situacao do aluno -->

### Campos:

| Campo | Descricao |
|-------|-----------|
| **Situacao** | Selecione a nova situacao |
| **Data** | Data da alteracao |
| **Observacao** | Motivo ou anotacao (opcional) |

### Opcoes de situacao:
| Situacao | Quando usar |
|----------|------------|
| **Cursando** | Aluno frequentando normalmente |
| **Aprovado** | Aluno aprovado ao final do ano/periodo |
| **Reprovado** | Aluno reprovado ao final do ano/periodo |
| **Transferido** | Aluno transferido para outra escola |
| **Evadido** | Aluno que abandonou a escola |
| **Falecido** | Caso de obito (registro oficial) |

3. Selecione a situacao e preencha a data
4. Clique em **"Salvar"**

> O **historico** de alteracoes de situacao fica registrado e pode ser consultado no mesmo modal.

---

## 6. Exportando Dados

### Imprimir relacao de alunos:
1. Na turma desejada, clique no icone de **impressora**
2. Uma pagina formatada para impressao sera aberta
3. Use Ctrl+P para imprimir

### Exportar como CSV:
1. Clique no icone de **download** (seta para baixo)
2. Um arquivo .csv sera baixado com os dados da turma
3. Abra no Excel ou Google Planilhas

---

## 7. Turmas Multisserie

Para visualizar a composicao de uma turma multisserie:

1. Localize a turma com o indicador **"Multisserie"**
2. Clique no icone de **composicao** (icone de camadas)
3. O modal exibira quantos alunos de cada serie estao na turma

Exemplo:
```
Turma Multisserie "Ribeirinha A"
- 3o Ano: 8 alunos
- 4o Ano: 12 alunos  
- 5o Ano: 5 alunos
Total: 25 alunos
```

---

## 8. Excluindo uma Turma

> **Atencao:** So e possivel excluir turmas **sem alunos matriculados**.

1. Clique no icone de **lixeira** na turma
2. Confirme a exclusao
3. Se houver alunos, transfira-os primeiro para outra turma

---

## Dicas Importantes

- Crie as turmas **antes** de iniciar as matriculas
- O **codigo da turma** deve ser unico dentro da mesma escola e ano letivo
- Verifique o **tipo de avaliacao** (bimestral/trimestral) — isso afeta como as notas sao lancadas
- Para turmas noturnas de EJA, selecione o turno **Noturno**
- A **capacidade** da turma e apenas informativa — o sistema permite matricular mais alunos que a capacidade
