-- ============================================================================
-- Atualizar conteúdo do site institucional com dados corretos
-- Executar no Supabase SQL Editor
-- ============================================================================

-- HERO: Atualizar título, botões e descrição
UPDATE site_config SET conteudo = jsonb_build_object(
  'titulo', 'Transformando vidas pela educação',
  'subtitulo', 'SEMED - São Sebastião da Boa Vista',
  'descricao', 'A Secretaria Municipal de Educação de São Sebastião da Boa Vista trabalha para garantir uma educação pública de qualidade, inclusiva e transformadora para todos os estudantes do município.',
  'botao_primario', jsonb_build_object('label', 'Acessar o Portal', 'href', '/login'),
  'botao_secundario', jsonb_build_object('label', 'Consultar Boletim', 'href', '/boletim')
), atualizado_em = NOW()
WHERE secao = 'hero';

-- ABOUT: Corrigir valores (array → string separada por vírgulas)
UPDATE site_config SET conteudo = jsonb_build_object(
  'titulo', 'Sobre a SEMED',
  'descricao', 'A Secretaria Municipal de Educação de São Sebastião da Boa Vista atua na gestão das escolas públicas municipais, promovendo educação de qualidade.',
  'missao', 'Garantir educação pública de qualidade, inclusiva e equitativa, promovendo o desenvolvimento integral dos estudantes de São Sebastião da Boa Vista.',
  'visao', 'Ser referência em educação municipal na região do Marajó, reconhecida pela excelência no ensino e valorização dos profissionais da educação.',
  'valores', 'Compromisso com a aprendizagem, Transparência na gestão, Valorização dos profissionais da educação, Inclusão e equidade, Inovação pedagógica'
), atualizado_em = NOW()
WHERE secao = 'about';
