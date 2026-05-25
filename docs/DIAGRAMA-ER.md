# Diagrama ER — SISAM/Educatec

Visão estruturada das 109 tabelas do sistema, organizadas por domínio.

> **Como ler:** cada bloco é um domínio funcional. Linhas com `─→` indicam relacionamentos.
> Para diagrama visual completo, importe este arquivo no dbdiagram.io ou Mermaid Live.

---

## Convenções

- **PK:** Primary Key (geralmente UUID `gen_random_uuid()`)
- **FK:** Foreign Key
- **N:M:** relação muitos-para-muitos via junction table
- **⚠️ RLS:** tabela com Row Level Security habilitado (Fase 5)
- **🔒 Sensível:** contém dados pessoais críticos (LGPD)

---

## DOMÍNIO 1 — IDENTIDADE & AUTENTICAÇÃO

```
usuarios (PK id)
├─ tipo_usuario: administrador|tecnico|polo|escola|professor|editor|publicador|responsavel
├─ acesso_sisam, acesso_gestor (booleanos)
└─ FK polo_id → polos
└─ FK escola_id → escolas
   │
   ├─ usuarios_2fa ⚠️🔒 (PK usuario_id) — segredo TOTP + códigos backup
   ├─ tokens_recuperacao_senha ⚠️🔒 — tokens hash SHA-256
   ├─ notificacoes_preferencias ⚠️
   ├─ logs_acesso (auditoria)
   └─ logs_auditoria (CRUD trail)

responsaveis_alunos (N:M usuario ↔ aluno)
└─ FK responsavel_id → usuarios
└─ FK aluno_id → alunos
```

---

## DOMÍNIO 2 — ESTRUTURA INSTITUCIONAL

```
polos (PK id)
├─ código, nome, coordenador
└─ → escolas (1:N)

escolas (PK id) ⚠️
├─ FK polo_id → polos
├─ código INEP, CNPJ, endereço, gestor
└─ → turmas, alunos, ordens_servico, pdde_orcamentos, etc.

series_escolares (PK id)
├─ código, nome
└─ modalidade: regular|eja_fundamental|ed_infantil_*
└─ FK escola_id (opcional - séries específicas)

disciplinas_escolares (PK id)
└─ nome, código, carga_horaria

turmas (PK id) ⚠️
├─ FK escola_id, FK série, código
├─ modalidade, grupo_etario_id (Ed. Infantil)
└─ → alunos, professor_turmas, horarios_aula

horarios_aula
├─ FK turma_id, FK disciplina_id, FK professor_id
└─ dia_semana, hora_inicio, hora_fim
```

---

## DOMÍNIO 3 — ALUNOS & RESPONSÁVEIS

```
alunos (PK id) ⚠️🔒
├─ FK escola_id, FK turma_id
├─ matricula, CPF, RG, data_nascimento, sexo
├─ nome_pai, nome_mae, naturalidade
├─ modalidade: regular|eja|ed_infantil_creche|ed_infantil_pre
├─ beneficiario_bolsa_familia, NIS, codigo_familiar (Fase 3)
└─ ativo (soft delete)
   │
   ├─ alunos_aee ⚠️🔒 (1:1) — tipos_deficiencia[], CID, laudo
   ├─ aee_planos_individuais (PEI por ano letivo)
   ├─ aee_atendimentos (sessões AEE)
   ├─ historico_situacao (aprovado/reprovado/transferido por ano)
   ├─ pre_matriculas
   ├─ matriculas (relacionamento com período letivo)
   ├─ frequencia_diaria ⚠️ (data + presenca P/F)
   ├─ frequencia_bimestral (resumo por bimestre)
   ├─ frequencia_hora_aula (por disciplina/hora-aula)
   ├─ notas_escolares ⚠️
   ├─ avaliacoes_descritivas ⚠️ (Ed. Inf. / anos iniciais)
   ├─ bolsa_familia_mapas ⚠️ (mapas bimestrais Sistema Presença)
   ├─ ed_infantil_portfolio (foto/vídeo/observação)
   ├─ ed_infantil_relatorios (semestral por campo BNCC)
   ├─ consentimentos_faciais 🔒
   ├─ embeddings_faciais 🔒
   ├─ pnae_restricoes_alunos (alergias, dietas)
   ├─ pnate_alunos_rotas (transporte escolar)
   ├─ pnld_distribuicao_aluno (livros entregues)
   ├─ biblioteca_emprestimos (acervo emprestado)
   ├─ documentos_emitidos ⚠️ (histórico, transferência, declarações)
   ├─ ficai_casos ⚠️ (busca ativa escolar)
   └─ eja_certificacoes
```

---

## DOMÍNIO 4 — BNCC (Base Nacional Comum Curricular)

