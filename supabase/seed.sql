-- ============================================================================
-- SISAM - Seed de dados iniciais para desenvolvimento local
-- Dados baseados no ambiente de producao
-- ============================================================================

-- ============================================================================
-- 1. POLOS
-- ============================================================================

INSERT INTO polos (id, nome, codigo) VALUES
  ('0eb8aeb7-fdde-488e-8e4e-8d84b7461792', 'CAETE', 'CAETE'),
  ('8d0a50ef-a2cc-424d-8467-fc2a96ef66ec', 'CIDADE', 'CIDADE'),
  ('0dee0303-62d7-4c26-8f1f-5c9e25cd66d6', 'EMMANOEL', 'EMMANOEL'),
  ('563ecd4c-7001-4b88-962d-b5f2d7578200', 'PEDRO NOGUEIRA', 'PEDRO_NOGUEIRA')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 2. ESCOLAS (5 escolas representativas)
-- ============================================================================

INSERT INTO escolas (id, nome, codigo, polo_id, municipio, uf, gestor_escolar_habilitado) VALUES
  ('69c3acf9-f737-4da9-87be-87de2e54f8d9', 'EMEB EMMANOEL LOBATO', 'EMEB_EMMANOEL_LOBATO', '0dee0303-62d7-4c26-8f1f-5c9e25cd66d6', 'Sao Sebastiao da Boa Vista', 'PA', true),
  ('31c589eb-73ff-4cba-9045-03ec4260ad58', 'EMEF MAGALHAES BARATA', 'EMEF_MAGALHAES_BARATA', '8d0a50ef-a2cc-424d-8467-fc2a96ef66ec', 'Sao Sebastiao da Boa Vista', 'PA', true),
  ('7e1eaa26-9e68-41d0-8b83-ecfe97980279', 'EMEF PDE JOSE DE ANCHIETA', 'EMEF_PDE_JOSE_DE_ANCHIETA', '8d0a50ef-a2cc-424d-8467-fc2a96ef66ec', 'Sao Sebastiao da Boa Vista', 'PA', true),
  ('678354e6-4ada-4469-a113-16eafd470258', 'EMEF VER. ENGRACIO', 'EMEF_VER._ENGRACIO', '0dee0303-62d7-4c26-8f1f-5c9e25cd66d6', 'Sao Sebastiao da Boa Vista', 'PA', true),
  ('9feeb925-48f9-4ab6-9e38-afa74ee6350f', 'EMEI F NOSSA SENHORA DE LOURDES', '15560350', '8d0a50ef-a2cc-424d-8467-fc2a96ef66ec', 'Sao Sebastiao da Boa Vista', 'PA', true)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 3. USUARIO ADMINISTRADOR (senha: admin123)
-- ============================================================================
-- Hash bcrypt de 'admin123' gerado com bcryptjs (10 rounds)

