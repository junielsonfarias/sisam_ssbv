# Plano de Refatoração do SISAM

> **Data de Criação:** 23/01/2026
> **Versão:** 1.0
> **Status:** Aprovado para Execução

---

## Visão Geral

Este plano divide a refatoração em **5 fases progressivas**, cada uma construindo sobre a anterior. O objetivo é transformar o código em uma base limpa, bem estruturada e manutenível.

### Métricas Atuais

| Métrica | Valor Atual | Meta |
|---------|-------------|------|
| Arquivos > 1000 linhas | 15 | 0 |
| Arquivos > 500 linhas | 35 | < 10 |
| Arquivos > 300 linhas | 65 | < 20 |
| Código morto identificado | ~3000 linhas | 0 |
| Duplicações críticas | 12+ | 0 |

---

## FASE 1: Limpeza e Remoção de Código Morto
**Duração Estimada:** 1-2 dias
**Risco:** Baixo
**Impacto:** Redução de ~3000 linhas

### 1.1 Remover Arquivos Não Utilizados

```
REMOVER COMPLETAMENTE:
├── lib/utils-error.ts                    # Não utilizado
├── lib/fetch-with-timeout.ts             # Não utilizado
├── hooks/useOfflineData.ts               # Não utilizado (duplicado)
├── hooks/useOfflineSync.ts               # Não utilizado (duplicado)
├── components/offline-sync-manager.tsx   # Não utilizado
└── components/dados/LoadingSpinner.tsx   # Duplicado (usar ui/loading-spinner)
```

### 1.2 Consolidar Rotas de Debug

```
MOVER PARA app/api/debug/ (ambiente dev only):
├── app/api/admin/debug-aluno/route.ts
├── app/api/admin/debug-relatorio/route.ts
├── app/api/debug-env/route.ts
└── app/api/test-dns/route.ts

ADICIONAR PROTEÇÃO:
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Not available' }, { status: 404 })
}
```

### 1.3 Consolidar Sistemas de Cache

**De 3 arquivos para 1:**

```typescript
// ANTES (3 arquivos):
lib/cache-dashboard.ts   // Cache em arquivo (server)
lib/dashboard-cache.ts   // Cache em sessionStorage (client)
lib/cache-memoria.ts     // Cache em memória (Map)

// DEPOIS (1 arquivo):
lib/cache/index.ts       // Exporta implementação correta por ambiente
lib/cache/memory.ts      // Cache em memória (principal)
lib/cache/types.ts       // Tipos compartilhados
```

### 1.4 Remover Diretório hooks/ da Raiz

```
ANTES:
├── hooks/                    # Raiz (duplicado)
│   ├── useOfflineData.ts
│   └── useOfflineSync.ts
└── lib/hooks/                # Organizado

DEPOIS:
└── lib/hooks/                # Único local para hooks
    ├── useOfflineData.ts     # Se necessário, mover para cá
    └── ...
```

### Checklist Fase 1

- [ ] Remover 6 arquivos de código morto
- [ ] Mover rotas de debug para `/api/debug/`
- [ ] Consolidar cache em `lib/cache/`
- [ ] Remover diretório `hooks/` da raiz
- [ ] Executar `npm run build` para validar
- [ ] Testar funcionalidades principais

---

## FASE 2: Reorganização de Estrutura de Diretórios
**Duração Estimada:** 2-3 dias
**Risco:** Médio
**Impacto:** Melhor navegabilidade e manutenção

### 2.1 Nova Estrutura de `/components`

