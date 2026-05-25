-- ============================================================================
-- SEED: Estrutura BNCC (etapas, áreas, componentes, competências gerais)
-- ============================================================================

-- 10 Competencias Gerais da BNCC (texto resumido oficial MEC)
INSERT INTO bncc_competencias_gerais (id, titulo, descricao) VALUES
  (1, 'Conhecimento',
   'Valorizar e utilizar os conhecimentos historicamente construidos sobre o mundo fisico, social, cultural e digital para entender e explicar a realidade, continuar aprendendo e colaborar para a construcao de uma sociedade justa, democratica e inclusiva.'),
  (2, 'Pensamento cientifico, critico e criativo',
   'Exercitar a curiosidade intelectual e recorrer a abordagem propria das ciencias, incluindo a investigacao, a reflexao, a analise critica, a imaginacao e a criatividade, para investigar causas, elaborar e testar hipoteses, formular e resolver problemas e criar solucoes.'),
  (3, 'Repertorio cultural',
   'Valorizar e fruir as diversas manifestacoes artisticas e culturais, das locais as mundiais, e tambem participar de praticas diversificadas da producao artistico-cultural.'),
  (4, 'Comunicacao',
   'Utilizar diferentes linguagens - verbal, corporal, visual, sonora e digital - bem como conhecimentos das linguagens artistica, matematica e cientifica, para se expressar e partilhar informacoes, experiencias, ideias e sentimentos.'),
  (5, 'Cultura digital',
   'Compreender, utilizar e criar tecnologias digitais de informacao e comunicacao de forma critica, significativa, reflexiva e etica nas diversas praticas sociais.'),
  (6, 'Trabalho e projeto de vida',
   'Valorizar a diversidade de saberes e vivencias culturais, e apropriar-se de conhecimentos e experiencias que lhe possibilitem entender as relacoes proprias do mundo do trabalho e fazer escolhas alinhadas ao exercicio da cidadania e ao seu projeto de vida.'),
  (7, 'Argumentacao',
   'Argumentar com base em fatos, dados e informacoes confiaveis, para formular, negociar e defender ideias, pontos de vista e decisoes comuns que respeitem e promovam os direitos humanos.'),
  (8, 'Autoconhecimento e autocuidado',
   'Conhecer-se, apreciar-se e cuidar de sua saude fisica e emocional, compreendendo-se na diversidade humana e reconhecendo suas emocoes e as dos outros, com autocritica e capacidade para lidar com elas.'),
  (9, 'Empatia e cooperacao',
   'Exercitar a empatia, o dialogo, a resolucao de conflitos e a cooperacao, fazendo-se respeitar e promovendo o respeito ao outro e aos direitos humanos, com acolhimento e valorizacao da diversidade.'),
  (10, 'Responsabilidade e cidadania',
   'Agir pessoal e coletivamente com autonomia, responsabilidade, flexibilidade, resiliencia e determinacao, tomando decisoes com base em principios eticos, democraticos, inclusivos, sustentaveis e solidarios.')
ON CONFLICT (id) DO NOTHING;

-- Etapas
INSERT INTO bncc_etapas (id, nome, ordem) VALUES
  ('EI',    'Educacao Infantil', 1),
  ('EF_AI', 'Ensino Fundamental - Anos Iniciais', 2),
  ('EF_AF', 'Ensino Fundamental - Anos Finais', 3),
  ('EM',    'Ensino Medio', 4)
ON CONFLICT (id) DO NOTHING;

-- Areas de Conhecimento (Ensino Fundamental - 5 areas)
INSERT INTO bncc_areas_conhecimento (id, nome, etapa_id, ordem) VALUES
  ('LINGUAGENS_AI',         'Linguagens', 'EF_AI', 1),
  ('MATEMATICA_AI',         'Matematica', 'EF_AI', 2),
  ('CIENCIAS_NATUREZA_AI',  'Ciencias da Natureza', 'EF_AI', 3),
  ('CIENCIAS_HUMANAS_AI',   'Ciencias Humanas', 'EF_AI', 4),
  ('ENSINO_RELIGIOSO_AI',   'Ensino Religioso', 'EF_AI', 5),

  ('LINGUAGENS_AF',         'Linguagens', 'EF_AF', 1),
  ('MATEMATICA_AF',         'Matematica', 'EF_AF', 2),
  ('CIENCIAS_NATUREZA_AF',  'Ciencias da Natureza', 'EF_AF', 3),
  ('CIENCIAS_HUMANAS_AF',   'Ciencias Humanas', 'EF_AF', 4),
  ('ENSINO_RELIGIOSO_AF',   'Ensino Religioso', 'EF_AF', 5)
ON CONFLICT (id) DO NOTHING;

-- Componentes Curriculares
INSERT INTO bncc_componentes_curriculares (id, nome, area_id, abreviatura, ordem) VALUES
  -- Anos Iniciais
  ('LP_AI', 'Lingua Portuguesa', 'LINGUAGENS_AI', 'LP', 1),
  ('AR_AI', 'Arte',              'LINGUAGENS_AI', 'AR', 2),
  ('EF_AI', 'Educacao Fisica',   'LINGUAGENS_AI', 'EF', 3),
  ('MA_AI', 'Matematica',        'MATEMATICA_AI', 'MA', 1),
  ('CI_AI', 'Ciencias',          'CIENCIAS_NATUREZA_AI', 'CI', 1),
  ('HI_AI', 'Historia',          'CIENCIAS_HUMANAS_AI', 'HI', 1),
  ('GE_AI', 'Geografia',         'CIENCIAS_HUMANAS_AI', 'GE', 2),
  ('ER_AI', 'Ensino Religioso',  'ENSINO_RELIGIOSO_AI', 'ER', 1),
  -- Anos Finais
  ('LP_AF', 'Lingua Portuguesa', 'LINGUAGENS_AF', 'LP', 1),
  ('LI_AF', 'Lingua Inglesa',    'LINGUAGENS_AF', 'LI', 2),
  ('AR_AF', 'Arte',              'LINGUAGENS_AF', 'AR', 3),
  ('EF_AF', 'Educacao Fisica',   'LINGUAGENS_AF', 'EF', 4),
  ('MA_AF', 'Matematica',        'MATEMATICA_AF', 'MA', 1),
  ('CI_AF', 'Ciencias',          'CIENCIAS_NATUREZA_AF', 'CI', 1),
  ('HI_AF', 'Historia',          'CIENCIAS_HUMANAS_AF', 'HI', 1),
  ('GE_AF', 'Geografia',         'CIENCIAS_HUMANAS_AF', 'GE', 2),
  ('ER_AF', 'Ensino Religioso',  'ENSINO_RELIGIOSO_AF', 'ER', 1),
  -- Educacao Infantil (sem area, mas registramos como componentes)
  ('EI_EOEU',    'O eu, o outro e o nos',                       NULL, 'EOEU', 1),
  ('EI_CG',      'Corpo, gestos e movimentos',                  NULL, 'CG',   2),
  ('EI_TS',      'Tracos, sons, cores e formas',                NULL, 'TS',   3),
  ('EI_EF',      'Escuta, fala, pensamento e imaginacao',       NULL, 'EF',   4),
  ('EI_ET',      'Espacos, tempos, quantidades, relacoes e transformacoes', NULL, 'ET', 5)
ON CONFLICT (id) DO NOTHING;
