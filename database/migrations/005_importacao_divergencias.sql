-- SISAM - Migration: Tabela de Divergências de Importação (ADR-001 match-only)
-- Data: 2026-06-21
-- Objetivo:
--   Criar a tabela dedicada `importacao_divergencias` para o ETL Sisam em modo
--   match-only (estrito): quando o ETL NÃO encontra o registro mestre (turma ou
--   aluno) por chave, ele registra uma divergência aqui em vez de criar o mestre.
--   O cadastro mestre é responsabilidade exclusiva do módulo Gestor Escolar.
--
--   Chaves de correspondência usadas nesta etapa (match fraco, sem PII):
--     - turma: código + escola + ano letivo
--     - aluno: nome normalizado + escola + turma + ano letivo
--   A chave forte CPF/INEP fica como refinamento futuro (ADR-002).
--
-- Aditiva e idempotente: apenas CREATE ... IF NOT EXISTS. Não dropa nada em uso.
--
-- Rollback:
--   DROP TABLE IF EXISTS importacao_divergencias;
--   (os índices caem junto com a tabela)

BEGIN;

CREATE TABLE IF NOT EXISTS importacao_divergencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    importacao_id UUID REFERENCES importacoes(id) ON DELETE CASCADE,
    -- Tipo do mestre ausente: 'turma' | 'aluno'
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('turma', 'aluno')),
    -- Dados do ETL (linha proposta) que não casou com mestre — sem PII sensível.
    dado_etl JSONB NOT NULL,
    -- Descrição textual da chave tentada na correspondência (ex.: codigo+escola+ano).
    chave_tentada TEXT,
    -- Estado da triagem: 'pendente' (default) | 'vinculado' | 'ignorado'
    status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'vinculado', 'ignorado')),
    -- Registro mestre ao qual a divergência foi vinculada (quando resolvida).
    vinculado_a_id UUID,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvido_em TIMESTAMP,
    resolvido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para a tela de triagem (filtro por importação, tipo e status pendente).
CREATE INDEX IF NOT EXISTS idx_importacao_divergencias_importacao
    ON importacao_divergencias(importacao_id);

CREATE INDEX IF NOT EXISTS idx_importacao_divergencias_status
    ON importacao_divergencias(status);

CREATE INDEX IF NOT EXISTS idx_importacao_divergencias_tipo
    ON importacao_divergencias(tipo);

COMMENT ON TABLE importacao_divergencias IS
    'ADR-001: divergências do ETL match-only — turmas/alunos não encontrados no cadastro mestre (Gestor). O ETL registra aqui em vez de criar mestre.';
COMMENT ON COLUMN importacao_divergencias.tipo IS 'Tipo do mestre ausente: turma | aluno';
COMMENT ON COLUMN importacao_divergencias.dado_etl IS 'Linha proposta pelo ETL (JSON) que não casou com mestre — sem PII sensível';
COMMENT ON COLUMN importacao_divergencias.chave_tentada IS 'Descrição da chave usada na correspondência (ex.: codigo+escola+ano)';
COMMENT ON COLUMN importacao_divergencias.status IS 'Triagem: pendente | vinculado | ignorado';
COMMENT ON COLUMN importacao_divergencias.vinculado_a_id IS 'ID do registro mestre vinculado na regularização (quando status=vinculado)';

COMMIT;