INSERT INTO usuarios (id, nome, email, senha, tipo_usuario, ativo) VALUES
  (uuid_generate_v4(), 'Administrador Local', 'admin@sisam.local', '$2a$10$SCm4RqHvJRw3q3.aC2NfYem7PI2QLx5szxhVjrJRIn2hDAxLPdjD6', 'administrador', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 4. TIPOS DE AVALIACAO
-- ============================================================================

INSERT INTO tipos_avaliacao (id, codigo, nome, descricao, tipo_resultado, nota_minima, nota_maxima) VALUES
  ('7574be7c-512c-4f5a-8c1a-af66dce4bb12', 'CONCEITO', 'Avaliacao por Conceito', 'Avaliacao baseada em conceitos qualitativos com equivalencia numerica.', 'conceito', 0, 10),
  ('7aad3606-7e65-4cd8-9a2d-2bac89ab0a03', 'MISTO', 'Avaliacao Mista', 'Combinacao de parecer descritivo com conceito ou nota.', 'misto', 0, 10),
  ('605c0cf0-492e-4320-988c-3e4e8edfe325', 'NUMERICO_10', 'Nota Numerica (0-10)', 'Avaliacao por nota numerica na escala de 0 a 10.', 'numerico', 0, 10),
  ('1c465a90-86b8-4c11-a7c7-f5811f6d011f', 'NUMERICO_100', 'Nota Numerica (0-100)', 'Avaliacao por nota numerica na escala de 0 a 100.', 'numerico', 0, 100),
  ('e5ad077c-190f-4e59-865d-b67ae940f548', 'PARECER_DESC', 'Parecer Descritivo', 'Avaliacao qualitativa por parecer do professor. Sem nota numerica.', 'parecer', 0, 0)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 5. SERIES ESCOLARES
-- ============================================================================

INSERT INTO series_escolares (id, codigo, nome, etapa, ordem, media_aprovacao, media_recuperacao, nota_maxima, permite_recuperacao, formula_nota_final) VALUES
  ('d04e0e72-ebc2-4525-8a3b-5456aa021444', 'CRE', 'Creche', 'educacao_infantil', 1, NULL, NULL, NULL, false, 'media_aritmetica'),
  ('1bd7bfc8-f906-4724-807e-ee76a0eac9eb', 'PRE1', 'Pre-Escola I', 'educacao_infantil', 2, NULL, NULL, NULL, false, 'media_aritmetica'),
  ('cae02030-3886-4776-82e1-c8e86479068c', 'PRE2', 'Pre-Escola II', 'educacao_infantil', 3, NULL, NULL, NULL, false, 'media_aritmetica'),
  ('f614203d-e7fc-4d05-8359-c3af67156887', '1', '1o Ano', 'fundamental_anos_iniciais', 4, 6, 5, 10, true, 'media_aritmetica'),
  ('0252f805-989f-46fb-b06c-f6a85ec4b169', '2', '2o Ano', 'fundamental_anos_iniciais', 5, 6, 5, 10, true, 'media_aritmetica'),
  ('0211adfd-5d2f-4ce8-a24e-308879f5cd58', '3', '3o Ano', 'fundamental_anos_iniciais', 6, 6, 5, 10, true, 'media_aritmetica'),
  ('f010ba83-bbf3-445a-8bec-51035632d65f', '4', '4o Ano', 'fundamental_anos_iniciais', 7, 6, 5, 10, true, 'media_aritmetica'),
  ('5456e30c-1a44-4f34-b534-6208008d62ef', '5', '5o Ano', 'fundamental_anos_iniciais', 8, 6, 5, 10, true, 'media_aritmetica'),
  ('9abbbb4f-3e0a-4b1d-b3f6-c088e95eca08', '6', '6o Ano', 'fundamental_anos_finais', 9, 6, 5, 10, true, 'media_aritmetica'),
  ('bb22649b-4b90-4dae-b4cf-4e6ef816f76a', '7', '7o Ano', 'fundamental_anos_finais', 10, 6, 5, 10, true, 'media_aritmetica'),
  ('bfaeb322-5de4-4c7b-8d47-b5d719a0b911', '8', '8o Ano', 'fundamental_anos_finais', 11, 6, 5, 10, true, 'media_aritmetica'),
  ('db1a3c8b-35e4-4a38-b389-b652329b2fbf', '9', '9o Ano', 'fundamental_anos_finais', 12, 6, 5, 10, true, 'media_aritmetica'),
  ('98fc9d80-48e8-4ad7-b9e7-dace296f0ff6', 'EJA1', 'EJA 1a Etapa', 'eja', 13, 5, 5, 10, true, 'media_aritmetica'),
  ('7a4d4f40-92f5-4374-a1f6-ba3e7ff2de68', 'EJA2', 'EJA 2a Etapa', 'eja', 14, 5, 5, 10, true, 'media_aritmetica'),
  ('0d590812-e198-4144-b006-82642087c2e9', 'EJA3', 'EJA 3a Etapa', 'eja', 15, 5, 5, 10, true, 'media_aritmetica'),
  ('416c45bb-0703-4ab1-99cc-71d77011b080', 'EJA4', 'EJA 4a Etapa', 'eja', 16, 5, 5, 10, true, 'media_aritmetica')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 6. DISCIPLINAS ESCOLARES
-- ============================================================================

INSERT INTO disciplinas_escolares (id, nome, codigo, abreviacao, ordem) VALUES
  ('a8a25718-4f4c-4f55-aea4-2dd1155c1814', 'Lingua Portuguesa', 'LP', 'Port', 1),
  ('82e347db-a2cb-4c65-b9f4-fafb9f40e206', 'Matematica', 'MAT', 'Mat', 2),
  ('8a0cf6de-e7b9-461f-813b-1ff07621eaca', 'Ciencias', 'CIE', 'Cien', 3),
  ('ceae60cb-c326-464c-9caa-806459a48496', 'Historia', 'HIS', 'Hist', 4),
  ('1cc2fd29-0538-43ce-a8c6-e7149aeaa6f8', 'Geografia', 'GEO', 'Geo', 5),
  ('1d249e5e-c3e6-44c8-837c-6864bd07e771', 'Artes', 'ART', 'Art', 6),
  ('818176bb-5591-4623-b472-05574b421392', 'Educacao Fisica', 'EDF', 'Ed.Fis', 7),
  ('5b2fffde-5eb4-4c0e-9831-99af252a217d', 'Ensino Religioso', 'REL', 'Rel', 8),
  ('0dc83df6-d883-49c2-b5c8-396ee62c8633', 'Lingua Inglesa', 'ING', 'Ing', 9)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 7. NIVEIS DE APRENDIZAGEM
-- ============================================================================

INSERT INTO niveis_aprendizagem (id, codigo, nome, cor, nota_minima, nota_maxima, ordem) VALUES
  ('55b8206b-3ad6-4985-97ea-d4224792c542', 'INSUFICIENTE', 'Insuficiente', '#EF4444', 0, 2.99, 1),
  ('718f1fac-41a6-4b88-9184-06f40556236f', 'BASICO', 'Basico', '#F59E0B', 3, 4.99, 2),
  ('2892a948-fef7-4c7e-9126-66fee1401101', 'ADEQUADO', 'Adequado', '#3B82F6', 5, 7.49, 3),
  ('999119d5-3dfe-47e7-9e90-63868cae24c0', 'AVANCADO', 'Avancado', '#10B981', 7.5, 10, 4)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 8. CONFIGURACAO DE SERIES (SISAM)
-- ============================================================================

INSERT INTO configuracao_series (serie, nome_serie, qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn, total_questoes_objetivas, tem_producao_textual, qtd_itens_producao, avalia_lp, avalia_mat, avalia_ch, avalia_cn, tipo_ensino) VALUES
  ('1', '1o Ano', 0, 0, 0, 0, 0, false, 0, true, true, false, false, 'anos_iniciais'),
  ('2', '2o Ano', 14, 14, 0, 0, 28, true, 8, true, true, false, false, 'anos_iniciais'),
  ('3', '3o Ano', 14, 14, 0, 0, 28, true, 8, true, true, false, false, 'anos_iniciais'),
  ('4', '4o Ano', 0, 0, 0, 0, 0, false, 0, true, true, false, false, 'anos_iniciais'),
  ('5', '5o Ano', 14, 20, 0, 0, 34, true, 8, true, true, false, false, 'anos_iniciais'),
  ('6', '6o Ano', 0, 0, 0, 0, 0, false, 0, true, true, true, true, 'anos_finais'),
  ('7', '7o Ano', 0, 0, 0, 0, 0, false, 0, true, true, true, true, 'anos_finais'),
  ('8', '8o Ano', 20, 20, 10, 10, 60, false, 0, true, true, true, true, 'anos_finais'),
  ('9', '9o Ano', 20, 20, 10, 10, 60, false, 0, true, true, true, true, 'anos_finais')
ON CONFLICT (serie) DO NOTHING;

-- ============================================================================
-- 9. MODULOS TECNICO
-- ============================================================================

INSERT INTO modulos_tecnico (modulo_key, modulo_label, habilitado, ordem) VALUES
  ('resultados', 'Resultados', true, 1),
  ('comparativos', 'Comparativos', true, 2),
  ('escolas', 'Escolas', false, 3),
  ('polos', 'Polos', false, 4),
  ('alunos', 'Alunos', true, 5)
ON CONFLICT (modulo_key) DO NOTHING;

-- ============================================================================
-- 10. ANO LETIVO E PERIODOS
-- ============================================================================

INSERT INTO anos_letivos (ano, status, data_inicio, data_fim, dias_letivos_total) VALUES
  ('2026', 'em_andamento', '2026-02-03', '2026-12-20', 200)
ON CONFLICT (ano) DO NOTHING;

INSERT INTO periodos_letivos (nome, tipo, numero, ano_letivo, data_inicio, data_fim, dias_letivos) VALUES
  ('1o Bimestre', 'bimestre', 1, '2026', '2026-02-03', '2026-04-30', 50),
  ('2o Bimestre', 'bimestre', 2, '2026', '2026-05-01', '2026-07-15', 50),
  ('3o Bimestre', 'bimestre', 3, '2026', '2026-07-28', '2026-10-10', 50),
  ('4o Bimestre', 'bimestre', 4, '2026', '2026-10-13', '2026-12-20', 50)
ON CONFLICT (tipo, numero, ano_letivo) DO NOTHING;

-- ============================================================================
-- 11. AVALIACOES SISAM
-- ============================================================================

INSERT INTO avaliacoes (nome, descricao, ano_letivo, tipo, ordem) VALUES
  ('SISAM 2026 - 1a Avaliacao', 'Primeira avaliacao diagnostica municipal 2026', '2026', 'diagnostica', 1),
  ('SISAM 2026 - 2a Avaliacao', 'Segunda avaliacao diagnostica municipal 2026', '2026', 'bimestral', 2)
ON CONFLICT (ano_letivo, tipo) DO NOTHING;

-- ============================================================================
-- 12. SERIES PARTICIPANTES DO SISAM
-- ============================================================================

INSERT INTO sisam_series_participantes (ano_letivo, serie) VALUES
  ('2026', '2'), ('2026', '3'), ('2026', '5'),
  ('2026', '8'), ('2026', '9')
ON CONFLICT (ano_letivo, serie) DO NOTHING;

-- ============================================================================
-- 13. PERSONALIZACAO DA TELA DE LOGIN
-- ============================================================================

INSERT INTO personalizacao (tipo, login_titulo, login_subtitulo, rodape_texto, rodape_ativo) VALUES
  ('sistema', 'SISAM', 'Sistema de Avaliacao Municipal', 'SEMED - Sao Sebastiao da Boa Vista/PA', true)
ON CONFLICT (tipo) DO NOTHING;

-- ============================================================================
-- 14. TURMAS DE EXEMPLO (para dev)
-- ============================================================================

INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno) VALUES
  ('5A-M', '5o Ano A - Matutino', '9feeb925-48f9-4ab6-9e38-afa74ee6350f', '5', '2026', 'matutino'),
  ('9A-M', '9o Ano A - Matutino', '31c589eb-73ff-4cba-9045-03ec4260ad58', '9', '2026', 'matutino')
ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;

-- ============================================================================
-- 15. ALUNOS DE EXEMPLO (para dev)
-- ============================================================================

INSERT INTO alunos (nome, escola_id, turma_id, serie, ano_letivo, data_nascimento, situacao) VALUES
  ('JOAO SILVA TESTE', '9feeb925-48f9-4ab6-9e38-afa74ee6350f', (SELECT id FROM turmas WHERE codigo = '5A-M' AND ano_letivo = '2026' LIMIT 1), '5', '2026', '2015-03-15', 'cursando'),
  ('MARIA SANTOS TESTE', '9feeb925-48f9-4ab6-9e38-afa74ee6350f', (SELECT id FROM turmas WHERE codigo = '5A-M' AND ano_letivo = '2026' LIMIT 1), '5', '2026', '2015-07-22', 'cursando'),
  ('PEDRO OLIVEIRA TESTE', '31c589eb-73ff-4cba-9045-03ec4260ad58', (SELECT id FROM turmas WHERE codigo = '9A-M' AND ano_letivo = '2026' LIMIT 1), '9', '2026', '2011-11-05', 'cursando')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIM DO SEED
-- ============================================================================
