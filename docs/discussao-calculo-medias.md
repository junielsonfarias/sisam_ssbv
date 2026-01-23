# Discussão: Cálculo de Médias no SISAM

> **Data:** 23/01/2026
> **Status:** Pendente de decisão
> **Participantes:** Equipe de desenvolvimento

---

## Contexto

Durante a análise dos dados do sistema, foi identificada uma diferença entre o cálculo esperado e o resultado exibido para a média geral.

### Exemplo Observado

| Métrica | Valor |
|---------|-------|
| Média Anos Iniciais | 5,17 |
| Média Anos Finais | 3,96 |
| **Média Geral (esperada - média simples)** | 4,57 |
| **Média Geral (exibida no sistema)** | 4,68 |

### Explicação da Diferença

O cálculo `(5,17 + 3,96) / 2 = 4,57` assume uma **média simples** (média das médias), que só seria correta se os dois grupos tivessem o mesmo número de alunos.

O sistema calcula a **média ponderada** de todos os alunos individualmente, onde cada aluno tem o mesmo peso no cálculo, independente de ser dos anos iniciais ou finais.

**Exemplo ilustrativo:**

| Grupo | Alunos | Média |
|-------|--------|-------|
| Anos Iniciais | 1.200 | 5,17 |
| Anos Finais | 800 | 3,96 |

```
Média Geral = (1.200 × 5,17 + 800 × 3,96) / 2.000
            = (6.204 + 3.168) / 2.000
            = 4,686 ≈ 4,69
```

O valor 4,68 indica que há **mais alunos avaliados nos anos iniciais** do que nos anos finais.

---

## Questão Levantada

> **Podemos aplicar essa mesma lógica de média ponderada para turmas e escolas?**
>
> Há escolas com apenas uma turma e poucos alunos, e escolas com mais turmas e mais alunos. Como isso deve afetar os cálculos?

---

## Duas Abordagens Possíveis

### 1. Média Simples (cada escola/turma = 1 voto)

Cada unidade (escola ou turma) tem o mesmo peso, independente do número de alunos.

**Exemplo:**
| Escola | Turmas | Alunos | Média |
|--------|--------|--------|-------|
| Escola A | 1 | 15 | 7,50 |
| Escola B | 5 | 180 | 4,80 |

```
Média do Sistema = (7,50 + 4,80) / 2 = 6,15
```

**Prós:**
- Cada unidade escolar tem representação igual
- Escolas pequenas não são "invisíveis"
- Bom para avaliar "qualidade média das unidades"

**Contras:**
- Uma escola com 15 alunos influencia tanto quanto uma com 180
- Pode distorcer a realidade do sistema como um todo
- Turmas muito pequenas com notas extremas podem enviesar os resultados

---

### 2. Média Ponderada (cada aluno = 1 voto)

Cada aluno tem o mesmo peso, então escolas/turmas maiores têm mais influência.

**Exemplo:**
```
Média do Sistema = (15 × 7,50 + 180 × 4,80) / 195
                 = (112,5 + 864) / 195
                 = 5,01
```

**Prós:**
- Reflete o desempenho real de todos os alunos
- Mais representativo do "estado do sistema"
- Estatisticamente mais preciso

**Contras:**
- Escolas grandes dominam os resultados
- Escolas pequenas têm pouca influência
- Pode mascarar problemas em escolas menores

---

## Sugestão de Aplicação

| Contexto | Abordagem Sugerida | Justificativa |
|----------|-------------------|---------------|
| **Média Geral do Sistema** | Ponderada | Representa todos os alunos igualmente |
| **Média por Série** | Ponderada | Desempenho real daquela série |
| **Média por Polo** | Ponderada | Desempenho real do polo |
| **Ranking de Escolas** | Simples | Compara qualidade, não tamanho |
| **Ranking de Turmas** | Simples | Cada turma é uma unidade de análise |
| **Listagem de Escolas** | Média própria | Cada escola mostra sua média (ponderada por seus alunos) |
| **Listagem de Turmas** | Média própria | Cada turma mostra sua média (ponderada por seus alunos) |

---

## Situação Atual do Sistema

Atualmente, o SISAM utiliza:

1. **Média Geral**: Ponderada por aluno (cada aluno conta igual)
2. **Média por Anos Iniciais/Finais**: Ponderada por aluno
3. **Média por Disciplina**: Ponderada por aluno
4. **Média de cada Escola**: Calculada sobre os alunos daquela escola
5. **Média de cada Turma**: Calculada sobre os alunos daquela turma

### Fórmula de Cálculo (Divisor Fixo)

- **Anos Iniciais (2º, 3º, 5º):** `(LP + MAT + PROD) / 3`
- **Anos Finais (6º, 7º, 8º, 9º):** `(LP + CH + MAT + CN) / 4`

---

## Perguntas para Discussão Futura

1. **A média geral do sistema deveria considerar escolas com peso igual?**
   - Isso daria mais visibilidade a escolas pequenas
   - Mas não representaria o desempenho real de todos os alunos

2. **O ranking de escolas deveria ponderar pelo número de alunos?**
   - Atualmente cada escola mostra sua própria média
   - Poderia haver um "índice de impacto" considerando quantidade de alunos

3. **Devemos criar métricas diferentes para análises diferentes?**
   - Média ponderada para "visão geral do sistema"
   - Média simples para "comparação entre unidades"

4. **Como tratar turmas muito pequenas (< 10 alunos)?**
   - Excluir de rankings?
   - Marcar com asterisco?
   - Agrupar com outras turmas?

---

## Decisão

> **Status:** Aguardando discussão
>
> Por enquanto, mantemos a lógica atual (média ponderada por aluno).
> Este documento serve como referência para futuras discussões sobre o tema.

---

## Referências

- Arquivo de serviço: `lib/services/estatisticas.service.ts`
- API de dados: `app/api/admin/dashboard-dados/route.ts`
- API de turmas: `app/api/admin/turmas/route.ts`
- Componente dashboard: `components/painel-dados.tsx`
