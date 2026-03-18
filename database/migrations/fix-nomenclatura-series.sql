-- Corrigir nomenclatura: "1o Ano" → "1º Ano"
UPDATE configuracao_series SET nome_serie = '1º Ano' WHERE serie = '1' AND nome_serie = '1o Ano';
UPDATE configuracao_series SET nome_serie = '4º Ano' WHERE serie = '4' AND nome_serie = '4o Ano';
UPDATE configuracao_series SET nome_serie = '6º Ano' WHERE serie = '6' AND nome_serie = '6o Ano';
UPDATE configuracao_series SET nome_serie = '7º Ano' WHERE serie = '7' AND nome_serie = '7o Ano';

-- Verificar
SELECT serie, nome_serie FROM configuracao_series ORDER BY serie::int;
