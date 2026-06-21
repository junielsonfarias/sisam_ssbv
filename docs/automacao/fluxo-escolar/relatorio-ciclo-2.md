# RELATORIO DO AGENTE - 2026-06-21 (Ciclo 2)

## 1. Status Geral do Sistema: Parcial

**Coracao do Sistema (Gestor Escolar): Medio**

A integridade referencial fisica do banco permanece saudavel (0 orfaos em todas as FKs auditadas, ON DELETE consistente na cadeia polo -> escola -> turma -> aluno). Os modulos de consumo (Semed, Portal do Responsavel, Financeiro/PNAE/PNATE/PDDE/PNLD, Transferencias) operam corretamente em modo somente leitura sobre os mestres. Porem o principio central do modelo ideal — *modulo externo nao cria nem altera dado mestre* — ainda apresentava violacao no ETL do Sisam (`importar-completo`): o `batch.ts` criava turmas e alunos direto do Excel sem gate equivalente ao que ja existia para escolas desde o Ciclo 1. Este gap e o maior risco de governanca do sistema e determinava a classificacao "Medio" para o coracao no inicio deste ciclo.

O Ciclo 2 fechou os cinco gaps de codigo e banco nao-destrutivo identificados na fase EXTRACAO, elevando a cobertura dos controles de governanca do dado mestre. Os dois itens de dados/banco-destrutivo restantes foram registrados como propostas pendentes de decisao humana.

---

## 2. Fluxo Atual Extraido

**Banco validado**: `tbbnswuqsqhulserwtcc` (educanet-demo, PostgreSQL 17, us-west-2). O projeto de producao `cjxejpgtuuqnbczpbdfe` (~3.755 alunos) nao estava acessivel via MCP neste ciclo — toda extracao e restrita ao demo.

**Encadeamento mestre confirmado**: `polos` <- `escolas` <- `turmas` <- `alunos`, com matricula implicita em `alunos.turma_id` / `alunos.serie_id` / `alunos.ano_letivo` (nao existe tabela `matriculas`). Historico de transferencia e movimentacao em `historico_situacao`. Professor nao e entidade propria: vive em `usuarios.tipo_usuario='professor'` (157 no demo); vinculo de ensino em `professor_turmas`.

**7 integracoes mapeadas:**

1. **Sisam ETL simples (`importar`) -> Gestor**: somente upsert de `resultados_provas`; exige escola e aluno ja cadastrados. Conforme.
2. **Sisam ETL completo (`importar-completo`) -> Gestor**: `load.ts` tinha gate para escolas/polos (desde Ciclo 1); `batch.ts` ainda criava turmas e alunos como dado mestre sem gate e sem marcar `origem`. Anti-padrao central. Corrigido no Ciclo 2 (ver secao 5).
3. **Gestor (importar-cadastros) -> Gestor**: ferramenta administrativa que cria mestre integral por planilha. Legitima; passou a marcar `origem='gestor'` explicitamente.
4. **Gestor/Sisam -> Semed (`mv_sisam_media` + `kpis-semed`)**: unidirecional, somente leitura no Semed. Conforme.
5. **Gestor/Sisam -> Portal do Responsavel**: somente leitura com gate anti-IDOR por `responsaveis_alunos`. Conforme.
6. **Gestor -> Financeiro (PNAE/PNATE/PDDE/PNLD)**: consome `escola_id`/`aluno_id` por FK; nunca cria/altera mestre. Conforme.
7. **Gestor -> Transferencias (`historico_situacao`)**: escrita apenas em tabela de movimento, nao no cadastro mestre. Conforme.