```
bncc_competencias_gerais (PK id) ⚠️ — 10 competências
bncc_etapas (PK id) ⚠️ — EI, EF_AI, EF_AF, EM
bncc_areas_conhecimento (PK id) ⚠️ — Linguagens, Matemática etc.
└─ FK etapa_id

bncc_componentes_curriculares (PK id) ⚠️ — LP_AI, MA_AI, etc.
└─ FK area_id

bncc_habilidades (PK codigo) ⚠️ — EF01LP01, EI02EO01, etc.
├─ FK componente_id
├─ FK etapa_id
├─ ano (1-9 para EF)
├─ campo_experiencia (EI: EOEU, CG, TS, EF, ET)
├─ faixa_etaria (EI: BC, CCR, CRE)
└─ descricao (full-text search portuguesa)

questoes_bncc_habilidades (N:M questao ↔ habilidade) ⚠️
planos_aula_bncc_habilidades (N:M plano ↔ habilidade) ⚠️
tarefas_turma_bncc_habilidades (N:M tarefa ↔ habilidade) ⚠️
diario_classe_bncc_habilidades (N:M diário ↔ habilidade) ⚠️
```

---

## DOMÍNIO 5 — AVALIAÇÃO MUNICIPAL (SISAM)

```
avaliacoes (PK id)
├─ tipo, periodo, ano
└─ → resultados_consolidados, sisam_series_participantes

questoes (PK id)
├─ disciplina, ano, nivel
└─ alternativas (jsonb), gabarito

resultados_consolidados
├─ FK avaliacao_id, FK aluno_id, FK turma_id
└─ nota_lp, nota_mat, nota_ch, nota_cn, nota_producao + presenca

resultados_provas (detalhamento por questão)
itens_producao (cartões de produção textual)
niveis_aprendizagem (N1-N4 por série)
divergencias_historico (correções entre versões)
```

---

## DOMÍNIO 6 — GESTÃO ACADÊMICA

```
anos_letivos (PK id) — 2024, 2025, 2026, ...
└─ data_inicio, data_fim, status, dias_letivos_total
   │
   └─ calendario_eventos ⚠️ — feriados, recessos, dias letivos especiais

periodos_letivos (PK id) — Bimestres / Semestres / Anuais
└─ FK ano_letivo_id, tipo_periodo

configuracao_series, configuracao_series_disciplinas
configuracao_notas_escola, escola_regras_avaliacao
tipos_avaliacao, regras_avaliacao

notas_escolares (FK aluno_id, FK disciplina_id, FK periodo_id) ⚠️
avaliacoes_descritivas ⚠️ (anos iniciais + EI)

professor_turmas (N:M usuario(professor) ↔ turma)

diario_classe — registros diários por turma+disciplina+professor
├─ conteudo, metodologia, atividades (jsonb)
├─ observacoes_individuais (jsonb por aluno)
└─ status: rascunho|publicado|assinado

planos_aula (FK professor_id, FK turma_id)
tarefas_turma (FK turma_id)
comunicados_turma (FK turma_id)

conselho_classe, conselho_classe_alunos
metas_escola

eja_certificacoes ⚠️ (FK aluno_id)
```

---

## DOMÍNIO 7 — DOCUMENTOS FORMAIS

```
documentos_emitidos (PK id) ⚠️🔒
├─ codigo_validacao (XXXX-YYYY-ZZZZ - validação pública)
├─ hash_conteudo (SHA-256 — anti-adulteração)
├─ tipo: historico_escolar|guia_transferencia|declaracao_*|certificado_eja
├─ FK aluno_id, FK emitido_por (usuario)
├─ dados_snapshot (jsonb — preservado)
├─ status: ativo|cancelado|substituido
└─ vezes_validado (contador)
   │
   └─ documentos_validacoes_log (auditoria de cada validação pública)
```

---

## DOMÍNIO 8 — INCLUSÃO (AEE / PNE)

```
aee_salas_recursos (PK id) — Salas Tipo I e II
└─ FK escola_id, FK professor_responsavel_id

alunos_aee (PK id) ⚠️🔒
├─ tipos_deficiencia[] (LDB Art. 58)
├─ CID, laudo médico, recursos especiais
├─ FK sala_recursos_id
└─ necessita_cuidador, necessita_interprete

aee_planos_individuais (PEI anual) — FK aluno_id
└─ objetivos, estrategias, areas_foco[]

aee_atendimentos (sessões) — FK plano_id, FK aluno_id
```

---

## DOMÍNIO 9 — BUSCA ATIVA (FICAI)

```
ficai_casos (PK id) ⚠️🔒
├─ FK aluno_id, FK escola_id
├─ motivo: infrequencia_50|ausencia_consecutiva|abandono|evasao
├─ status: aberto → contato_responsavel → encaminhado_CT → MP → resolvido
└─ snapshot de infrequência (faltas, pct, última presença)
   │
   └─ ficai_acoes (timeline de contatos, encaminhamentos, ofícios)
```

---

## DOMÍNIO 10 — PROGRAMAS FEDERAIS

### PNAE (Alimentação)
```
pnae_nutricionistas (CRN, responsavel_tecnico)
pnae_cardapios ⚠️ (escola+semana+faixa_etaria, status)
└─ pnae_refeicoes (dia_semana, tipo, kcal, alergênicos)
pnae_atendimentos_diarios (refeições servidas/dia — prestação FNDE)
pnae_restricoes_alunos ⚠️🔒
```

