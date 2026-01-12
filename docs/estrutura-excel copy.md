# Estrutura do Arquivo Excel para Importação

Este documento descreve a estrutura esperada do arquivo Excel para importação de dados de provas no sistema SISAM.

## Formato do Arquivo

- **Extensões aceitas**: `.xlsx` ou `.xls`
- **Primeira linha**: Pode conter cabeçalhos (será ignorada se não corresponder aos nomes esperados)
- **Dados**: A partir da segunda linha

## Colunas Esperadas

O sistema aceita múltiplas variações de nomes de colunas. As colunas podem ser nomeadas de qualquer uma das seguintes formas:

### Colunas Obrigatórias

| Nome Alternativo 1 | Nome Alternativo 2 | Nome Alternativo 3 | Descrição |
|-------------------|-------------------|-------------------|-----------|
| Código Escola | codigo_escola | Escola | Código ou nome da escola |
| Código Aluno | codigo_aluno | Aluno | Código identificador do aluno |

### Colunas Opcionais

| Nome Alternativo 1 | Nome Alternativo 2 | Nome Alternativo 3 | Descrição |
|-------------------|-------------------|-------------------|-----------|
| Nome Aluno | nome_aluno | Nome | Nome completo do aluno |
| Código Questão | codigo_questao | Questão | Código da questão |
| Resposta | resposta | Resposta Aluno | Resposta dada pelo aluno |
| Acertou | - | - | "Sim" ou "Não" (ou true/false) |
| Nota | nota | - | Nota obtida (numérico) |
| Data | data | Data Prova | Data da prova (formato: DD/MM/YYYY ou YYYY-MM-DD) |
| Ano Letivo | ano_letivo | Ano | Ano letivo (ex: 2024) |
| Série | serie | Serie | Série/ano do aluno |
| Turma | turma | - | Turma do aluno |
| Disciplina | disciplina | - | Nome da disciplina |
| Área | area | Área Conhecimento | Área de conhecimento |

## Exemplo de Estrutura

```
| Código Escola | Código Aluno | Nome Aluno | Código Questão | Resposta | Acertou | Nota | Data | Ano Letivo | Série | Disciplina |
|---------------|--------------|------------|---------------|----------|---------|------|------|------------|-------|------------|
| ES001         | ALU001       | João Silva | Q001          | A        | Sim     | 10   | 01/03/2024 | 2024 | 3º Ano | Matemática |
| ES001         | ALU001       | João Silva | Q002          | B        | Não     | 0    | 01/03/2024 | 2024 | 3º Ano | Matemática |
```

## Regras de Validação

1. **Escola**: O código/nome da escola deve existir no sistema. Caso não exista, a linha será ignorada.
2. **Aluno**: O código do aluno é obrigatório.
3. **Questão**: Se o código da questão não existir no sistema, será criado um registro apenas com o código.
4. **Acertou**: Aceita "Sim", "S", "true", "1" para verdadeiro e "Não", "N", "false", "0" para falso.
5. **Data**: Aceita formatos DD/MM/YYYY, YYYY-MM-DD ou outros formatos reconhecidos pelo JavaScript Date.

## Processamento

- O sistema processa linha por linha
- Linhas com erros são registradas mas não interrompem o processo
- Um relatório de importação é gerado ao final com:
  - Total de linhas processadas
  - Total de linhas com sucesso
  - Total de linhas com erro
  - Detalhes dos erros (se houver)

## Dicas

1. **Prepare os dados**: Certifique-se de que todas as escolas já estão cadastradas no sistema antes de importar.
2. **Valide os dados**: Verifique se os códigos de escola correspondem aos cadastrados.
3. **Formato de data**: Use um formato consistente de data em todo o arquivo.
4. **Backup**: Faça backup dos dados antes de importar grandes volumes.

## Suporte

Em caso de dúvidas sobre a estrutura do arquivo, entre em contato com a equipe de suporte técnico.

