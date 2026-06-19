-- ============================================================================
-- separar-fila-espera-publica.sql
-- Data: 2026-06-19
-- Auditoria: A1 — separar a fila de espera PÚBLICA da fila de espera CANÔNICA.
--
-- CONTEXTO DO PROBLEMA
--   A tabela `fila_espera` nasceu (2026-03-14, add-controle-vagas-notificacoes)
--   com contrato CANÔNICO: aluno_id/turma_id/escola_id NOT NULL, status em
--   ('aguardando','convocado','matriculado','desistente'), UNIQUE(aluno_id, turma_id).
--   Para acomodar uma fila PÚBLICA (interessados sem aluno/turma cadastrados),
--   a tabela foi AFROUXADA: aluno_id/turma_id viraram NULLABLE, o CHECK de status
--   foi removido e colunas de texto livre (aluno_nome/responsavel_nome/telefone/
--   serie/ano_letivo) foram adicionadas. Isso misturou dois contratos numa só
--   tabela e enfraqueceu a integridade da fila canônica.
--
-- O QUE ESTA MIGRATION FAZ
--   1. Cria `fila_espera_publica` (contrato público: identifica por texto livre,
--      sem FK obrigatória a aluno/turma) — a Rota B passa a gravar AQUI.
--   2. Restaura `fila_espera` ao contrato canônico (NOT NULL + CHECK de status).
--
-- IDEMPOTÊNCIA
--   Tudo é re-executável: CREATE TABLE/INDEX IF NOT EXISTS, ENABLE RLS é no-op se
--   já habilitado, e o CHECK só é adicionado se ainda não existir (consulta a
--   pg_constraint dentro de bloco DO $$). O SET NOT NULL é idempotente no Postgres.
--
-- SEGURANÇA / VALIDAÇÃO
--   Validado contra a DEMO (Supabase tbbnswuqsqhulserwtcc): `fila_espera` está
--   VAZIA (0 linhas) → restaurar NOT NULL é seguro, NÃO há migração de dados.
--   ⚠️ PRODUÇÃO (cjxejpgtuuqnbczpbdfe) deve ser VERIFICADA antes de aplicar lá:
--      se houver linhas com aluno_id/turma_id NULL, esta migration ABORTA
--      (RAISE EXCEPTION) — nesse caso é preciso primeiro mover esses registros
--      para `fila_espera_publica` e só então rodar a restauração canônica.
--
-- RLS
--   `fila_espera_publica` segue o MESMO padrão de `fila_espera` e das demais
--   tabelas legadas (enable-rls-tabelas-legadas.sql, BD-6): RLS HABILITADA SEM
--   POLICY. O app acessa via service_role do pool (database/connection.ts), que
--   BYPASSA RLS por design; anon/authenticated (PostgREST) ficam sem qualquer
--   acesso = defesa em profundidade. NÃO se cria policy pública aqui (não há
--   esse padrão em fila_espera; criar uma seria inventar contrato novo).
--
-- ⚠️ ACOPLAMENTO CÓDIGO ↔ SCHEMA (LER ANTES DE APLICAR)
--   Após esta migration, `fila_espera` REJEITA INSERT sem aluno_id/turma_id
--   (NOT NULL) e com status fora do CHECK canônico. A Rota B
--   (app/api/admin/fila-espera/route.ts) hoje grava dados de fila PÚBLICA
--   (texto livre, sem aluno/turma) e PRECISA ser re-apontada para
--   `fila_espera_publica` ANTES de voltar a receber tráfego — caso contrário
--   quebra com erro de NOT NULL/CHECK. O `implementador-sisam` fará esse
--   re-apontamento. ORDEM SEGURA: re-apontar a rota → depois aplicar esta migration
--   (ou aplicar em janela sem tráfego e subir o código re-apontado em seguida).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PARTE 1 — Criar a fila pública (contrato público)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fila_espera_publica (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_nome      VARCHAR(255) NOT NULL,
  responsavel_nome VARCHAR(255),
  telefone        VARCHAR(50),
  escola_id       UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  serie           VARCHAR(100),
  ano_letivo      VARCHAR(20),
  posicao         INTEGER NOT NULL DEFAULT 1,
  status          VARCHAR(20) NOT NULL DEFAULT 'aguardando'
                    CHECK (status IN ('aguardando', 'aprovado', 'rejeitado', 'matriculado')),
  observacao      TEXT,
  data_entrada    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_resolucao  TIMESTAMP,
  criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice de apoio às consultas por escola + status (listagem da fila pública).
CREATE INDEX IF NOT EXISTS idx_fila_espera_publica_escola_status
  ON public.fila_espera_publica (escola_id, status);

-- Trigger de atualizado_em — reutiliza a MESMA função já existente da fila
-- canônica (atualizar_timestamp_fila_espera), criada em
-- add-controle-vagas-notificacoes.sql. DROP+CREATE garante idempotência.
DROP TRIGGER IF EXISTS trigger_atualizar_fila_espera_publica ON public.fila_espera_publica;
CREATE TRIGGER trigger_atualizar_fila_espera_publica
  BEFORE UPDATE ON public.fila_espera_publica
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_fila_espera();

-- RLS: mesmo padrão das tabelas legadas (habilitar SEM policy).
ALTER TABLE public.fila_espera_publica ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fila_espera_publica IS
  'Fila de espera PÚBLICA (interessados por texto livre, sem FK a aluno/turma). '
  'Gravada pela Rota B (app/api/admin/fila-espera). RLS habilitada sem policy — '
  'acesso só via service_role do pool (defesa em profundidade, padrão BD-6).';

-- ----------------------------------------------------------------------------
-- PARTE 2 — Restaurar fila_espera ao contrato canônico
-- ----------------------------------------------------------------------------

-- 2.1 Diagnóstico defensivo: a tabela deveria estar vazia (validado na demo).
--     Se houver linha com aluno_id/turma_id NULL, ABORTA — não fazemos DELETE
--     cego; é preciso migrar esses registros para fila_espera_publica antes.
DO $$
DECLARE
  v_total      BIGINT;
  v_orfaos     BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.fila_espera;
  SELECT COUNT(*) INTO v_orfaos
    FROM public.fila_espera
    WHERE aluno_id IS NULL OR turma_id IS NULL;

  RAISE NOTICE '[A1] fila_espera: % linha(s) no total; % com aluno_id/turma_id NULL.',
    v_total, v_orfaos;

  IF v_orfaos > 0 THEN
    RAISE EXCEPTION
      '[A1] ABORTANDO: % linha(s) em fila_espera com aluno_id/turma_id NULL. '
      'Esses registros pertencem à fila PÚBLICA e precisam ser movidos para '
      'fila_espera_publica ANTES de restaurar o contrato canônico (NOT NULL). '
      'Faça a separação de dados primeiro e rode esta migration novamente.',
      v_orfaos;
  END IF;
END $$;

-- 2.2 Restaurar NOT NULL nas FKs canônicas (seguro: sem linhas órfãs, garantido em 2.1).
ALTER TABLE public.fila_espera ALTER COLUMN aluno_id SET NOT NULL;
ALTER TABLE public.fila_espera ALTER COLUMN turma_id SET NOT NULL;

-- 2.3 Restaurar o CHECK canônico de status — só cria se ainda não existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fila_espera_status_check'
      AND conrelid = 'public.fila_espera'::regclass
  ) THEN
    ALTER TABLE public.fila_espera
      ADD CONSTRAINT fila_espera_status_check
      CHECK (status IN ('aguardando', 'convocado', 'matriculado', 'desistente'));
    RAISE NOTICE '[A1] CHECK fila_espera_status_check criado.';
  ELSE
    RAISE NOTICE '[A1] CHECK fila_espera_status_check já existia — nada a fazer.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 3 — Verificação final
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_aluno_nn   BOOLEAN;
  v_turma_nn   BOOLEAN;
  v_tem_publica BOOLEAN;
  v_tem_check  BOOLEAN;