### PNATE (Transporte)
```
pnate_veiculos (placa, vistoria_validade, capacidade)
pnate_motoristas ⚠️ (CNH, curso_escolar_validade)
pnate_rotas (codigo, escolas[], turno)
└─ pnate_paradas (ordem, endereco, hora)
pnate_alunos_rotas ⚠️
```

### PNLD (Livro Didático)
```
pnld_titulos ⚠️ (ISBN, código PNLD, FK componente BNCC)
pnld_estoque_escola ⚠️ (qtd_total, qtd_disponivel, ano_letivo)
pnld_distribuicao_aluno ⚠️ (entrega, devolução, tombamento)
```

### PDDE (Financeiro)
```
pdde_tipos_verba ⚠️ (PDDE_BASICO, PDDE_QUALIDADE, etc - FNDE)
pdde_orcamentos ⚠️ (FK escola_id, valor_recebido, data_credito)
└─ pdde_despesas ⚠️ (fornecedor, valor, categoria, nota_url)
pdde_saldos (VIEW: recebido - executado)
```

### Bolsa Família
```
bolsa_familia_mapas ⚠️🔒 (FK aluno_id, periodo Sistema Presença)
└─ frequencia_percentual, cumpre_condicionalidade (60%/75%)
```

---

## DOMÍNIO 11 — ADMINISTRATIVO

### RH Escolar
```
servidores ⚠️🔒 (CPF, matrícula_funcional, tipo_vinculo)
└─ FK usuario_id (opcional — se servidor loga no sistema)
   │
   ├─ servidor_lotacoes ⚠️ (escola + função + carga_horaria + vigência)
   └─ servidor_formacoes ⚠️ (cursos, certificados, modalidade)
```

### Patrimônio
```
patrimonio_bens (PK id) ⚠️
├─ tombo (etiqueta física)
├─ FK escola_id, categoria, estado_conservacao
└─ status: ativo|em_manutencao|extraviado|baixado
   │
   └─ patrimonio_movimentacoes (transferência, manutenção, baixa)
```

### Biblioteca
```
biblioteca_acervo ⚠️ (FK escola_id, ISBN, qtd_total)
└─ biblioteca_emprestimos ⚠️ (aluno XOR servidor, devolução)
└─ biblioteca_reservas (fila quando indisponível)
```

### Ordens de Serviço
```
ordens_servico ⚠️ (PK id, numero OS-2026-NNNN)
├─ FK escola_id, FK aberta_por, FK responsavel_id
├─ tipo: predial|eletrica|hidraulica|...
├─ prioridade: baixa|media|alta|urgente
└─ status: aberta → em_atendimento → concluida
   │
   └─ ordens_servico_comentarios (timeline)
```

---

## DOMÍNIO 12 — COMUNICAÇÃO

```
publicacoes (FK editor, tipo, status)
eventos (FK escola_id)
ouvidoria 🔒 (mensagens cidadão → SEMED)
site_config (CMS institucional)
notificacoes (legado — uso geral)
notificacoes_disparos ⚠️ (Fase 4 — handlers de eventos)
notificacoes_preferencias ⚠️
```

---

## DOMÍNIO 13 — FACIAL / IoT

```
dispositivos_faciais (PK id, api_key_hash, escola_id)
dispositivos_push (FCM tokens)
embeddings_faciais 🔒 (vetores face-api.js)
consentimentos_faciais ⚠️🔒 (LGPD)
logs_dispositivos (auditoria)
qr_presenca (códigos efêmeros)
```

---

## DOMÍNIO 14 — OBSERVABILIDADE

```
status_incidentes ⚠️ (público — manutenções e incidentes)
└─ status_atualizacoes ⚠️ (timeline pública)

logs_acesso (autenticações)
logs_auditoria (CRUD em entidades sensíveis)
logs_backup (histórico de dumps)
logs_dispositivos (terminal facial)
```

---

## DOMÍNIO 15 — LGPD & COMPLIANCE

```
usuarios_2fa ⚠️🔒 (Fase 1)
tokens_recuperacao_senha ⚠️🔒 (Fase 1)
lgpd_solicitacoes ⚠️🔒 (exportar, portabilidade, exclusão)
consentimentos_faciais ⚠️🔒 (decreto LGPD facial)
```

---

## Resumo

**Total de tabelas:** 109
**Tabelas com RLS habilitado (Fase 5):** 49 (todas as novas Fases 2/3/4)
**Tabelas com dados pessoais sensíveis (🔒):** ~20 (alunos, usuarios, AEE, FICAI, biometria, RH, BF)
**Views materializadas:** 0 (oportunidade futura para dashboards)
**Triggers:** 1 (`gerar_numero_os` em ordens_servico)
**Funções:** 2 (`contar_dias_letivos`, `gerar_numero_os`)

**Para gerar diagrama visual:**
1. Exportar schema com `pg_dump --schema-only -O sisam.sql`
2. Importar em https://dbdiagram.io (formato PostgreSQL)
3. Alternativamente, usar SchemaSpy, DBeaver ou Drawio com plugin SQL
