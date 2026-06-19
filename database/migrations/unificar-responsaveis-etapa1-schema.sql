-- ============================================================================
-- unificar-responsaveis-etapa1-schema.sql
-- Data: 2026-06-19
-- Auditoria: 3.2 — unificar o modelo duplo de responsáveis na tabela
--            `responsaveis_alunos` (a que o portal já usa). OPÇÃO A.
--
-- CONTEXTO DO PROBLEMA
--   Havia DOIS modelos paralelos de vínculo responsável<->aluno sem ponte:
--     (1) Cadastro admin (Fase 3.1): tabelas `responsaveis` + `aluno_responsaveis`.
--     (2) Portal/login/boletim/LGPD: tabela `responsaveis_alunos` (usuario_id).
--   Um responsável cadastrado por um fluxo NÃO aparecia no outro.
--   Decisão: unificar tudo em `responsaveis_alunos`, identificando o responsável
--   por `usuario_id` (linha em `usuarios` com tipo_usuario='responsavel').
--
-- O QUE ESTA MIGRATION (ETAPA 1 — SCHEMA) FAZ
--   1. Adiciona `responsaveis_alunos.principal` (contato principal por aluno) —
--      existia só no modelo legado (`aluno_responsaveis.principal`).
--   2. Amplia o CHECK de `tipo_vinculo` para acomodar os parentescos legados
--      (avo/tio/irmao), evitando violação ao migrar os dados na etapa 2.
--   3. Amplia o CHECK de `origem` com 'migracao_legado'.
--   4. Cria índice parcial do responsável principal por aluno.
--   5. Adiciona `usuarios.data_nascimento` (o cadastro estruturado guardava a
--      data de nascimento do responsável em `responsaveis`; `usuarios` não tinha).
--
--   A MIGRAÇÃO DE DADOS (aluno_responsaveis -> responsaveis_alunos) e o DROP das
--   tabelas legadas ficam para etapas 2 e 3, em sessões separadas, após o código
--   repontado estar estável em produção.
--
-- IDEMPOTENTE: pode rodar mais de uma vez sem erro.
-- ============================================================================

BEGIN;

-- 1) Coluna `principal` (contato principal por aluno)
ALTER TABLE responsaveis_alunos
  ADD COLUMN IF NOT EXISTS principal boolean NOT NULL DEFAULT false;

-- 2) Ampliar domínio de `tipo_vinculo` (cobre parentescos legados sem perder os atuais)
ALTER TABLE responsaveis_alunos DROP CONSTRAINT IF EXISTS responsaveis_alunos_tipo_vinculo_check;
ALTER TABLE responsaveis_alunos ADD CONSTRAINT responsaveis_alunos_tipo_vinculo_check
  CHECK (tipo_vinculo IN ('mae','pai','responsavel','avos','avo','tio','irmao','outro'));

-- 3) Ampliar `origem` com a procedência de migração legada
ALTER TABLE responsaveis_alunos DROP CONSTRAINT IF EXISTS responsaveis_alunos_origem_check;
ALTER TABLE responsaveis_alunos ADD CONSTRAINT responsaveis_alunos_origem_check
  CHECK (origem IN ('admin','auto_cadastro','solicitacao_pai','migracao_legado'));

-- 4) Índice do responsável principal por aluno
CREATE INDEX IF NOT EXISTS idx_resp_alunos_principal
  ON responsaveis_alunos (aluno_id) WHERE principal = true;

-- 5) Data de nascimento do responsável passa a viver em `usuarios`
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS data_nascimento date;

COMMIT;
