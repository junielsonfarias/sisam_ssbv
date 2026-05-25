-- ============================================================================
-- MIGRATION: RLS (Row Level Security) nas tabelas SEMED novas
-- Fase 5 SEMED — proteção em camada de banco para tabelas das Fases 2/3/4
--
-- ESTRATEGIA:
--   1. Habilitar RLS em todas as 49 tabelas novas
--   2. Política permissiva por padrão para `service_role` (usado pelo app via withAuth)
--   3. Política restritiva para `authenticated` e `anon`:
--      - Tabelas de leitura pública: SELECT permitido a anon (status, transparencia)
--      - Resto: nega tudo (forca uso da service_role via API server-side)
--
-- IMPORTANTE: Esta abordagem mantém a segurança em duas camadas:
--   - Aplicação (withAuth + JWT custom) — primeira linha de defesa
--   - Banco (RLS) — segunda linha de defesa
--
-- As 53 tabelas legadas (criadas antes da Fase 2) NÃO recebem RLS aqui;
-- decisão deliberada para evitar quebra de fluxos existentes.
-- ============================================================================

-- ============================================================================
-- FASE 2 — Gestão Pedagógica (BNCC, Diário, Avaliação Descritiva, AEE,
--          Calendário, Documentos, FICAI, Ed. Infantil)
-- ============================================================================

-- BNCC (consulta pública aceitável — leitura de habilidades educacionais)
ALTER TABLE bncc_competencias_gerais ENABLE ROW LEVEL SECURITY;
ALTER TABLE bncc_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bncc_areas_conhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE bncc_componentes_curriculares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bncc_unidades_tematicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bncc_habilidades ENABLE ROW LEVEL SECURITY;

-- Politica: leitura pública para BNCC (dados educacionais oficiais)
DROP POLICY IF EXISTS "bncc_select_public" ON bncc_habilidades;
CREATE POLICY "bncc_select_public" ON bncc_habilidades FOR SELECT USING (true);
DROP POLICY IF EXISTS "bncc_select_public" ON bncc_componentes_curriculares;
CREATE POLICY "bncc_select_public" ON bncc_componentes_curriculares FOR SELECT USING (true);
DROP POLICY IF EXISTS "bncc_select_public" ON bncc_etapas;
CREATE POLICY "bncc_select_public" ON bncc_etapas FOR SELECT USING (true);
DROP POLICY IF EXISTS "bncc_select_public" ON bncc_areas_conhecimento;
CREATE POLICY "bncc_select_public" ON bncc_areas_conhecimento FOR SELECT USING (true);
DROP POLICY IF EXISTS "bncc_select_public" ON bncc_competencias_gerais;
CREATE POLICY "bncc_select_public" ON bncc_competencias_gerais FOR SELECT USING (true);
DROP POLICY IF EXISTS "bncc_select_public" ON bncc_unidades_tematicas;
CREATE POLICY "bncc_select_public" ON bncc_unidades_tematicas FOR SELECT USING (true);

-- BNCC junctions (vinculações: questoes/planos/tarefas/diario)
ALTER TABLE questoes_bncc_habilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_aula_bncc_habilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_turma_bncc_habilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_classe_bncc_habilidades ENABLE ROW LEVEL SECURITY;

-- Diário de classe (já existia, mas com novos vínculos BNCC)
-- NÃO habilitamos RLS na diario_classe (legada). Apenas no junction acima.

-- Avaliações descritivas (anos iniciais e Ed. Infantil)
ALTER TABLE avaliacoes_descritivas ENABLE ROW LEVEL SECURITY;

-- Educação Infantil
ALTER TABLE ed_infantil_grupos_etarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ed_infantil_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE ed_infantil_relatorios ENABLE ROW LEVEL SECURITY;

-- Grupos etários: leitura pública (referência educacional)
DROP POLICY IF EXISTS "ei_grupos_select_public" ON ed_infantil_grupos_etarios;
CREATE POLICY "ei_grupos_select_public" ON ed_infantil_grupos_etarios FOR SELECT USING (true);

-- EJA
ALTER TABLE eja_certificacoes ENABLE ROW LEVEL SECURITY;

-- AEE / PNE
ALTER TABLE aee_salas_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos_aee ENABLE ROW LEVEL SECURITY;
ALTER TABLE aee_planos_individuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE aee_atendimentos ENABLE ROW LEVEL SECURITY;

-- Calendário escolar
ALTER TABLE calendario_eventos ENABLE ROW LEVEL SECURITY;

-- Calendário: leitura pública (datas escolares são informação pública)
DROP POLICY IF EXISTS "calendario_select_public" ON calendario_eventos;
CREATE POLICY "calendario_select_public" ON calendario_eventos FOR SELECT USING (true);

-- Documentos emitidos + validações públicas
ALTER TABLE documentos_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_validacoes_log ENABLE ROW LEVEL SECURITY;

-- FICAI
ALTER TABLE ficai_casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ficai_acoes ENABLE ROW LEVEL SECURITY;

