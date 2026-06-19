-- ============================================================================
-- unificar-responsaveis-etapa2-dados.sql
-- Data: 2026-06-19
-- Auditoria: 3.2 — ETAPA 2 (DADOS). Migra o vínculo legado
--            `aluno_responsaveis` (entidade `responsaveis`) para o modelo
--            unificado `responsaveis_alunos` (usuario_id). Pré-requisito:
--            etapa 1 (schema) já aplicada.
--
-- O QUE FAZ (idempotente)
--   Para cada linha de `responsaveis` (entidade legada):
--     1. Resolve a conta `usuarios` correspondente, nesta ordem:
--          a) `responsaveis.usuario_id` quando preenchido;
--          b) match por CPF normalizado (11 dígitos) em `usuarios.cpf`;
--          c) match por e-mail (lower/trim) em `usuarios.email`;
--          d) caso nada case, CRIA a conta (tipo_usuario='responsavel', senha
--             provisória bcrypt via pgcrypto — o responsável recupera por
--             "esqueci a senha"; e-mail placeholder determinístico quando não há).
--     2. Migra TODOS os vínculos desse responsável de `aluno_responsaveis`
--        para `responsaveis_alunos` com status='aprovado', origem='migracao_legado',
--        preservando parentesco→tipo_vinculo, principal, ativo e timestamps.
--        ON CONFLICT (usuario_id, aluno_id) DO NOTHING — NUNCA sobrescreve um
--        vínculo já existente do portal.
--
--   parentesco fora do domínio do CHECK atual é coagido para 'outro'.
--
-- SEGURANÇA: roda em transação; reexecutável sem duplicar (dedupe por
--   (usuario_id, aluno_id) e reuso de conta por CPF/e-mail).
-- NOTA: na DEMO as tabelas legadas estão VAZIAS → esta migration é no-op aqui;
--   o valor real é em PRODUÇÃO, onde deve ser revisada com os dados presentes.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  r              RECORD;
  v_usuario_id   uuid;
  v_cpf          text;
  v_email        text;
  v_email_final  text;
  n_contas       int := 0;
  n_vinc         int := 0;
  n_vinc_lote    int := 0;
BEGIN
  FOR r IN SELECT * FROM responsaveis LOOP
    -- Normalização defensiva
    v_cpf := NULLIF(regexp_replace(COALESCE(r.cpf, ''), '\D', '', 'g'), '');
    IF v_cpf IS NOT NULL AND length(v_cpf) <> 11 THEN
      v_cpf := NULL;
    END IF;
    v_email := NULLIF(lower(trim(COALESCE(r.email, ''))), '');

    -- (a) usuario_id já vinculado na entidade legada
    v_usuario_id := r.usuario_id;

    -- (b) match por CPF normalizado
    IF v_usuario_id IS NULL AND v_cpf IS NOT NULL THEN
      SELECT id INTO v_usuario_id
        FROM usuarios
       WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = v_cpf
       LIMIT 1;
    END IF;

    -- (c) match por e-mail
    IF v_usuario_id IS NULL AND v_email IS NOT NULL THEN
      SELECT id INTO v_usuario_id FROM usuarios WHERE lower(email) = v_email LIMIT 1;
    END IF;

    -- (d) cria a conta de responsável
    IF v_usuario_id IS NULL THEN
      v_email_final := COALESCE(
        v_email,
        'resp.' || COALESCE(v_cpf, 'leg-' || r.id::text) || '@sem-email.local'
      );
      IF EXISTS (SELECT 1 FROM usuarios WHERE lower(email) = lower(v_email_final)) THEN
        v_email_final := 'resp.leg-' || r.id::text || '@sem-email.local';
      END IF;

      INSERT INTO usuarios (nome, email, senha, tipo_usuario, cpf, telefone, data_nascimento, ativo)
      VALUES (
        r.nome,
        v_email_final,
        crypt(gen_random_uuid()::text, gen_salt('bf', 10)),
        'responsavel',
        v_cpf,
        r.telefone,
        r.data_nascimento,
        TRUE
      )
      RETURNING id INTO v_usuario_id;
      n_contas := n_contas + 1;
    ELSE
      -- completa contato faltante sem sobrescrever o que já existe
      UPDATE usuarios SET
        cpf             = COALESCE(cpf, v_cpf),
        telefone        = COALESCE(telefone, r.telefone),
        data_nascimento = COALESCE(data_nascimento, r.data_nascimento),
        atualizado_em   = NOW()
      WHERE id = v_usuario_id;
    END IF;

    -- Migra os vínculos do responsável (parentesco coagido ao domínio do CHECK)
    INSERT INTO responsaveis_alunos
      (usuario_id, aluno_id, tipo_vinculo, principal, ativo, status, origem, criado_em, atualizado_em)
    SELECT
      v_usuario_id,
      ar.aluno_id,
      CASE WHEN ar.parentesco IN ('mae','pai','responsavel','avos','avo','tio','irmao','outro')
           THEN ar.parentesco ELSE 'outro' END,
      ar.principal,
      ar.ativo,
      'aprovado',
      'migracao_legado',
      ar.criado_em,
      ar.atualizado_em
    FROM aluno_responsaveis ar
    WHERE ar.responsavel_id = r.id
    ON CONFLICT (usuario_id, aluno_id) DO NOTHING;

    GET DIAGNOSTICS n_vinc_lote = ROW_COUNT;
    n_vinc := n_vinc + n_vinc_lote;
  END LOOP;

  RAISE NOTICE 'Etapa 2 — responsaveis legados migrados: % contas criadas, % vinculos inseridos', n_contas, n_vinc;
END $$;

COMMIT;
