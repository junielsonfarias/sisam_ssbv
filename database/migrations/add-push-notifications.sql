-- ============================================
-- MIGRACAO: Push Notifications (Firebase FCM)
-- Data: 2026-04-02
-- ============================================
--
-- CONTEXTO:
-- Armazena tokens de dispositivos para envio de push notifications
-- via Firebase Cloud Messaging. Cada usuario pode ter varios
-- dispositivos registrados (celular, tablet, computador).
--
-- IMPACTO:
-- - 1 nova tabela (dispositivos_push)
-- - Atualizar CHECK de tipos na tabela notificacoes
-- ============================================

-- ============================================
-- TABELA: dispositivos_push
-- Tokens FCM dos dispositivos dos usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS dispositivos_push (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    plataforma VARCHAR(20) NOT NULL DEFAULT 'web'
        CHECK (plataforma IN ('web', 'android', 'ios')),
    navegador VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    ultimo_uso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Mesmo token nao pode ser registrado 2x
    UNIQUE(token)
);

CREATE INDEX IF NOT EXISTS idx_push_usuario ON dispositivos_push(usuario_id, ativo);
CREATE INDEX IF NOT EXISTS idx_push_token ON dispositivos_push(token);

DROP TRIGGER IF EXISTS update_dispositivos_push_updated_at ON dispositivos_push;
CREATE TRIGGER update_dispositivos_push_updated_at BEFORE UPDATE ON dispositivos_push
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Atualizar tipos de notificacao para incluir novos tipos
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'notificacoes_tipo_check'
        AND table_name = 'notificacoes'
    ) THEN
        ALTER TABLE notificacoes DROP CONSTRAINT notificacoes_tipo_check;
    END IF;

    ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_check
        CHECK (tipo IN (
            'infrequencia', 'nota_baixa', 'prazo_conselho', 'transferencia',
            'fila_espera', 'recuperacao', 'geral',
            'periodo_aberto', 'resultados_publicados', 'aviso_admin', 'prazo_notas',
            'nova_nota', 'falta_registrada', 'nova_mensagem', 'novo_comunicado'
        ));

    RAISE NOTICE 'CHECK constraint de notificacoes atualizada com novos tipos';
END $$;

-- Adicionar responsavel como destinatario valido
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'notificacoes_destinatario_tipo_check'
        AND table_name = 'notificacoes'
    ) THEN
        ALTER TABLE notificacoes DROP CONSTRAINT notificacoes_destinatario_tipo_check;
    END IF;

    ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_destinatario_tipo_check
        CHECK (destinatario_tipo IN ('administrador', 'tecnico', 'polo', 'escola', 'professor', 'responsavel'));

    RAISE NOTICE 'CHECK constraint de destinatario atualizada com responsavel';
END $$;

-- ============================================
-- VERIFICACAO
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO PUSH NOTIFICATIONS CONCLUIDA ===';
    RAISE NOTICE 'Tabela criada: dispositivos_push';
    RAISE NOTICE 'Tipos de notificacao atualizados';
END $$;
