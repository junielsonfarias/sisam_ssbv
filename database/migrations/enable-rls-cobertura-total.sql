-- ============================================================================
-- enable-rls-cobertura-total.sql
-- Data: 2026-06-17
-- Auditoria: fecha o BLOQUEADOR de produção "RLS incompleto" (CHECKLIST-PRODUCAO
--            itens 4 e 9). Sucessora de `enable-rls-tabelas-legadas.sql`.
--
-- OBJETIVO
--   Garantir 100% de cobertura de Row Level Security em `public`, incluindo
--   tabelas sensíveis que ficaram de fora das migrations anteriores —
--   notadamente `usuarios` (que recebeu apenas COMMENT, sem ENABLE RLS),
--   `usuarios_2fa`, `refresh_tokens`, `responsaveis_alunos`,
--   `presenca_facial_eventos`, além de quaisquer tabelas criadas via MCP que
--   não estejam em arquivos de migration locais.
--
-- POR QUE NÃO QUEBRA O APP (premissas validadas no código em 2026-06-17)
--   1. Todo acesso ao banco é via `pg` pool como role `postgres.<projeto>`
--      (service_role), que tem BYPASSRLS — RLS é ignorado para o app.
--   2. O projeto NÃO usa `@supabase/supabase-js` nem a chave `anon`
--      (dependência ausente em package.json) — nada lê via PostgREST/anon.
--      Logo, habilitar RLS SEM policies não remove nenhum acesso legítimo.
--   => O efeito prático é apenas defesa em profundidade: se um dia a chave
--      anon for usada, ou o pool vazar, o acesso direto fica barrado.
--
-- ESTRATÉGIA
--   - GATE de segurança: aborta a transação inteira se nenhum role de
--     aplicação tiver BYPASSRLS (evita o cenário catastrófico de negar tudo).
--   - Habilita RLS dinamicamente em TODA tabela de `public` que ainda não tem.
--   - Idempotente: rodar novamente não altera nada (só pega o que falta).
--
-- COMO APLICAR
--   1. Rode `verificar-rls-estado.sql` (passo 1) e confirme bypassa_rls = true.
--   2. Aplique este arquivo (Supabase Dashboard → SQL Editor, ou apply_migration).
--   3. Rode `verificar-rls-estado.sql` de novo: pct_cobertura deve ser 100.0
--      e a lista de "tabela_sem_rls" deve estar vazia.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- GATE DE SEGURANÇA
-- Aborta se nenhum role de aplicação bypassa RLS. Sem isto, habilitar RLS sem
-- policies negaria todas as queries do app.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bypass boolean;
BEGIN
  SELECT bool_or(rolbypassrls) INTO v_bypass
  FROM pg_roles
  WHERE rolname IN ('postgres', 'service_role', 'supabase_admin');

  IF v_bypass IS DISTINCT FROM true THEN
    RAISE EXCEPTION
      'ABORTADO: nenhum role de aplicação (postgres/service_role/supabase_admin) '
      'tem BYPASSRLS. Habilitar RLS quebraria as queries do app. Revise a '
      'estratégia (criar policies permissivas para o role do app) antes de aplicar.';
  END IF;

  RAISE NOTICE 'Gate OK: role de aplicação bypassa RLS — seguro habilitar.';
END $$;

-- ----------------------------------------------------------------------------
-- COBERTURA TOTAL
-- Habilita RLS em toda tabela de `public` que ainda não tem (idempotente).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r        record;
  v_count  int := 0;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND NOT rowsecurity
    ORDER BY tablename
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'RLS habilitado: %', r.tablename;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Concluído. Tabelas com RLS recém-habilitado nesta execução: %', v_count;
END $$;

COMMENT ON TABLE public.usuarios IS
  'RLS habilitada (cobertura-total 2026-06-17) — autorizacao primaria via withAuth; service_role bypassa.';

COMMIT;
