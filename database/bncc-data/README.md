# Dados BNCC

Arquivos JSON com as habilidades oficiais da Base Nacional Comum Curricular (Lei 13.005/2014, Resolução CNE/CP nº 2/2017).

**Fonte oficial:** http://basenacionalcomum.mec.gov.br

## Estrutura dos arquivos

Cada arquivo `habilidades-*.json` contém um array de habilidades no formato:

```json
[
  {
    "codigo": "EF01LP01",
    "descricao": "Reconhecer que textos sao lidos e escritos da esquerda para a direita e de cima para baixo da pagina.",
    "componente_id": "LP_AI",
    "etapa_id": "EF_AI",
    "ano": 1
  }
]
```

Para Educação Infantil:

```json
[
  {
    "codigo": "EI02EO01",
    "descricao": "Demonstrar atitudes de cuidado e solidariedade na interacao com criancas e adultos.",
    "componente_id": "EI_EOEU",
    "etapa_id": "EI",
    "campo_experiencia": "EOEU",
    "faixa_etaria": "CCR"
  }
]
```

## Arquivos disponíveis

| Arquivo | Etapa | Disciplinas |
|---|---|---|
| `habilidades-ei.json` | Educação Infantil | 5 campos de experiência (BC, CCR, CRE) |
| `habilidades-ef-ai-lp.json` | Fundamental Anos Iniciais | Língua Portuguesa (1º-5º) |
| `habilidades-ef-ai-ma.json` | Fundamental Anos Iniciais | Matemática (1º-5º) |
| `habilidades-ef-af-lp.json` | Fundamental Anos Finais | Língua Portuguesa (6º-9º) |
| `habilidades-ef-af-ma.json` | Fundamental Anos Finais | Matemática (6º-9º) |

## Como carregar no banco

```bash
# Primeiro, aplicar as migrations:
# database/migrations/add-bncc-estrutura.sql
# database/migrations/seed-bncc-estrutura.sql

# Depois, rodar o script de seed das habilidades:
node scripts/seed/seed-bncc.js
```

## Adicionando mais habilidades

Para expandir (Ciências, História, Geografia, Arte, Educação Física, Ensino Religioso):

1. Criar arquivo `habilidades-ef-ai-{componente}.json` no mesmo formato
2. O `seed-bncc.js` carrega automaticamente todos os `habilidades-*.json` do diretório

## Faixas etárias (Ed. Infantil)

| Código | Faixa | Idade |
|---|---|---|
| `BC` | Bebês | 0-1 ano 6 meses |
| `CCR` | Crianças bem pequenas | 1 ano 7 meses - 3 anos 11 meses |
| `CRE` | Crianças pequenas | 4 anos - 5 anos 11 meses |

## Campos de Experiência (Ed. Infantil)

| Código | Campo |
|---|---|
| `EOEU` | O eu, o outro e o nós |
| `CG` | Corpo, gestos e movimentos |
| `TS` | Traços, sons, cores e formas |
| `EF` | Escuta, fala, pensamento e imaginação |
| `ET` | Espaços, tempos, quantidades, relações e transformações |