**Inconsistencias de dominio persistentes no demo (nao corrigidas — exigem decisao humana):**
- 36 turmas SEED-2024 ativas e vazias, sem o ano 2024 em `anos_letivos`.
- 43 alunos ativos com serie sem oferta correspondente em `series_escola` para a escola+ano.
- 51 alunos ativos sem responsavel aprovado em `responsaveis_alunos`.
- Anos letivos 2025 e 2026 ambos com `status='em_andamento'` (2025 deveria estar fechado).
- 1.608 alunos no demo com 100% de `cpf` e `codigo_inep_aluno` nulos (massa de demonstracao).

**Bloqueio de governanca nao resolvido**: o project_id `umtfcjxytmrybwlcqzdq` passado em ciclos anteriores esta em outra organizacao/regiao e nao corresponde ao SISAM. O MCP desta conta expoe apenas `tbbnswuqsqhulserwtcc` (demo). Toda escrita foi restrita ao demo; comparacao demo<->producao permanece bloqueada ate confirmacao do usuario.

---

## 3. Comparacao com o Modelo Ideal

| Modulo / Integracao | Status Atual | Gap | Prioridade |
|---|---|---|---|
| Sisam (ETL completo `batch.ts`) -> Gestor — gate de turmas e alunos | `load.ts` tinha gate para escolas desde o Ciclo 1; `batch.ts` criava turmas e alunos como dado mestre direto do Excel sem gate equivalente | ETL violava o principio da fonte unica ao criar dado mestre de responsabilidade exclusiva do Gestor | **Alta — corrigido no Ciclo 2** (commit `382d658`) |
| Gestor (governanca) -> rastreabilidade do dado mestre | Colunas `origem`/`origem_importacao_id` criadas no Ciclo 1, mas INSERTs do ETL e de `importar-cadastros` NAO populavam essas colunas; 100% dos registros ficavam com `origem='gestor'` (DEFAULT), anulando a rastreabilidade | Impossivel distinguir o que o ETL Sisam criou do que o Gestor criou; sem auditoria de origem | **Alta — corrigido no Ciclo 2** (commit `d542ae5`) |
| Gestor (planilha) vs Sisam (ETL) — duas portas com politicas divergentes de criacao de mestre | Dois caminhos com regras diferentes para criar a mesma entidade mestra: `importar-cadastros` (regras X) e ETL (regras Y); logica de normalizacao duplicada | Sem politica unica de criacao de dado mestre; o que e bloqueado por uma porta pode entrar pela outra | **Media — corrigido no Ciclo 2** (commit `eafecb7`) |
| Gestor -> identidade do aluno (anti-duplicacao) | 1.608 alunos no demo sem CPF e sem `codigo_inep_aluno`; deduplicacao por nome+escola+turma+ano | Chave de identidade natural fraca; risco de duplicacao real em importacoes futuras ou em producao | **Media — corrigido no Ciclo 2** (commit `afa000d`, banco nao-destrutivo) |
| Gestor -> historico de migracoes/importacoes consultavel | Divergencias ficavam so no campo texto `erros` da tabela `importacoes`; sem trilha por entidade afetada nem relatorio acessivel ao Gestor | Gestor nao consegue auditar nem regularizar uma importacao especifica | **Media — corrigido no Ciclo 2** (commit `9d789cd`) |
| Consistencia de dominio — residuo de seed/migracao | 36 turmas SEED-2024 sem ano 2024; 43 alunos com serie sem oferta; 51 sem responsavel; ano 2025 `em_andamento` | Dados inconsistentes com a fonte mestra; podem distorcer telas e relatorios | **Baixa — proposta pendente (dados, nao autoaplicavel)** |
| Banco — FKs duplicadas em `turma_id` | `notas_escolares.turma_id`: 2 FKs sobrepostas (NO ACTION + SET NULL); `frequencia_diaria.turma_id`: 2 FKs com ON DELETE conflitante (NO ACTION vs CASCADE) | Comportamento ambiguo em delete de turma; risco de perda de movimento | **Baixa — proposta pendente (banco-destrutivo, nao autoaplicavel)** |
| Acesso ao banco de producao | MCP so expoe `tbbnswuqsqhulserwtcc` (demo); `cjxejpgtuuqnbczpbdfe` e `umtfcjxytmrybwlcqzdq` nao acessiveis nesta conta | Comparacao demo<->producao bloqueada; migrations do Ciclo 2 nao replicadas em producao | **Bloqueio — pendente de acao humana** |

