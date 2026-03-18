-- Detalhe dos 22 matches fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT
  ROW_NUMBER() OVER (ORDER BY similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome))) DESC, a25.nome) as "#",
  ROUND(similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome)))::numeric, 2) as similaridade,
  a25.nome as nome_2025,
  a26.nome as nome_2026,
  a25.serie as serie_2025,
  a26.serie as serie_2026,
  a25.data_nascimento as nasc_2025,
  a26.data_nascimento as nasc_2026,
  CASE WHEN a25.data_nascimento = a26.data_nascimento THEN 'MESMA' ELSE 'DIFERENTE' END as nasc_match,
  a25.responsavel as responsavel_2025,
  a26.responsavel as responsavel_2026
FROM alunos a25
CROSS JOIN alunos a26
WHERE a25.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a26.escola_id = a25.escola_id
  AND a25.ano_letivo = '2025'
  AND a26.ano_letivo = '2026'
  AND a25.id != a26.id
  AND similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome))) > 0.70
  AND UPPER(TRIM(a25.nome)) != UPPER(TRIM(a26.nome))
ORDER BY similaridade DESC, a25.nome;