```
components/
├── layout/                      # NOVO - Componentes de layout
│   ├── DashboardLayout.tsx      # Renomear de layout-dashboard.tsx
│   ├── ProtectedRoute.tsx       # Mover de raiz
│   ├── Header.tsx               # Extrair de DashboardLayout
│   ├── Sidebar.tsx              # Extrair de DashboardLayout
│   └── Footer.tsx               # Mover/criar
│
├── modals/                      # NOVO - Todos os modais
│   ├── AlunoModal.tsx           # Renomear de modal-aluno.tsx
│   ├── QuestoesAlunoModal.tsx   # Renomear de modal-questoes-aluno.tsx
│   ├── HistoricoAlunoModal.tsx  # Renomear de modal-historico-aluno.tsx
│   ├── AlunosTurmaModal.tsx     # Renomear de modal-alunos-turma.tsx
│   └── index.ts                 # Barrel export
│
├── paineis/                     # NOVO - Painéis principais
│   ├── PainelDados/             # Subpasta para componente grande
│   │   ├── index.tsx
│   │   ├── TabelaResultados.tsx
│   │   ├── FiltrosSection.tsx
│   │   ├── EstatisticasCards.tsx
│   │   └── hooks/
│   │       └── usePainelDados.ts
│   │
│   ├── PainelAnalise/
│   │   ├── index.tsx
│   │   ├── TabelaAnalise.tsx
│   │   └── hooks/
│   │       └── usePainelAnalise.ts
│   │
│   └── PainelGraficos/
│       ├── index.tsx
│       └── ...
│
├── charts/                      # MANTER - Já organizado
├── dados/                       # MANTER - Já organizado
├── relatorios/                  # MANTER - Já organizado
├── ui/                          # MANTER - Componentes base
│
└── shared/                      # NOVO - Componentes compartilhados
    ├── LoadingContent.tsx
    ├── ErrorBoundary.tsx
    ├── EmptyState.tsx
    └── index.ts
```

### 2.2 Nova Estrutura de `/lib`

```
lib/
├── core/                        # NOVO - Núcleo do sistema
│   ├── auth.ts                  # Mover de raiz
│   ├── constants.ts             # Mover de raiz
│   ├── logger.ts                # Mover de raiz
│   └── config.ts                # Consolidar configurações
│
├── api/                         # NOVO - Utilitários de API
│   ├── utils.ts                 # Mover de api-utils.ts
│   ├── responses.ts             # Extrair respostas padronizadas
│   ├── middleware.ts            # Extrair middlewares
│   └── schemas.ts               # Mover de raiz
│
├── cache/                       # NOVO - Sistema de cache unificado
│   ├── index.ts
│   ├── memory.ts
│   └── types.ts
│
├── database/                    # NOVO - Acesso a dados
│   ├── connection.ts            # Mover de database/
│   ├── queries/                 # Queries SQL organizadas
│   │   ├── alunos.ts
│   │   ├── escolas.ts
│   │   ├── resultados.ts
│   │   └── estatisticas.ts
│   └── types.ts
│
├── services/                    # EXPANDIR - Lógica de negócio
│   ├── estatisticas.service.ts  # Já existe
│   ├── alunos.service.ts        # CRIAR
│   ├── escolas.service.ts       # CRIAR
│   ├── turmas.service.ts        # CRIAR
│   ├── importacao.service.ts    # CRIAR (extrair de API)
│   └── relatorios.service.ts    # CRIAR
│
├── hooks/                       # MANTER - Hooks customizados
├── dados/                       # MANTER - Módulo dados
├── divergencias/                # MANTER - Módulo divergências
├── relatorios/                  # MANTER - Módulo relatórios
│
└── utils/                       # NOVO - Utilitários gerais
    ├── formatters.ts            # Formatação de dados
    ├── validators.ts            # Validações comuns
    ├── normalizers.ts           # Mover normalizar-serie.ts etc
    └── index.ts
```

### 2.3 Atualizar Imports

Criar script para atualizar imports automaticamente:

```typescript
// scripts/update-imports.ts
const mappings = {
  '@/components/layout-dashboard': '@/components/layout/DashboardLayout',
  '@/components/modal-aluno': '@/components/modals/AlunoModal',
  '@/lib/auth': '@/lib/core/auth',
  '@/lib/api-utils': '@/lib/api/utils',
  // ... etc
}
```

### Checklist Fase 2

- [ ] Criar nova estrutura de diretórios
- [ ] Mover componentes para subpastas corretas
- [ ] Mover libs para estrutura organizada
- [ ] Atualizar todos os imports
- [ ] Criar arquivos barrel (index.ts) para exports
- [ ] Executar `npm run build` para validar
- [ ] Testar navegação e funcionalidades

---

## FASE 3: Divisão de Arquivos Grandes
**Duração Estimada:** 5-7 dias
**Risco:** Alto
**Impacto:** Código mais manutenível

### 3.1 Prioridade Crítica (> 1500 linhas)

#### 3.1.1 `app/admin/dados/page.tsx` (3472 linhas)

**Dividir em:**

