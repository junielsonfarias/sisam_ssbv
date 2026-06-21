-- Migration: Sanear resultados_consolidados órfãos (sem resultados_provas correspondente)
-- Data: 2026-06-21
-- Autoria/Auditoria: ADR-003 follow-up (qualidade de dados) — aplicado em educanet-demo (tbbnswuqsqhulserwtcc).
-- Motivo:
--   O seed de massa de demonstração inseriu linhas em resultados_consolidados para
--   24 alunos DEMO (codigo DEMO-AL-0001..0024, origem 'gestor', séries 5/7/9) com
--   notas fabricadas, SEM gerar as linhas correspondentes em resultados_provas (1 por
--   questão). O resultado são 48 consolidados (24 alunos × 2 avaliações) órfãos:
--   total_questoes_respondidas = 0/NULL e nenhuma prova por questão lastreando a média.
--   Isso polui dashboards e relatórios do SISAM (médias sem base de respostas).
--
-- Critério de órfão (preciso): linha de resultados_consolidados para a qual NÃO existe
--   nenhuma linha em resultados_provas com o MESMO par (aluno_id, avaliacao_id).
--   A unicidade do pipeline é (aluno_id, avaliacao_id) em consolidados e
--   (aluno_id, questao_codigo, avaliacao_id) em provas — daí o par usado no WHERE.
--
-- Segurança:
--   - resultados_consolidados é tabela-folha: nenhuma FK aponta para ela (verificado).
--   - Volume baixo (48 linhas), banco demo, produção desvinculada.
--   - Idempotente: re-execução não afeta nada se já não houver órfãos.
--   - Defensivo: diagnóstico (RAISE NOTICE) antes, verificação final (RAISE EXCEPTION)
--     se a remoção não convergir para zero órfãos.
--
-- NÃO destrutivo para dados legítimos: a cláusula NOT EXISTS preserva 100% dos
--   consolidados que possuem provas correspondentes (2.464 linhas válidas).

BEGIN;

-- Diagnóstico: quantos serão afetados
DO $$
DECLARE
  total_orfaos INTEGER;
  alunos_orfaos INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'resultados_consolidados'
  ) THEN
    RAISE NOTICE 'Tabela resultados_consolidados não existe — nada a sanear.';
    RETURN;
  END IF;

  SELECT COUNT(*), COUNT(DISTINCT aluno_id)
    INTO total_orfaos, alunos_orfaos
  FROM resultados_consolidados rc
  WHERE NOT EXISTS (
    SELECT 1 FROM resultados_provas rp
    WHERE rp.aluno_id = rc.aluno_id
      AND rp.avaliacao_id = rc.avaliacao_id
  );

  RAISE NOTICE 'Consolidados órfãos a remover: % linhas (% alunos distintos).',
    total_orfaos, alunos_orfaos;
END $$;

-- Saneamento: remover apenas os consolidados sem prova correspondente
DELETE FROM resultados_consolidados rc
WHERE NOT EXISTS (
  SELECT 1 FROM resultados_provas rp
  WHERE rp.aluno_id = rc.aluno_id
    AND rp.avaliacao_id = rc.avaliacao_id
);

-- Verificação final: deve restar ZERO órfão
DO $$
DECLARE
  restantes INTEGER;
BEGIN
  SELECT COUNT(*) INTO restantes
  FROM resultados_consolidados rc
  WHERE NOT EXISTS (
    SELECT 1 FROM resultados_provas rp
    WHERE rp.aluno_id = rc.aluno_id
      AND rp.avaliacao_id = rc.avaliacao_id
  );

  IF restantes <> 0 THEN
    RAISE EXCEPTION 'Saneamento não convergiu: ainda restam % consolidados órfãos.', restantes;
  END IF;

  RAISE NOTICE 'Saneamento concluído: 0 consolidados órfãos restantes.';
END $$;

COMMIT;
