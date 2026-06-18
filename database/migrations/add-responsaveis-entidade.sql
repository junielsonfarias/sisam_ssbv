-- ============================================================================
-- MIGRATION: Responsavel como entidade propria (Fase 3.1) — ADITIVA
-- ----------------------------------------------------------------------------
-- Cria a entidade legal `responsaveis` + a ponte `aluno_responsaveis`.
-- NAO toca em `responsaveis_alunos` (vinculo do PORTAL usuarios<->alunos) nem
-- remove os campos texto de `alunos` (nome_mae/nome_pai/responsavel/
-- telefone_responsavel) — a leitura legada continua funcionando.
-- Idempotente: tabelas com IF NOT EXISTS; backfill roda UMA vez (guard).
-- ============================================================================

BEGIN;

-- Entidade legal do responsavel (pessoa fisica). Distinta de responsaveis_alunos.
CREATE TABLE IF NOT EXISTS responsaveis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(255) NOT NULL,
  cpf             VARCHAR(11),              -- so digitos; unico quando informado
  telefone        VARCHAR(20),
  email           VARCHAR(255),
  data_nascimento DATE,
  -- Vinculo OPCIONAL com o usuario do portal (quando o responsavel tem login).
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CPF unico apenas quando preenchido (varios NULL permitidos).
CREATE UNIQUE INDEX IF NOT EXISTS uq_responsaveis_cpf
  ON responsaveis(cpf) WHERE cpf IS NOT NULL AND cpf <> '';
CREATE INDEX IF NOT EXISTS idx_responsaveis_nome ON responsaveis(nome);
CREATE INDEX IF NOT EXISTS idx_responsaveis_usuario
  ON responsaveis(usuario_id) WHERE usuario_id IS NOT NULL;

-- Ponte aluno <-> responsavel (entidade legal). Distinta de responsaveis_alunos.
CREATE TABLE IF NOT EXISTS aluno_responsaveis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  responsavel_id  UUID NOT NULL REFERENCES responsaveis(id) ON DELETE CASCADE,
  parentesco      VARCHAR(30) NOT NULL DEFAULT 'responsavel'
    CHECK (parentesco IN ('mae','pai','responsavel','avo','tio','irmao','outro')),
  principal       BOOLEAN NOT NULL DEFAULT FALSE,  -- contato prioritario
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, responsavel_id)
);

CREATE INDEX IF NOT EXISTS idx_aluno_resp_aluno ON aluno_responsaveis(aluno_id, ativo);
CREATE INDEX IF NOT EXISTS idx_aluno_resp_responsavel ON aluno_responsaveis(responsavel_id);

COMMENT ON TABLE responsaveis IS
  'Entidade legal do responsavel (nome/cpf/contato). Distinta de responsaveis_alunos (vinculo do portal usuarios<->alunos).';
COMMENT ON TABLE aluno_responsaveis IS
  'Ponte aluno <-> responsavel (entidade legal). Origem: backfill dos campos texto de alunos. NAO confundir com responsaveis_alunos (portal).';

-- ----------------------------------------------------------------------------
-- BACKFILL (roda UMA vez — guard por aluno_responsaveis vazio).
-- Cria 1 responsavel por campo texto preenchido e vincula. Sem dedupe entre
-- alunos (homonimos/irmaos geram registros separados — merge fica para o
-- cadastro estruturado com CPF, na UI). O telefone vai para o contato principal.
-- ----------------------------------------------------------------------------
DO $$
DECLARE a RECORD; v_id UUID; v_principal BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM aluno_responsaveis) THEN
    RAISE NOTICE 'aluno_responsaveis ja populado — backfill ignorado';
    RETURN;
  END IF;

  FOR a IN
    SELECT id, nome_mae, nome_pai, responsavel, telefone_responsavel FROM alunos
  LOOP
    v_principal := FALSE;

    -- Mae (contato principal por padrao)
    IF a.nome_mae IS NOT NULL AND btrim(a.nome_mae) <> '' THEN
      INSERT INTO responsaveis (nome, telefone)
        VALUES (btrim(a.nome_mae), a.telefone_responsavel)
        RETURNING id INTO v_id;
      INSERT INTO aluno_responsaveis (aluno_id, responsavel_id, parentesco, principal)
        VALUES (a.id, v_id, 'mae', TRUE);
      v_principal := TRUE;
    END IF;

    -- Pai
    IF a.nome_pai IS NOT NULL AND btrim(a.nome_pai) <> '' THEN
      INSERT INTO responsaveis (nome, telefone)
        VALUES (btrim(a.nome_pai), CASE WHEN v_principal THEN NULL ELSE a.telefone_responsavel END)
        RETURNING id INTO v_id;
      INSERT INTO aluno_responsaveis (aluno_id, responsavel_id, parentesco, principal)
        VALUES (a.id, v_id, 'pai', NOT v_principal);
      v_principal := TRUE;
    END IF;

    -- Responsavel generico (apenas se distinto de mae/pai por nome)
    IF a.responsavel IS NOT NULL AND btrim(a.responsavel) <> ''
       AND btrim(lower(a.responsavel)) NOT IN (
             btrim(lower(COALESCE(a.nome_mae, ''))),
             btrim(lower(COALESCE(a.nome_pai, '')))
           ) THEN
      INSERT INTO responsaveis (nome, telefone)
        VALUES (btrim(a.responsavel), CASE WHEN v_principal THEN NULL ELSE a.telefone_responsavel END)
        RETURNING id INTO v_id;
      INSERT INTO aluno_responsaveis (aluno_id, responsavel_id, parentesco, principal)
        VALUES (a.id, v_id, 'responsavel', NOT v_principal);
      v_principal := TRUE;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill de responsaveis concluido.';
END $$;

COMMIT;
