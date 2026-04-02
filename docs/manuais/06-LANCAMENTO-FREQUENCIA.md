# Manual 06 — Lancamento de Frequencia

**Publico-alvo:** Administrador, Tecnico, Escola

---

## Visao Geral

O lancamento de frequencia permite registrar a presenca e ausencia dos alunos por periodo (bimestre). O sistema calcula automaticamente o percentual de frequencia e identifica alunos em risco de infrequencia.

**Caminho no menu:** Gestor Escolar > Frequencia > **Frequencia Bimestral**

**URL:** `/admin/frequencia`

---

## 1. Tipos de Frequencia no Sistema

O SISAM oferece dois tipos de registro de frequencia:

| Tipo | Descricao | Quando usar |
|------|-----------|-------------|
| **Frequencia Bimestral** | Registra total de faltas por periodo | Controle padrao — todos |
| **Frequencia Diaria** | Registra presenca dia a dia | Quando usa reconhecimento facial ou controle diario |

Este manual aborda a **Frequencia Bimestral**, que e o metodo padrao.

---

## 2. Selecionando a Turma

1. No menu, acesse **Frequencia** > **Frequencia Bimestral**
2. A pagina inicia no modo **"Selecao"**

<!-- SCREENSHOT: Filtros de frequencia -->

### Filtros:

| Filtro | Obrigatorio | Descricao |
|--------|:-----------:|-----------|
| **Ano Letivo** | Sim | Ex: 2026 |
| **Escola** | Sim | Selecione a escola |
| **Turma** | Sim | Selecione a turma |
| **Periodo** | Sim | Ex: 1o Bimestre, 2o Bimestre |

3. Preencha os filtros na ordem
4. Clique em **"Lancar Frequencia"** ou mude para a aba **"Lancamento"**

---

## 3. Lancando a Frequencia

Apos a selecao, a tabela de alunos sera exibida:

<!-- SCREENSHOT: Tabela de lancamento de frequencia -->

### Colunas da tabela:

| Coluna | Descricao |
|--------|-----------|
| **Aluno** | Nome do aluno |
| **Presencas** | Numero de dias que o aluno esteve presente |
| **Faltas** | Numero de dias que o aluno faltou |
| **Faltas Justificadas** | Faltas com justificativa (atestado, etc.) |
| **% Frequencia** | Percentual calculado automaticamente |
| **Observacao** | Anotacoes sobre o aluno |

### Passo a passo:

1. No topo, verifique/ajuste o numero de **Dias Letivos** do periodo
   - Exemplo: 1o Bimestre = 50 dias letivos
   - Este valor pode ser editado conforme o calendario escolar

2. Para cada aluno, preencha o numero de **faltas**
   - O sistema calcula automaticamente as presencas e o percentual:
   ```
   Presencas = Dias Letivos - Faltas
   % Frequencia = (Presencas / Dias Letivos) x 100
   ```

3. Se o aluno tem faltas justificadas, preencha o campo **"Faltas Justificadas"**
   - Faltas justificadas sao contabilizadas no total mas sinalizadas separadamente

4. Adicione **observacoes** quando necessario (ex: "Atestado medico de 5 dias")

5. Clique em **"Salvar Frequencia"**

### Exemplo pratico:

```
Dias Letivos: 50

Aluno               | Faltas | Just. | Presencas | %
Maria Silva         |   3    |   1   |    47     | 94%
Joao Pedro          |  12    |   0   |    38     | 76%
Ana Beatriz         |   0    |   0   |    50     | 100%
```

---

## 4. Indicadores de Frequencia

O sistema destaca automaticamente os alunos conforme a frequencia:

| Cor | Faixa | Significado |
|-----|-------|-------------|
| **Verde** | >= 90% | Frequencia adequada |
| **Amarelo** | 75% a 89% | Atencao — risco de infrequencia |
| **Vermelho** | < 75% | Infrequente — risco de reprovacao por falta |

> **Regra legal:** O aluno com frequencia inferior a **75%** do total de horas letivas pode ser reprovado por falta, independentemente das notas.

---

## 5. Frequencia Diaria (Controle dia a dia)

**Caminho:** Frequencia > **Frequencia Diaria**

Para escolas que fazem controle diario de presenca:

1. Selecione a escola e turma
2. Selecione a **data** (dia especifico)
3. Para cada aluno, marque:
   - **P** = Presente
   - **F** = Faltou
   - **T** = Transferido (nao conta na frequencia)

4. Salve o registro

> A frequencia diaria e somada automaticamente para gerar o total bimestral.

---

## 6. Integracao com Reconhecimento Facial

Se a escola utiliza **reconhecimento facial** para controle de presenca:

- Os registros do terminal facial sao sincronizados automaticamente
- Na tela de frequencia diaria, os registros faciais aparecem com o icone de **camera**
- O metodo (manual ou facial) fica registrado para cada presenca
- Voce pode complementar ou corrigir registros faciais manualmente

> Para configurar o reconhecimento facial, consulte o **Manual 07 — Cadastro Facial**.

---

## 7. Painel da Turma

**Caminho:** Frequencia > **Painel da Turma**

O painel mostra uma visao consolidada da frequencia de toda a turma:

- **Resumo geral**: Media de frequencia da turma
- **Alunos infrequentes**: Lista de alunos com menos de 75%
- **Evolucao**: Grafico de frequencia ao longo dos bimestres
- **Comparativo**: Comparacao com outras turmas da escola

---

## 8. Infrequencia

**Caminho:** Frequencia > **Infrequencia**

Pagina especifica para identificar e acompanhar alunos com baixa frequencia:

- Lista todos os alunos com frequencia abaixo do limiar
- Permite registrar acoes tomadas (contato com a familia, encaminhamentos)
- Gera relatorios para o Conselho Tutelar quando necessario

---

## Problemas Comuns

| Problema | Solucao |
|----------|---------|
| Dias letivos incorretos | Edite o campo "Dias Letivos" no topo da pagina de lancamento |
| Aluno nao aparece na lista | Verifique se esta matriculado com situacao "Cursando" |
| Frequencia nao salva | Verifique se preencheu pelo menos um campo de faltas |
| Percentual aparece como 0% | Verifique se os "Dias Letivos" estao preenchidos (nao pode ser 0) |
| Registros faciais nao aparecem | Verifique se o aluno tem cadastro facial ativo e se o terminal esta sincronizado |

---

## Dicas Importantes

- Lance a frequencia **ao final de cada bimestre** ou conforme a escola organizar
- Confira o numero de **dias letivos** com o calendario escolar antes de lancar
- Alunos com muitas faltas devem ser sinalizados para a coordenacao
- A frequencia **ja lancada** pode ser alterada a qualquer momento (nao ha trava)
- Professores tambem podem lancar frequencia pelo **Portal do Professor** (veja Manual 08)
- O sistema suporta **modo offline**: voce pode lancar frequencia sem internet e sincronizar depois
