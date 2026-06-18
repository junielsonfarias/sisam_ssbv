-- ============================================================================
-- REMOÇÃO DOS DADOS DE DEMONSTRAÇÃO (Educanet)
-- ----------------------------------------------------------------------------
-- Remove TODOS os dados fictícios criados por scripts/seed/seed-demo.js.
-- Marcadores: polo.codigo='DEMO' (e tudo abaixo dele) + usuários '*.demo@educanet.app'.
-- Idempotente e seguro: não toca em nenhum dado real. Ordem respeita as FKs.
--
-- Uso: rodar este SQL no banco de demonstração quando quiser encerrar a demo.
-- (Depois, desligar a env NEXT_PUBLIC_DEMO_MODE no deploy.)
-- ============================================================================

BEGIN;

DELETE FROM notas_escolares WHERE escola_id IN
  (SELECT e.id FROM escolas e JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM frequencia_bimestral WHERE escola_id IN
  (SELECT e.id FROM escolas e JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM resultados_consolidados WHERE escola_id IN
  (SELECT e.id FROM escolas e JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM tarefas_turma WHERE turma_id IN
  (SELECT t.id FROM turmas t JOIN escolas e ON e.id = t.escola_id JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM notificacoes WHERE aluno_id IN
  (SELECT a.id FROM alunos a JOIN escolas e ON e.id = a.escola_id JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO')
  OR destinatario_id IN (SELECT id FROM usuarios WHERE email LIKE '%.demo@educanet.app');

DELETE FROM notificacoes_disparos WHERE destinatario_id IN
  (SELECT id FROM usuarios WHERE email LIKE '%.demo@educanet.app');

DELETE FROM historico_situacao WHERE aluno_id IN
  (SELECT a.id FROM alunos a JOIN escolas e ON e.id = a.escola_id JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM professor_turmas WHERE turma_id IN
  (SELECT t.id FROM turmas t JOIN escolas e ON e.id = t.escola_id JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM responsaveis_alunos WHERE aluno_id IN
  (SELECT a.id FROM alunos a JOIN escolas e ON e.id = a.escola_id JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM alunos WHERE escola_id IN
  (SELECT e.id FROM escolas e JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM turmas WHERE escola_id IN
  (SELECT e.id FROM escolas e JOIN polos p ON p.id = e.polo_id WHERE p.codigo = 'DEMO');

DELETE FROM usuarios WHERE email LIKE '%.demo@educanet.app';

DELETE FROM escolas WHERE polo_id IN (SELECT id FROM polos WHERE codigo = 'DEMO');

DELETE FROM polos WHERE codigo = 'DEMO';

COMMIT;
