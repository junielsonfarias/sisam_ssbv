# Manual 05 — Lancamento de Notas

**Publico-alvo:** Administrador, Tecnico, Escola

---

## Visao Geral

O lancamento de notas permite registrar as avaliacoes dos alunos por **disciplina** e **periodo** (bimestre). O sistema calcula automaticamente as medias, verifica a necessidade de recuperacao e determina se o aluno foi aprovado ou reprovado.

**Caminho no menu:** Gestor Escolar > Avaliacoes Escolares > **Lancar Notas**

**URL:** `/admin/notas-escolares`

---

## 1. Entendendo a Configuracao de Notas

Antes de lancar notas, e importante conhecer as regras de avaliacao configuradas:

| Configuracao | Valor Padrao | Descricao |
|-------------|:------------:|-----------|
| Nota maxima | **10,0** | Maior nota possivel |
| Media de aprovacao | **6,0** | Nota minima para aprovacao |
| Media de recuperacao | **5,0** | Nota minima na recuperacao |
| Peso da avaliacao | **60%** | Peso da nota regular na media final |
| Peso da recuperacao | **40%** | Peso da nota de recuperacao na media final |
| Permite recuperacao | **Sim** | Se o aluno pode fazer prova de recuperacao |

> Estas configuracoes podem variar por escola. Consulte as **Regras de Avaliacao** no menu de configuracoes.

---

## 2. Selecionando o que Lancar

A pagina de notas tem 3 modos, selecionados por abas no topo:

```
[Selecao] | [Lancamento] | [Boletim]
```

### Modo Selecao

Preencha os filtros para selecionar quais notas lancar:

<!-- SCREENSHOT: Painel de selecao de notas -->

| Filtro | Obrigatorio | Descricao |
|--------|:-----------:|-----------|
| **Ano Letivo** | Sim | Ex: 2026 |
| **Escola** | Sim | Selecione a escola |
| **Serie** | Sim | Serie das turmas (filtrado pela escola) |
| **Turma** | Sim | Turma especifica |
| **Disciplina** | Sim | Ex: Lingua Portuguesa, Matematica |
| **Periodo** | Sim | Ex: 1o Bimestre, 2o Bimestre, etc. |

1. Preencha todos os filtros na ordem: Escola > Serie > Turma > Disciplina > Periodo
2. Cada filtro atualiza as opcoes do proximo
3. Apos selecionar tudo, clique em **"Lancar Notas"** ou a aba **"Lancamento"** ficara disponivel

---

## 3. Lancando as Notas

Apos a selecao, o modo **Lancamento** exibira uma tabela com todos os alunos da turma:

<!-- SCREENSHOT: Tabela de lancamento de notas -->

### Colunas da tabela:

| Coluna | Descricao |
|--------|-----------|
| **Aluno** | Nome e codigo do aluno |
| **Nota** | Campo para digitar a nota (0 a 10) |
| **Recuperacao** | Nota da recuperacao (aparece apenas quando aplicavel) |
| **Faltas** | Numero de faltas no periodo |
| **Observacao** | Campo livre para anotacoes |

### Passo a passo:

1. Clique no campo **"Nota"** do primeiro aluno
2. Digite a nota (ex: 7.5)
3. Pressione **Tab** ou clique no proximo campo para avancar
4. Repita para todos os alunos
5. Ao terminar, clique em **"Salvar Notas"**

> **Dica rapida:** Use a tecla **Tab** para navegar entre os campos sem precisar do mouse.

### Regras de preenchimento:
- Notas devem ser entre **0** e **10** (ou o maximo configurado)
- Use **ponto** (.) como separador decimal: 7.5, 8.0, 9.25
- Deixe em branco se o aluno **nao fez** a avaliacao
- O campo de **recuperacao** so aceita valores se a nota original for abaixo da media

### Calculo automatico:
O sistema mostra em tempo real:
- **Media da turma**: Media de todas as notas lancadas
- **Aprovados**: Quantidade de alunos com nota >= media de aprovacao
- **Em recuperacao**: Alunos com nota abaixo da media