---

## 4. Recomendacoes de Melhoria (Priorizadas)

**1. (Alta — proximo ciclo) Definir politica definitiva do gate de turmas e alunos no ETL**
O Ciclo 2 implementou o gate em modo `transicao` (cria marcando `origem='sisam_etl'`) por default, com modo `estrito` ativavel via `ETL_GATE_MESTRE=estrito`. A decisao de arquitetura pendente e quando virar para modo estrito em producao: hoje o ETL ainda pode criar turmas e alunos caso o ambiente nao esteja em modo estrito. Criterio de "pronto": (a) todas as turmas e alunos vindos do ETL tem `origem='sisam_etl'` e `origem_importacao_id` preenchido; (b) reimportacao de turma/aluno inexistente gera DIVERGENCIA consultavel pelo Gestor em vez de criacao silenciosa; (c) testes de integracao do ETL (divergencia x criacao, ON CONFLICT, marcacao de origem) verdes. Acionar `arquiteto-sisam` para a decisao, `implementador-sisam` para o codigo e `qa-sisam` para os testes.

**2. (Alta — proximo ciclo) Backfill de INEP/CPF e ativacao da chave de identidade forte**
Os indices UNIQUE parciais de `codigo_inep_aluno` e `cpf` foram criados (banco-naodestrutivo); no demo os 1.608 alunos tem 100% NULL nessas colunas, tornando os indices inertes. O backfill depende de planilha oficial externa com os dados. Quando disponivel: `especialista-banco-sisam` executa backfill; em seguida, o upsert de `importar-cadastros` (linhas 222-271) deve preferir match por INEP/CPF antes de `chaveAluno` por nome. Ate la, a deteccao de duplicidade real permanece fragil.

**3. (Media — ciclo atual nao concluido) Regularizacao de inconsistencias de dominio no demo**
Proposta nao autoaplicada (exige decisao do usuario): (a) inativar/remover as 36 turmas SEED-2024 ou cadastrar o ano 2024 em `anos_letivos`; (b) criar as 43 ofertas faltantes em `series_escola` ou corrigir a serie dos alunos afetados; (c) completar vinculo de responsavel dos 51 alunos; (d) fechar o status do ano letivo 2025. Validar tudo no demo antes de replicar em producao.

**4. (Media — infraestrutura) Confirmar e conectar o banco de producao ao MCP**
Sem acesso a `cjxejpgtuuqnbczpbdfe` nao e possivel: validar se as inconsistencias do demo existem em producao, replicar as migrations do Ciclo 2, nem comparar contagens reais. Solicitar ao usuario que adicione o projeto de producao correto ao MCP da conta.

**5. (Baixa — higiene de schema) Limpeza de FKs duplicadas em `turma_id`**
`notas_escolares.turma_id` e `frequencia_diaria.turma_id` tem FKs redundantes com politicas ON DELETE conflitantes. A correcao e um DROP de constraint (banco-destrutivo) — exige decisao de qual politica manter e validacao em producao. Acionar `especialista-banco-sisam`. Nao autoaplicar.

**Ordem sugerida para o proximo ciclo:**
- Fase 1 (decisao): arquiteto define politica do gate (estrito vs transicao) e cronograma de backfill INEP/CPF.
- Fase 2 (banco nao-destrutivo): replicar migrations do Ciclo 2 em producao; backfill quando dados disponiveis.
- Fase 3 (codigo): testes de integracao do ETL; ajuste do upsert para preferir chave forte.
- Fase 4 (dados, coordenado com usuario): regularizacao das inconsistencias de dominio.
- Fase 5 (docs): ADR do gate completo + ADR da fonte canonica de series + registro de horas.