```
app/admin/dados/
├── page.tsx                     # Container principal (~200 linhas)
├── components/
│   ├── AbaVisaoGeral.tsx        # ~400 linhas
│   ├── AbaEscolas.tsx           # ~400 linhas
│   ├── AbaTurmas.tsx            # ~400 linhas
│   ├── AbaAlunos.tsx            # ~500 linhas
│   ├── AbaAnalises.tsx          # ~400 linhas
│   ├── FiltrosAvancados.tsx     # ~300 linhas
│   └── HeaderDados.tsx          # ~100 linhas
├── hooks/
│   ├── useDadosPage.ts          # Estado principal
│   ├── useFiltros.ts            # Lógica de filtros
│   └── useExportacao.ts         # Lógica de exportação
└── types.ts                     # Tipos locais
```

#### 3.1.2 `components/painel-dados.tsx` (1909 linhas)

**Dividir em:**

```
components/paineis/PainelDados/
├── index.tsx                    # Container (~150 linhas)
├── TabelaResultados.tsx         # Tabela principal (~400 linhas)
├── TabelaEscolas.tsx            # Tabela escolas (~300 linhas)
├── TabelaTurmas.tsx             # Tabela turmas (~300 linhas)
├── EstatisticasCards.tsx        # Cards de estatísticas (~200 linhas)
├── FiltrosSection.tsx           # Seção de filtros (~250 linhas)
├── hooks/
│   ├── usePainelDados.ts        # Hook principal (~300 linhas)
│   └── useEstatisticas.ts       # Cálculos (~150 linhas)
└── types.ts
```

#### 3.1.3 `app/admin/resultados/page.tsx` (1870 linhas)

**Dividir em:**

```
app/admin/resultados/
├── page.tsx                     # Container (~200 linhas)
├── components/
│   ├── TabelaResultados.tsx     # ~500 linhas
│   ├── FiltrosResultados.tsx    # ~300 linhas
│   ├── EstatisticasHeader.tsx   # ~200 linhas
│   └── AcoesResultados.tsx      # ~200 linhas
├── hooks/
│   └── useResultados.ts         # ~400 linhas
└── types.ts
```

#### 3.1.4 `app/api/admin/dashboard-dados/route.ts` (1774 linhas)

**Dividir em:**

```
app/api/admin/dashboard-dados/
├── route.ts                     # Handler principal (~200 linhas)
├── queries/
│   ├── estatisticas.ts          # ~300 linhas
│   ├── escolas.ts               # ~300 linhas
│   ├── turmas.ts                # ~300 linhas
│   ├── alunos.ts                # ~400 linhas
│   └── filtros.ts               # ~200 linhas
└── types.ts
```

### 3.2 Prioridade Alta (800-1500 linhas)

| Arquivo | Linhas | Ação |
|---------|--------|------|
| `app/admin/graficos/page.tsx` | 1475 | Extrair componentes de gráficos |
| `app/api/admin/graficos/route.ts` | 1375 | Separar queries por tipo de gráfico |
| `lib/divergencias/verificadores.ts` | 1326 | Separar por tipo de verificação |
| `lib/relatorios/consultas-relatorio.ts` | 1251 | Separar por tipo de relatório |
| `app/escola/resultados/page.tsx` | 1283 | Extrair componentes |
| `app/admin/comparativos/page.tsx` | 1104 | Extrair componentes |
| `lib/relatorios/gerador-pdf.tsx` | 1077 | Separar seções do PDF |
| `app/tecnico/graficos/page.tsx` | 1063 | Reutilizar componentes de admin |

### 3.3 Prioridade Média (500-800 linhas)

| Arquivo | Linhas | Ação |
|---------|--------|------|
| `lib/services/estatisticas.service.ts` | 946 | Separar por tipo de estatística |
| `lib/offline-storage.ts` | 893 | Separar por entidade |
| `components/painel-analise.tsx` | 895 | Extrair subcomponentes |
| `app/admin/configuracao-series/page.tsx` | 942 | Extrair componentes |
| `components/modal-questoes-aluno.tsx` | 629 | Extrair seções |
| `components/layout-dashboard.tsx` | 532 | Extrair Header/Sidebar |

### Checklist Fase 3

- [ ] Dividir `app/admin/dados/page.tsx`
- [ ] Dividir `components/painel-dados.tsx`
- [ ] Dividir `app/admin/resultados/page.tsx`
- [ ] Dividir `app/api/admin/dashboard-dados/route.ts`
- [ ] Dividir arquivos de prioridade alta
- [ ] Dividir arquivos de prioridade média
- [ ] Testar cada página/funcionalidade após divisão
- [ ] Executar `npm run build` após cada divisão

---

