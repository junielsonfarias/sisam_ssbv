-- =============================================================================
-- Migration: fix-recuperacao-nota-final-legado
-- Objetivo : Corrigir registros legados (seed) em que a NOTA DE RECUPERAÇÃO é
--            MAIOR que a avaliação, mas a `nota_final` ficou com o valor da
--            avaliação (substituição NÃO aplicada). Esses registros foram
--            gravados sem passar por `calcularNotaFinal` (lib/services/notas/calculo.ts),
--            cuja regra padrão é substituição = MAX(nota, recuperacao).
--            No demo eram 97 linhas (rec > nota e nota_final = nota).
-- Efeito   : nota_final passa a ser GREATEST(nota, nota_recuperacao) nesses casos
--            — correção a favor do aluno, alinhada à regra 'substituicao' padrão.
-- Idempotente: SIM. Após rodar, nenhuma linha casa o WHERE (re-execução = 0 updates).
-- Rollback : não reversível automaticamente (recupera nota devida ao aluno).
-- Escopo   : apenas o banco em uso (educanet-demo). Não toca casos de média
--            ponderada (não existem: nota_final sempre era = avaliação ou = maior).
-- =============================================================================

UPDATE notas_escolares
SET nota_final = GREATEST(nota, nota_recuperacao)
WHERE nota_recuperacao IS NOT NULL
  AND nota_recuperacao > nota
  AND nota_final = nota;