---

## 5. Acoes Executadas / Sugeridas

### APLICADAS AUTOMATICAMENTE neste ciclo (codigo e banco-naodestrutivo no demo)

#### 1. Gate de habilitacao do ETL estendido a turmas e alunos
- **Integracao corrigida**: Sisam (ETL completo) -> Gestor
- **Commit**: `382d658` — branch `auto/fluxo-escolar`
- **Tipo**: codigo
- **Arquivos alterados**:
  - `lib/services/importacao/config.ts` (NOVO): tipo `EtlGateMode`, constante `ORIGEM_SISAM_ETL='sisam_etl'`, funcao `getEtlGateMode()` que le `process.env.ETL_GATE_MESTRE`. Modo padrao `transicao` (conservador).
  - `lib/services/importacao/process.ts`: no bloco de criacao de turma e de aluno, quando o registro nao existe no mapa do mestre — modo `estrito` registra DIVERGENCIA (push em `erros`, com dedup por `Set`) e NAO cria; modo `transicao` cria com `origem='sisam_etl'` + `origem_importacao_id`.
  - `lib/services/importacao/types.ts`: campos `origem`/`origem_importacao_id` em `TurmaParaInserir` e `AlunoParaInserir`; contadores `divergentes` em `turmas` e `alunos` de `ImportacaoResultado`.
  - `lib/services/importacao/batch.ts`: INSERTs batch e fallback individual de turmas (5->7 colunas) e alunos (6->8 colunas) propagam `origem`/`origem_importacao_id`. ON CONFLICT em turmas NAO sobrescreve `origem`.
  - `lib/services/importacao/index.ts`: inicializa os novos contadores.
  - `lib/services/importacao/validate.ts`: resumo final lista divergencias de escolas/turmas/alunos; emite aviso consolidado apontando o relatorio de erros.
- **Verificacao real**: `npx tsc --noEmit` limpo; `npx vitest run` 939/939 testes em 57 arquivos verde.
- **Nenhuma migration nova** necessaria (colunas `origem`/`origem_importacao_id` ja existiam da migration `add-origem-dado-mestre.sql` do Ciclo 1, confirmadas no demo).
- **Fora de escopo (anotado)**: campo `erros` de `importacoes` e truncado em 50 linhas em `validate.ts` — em importacoes grandes no modo estrito o relatorio pode nao listar todas as divergencias; tabela dedicada seria mais robusta.

#### 2. Rastreabilidade do dado mestre — origem explicita no lado Gestor
- **Integracao corrigida**: Gestor (governanca) -> rastreabilidade do dado mestre
- **Commit**: `d542ae5` — branch `auto/fluxo-escolar`
- **Tipo**: codigo
- **Arquivo alterado**: `app/api/admin/importar-cadastros/route.ts`
- **O que foi feito**: `origem='gestor'` passou a ser EXPLICITO nos 4 INSERTs (polos ~linha 123, escolas ~162, turmas ~203, alunos ~259), em vez de depender silenciosamente do DEFAULT da coluna. Literal `'gestor'` passado como parametro `$N` (query parametrizada; sem interpolacao).
- **Verificacao real**: `npx tsc --noEmit` limpo; `npx vitest run` 939/939 testes passando (57 arquivos).
- **Fora de escopo (reportado, nao corrigido)**: `app/api/admin/importar-resultados/processar-linha.ts` cria alunos sem `origem` num caminho de ETL (deveria ser `sisam_etl`); CRUDs diretos do Gestor usam o DEFAULT `gestor` (funcionalmente correto).