## FASE 4: Consolidação de Tipos e Interfaces
**Duração Estimada:** 2-3 dias
**Risco:** Médio
**Impacto:** Código mais consistente

### 4.1 Estrutura de Tipos Proposta

```
lib/types/
├── index.ts                     # Re-exporta todos os tipos
├── entities/                    # Entidades do banco
│   ├── usuario.ts
│   ├── escola.ts
│   ├── turma.ts
│   ├── aluno.ts
│   ├── polo.ts
│   └── resultado.ts
├── api/                         # Tipos de API
│   ├── requests.ts
│   ├── responses.ts
│   └── filters.ts
├── ui/                          # Tipos de UI
│   ├── forms.ts
│   ├── tables.ts
│   └── charts.ts
└── shared/                      # Tipos compartilhados
    ├── pagination.ts
    ├── statistics.ts
    └── common.ts
```

### 4.2 Eliminar Duplicações

**ANTES (12+ interfaces similares):**
```typescript
// Em diferentes arquivos:
interface Estatisticas { ... }
interface EstatisticasPainel { ... }
interface EstatisticasSerie { ... }
interface EstatisticasAluno { ... }
interface EstatisticasGerais { ... }
// ... etc
```

**DEPOIS (hierarquia clara):**
```typescript
// lib/types/shared/statistics.ts
interface BaseEstatisticas {
  mediaGeral: number
  mediaLp: number
  mediaMat: number
  totalAlunos: number
}

interface EstatisticasPainel extends BaseEstatisticas {
  mediaCh?: number
  mediaCn?: number
  mediaProd?: number
}

interface EstatisticasAluno extends BaseEstatisticas {
  alunoId: string
  nomeAluno: string
}

// Re-exportar tipos antigos como aliases para compatibilidade
export type Estatisticas = BaseEstatisticas
export type EstatisticasGerais = EstatisticasPainel
```

### 4.3 Padronizar Enums

```typescript
// lib/types/entities/enums.ts

export enum TipoUsuario {
  ADMINISTRADOR = 'administrador',
  TECNICO = 'tecnico',
  POLO = 'polo',
  ESCOLA = 'escola'
}

export enum Serie {
  SEGUNDO_ANO = '2º Ano',
  TERCEIRO_ANO = '3º Ano',
  QUINTO_ANO = '5º Ano',
  SEXTO_ANO = '6º Ano',
  SETIMO_ANO = '7º Ano',
  OITAVO_ANO = '8º Ano',
  NONO_ANO = '9º Ano'
}

export enum TipoEnsino {
  ANOS_INICIAIS = 'anos_iniciais',
  ANOS_FINAIS = 'anos_finais'
}

export enum NivelAprendizagem {
  INSUFICIENTE = 'Insuficiente',
  BASICO = 'Básico',
  ADEQUADO = 'Adequado',
  AVANCADO = 'Avançado'
}
```

### Checklist Fase 4

- [ ] Criar nova estrutura de tipos em `lib/types/`
- [ ] Migrar tipos de entidades
- [ ] Migrar tipos de API
- [ ] Criar tipos compartilhados
- [ ] Eliminar arquivos de tipos antigos
- [ ] Atualizar imports em todo o projeto
- [ ] Validar com TypeScript strict

---

## FASE 5: Otimização e Padronização Final
**Duração Estimada:** 3-4 dias
**Risco:** Baixo
**Impacto:** Performance e manutenibilidade

### 5.1 Criar Camada de Serviços

```typescript
// lib/services/alunos.service.ts
export class AlunosService {
  static async listar(filtros: FiltrosAlunos): Promise<Aluno[]> { ... }
  static async buscarPorId(id: string): Promise<Aluno | null> { ... }
  static async buscarEstatisticas(alunoId: string): Promise<EstatisticasAluno> { ... }
  static async buscarHistorico(alunoId: string): Promise<HistoricoAluno[]> { ... }
}

// lib/services/escolas.service.ts
export class EscolasService {
  static async listar(filtros: FiltrosEscolas): Promise<Escola[]> { ... }
  static async buscarPorId(id: string): Promise<Escola | null> { ... }
  static async buscarTurmas(escolaId: string): Promise<Turma[]> { ... }
  static async buscarEstatisticas(escolaId: string): Promise<EstatisticasEscola> { ... }
}

// lib/services/index.ts
export { AlunosService } from './alunos.service'
export { EscolasService } from './escolas.service'
export { TurmasService } from './turmas.service'
export { EstatisticasService } from './estatisticas.service'
export { RelatoriosService } from './relatorios.service'
```

