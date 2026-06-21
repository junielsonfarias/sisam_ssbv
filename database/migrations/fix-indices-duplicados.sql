-- ============================================================================
-- fix-indices-duplicados.sql
-- Data: 2026-06-20
-- Auditoria: DBA — advisor de performance (duplicate_index) apontou 11 pares de
--            indices byte-a-byte identicos (mesmas colunas, mesma unicidade,
--            mesmos predicados parciais). Indice duplicado custa escrita e
--            espaco sem nenhum ganho de leitura.
--
-- Em cada par mantemos o nome "canonico" (prefixo da tabela por extenso) e
-- removemos o apelido curto/legado. Para os pares UNIQUE de resultados_*
-- mantemos o indice usado pelo ON CONFLICT do upsert.
--
-- Idempotencia: DROP INDEX IF EXISTS. Seguro re-rodar.
-- Atencao: os dois pares UNIQUE abaixo dao suporte a ON CONFLICT — o indice
--          MANTIDO cobre exatamente as mesmas colunas, entao o upsert continua
--          funcionando apos o DROP do redundante.
-- ============================================================================

BEGIN;

-- alunos: UNIQUE parcial em codigo_inep_aluno (mantem idx_alunos_inep_unique)
DROP INDEX IF EXISTS idx_alunos_codigo_inep;

-- usuarios: UNIQUE parcial em cpf (mantem idx_usuarios_cpf_unique)
DROP INDEX IF EXISTS idx_usuarios_cpf;

-- notas_escolares: btree (turma_id)
DROP INDEX IF EXISTS idx_notas_esc_turma;

-- historico_situacao: btree (aluno_id)
DROP INDEX IF EXISTS idx_hist_situacao_aluno;

-- resultados_consolidados: btree (aluno_id, ano_letivo)
DROP INDEX IF EXISTS idx_consolidados_aluno_ano;

-- responsaveis_alunos: btree (usuario_id, ativo)
--   (nome enganoso "_ativo" — na verdade indexa usuario_id+ativo, igual ao _usuario)
DROP INDEX IF EXISTS idx_resp_alunos_ativo;

-- fila_espera: btree (turma_id, status)
DROP INDEX IF EXISTS idx_fila_espera_turma;

-- professor_turmas: UNIQUE parcial polivalente (turma_id, ano_letivo)
DROP INDEX IF EXISTS idx_prof_turmas_polivalente_unique;

-- professor_turmas: UNIQUE parcial disciplina (turma_id, disciplina_id, ano_letivo)
DROP INDEX IF EXISTS idx_prof_turmas_disciplina_unique;

-- resultados_provas: UNIQUE (aluno_id, questao_codigo, avaliacao_id) — upsert
--   mantem idx_resultados_provas_unique (nome referenciado no contexto/§8)
DROP INDEX IF EXISTS idx_resultados_provas_aluno_questao_avaliacao;

-- resultados_consolidados: UNIQUE (aluno_id, avaliacao_id) — upsert
--   AMBOS os nomes (resultados_consolidados_aluno_id_avaliacao_id_key e
--   resultados_consolidados_aluno_avaliacao_key) sao UNIQUE CONSTRAINTS identicas
--   sobre (aluno_id, avaliacao_id) — confirmado em pg_constraint (contype='u').
--   O indice de suporte e propriedade da constraint, entao DROP INDEX falha
--   ('cannot drop index ... because constraint ... requires it'). Removemos a
--   constraint redundante via DROP CONSTRAINT e mantemos
--   resultados_consolidados_aluno_id_avaliacao_id_key, que continua dando suporte
--   ao ON CONFLICT (aluno_id, avaliacao_id) do upsert de consolidados.
ALTER TABLE resultados_consolidados
  DROP CONSTRAINT IF EXISTS resultados_consolidados_aluno_avaliacao_key;

COMMIT;

-- ============================================================================
-- Verificacao pos-migration (deve retornar 0 linhas):
--   SELECT indrelid::regclass AS tbl, array_agg(indexrelid::regclass) idxs
--   FROM pg_index
--   GROUP BY indrelid, indkey, indisunique, indpred, indexprs
--   HAVING count(*) > 1;
-- ============================================================================
