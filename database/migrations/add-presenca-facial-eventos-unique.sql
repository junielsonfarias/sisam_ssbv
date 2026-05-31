-- ============================================================================
-- add-presenca-facial-eventos-unique.sql
-- Data: 2026-05-31 (auditoria)
--
-- Anti-race: sem UNIQUE constraint, 2 scans paralelos do mesmo aluno no
-- mesmo timestamp poderiam ambos passar pela classificacao com ultimo=null
-- e ambos serem inseridos como 'entrada' (dois eventos identicos).
--
-- Com UNIQUE (aluno_id, registrado_em), o segundo INSERT vira erro 23505
-- que o caller trata (ou retenta com uma nova classificacao).
-- ============================================================================

BEGIN;

ALTER TABLE presenca_facial_eventos
  ADD CONSTRAINT presenca_facial_eventos_aluno_registrado_em_key
  UNIQUE (aluno_id, registrado_em);

COMMIT;
