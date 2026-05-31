-- ============================================================================
-- MIGRATION: Calendario Escolar com Eventos (Fase 2 SEMED)
-- Permite registrar feriados, recessos, dias letivos efetivos por escola.
-- Base para validacao automatica de 200 dias letivos / 800h (LDB Art. 24).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS calendario_eventos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_letivo_id   UUID NOT NULL REFERENCES anos_letivos(id) ON DELETE CASCADE,
  -- Escola_id NULL = aplica a todas as escolas do municipio
  escola_id       UUID REFERENCES escolas(id) ON DELETE CASCADE,
  tipo            VARCHAR(30) NOT NULL CHECK (tipo IN (
    'letivo',           -- dia letivo regular
    'feriado_nacional',
    'feriado_estadual',
    'feriado_municipal',
    'feriado_religioso',
    'recesso',
    'planejamento',     -- dia letivo nao-aula (planejamento docente)
    'conselho_classe',
    'reuniao_pais',
    'evento_pedagogico',
    'paralisacao',
    'reposicao'         -- dia extra para repor aulas perdidas
  )),
  data            DATE NOT NULL,
  titulo          VARCHAR(255) NOT NULL,
  descricao       TEXT,
  -- Conta como dia letivo? (feriados/recessos = false)
  conta_dia_letivo BOOLEAN NOT NULL DEFAULT FALSE,
  -- Quantas horas de aula este dia contabiliza (0 para feriados)
  carga_horaria   NUMERIC(4,1) NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ano_letivo_id, escola_id, data)
);

CREATE INDEX IF NOT EXISTS idx_calevt_ano ON calendario_eventos(ano_letivo_id);
CREATE INDEX IF NOT EXISTS idx_calevt_escola ON calendario_eventos(escola_id) WHERE escola_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calevt_data ON calendario_eventos(data);
CREATE INDEX IF NOT EXISTS idx_calevt_tipo ON calendario_eventos(tipo);

COMMENT ON TABLE calendario_eventos IS
  'Eventos do calendario escolar: feriados, recessos, dias letivos especiais. Base para calculo de dias letivos efetivos.';

COMMENT ON COLUMN calendario_eventos.escola_id IS
  'NULL = aplica a todas as escolas. Especifico = apenas a escola informada.';

-- Funcao auxiliar: calcula dias letivos efetivos no periodo para uma escola
CREATE OR REPLACE FUNCTION contar_dias_letivos(
  p_ano_letivo_id UUID,
  p_escola_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE
) RETURNS INTEGER AS $$
DECLARE
  v_dia DATE;
  v_total INTEGER := 0;
  v_eh_feriado BOOLEAN;
  v_eh_letivo BOOLEAN;
BEGIN
  v_dia := p_data_inicio;
  WHILE v_dia <= p_data_fim LOOP
    -- Sabados e domingos nao sao letivos por padrao
    IF EXTRACT(DOW FROM v_dia) NOT IN (0, 6) THEN
      -- Verifica se ha evento neste dia para esta escola (ou geral)
      SELECT NOT bool_or(NOT conta_dia_letivo), bool_or(conta_dia_letivo)
        INTO v_eh_feriado, v_eh_letivo
        FROM calendario_eventos
       WHERE ano_letivo_id = p_ano_letivo_id
         AND data = v_dia
         AND (escola_id = p_escola_id OR escola_id IS NULL);

      -- Se ha evento de reposicao, conta letivo. Se ha feriado/recesso, nao conta.
      IF v_eh_letivo IS TRUE THEN
        v_total := v_total + 1;
      ELSIF v_eh_feriado IS NOT FALSE THEN
        -- Sem evento -> conta como dia letivo regular
        v_total := v_total + 1;
      END IF;
    -- Sabado letivo (evento explicito): conta
    ELSIF EXISTS(SELECT 1 FROM calendario_eventos
                  WHERE ano_letivo_id = p_ano_letivo_id
                    AND data = v_dia
                    AND conta_dia_letivo = TRUE
                    AND (escola_id = p_escola_id OR escola_id IS NULL)) THEN
      v_total := v_total + 1;
    END IF;

    v_dia := v_dia + 1;
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION contar_dias_letivos IS
  'Conta dias letivos efetivos no periodo, considerando feriados/recessos do calendario e reposicoes. Exclui fim de semana (exceto sabado letivo explicito).';

COMMIT;