#### 3. Service unico de upsert de dado mestre (duas portas unificadas)
- **Integracao corrigida**: Gestor (planilha) vs Sisam (ETL) — duas portas de criacao de mestre
- **Commit**: `eafecb7` — branch `auto/fluxo-escolar`
- **Tipo**: codigo
- **Arquivos alterados**:
  - `lib/services/gestor/mestre.service.ts` (NOVO): constantes `ORIGEM_GESTOR`/`ORIGEM_SISAM_ETL`, funcoes de normalizacao (`normalizarNomePolo`, `normalizarNomeEscola`, `chaveAluno`), geracao de codigo (`codigoPolo`, `codigoEscola`) e politica tipada `podeCriarMestre(origem, entidade)`.
  - `app/api/admin/importar-cadastros/route.ts`: removidas 4 normalizacoes inline; literais `'gestor'` parametrizados via `ORIGEM_GESTOR`.
  - `lib/services/importacao/load.ts`: removida definicao local de `normalizarNomeEscola` (importada da fonte unica); gate de escola derivado de `podeCriarMestre`; INSERT de polo marca `origem`.
  - `lib/services/importacao/config.ts`: `ORIGEM_SISAM_ETL` re-exportado da fonte unica.
- **Verificacao real**: `npx tsc --noEmit` limpo; `npx vitest run` 939/939 testes passando.
- **Fora de escopo (reportado)**: `docs/PLANO-AUDITORIA-2026-06-20.md` nao rastreado, sem relacao com o ciclo.

#### 4. Indices UNIQUE parciais para identidade natural do aluno (anti-duplicacao)
- **Integracao corrigida**: Gestor -> identidade do aluno (anti-duplicacao)
- **Commit**: `afa000d` — branch `auto/fluxo-escolar`
- **Tipo**: banco-naodestrutivo — migration aplicada SOMENTE no demo (`tbbnswuqsqhulserwtcc`)
- **Migration criada**: `database/migrations/add-aluno-identidade-natural-anti-duplicacao.sql`
- **O que foi feito**:
  - Indices UNIQUE parciais `idx_alunos_codigo_inep_anti_dup` e `idx_alunos_cpf_anti_dup` (`WHERE ... IS NOT NULL`) — NULLs escapam por design (nao quebra o legado sem dados).
  - CHECKs `NOT VALID` `chk_alunos_inep_formato` (12 digitos) e `chk_alunos_cpf_formato` (11 digitos) — validam escritas futuras sem reprovar legado.
- **Verificacao pos-aplicacao no demo**: 4 objetos confirmados. Demo: 1.608 alunos, 0 com INEP, 0 com CPF, 0 duplicados — indices UNIQUE inertes ate backfill dos dados reais.
- **Producao**: nao acessivel via MCP; aplicar separadamente contra `cjxejpgtuuqnbczpbdfe`.
- **Propostas nao executadas**: match por INEP/CPF antes do match por nome no upsert de `importar-cadastros` (linhas 222-271); DROP do indice INEP duplicado `idx_alunos_inep_unique`; VALIDATE CONSTRAINT apos limpeza; politica NOT NULL futura.

#### 5. Historico de migracoes consultavel com regularizacao pelo Gestor
- **Integracao corrigida**: Gestor -> historico de migracoes/importacoes
- **Commit**: `9d789cd` — branch `auto/fluxo-escolar`
- **Tipo**: codigo + migration nao-destrutiva aplicada no demo
- **Arquivos criados/alterados**:
  - `database/migrations/add-resumo-divergencias-importacoes.sql`: `ADD COLUMN IF NOT EXISTS resumo JSONB` em `importacoes` (idempotente). Aplicada no demo via `apply_migration`. `database/schema.sql` atualizado.
  - `lib/services/importacao/validate.ts`: persiste resumo estruturado por entidade (criados/existentes/divergentes + `total_divergencias`) na nova coluna `resumo`.
  - `app/api/admin/importacoes/route.ts` (GET): retorna `i.resumo` no SELECT.
  - `app/api/admin/importacoes/[id]/divergencias/route.ts` (NOVO): GET lista turmas e alunos criados pelo ETL (`origem=sisam_etl`) vinculados a importacao; POST dispara regularizacao (`UPDATE origem sisam_etl -> gestor`), com `withAuth` via `getUsuarioFromRequest`/`verificarPermissao` (administrador/tecnico), validacao Zod, queries parametrizadas, `RETURNING` e registro de auditoria.
  - `app/admin/sisam/importacoes/page.tsx` + `components/divergencias-modal.tsx` (NOVO): badge "N divergencia(s) — regularizar" por linha; modal lista turmas/alunos divergentes e dispara regularizacao, com dark mode, `useToast` e `LoadingSpinner`.