-- LGPD solicitações (já existia da Fase 1)
ALTER TABLE lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;

-- 2FA (Fase 1)
ALTER TABLE usuarios_2fa ENABLE ROW LEVEL SECURITY;

-- Tokens recuperação senha (Fase 1)
ALTER TABLE tokens_recuperacao_senha ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FASE 3 — Programas Federais + RH + Administrativo
-- ============================================================================

-- PNAE
ALTER TABLE pnae_nutricionistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnae_cardapios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnae_refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnae_atendimentos_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnae_restricoes_alunos ENABLE ROW LEVEL SECURITY;

-- Cardápios publicados: leitura pública (responsáveis veem o cardápio)
DROP POLICY IF EXISTS "pnae_cardapio_public" ON pnae_cardapios;
CREATE POLICY "pnae_cardapio_public" ON pnae_cardapios
  FOR SELECT USING (status = 'publicado');

DROP POLICY IF EXISTS "pnae_refeicoes_public" ON pnae_refeicoes;
CREATE POLICY "pnae_refeicoes_public" ON pnae_refeicoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pnae_cardapios c
             WHERE c.id = pnae_refeicoes.cardapio_id AND c.status = 'publicado')
  );

-- PNATE
ALTER TABLE pnate_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnate_motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnate_rotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnate_paradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnate_alunos_rotas ENABLE ROW LEVEL SECURITY;

-- PNLD
ALTER TABLE pnld_titulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnld_estoque_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnld_distribuicao_aluno ENABLE ROW LEVEL SECURITY;

-- Catálogo PNLD: leitura pública (referência didática oficial FNDE)
DROP POLICY IF EXISTS "pnld_titulos_public" ON pnld_titulos;
CREATE POLICY "pnld_titulos_public" ON pnld_titulos FOR SELECT USING (true);

-- PDDE
ALTER TABLE pdde_tipos_verba ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdde_orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdde_despesas ENABLE ROW LEVEL SECURITY;

-- Tipos de verba PDDE: leitura pública (códigos FNDE oficiais)
DROP POLICY IF EXISTS "pdde_tipos_public" ON pdde_tipos_verba;
CREATE POLICY "pdde_tipos_public" ON pdde_tipos_verba FOR SELECT USING (true);

-- Bolsa Família
ALTER TABLE bolsa_familia_mapas ENABLE ROW LEVEL SECURITY;

-- RH
ALTER TABLE servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE servidor_lotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE servidor_formacoes ENABLE ROW LEVEL SECURITY;

-- Patrimônio
ALTER TABLE patrimonio_bens ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrimonio_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Biblioteca
ALTER TABLE biblioteca_acervo ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_emprestimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_reservas ENABLE ROW LEVEL SECURITY;

-- Acervo: leitura pública (catálogo escolar é informação pública)
DROP POLICY IF EXISTS "biblioteca_acervo_public" ON biblioteca_acervo;
CREATE POLICY "biblioteca_acervo_public" ON biblioteca_acervo
  FOR SELECT USING (ativo = TRUE);

-- Ordens de serviço
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico_comentarios ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FASE 4 — Observabilidade
-- ============================================================================

-- Notificações
ALTER TABLE notificacoes_disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_preferencias ENABLE ROW LEVEL SECURITY;

-- Status (incidentes públicos)
ALTER TABLE status_incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_atualizacoes ENABLE ROW LEVEL SECURITY;

-- Status page é PÚBLICA — qualquer um vê incidentes
DROP POLICY IF EXISTS "status_inc_public" ON status_incidentes;
CREATE POLICY "status_inc_public" ON status_incidentes FOR SELECT USING (true);

DROP POLICY IF EXISTS "status_atual_public" ON status_atualizacoes;
CREATE POLICY "status_atual_public" ON status_atualizacoes FOR SELECT USING (true);

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
-- Sem políticas customizadas para INSERT/UPDATE/DELETE, RLS bloqueia
-- esses comandos para anon/authenticated. A aplicação Next.js usa
-- service_role (via DB_USER='postgres.<projeto>'), que BYPASSA RLS.
--
-- Isso significa:
--  - Leitura via anon key (cliente direto): bloqueada exceto onde houver
--    política SELECT permissiva (BNCC, calendário, cardápios publicados,
--    catálogo PNLD, tipos PDDE, biblioteca acervo, status page).
--  - Escrita via anon key: SEMPRE bloqueada nas tabelas SEMED.
--  - Leitura/escrita via aplicação (service_role): nunca afetada por RLS.
--
-- Esta é uma proteção defensiva contra vazamento da anon key.
-- ============================================================================

COMMENT ON SCHEMA public IS
  'Schema principal. RLS habilitado nas tabelas das Fases 2/3/4 SEMED (49 tabelas). 53 tabelas legadas ficam sem RLS por decisão deliberada — protegidas pelo withAuth na aplicação.';