BEGIN
  -- fila_espera: aluno_id e turma_id devem estar NOT NULL.
  SELECT (is_nullable = 'NO') INTO v_aluno_nn
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fila_espera'
      AND column_name = 'aluno_id';

  SELECT (is_nullable = 'NO') INTO v_turma_nn
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fila_espera'
      AND column_name = 'turma_id';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fila_espera_publica'
  ) INTO v_tem_publica;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fila_espera_status_check'
      AND conrelid = 'public.fila_espera'::regclass
  ) INTO v_tem_check;

  IF NOT v_aluno_nn OR NOT v_turma_nn THEN
    RAISE EXCEPTION '[A1] FALHA: fila_espera.aluno_id/turma_id não ficaram NOT NULL.';
  END IF;
  IF NOT v_tem_publica THEN
    RAISE EXCEPTION '[A1] FALHA: tabela fila_espera_publica não foi criada.';
  END IF;
  IF NOT v_tem_check THEN
    RAISE EXCEPTION '[A1] FALHA: CHECK de status canônico ausente em fila_espera.';
  END IF;

  RAISE NOTICE '[A1] OK: fila_espera (aluno_id/turma_id NOT NULL + CHECK status canônico) '
               'e fila_espera_publica presentes. Reconciliação concluída.';
END $$;

COMMIT;