### 5.2 Implementar Custom Hooks Padronizados

```typescript
// lib/hooks/useQuery.ts
export function useQuery<T>(
  queryFn: () => Promise<T>,
  options?: QueryOptions
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  // ... implementação com cache, retry, etc.
}

// lib/hooks/usePagination.ts
export function usePagination(options: PaginationOptions) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(options.defaultPageSize || 10)
  // ... implementação
}

// lib/hooks/useFilters.ts
export function useFilters<T extends Record<string, any>>(
  initialFilters: T,
  options?: FilterOptions
) {
  const [filters, setFilters] = useState<T>(initialFilters)
  // ... implementação com debounce, persistência, etc.
}
```

### 5.3 Padronizar Componentes de UI

```typescript
// components/ui/data-table/
├── DataTable.tsx                # Componente base
├── DataTableHeader.tsx
├── DataTableBody.tsx
├── DataTablePagination.tsx
├── DataTableFilters.tsx
├── hooks/
│   └── useDataTable.ts
└── index.ts

// Uso padronizado:
<DataTable
  data={alunos}
  columns={columns}
  pagination={pagination}
  filters={filters}
  loading={loading}
  onRowClick={handleRowClick}
/>
```

### 5.4 Documentação de Código

```typescript
// Padrão JSDoc para funções públicas
/**
 * Busca estatísticas consolidadas de uma escola
 * @param escolaId - ID da escola
 * @param anoLetivo - Ano letivo (opcional, padrão: ano atual)
 * @returns Estatísticas da escola ou null se não encontrada
 * @throws {Error} Se o ID da escola for inválido
 * @example
 * const stats = await EscolasService.buscarEstatisticas('escola-123', '2026')
 */
static async buscarEstatisticas(
  escolaId: string,
  anoLetivo?: string
): Promise<EstatisticasEscola | null> {
  // ...
}
```

### 5.5 Configurar ESLint/Prettier Rigoroso

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50 }],
    'complexity': ['error', 10],
    'no-unused-vars': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  }
}
```

### Checklist Fase 5

- [ ] Criar serviços para todas as entidades principais
- [ ] Implementar hooks padronizados
- [ ] Criar componentes de UI reutilizáveis
- [ ] Adicionar documentação JSDoc
- [ ] Configurar ESLint com regras de tamanho
- [ ] Executar lint em todo o projeto
- [ ] Corrigir warnings restantes
- [ ] Teste final de todas as funcionalidades

---

## Cronograma Resumido

| Fase | Descrição | Duração | Dependências |
|------|-----------|---------|--------------|
| **1** | Limpeza de código morto | 1-2 dias | Nenhuma |
| **2** | Reorganização de diretórios | 2-3 dias | Fase 1 |
| **3** | Divisão de arquivos grandes | 5-7 dias | Fase 2 |
| **4** | Consolidação de tipos | 2-3 dias | Fase 3 |
| **5** | Otimização final | 3-4 dias | Fase 4 |

**Total estimado:** 13-19 dias

---

## Critérios de Sucesso

### Métricas Finais Esperadas

| Métrica | Antes | Depois |
|---------|-------|--------|
| Arquivos > 500 linhas | 35 | < 5 |
| Arquivos > 300 linhas | 65 | < 15 |
| Código morto | ~3000 linhas | 0 |
| Duplicações de tipos | 12+ | 0 |
| Cobertura de documentação | ~20% | > 80% |

### Validação

Após cada fase:
1. `npm run build` deve passar sem erros
2. `npm run lint` deve passar sem erros
3. Todas as funcionalidades devem continuar funcionando
4. Tempo de build não deve aumentar significativamente

---

## Notas Importantes

1. **Fazer backup antes de cada fase**
2. **Commitar frequentemente** (a cada componente/arquivo refatorado)
3. **Testar manualmente** as funcionalidades após mudanças
4. **Não alterar lógica de negócio** durante a refatoração
5. **Manter compatibilidade** com dados existentes

---

## Apêndice: Comandos Úteis

```bash
# Encontrar arquivos grandes
find . -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -n | tail -20

# Verificar imports não utilizados
npx eslint . --rule 'no-unused-vars: error'

# Verificar duplicações
npx jscpd ./lib ./components --min-lines 10

# Atualizar imports após mover arquivos
npx ts-morph-scripts update-imports
```
