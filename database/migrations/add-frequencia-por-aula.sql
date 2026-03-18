-- ============================================
-- MIGRACAO: Frequência por Hora-Aula (6º-9º Ano)
-- Data: 2026-03-17
-- ============================================
--
-- CONTEXTO:
-- Dois modelos de frequência coexistem:
-- - Creche ao 5º Ano: frequência unificada (1 presença = dia inteiro)
-- - 6º ao 9º Ano: frequência por hora-aula (6 aulas/dia por disciplina)
--
-- IMPACTO:
-- - Nova tabela horarios_aula (grade horária semanal)
-- - Nova tabela frequencia_hora_aula (presença por aula)
-- ============================================

-- ============================================
-- TABELA 1: horarios_aula
-- Grade horária semanal de cada turma
-- Define qual disciplina ocorre em cada aula de cada dia
-- ============================================
CREATE TABLE IF NOT EXISTS horarios_aula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana >= 1 AND dia_semana <= 5),
    -- 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta
    numero_aula INTEGER NOT NULL CHECK (numero_aula >= 1 AND numero_aula <= 6),
    disciplina_id UUID NOT NULL REFERENCES disciplinas_escolares(id) ON DELETE CASCADE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(turma_id, dia_semana, numero_aula)
);

CREATE INDEX IF NOT EXISTS idx_horarios_turma ON horarios_aula(turma_id);
CREATE INDEX IF NOT EXISTS idx_horarios_turma_dia ON horarios_aula(turma_id, dia_semana);

DROP TRIGGER IF EXISTS update_horarios_aula_updated_at ON horarios_aula;
CREATE TRIGGER update_horarios_aula_updated_at BEFORE UPDATE ON horarios_aula
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA 2: frequencia_hora_aula
-- Registro de presença por aula (6º-9º Ano)
-- ============================================
CREATE TABLE IF NOT EXISTS frequencia_hora_aula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    numero_aula INTEGER NOT NULL CHECK (numero_aula >= 1 AND numero_aula <= 6),
    disciplina_id UUID NOT NULL REFERENCES disciplinas_escolares(id) ON DELETE CASCADE,
    presente BOOLEAN NOT NULL DEFAULT true,
    metodo VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (metodo IN ('manual', 'facial', 'automatico')),
    registrado_por UUID REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id, data, numero_aula)
);

CREATE INDEX IF NOT EXISTS idx_fha_aluno_data ON frequencia_hora_aula(aluno_id, data);
CREATE INDEX IF NOT EXISTS idx_fha_turma_data ON frequencia_hora_aula(turma_id, data);
CREATE INDEX IF NOT EXISTS idx_fha_disciplina ON frequencia_hora_aula(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_fha_turma_data_aula ON frequencia_hora_aula(turma_id, data, numero_aula);

-- VERIFICACAO
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO FREQUENCIA POR HORA-AULA CONCLUIDA ===';
    RAISE NOTICE 'Tabelas criadas: horarios_aula, frequencia_hora_aula';
END $$;
