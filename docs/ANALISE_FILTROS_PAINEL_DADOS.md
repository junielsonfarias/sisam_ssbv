# Analise de Filtros do Painel de Dados

## Filtros Disponiveis (12 filtros)

| # | Filtro | Tipo | Dependencia |
|---|--------|------|-------------|
| 1 | Ano Letivo | Select | Nenhuma |
| 2 | Polo | Select | Nenhuma |
| 3 | Escola | Select | **Depende de Polo** |
| 4 | Etapa de Ensino | Select | Nenhuma |
| 5 | Serie | Chips | Filtra Turma |
| 6 | Turma | Select | **Depende de Serie** |
| 7 | Disciplina | Select | Nenhuma |
| 8 | Presenca | Select | Nenhuma |
| 9 | Nivel | Select | Nenhuma |
| 10 | Faixa de Media | Select | Nenhuma |
| 11 | Taxa de Acerto Min (%) | Input | Nenhuma |
| 12 | Taxa de Acerto Max (%) | Input | Nenhuma |
| 13 | Questao Especifica | Input | Nenhuma |

---

## Dados do Banco de Dados

### Anos Letivos
- 2025: 2375 registros

### Polos (4)
- CAETE: 432 alunos
- CIDADE: 1122 alunos
- EMMANOEL: 517 alunos
- PEDRO NOGUEIRA: 304 alunos

### Series
| Serie | Total | Etapa |
|-------|-------|-------|
| 2º Ano | 494 | Anos Iniciais |
| 3º Ano | 454 | Anos Iniciais |
| 5º Ano | 458 | Anos Iniciais |
| 8º Ano | 516 | Anos Finais |
| 9º Ano | 450 | Anos Finais |

### Presenca
| Status | Total |
|--------|-------|
| P (Presente) | 936 |
| F (Faltante) | 33 |
| - (Sem info) | 1406 |

---

## Problemas Identificados

### 1. Series com Nomes Inconsistentes
**Problema**: Existem registros com "2º", "3º", "5º" (sem "Ano") junto com "2º Ano", "3º Ano", "5º Ano".

**Impacto**: Pode causar duplicacao nos chips de serie e confusao visual.

**Dados**:
- "2º": 1 aluno | "2º Ano": 494 alunos
- "3º": 1 aluno | "3º Ano": 454 alunos
- "5º": 1 aluno | "5º Ano": 458 alunos

**Solucao**: Normalizar series no banco para "Xº Ano".

---

### 2. Muitos Registros sem Presenca (1406 de 2375)
**Problema**: 59% dos registros tem presenca = "-", indicando dados incompletos.

**Impacto**: Esses registros nao aparecem nas estatisticas de presentes/faltantes, mas podem confundir a contagem total.

**Solucao**: Tratar "-" como categoria separada ou investigar origem dos dados.

---

### 3. Nivel de Aprendizagem nao Classificado (99.9%)
**Problema**: Apenas 3 de 2375 alunos tem nivel de aprendizagem definido.

**Dados**:
- N2: 1 aluno
- N3: 2 alunos
- Nao classificado: 2372 alunos

**Solucao**: Implementar calculo automatico de nivel baseado na media.

---

### 4. Sincronizacao Serie <-> Etapa de Ensino NAO EXISTE
**Problema**: Quando seleciona uma serie via chip, o filtro de Etapa de Ensino NAO atualiza automaticamente.

**Exemplo**: Se selecionar "8º Ano" nos chips, o filtro "Etapa de Ensino" continua mostrando "Todas as etapas" em vez de mudar para "Anos Finais".

**Impacto**: Usuario pode ficar confuso com o estado dos filtros.

**Solucao**: Implementar sincronizacao bidirecional.

---

### 5. Disciplinas NAO SAO FILTRADAS por Etapa de Ensino
**Problema**: O filtro de Disciplina mostra todas as opcoes (LP, MAT, CH, CN, PT) independente da Etapa de Ensino selecionada.

**Exemplo**: Se selecionar "Anos Iniciais", ainda mostra CH e CN (que nao existem para essa etapa).

**Dados Anos Iniciais** (apenas 3 presentes):
- LP: 3, MAT: 3, PROD: 3, CH: 0, CN: 0

**Dados Anos Finais** (933 presentes):
- LP: 929, MAT: 911, CH: 911, CN: 901, PROD: 0

**Solucao**: Filtrar opcoes de disciplina baseado na Etapa de Ensino ou Serie selecionada.

---

## Relacionamentos entre Filtros

