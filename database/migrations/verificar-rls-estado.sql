-- ============================================================================
-- verificar-rls-estado.sql  (SOMENTE LEITURA — não altera nada)
-- Data: 2026-06-17
--
-- Diagnóstico do estado de Row Level Security do banco SISAM.
-- Rode no SQL Editor do Supabase ANTES e DEPOIS de aplicar
-- `enable-rls-cobertura-total.sql`.
--
-- O passo 1 é o GATE DE SEGURANÇA: confirma que o role usado pelo app
-- (postgres / service_role) tem BYPASSRLS. Se NÃO tiver, NÃO aplique a
-- migration de cobertura — habilitar RLS sem policies negaria todas as
-- queries do app e derrubaria o sistema.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) GATE DE SEGURANÇA — o role do app bypassa RLS?
--    Esperado: 'postgres' e 'service_role' com rolbypassrls = true.
-- ----------------------------------------------------------------------------
SELECT
  rolname                                   AS role,
  rolbypassrls                              AS bypassa_rls,
  CASE WHEN rolbypassrls
       THEN '✅ seguro — RLS não afeta este role'
       ELSE '⛔ PERIGO — habilitar RLS quebraria queries deste role'
  END                                       AS veredito
FROM pg_roles
WHERE rolname IN ('postgres', 'service_role', 'supabase_admin',
                  'authenticator', 'authenticated', 'anon')
ORDER BY rolbypassrls DESC, rolname;

-- ----------------------------------------------------------------------------
-- 2) RESUMO — quantas tabelas de public têm / não têm RLS
-- ----------------------------------------------------------------------------
SELECT
  count(*)                                              AS total_tabelas,
  count(*) FILTER (WHERE rowsecurity)                   AS com_rls,
  count(*) FILTER (WHERE NOT rowsecurity)               AS sem_rls,
  round(100.0 * count(*) FILTER (WHERE rowsecurity) / NULLIF(count(*), 0), 1)
                                                        AS pct_cobertura
FROM pg_tables
WHERE schemaname = 'public';

-- ----------------------------------------------------------------------------
-- 3) GAPS — tabelas de public que AINDA NÃO têm RLS (o que falta cobrir)
-- ----------------------------------------------------------------------------
SELECT tablename AS tabela_sem_rls
FROM pg_tables
WHERE schemaname = 'public' AND NOT rowsecurity
ORDER BY tablename;

-- ----------------------------------------------------------------------------
-- 4) RLS HABILITADO porém SEM POLICY — para roles que NÃO bypassam, isto
--    significa "nega tudo". Para o app (bypassa) é indiferente. Use esta
--    lista para saber onde criar policies de leitura pública, SE algum dia
--    o sistema passar a ler via anon/PostgREST (hoje não lê).
-- ----------------------------------------------------------------------------
SELECT t.tablename AS tabela_rls_sem_policy
FROM pg_tables t
LEFT JOIN pg_policies p
       ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- ----------------------------------------------------------------------------
-- 5) EXPOSIÇÃO via API REST — grants diretos a anon/authenticated.
--    Idealmente vazio (o app não usa a API REST do Supabase). Qualquer linha
--    aqui é uma porta que o RLS passa a proteger após a migration.
-- ----------------------------------------------------------------------------
SELECT grantee, table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
GROUP BY grantee, table_name
ORDER BY grantee, table_name;
