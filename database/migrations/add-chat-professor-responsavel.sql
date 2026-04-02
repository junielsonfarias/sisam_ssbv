-- ============================================
-- MIGRACAO: Chat Professor ↔ Responsavel
-- Data: 2026-04-02
-- ============================================
--
-- CONTEXTO:
-- Sistema de mensagens bidirecionais entre professores e pais.
-- Comunicados (comunicados_turma) continuam para avisos da turma.
-- Mensagens sao conversas 1-a-1 sobre um aluno especifico.
--
-- IMPACTO:
-- - 2 novas tabelas
-- - 6 indices
-- ============================================

-- ============================================
-- TABELA 1: threads_chat
-- Uma conversa entre professor e responsavel sobre um aluno
-- ============================================
CREATE TABLE IF NOT EXISTS threads_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    responsavel_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    -- Metadata para listar threads sem ler mensagens
    ultimo_remetente VARCHAR(30) CHECK (ultimo_remetente IN ('professor', 'responsavel')),
    ultima_mensagem TEXT,
    ultima_mensagem_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nao_lido_professor INT DEFAULT 0,
    nao_lido_responsavel INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Um thread por combinacao professor+responsavel+aluno
    UNIQUE(professor_id, responsavel_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_professor ON threads_chat(professor_id, ultima_mensagem_em DESC);
CREATE INDEX IF NOT EXISTS idx_threads_responsavel ON threads_chat(responsavel_id, ultima_mensagem_em DESC);
CREATE INDEX IF NOT EXISTS idx_threads_aluno ON threads_chat(aluno_id);

DROP TRIGGER IF EXISTS update_threads_chat_updated_at ON threads_chat;
CREATE TRIGGER update_threads_chat_updated_at BEFORE UPDATE ON threads_chat
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA 2: mensagens_chat
-- Mensagens individuais dentro de um thread
-- ============================================
CREATE TABLE IF NOT EXISTS mensagens_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES threads_chat(id) ON DELETE CASCADE,
    remetente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    remetente_tipo VARCHAR(30) NOT NULL CHECK (remetente_tipo IN ('professor', 'responsavel')),
    conteudo TEXT NOT NULL,
    lido BOOLEAN DEFAULT false,
    lido_em TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mensagens_thread ON mensagens_chat(thread_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON mensagens_chat(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_nao_lido ON mensagens_chat(thread_id, lido) WHERE lido = false;

-- ============================================
-- VERIFICACAO
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO CHAT PROFESSOR-RESPONSAVEL CONCLUIDA ===';
    RAISE NOTICE 'Tabelas criadas: threads_chat, mensagens_chat';
END $$;