### Funcionando Corretamente:
1. **Polo -> Escola**: Quando seleciona Polo, apenas escolas daquele polo aparecem
2. **Polo -> Turma**: Limpa turma quando muda polo
3. **Etapa de Ensino -> Serie/Turma**: Limpa serie e turma quando muda etapa
4. **Escola -> Turma**: Limpa turma quando muda escola
5. **Serie -> Turma**: Turmas so aparecem apos selecionar serie

### Precisa Implementar:
1. **Serie -> Etapa de Ensino**: Atualizar etapa quando seleciona serie
2. **Etapa de Ensino/Serie -> Disciplina**: Filtrar disciplinas disponiveis

---

## Melhorias Propostas

### Melhoria 1: Sincronizacao Serie <-> Etapa de Ensino
```typescript
// Quando seleciona serie via chip
const handleSerieChipClick = (serie: string) => {
  setFiltroSerie(serie)

  // NOVA LOGICA: Atualizar Etapa de Ensino automaticamente
  const numeroSerie = serie.match(/\d+/)?.[0]
  if (numeroSerie) {
    if (['2', '3', '5'].includes(numeroSerie)) {
      setFiltroTipoEnsino('anos_iniciais')
    } else if (['6', '7', '8', '9'].includes(numeroSerie)) {
      setFiltroTipoEnsino('anos_finais')
    }
  } else {
    setFiltroTipoEnsino('') // Limpar se serie vazia
  }

  setPaginaAtual(1)
  setPaginasAnalises(PAGINACAO_ANALISES_INICIAL)
}
```

### Melhoria 2: Filtrar Disciplinas por Etapa/Serie
```typescript
// Atualizar options do select de Disciplina
const disciplinasDisponiveis = useMemo(() => {
  const todas = [
    { value: '', label: 'Todas as disciplinas' },
    { value: 'LP', label: 'Lingua Portuguesa' },
    { value: 'MAT', label: 'Matematica' },
    { value: 'CH', label: 'Ciencias Humanas' },
    { value: 'CN', label: 'Ciencias da Natureza' },
    { value: 'PT', label: 'Producao Textual' }
  ]

  if (filtroTipoEnsino === 'anos_iniciais' || isAnosIniciaisLib(filtroSerie)) {
    // Anos Iniciais: LP, MAT, PT
    return todas.filter(d => ['', 'LP', 'MAT', 'PT'].includes(d.value))
  }

  if (filtroTipoEnsino === 'anos_finais' || isAnosFinaisLib(filtroSerie)) {
    // Anos Finais: LP, MAT, CH, CN
    return todas.filter(d => ['', 'LP', 'MAT', 'CH', 'CN'].includes(d.value))
  }

  return todas // Todas se nao houver filtro
}, [filtroTipoEnsino, filtroSerie])
```

### Melhoria 3: Filtrar Series por Etapa de Ensino (nos chips)
```typescript
// Filtrar series exibidas nos chips baseado na etapa
const seriesFiltradas = useMemo(() => {
  if (!dados?.filtros.series) return []

  if (filtroTipoEnsino === 'anos_iniciais') {
    return dados.filtros.series.filter(s => {
      const num = s.match(/\d+/)?.[0]
      return num && ['2', '3', '5'].includes(num)
    })
  }

  if (filtroTipoEnsino === 'anos_finais') {
    return dados.filtros.series.filter(s => {
      const num = s.match(/\d+/)?.[0]
      return num && ['6', '7', '8', '9'].includes(num)
    })
  }

  return dados.filtros.series
}, [dados?.filtros.series, filtroTipoEnsino])
```

### Melhoria 4: Normalizar Series no Banco
```sql
-- Script para normalizar series
UPDATE resultados_consolidados
SET serie = serie || ' Ano'
WHERE serie IN ('2º', '3º', '5º', '6º', '7º', '8º', '9º')
AND serie NOT LIKE '%Ano%';
```

---

## Resumo

| Categoria | Status | Prioridade |
|-----------|--------|------------|
| Filtro Polo->Escola | OK | - |
| Filtro Serie->Turma | OK | - |
| Filtro Etapa->Serie | OK (limpa serie) | - |
| Sincronizacao Serie->Etapa | NAO IMPLEMENTADO | Alta |
| Filtrar Disciplinas por Etapa | NAO IMPLEMENTADO | Alta |
| Filtrar Series por Etapa | NAO IMPLEMENTADO | Media |
| Normalizar Series | DADOS INCONSISTENTES | Media |
| Nivel de Aprendizagem | 99.9% NAO CLASSIFICADO | Baixa |

---

*Documento gerado em: 2026-01-10*