---

## 4. Notas de Recuperacao

Quando um aluno obtem nota abaixo da media de aprovacao (6,0):

1. A coluna **"Recuperacao"** e habilitada para esse aluno
2. Apos o aluno fazer a prova de recuperacao, insira a nota
3. O sistema calcula a **media final** automaticamente:

```
Media Final = (Nota x 60%) + (Recuperacao x 40%)
```

Exemplo:
```
Nota original: 4,0
Nota recuperacao: 7,0
Media final: (4,0 x 0,6) + (7,0 x 0,4) = 2,4 + 2,8 = 5,2
```

> Neste exemplo, mesmo com recuperacao, o aluno nao atingiu a media 6,0.

---

## 5. Visualizando o Boletim

A aba **"Boletim"** permite ver as notas consolidadas de um aluno:

<!-- SCREENSHOT: Boletim do aluno -->

### Informacoes exibidas:
- Nome do aluno e turma
- Notas de **cada periodo** por disciplina
- Notas de **recuperacao** (quando houver)
- **Media final** de cada disciplina
- **Status**: Aprovado ou Reprovado
- **Resumo de frequencia**

### Para acessar o boletim:
1. Na aba **"Boletim"**, selecione a escola e turma
2. Clique no nome do aluno para ver o boletim individual
3. Para imprimir, use **Ctrl+P** ou clique no botao de impressao

---

## 6. Disciplinas por Serie

As disciplinas variam conforme a serie:

### Ensino Fundamental — Anos Iniciais (1o ao 5o Ano)
| Disciplina | Sigla |
|-----------|-------|
| Lingua Portuguesa | LP |
| Matematica | MAT |
| Ciencias Humanas | CH |
| Ciencias da Natureza | CN |

### Ensino Fundamental — Anos Finais (6o ao 9o Ano)
Mesmas disciplinas, com possibilidade de disciplinas adicionais conforme configuracao.

> As disciplinas disponiveis sao definidas pelo administrador em **Configuracoes > Disciplinas**.

---

## 7. Salvando e Conferindo

### Salvando:
- Clique em **"Salvar Notas"** ao terminar
- Aguarde a mensagem **"Notas salvas com sucesso"**
- As notas ficam salvas imediatamente

### Conferindo:
- Volte ao modo **"Selecao"** e selecione os mesmos filtros
- As notas ja lancadas aparecerao preenchidas
- Voce pode **alterar** qualquer nota e salvar novamente

> **Importante:** Nao ha limite de vezes que voce pode alterar as notas. O sistema salva apenas a versao mais recente.

---

## 8. Frequencia Unificada (Anos Iniciais)

Para turmas dos **anos iniciais** (1o ao 5o ano) com frequencia unificada:

- A frequencia e lancada **junto com as notas** no mesmo painel
- A coluna de faltas reflete a frequencia geral da turma (nao por disciplina)
- Nao e necessario lancar frequencia separadamente

---

## Problemas Comuns

| Problema | Solucao |
|----------|---------|
| Disciplina nao aparece no filtro | Verifique se a disciplina esta configurada para a serie da turma |
| Periodo nao aparece | Verifique se os periodos letivos estao cadastrados para o ano |
| Nota nao salva | Verifique se o valor esta entre 0 e 10. Use ponto (.) como decimal |
| Coluna recuperacao nao aparece | A recuperacao so e habilitada para alunos com nota abaixo da media |
| "Aluno nao encontrado" | Verifique se o aluno esta matriculado na turma e com situacao "Cursando" |

---

## Dicas Importantes

- Lance as notas **por periodo** conforme as avaliacoes forem realizadas
- Nao espere o final do ano para lancar todas as notas — faca bimestre a bimestre
- Confira as notas **antes e depois** de salvar
- O **boletim** so reflete notas que foram salvas — notas nao salvas serao perdidas
- Professores tambem podem lancar notas pelo **Portal do Professor** (veja Manual 08)
