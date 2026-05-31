-- ============================================================================
-- add-portal-responsavel-aprovacao.sql
-- Data: 2026-05-31 (substitui/complementa add-portal-responsavel.sql)
--
-- A migration original add-portal-responsavel.sql nao tinha sido aplicada
-- no banco — o portal do responsavel ficou quebrado em prod. Esta migration
-- aplica TUDO + estende com workflow de aprovacao:
--
--   - status: aprovado | pendente | rejeitado
--   - origem: admin | auto_cadastro | solicitacao_pai
--   - aprovado_por / aprovado_em / motivo_rejeicao
--
-- Auto-cadastro do pai (POST /api/auth/cadastro-responsavel) cria
-- vinculo com status='pendente' — escola revisa em /admin/responsaveis
-- antes de liberar acesso aos dados do aluno.
-- ============================================================================

BEGIN;

-- 1) Adicionar 'responsavel' ao CHECK de tipo_usuario
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='usuarios_tipo_usuario_check' AND table_name='usuarios') THEN
    ALTER TABLE usuarios DROP CONSTRAINT usuarios_tipo_usuario_check;
  END IF;
  ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check
    CHECK (tipo_usuario IN ('administrador','tecnico','polo','escola','professor','editor','publicador','responsavel'));
END $$;

-- 2) Coluna CPF + telefone em usuarios (login do responsavel)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_cpf_unique
  ON usuarios(cpf) WHERE cpf IS NOT NULL AND cpf <> '';

-- 3) Vinculo responsavel <-> aluno com workflow de aprovacao
CREATE TABLE IF NOT EXISTS responsaveis_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  tipo_vinculo VARCHAR(30) NOT NULL DEFAULT 'responsavel'
    CHECK (tipo_vinculo IN ('mae','pai','responsavel','avos','outro')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(15) NOT NULL DEFAULT 'aprovado'
    CHECK (status IN ('pendente','aprovado','rejeitado')),
  origem VARCHAR(20) NOT NULL DEFAULT 'admin'
    CHECK (origem IN ('admin','auto_cadastro','solicitacao_pai')),
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aprovado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  aprovado_em TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_resp_alunos_usuario ON responsaveis_alunos(usuario_id, ativo);
CREATE INDEX IF NOT EXISTS idx_resp_alunos_aluno   ON responsaveis_alunos(aluno_id, ativo);
CREATE INDEX IF NOT EXISTS idx_resp_alunos_pendentes
  ON responsaveis_alunos(status) WHERE status = 'pendente';

ALTER TABLE responsaveis_alunos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE responsaveis_alunos IS
  'Vinculo N:N responsavel<->aluno. status=aprovado quando admin cria; status=pendente quando pai solicita via auto-cadastro ou portal.';
COMMENT ON COLUMN responsaveis_alunos.origem IS
  'admin=criado por admin/escola; auto_cadastro=criado pelo pai na pagina publica; solicitacao_pai=pai logado adicionou outro filho.';
COMMENT ON COLUMN responsaveis_alunos.status IS
  'aprovado=tem acesso aos dados; pendente=aguardando escola aprovar; rejeitado=escola negou.';

COMMIT;