- **Verificacao real**: `npx tsc --noEmit` sem erros; `npx vitest run` 57 arquivos / 939 testes passando.
- **Fora de escopo (reportado)**: `docs/PLANO-AUDITORIA-2026-06-20.md` e `database/migrations/fix-indices-duplicados.sql` nao rastreados, deixados intactos.

---

### SUGESTOES (nao aplicadas — banco-destrutivo, dados ou dependem de decisao humana)

#### P1. Regularizacao de inconsistencias de dominio no demo (dados)
- **Tipo**: dados — nao autoaplicavel
- **Motivo**: exige decisao do usuario; risco de remover dados que podem ser legitimos.
- **O que fazer** (proposta):
  - (a) Inativar/remover 36 turmas SEED-2024 ou cadastrar o ano 2024 em `anos_letivos`.
  - (b) Criar as 43 ofertas faltantes em `series_escola` ou corrigir a serie dos alunos afetados.
  - (c) Completar vinculo de responsavel dos 51 alunos ativos sem responsavel aprovado.
  - (d) Fechar o status do ano letivo 2025 (`status='encerrado'`).
- **Risco**: distorcao em telas que cruzam aluno x oferta de serie e relatorios do Semed. Validar no demo antes de qualquer acao em producao.
- **Proximo passo**: usuario aprova e define a correcao; `especialista-banco-sisam` executa via SQL no demo.

#### P2. Limpeza de FKs duplicadas em `turma_id` (banco-destrutivo)
- **Tipo**: banco-destrutivo (DROP de constraint)
- **Motivo**: envolve DROP — comportamento de delete e ambiguo mas o impacto e baixo no fluxo normal (turmas raramente deletadas); exige analise e decisao de qual politica ON DELETE manter.
- **O que fazer** (proposta): decidir a politica desejada; `especialista-banco-sisam` faz DROP da FK redundante em `notas_escolares.turma_id` (manter uma das duas) e em `frequencia_diaria.turma_id` (manter uma, decidir CASCADE vs NO ACTION). Validar no demo.
- **Proximo passo**: `especialista-banco-sisam` analisa e propoe SQL; usuario aprova antes de aplicar.

#### P3. Replicar migrations do Ciclo 2 em producao (pendente de acesso)
- **Tipo**: banco-naodestrutivo — nao bloqueio tecnico, bloqueio de acesso
- **Motivo**: o banco de producao `cjxejpgtuuqnbczpbdfe` nao estava acessivel via MCP neste ciclo.
- **Migrations pendentes em producao**:
  - `database/migrations/add-aluno-identidade-natural-anti-duplicacao.sql`
  - `database/migrations/add-resumo-divergencias-importacoes.sql`
- **Proximo passo**: usuario confirma o project_id correto de producao no MCP; `especialista-banco-sisam` aplica e verifica.

---

*Branch: `auto/fluxo-escolar`. Commits deste ciclo: `382d658`, `d542ae5`, `eafecb7`, `afa000d`, `9d789cd`. Nenhum push realizado.*

*Validacao limitada ao demo (`tbbnswuqsqhulserwtcc`). Antes de aplicar correcoes em producao, repetir todas as checagens de consistencia contra `cjxejpgtuuqnbczpbdfe`.*
