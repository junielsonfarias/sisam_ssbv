-- ============================================
-- MIGRACAO: Criar tabela de configuracao do site institucional
-- ============================================
-- Esta tabela armazena o conteudo de cada secao do site
-- institucional da SEMED Sao Sebastiao da Boa Vista - PA.
-- Cada secao e identificada por um slug unico e armazena
-- seu conteudo em formato JSONB para flexibilidade.
-- ============================================

-- Criar tabela de configuracao do site
CREATE TABLE IF NOT EXISTS site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secao VARCHAR(50) UNIQUE NOT NULL,
  conteudo JSONB NOT NULL DEFAULT '{}',
  atualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_site_config_secao ON site_config(secao);

-- Comentarios na tabela
COMMENT ON TABLE site_config IS 'Configuracao de conteudo do site institucional da SEMED.';
COMMENT ON COLUMN site_config.secao IS 'Identificador unico da secao: header, hero, about, stats, services, news, schools, contact, footer';
COMMENT ON COLUMN site_config.conteudo IS 'Conteudo da secao em formato JSONB';
COMMENT ON COLUMN site_config.atualizado_por IS 'ID do usuario que fez a ultima atualizacao';
COMMENT ON COLUMN site_config.atualizado_em IS 'Data e hora da ultima atualizacao';
COMMENT ON COLUMN site_config.criado_em IS 'Data e hora de criacao do registro';

-- ============================================
-- SEED: Conteudo padrao das secoes
-- ============================================

INSERT INTO site_config (secao, conteudo) VALUES
(
  'header',
  '{
    "logo_url": null,
    "titulo": "SEMED",
    "subtitulo": "São Sebastião da Boa Vista",
    "menu": [
      { "label": "Início", "href": "#inicio" },
      { "label": "Sobre", "href": "#sobre" },
      { "label": "Serviços", "href": "#servicos" },
      { "label": "Escolas", "href": "#escolas" },
      { "label": "Notícias", "href": "#noticias" },
      { "label": "Contato", "href": "#contato" }
    ],
    "login_url": "/login"
  }'::jsonb
),
(
  'hero',
  '{
    "titulo": "Secretaria Municipal de Educação",
    "subtitulo": "São Sebastião da Boa Vista - Pará",
    "descricao": "Comprometidos com a educação de qualidade para todos os alunos do nosso município. Acompanhe nossas ações, projetos e resultados.",
    "imagem_url": null,
    "botao_primario": { "label": "Acesse o SISAM", "href": "/login" },
    "botao_secundario": { "label": "Saiba mais", "href": "#sobre" }
  }'::jsonb
),
(
  'about',
  '{
    "titulo": "Sobre a SEMED",
    "descricao": "A Secretaria Municipal de Educação de São Sebastião da Boa Vista, localizada na Ilha do Marajó, estado do Pará, é responsável pela gestão da rede municipal de ensino. Nosso compromisso é garantir educação de qualidade, inclusiva e equitativa, promovendo oportunidades de aprendizagem para todos os estudantes do município.",
    "missao": "Promover uma educação pública de qualidade, garantindo o acesso, a permanência e o sucesso escolar de todos os alunos da rede municipal.",
    "visao": "Ser referência em gestão educacional no Marajó, com indicadores de aprendizagem em constante evolução e escolas equipadas para o século XXI.",
    "valores": ["Compromisso com a aprendizagem", "Transparência na gestão", "Valorização dos profissionais da educação", "Inclusão e equidade", "Inovação pedagógica"],
    "imagem_url": null
  }'::jsonb
),
(
  'stats',
  '{
    "titulo": "Nossos Números",
    "descricao": "Dados atualizados da rede municipal de ensino.",
    "auto_count": true,
    "itens": [
      { "label": "Escolas", "valor": 0, "icone": "school" },
      { "label": "Alunos Matriculados", "valor": 0, "icone": "users" },
      { "label": "Turmas Ativas", "valor": 0, "icone": "book-open" },
      { "label": "Profissionais da Educação", "valor": 150, "icone": "briefcase" }
    ]
  }'::jsonb
),
(
  'services',
  '{
    "titulo": "Serviços e Programas",
    "descricao": "Conheça os principais serviços e programas da SEMED.",
    "itens": [
      {
        "titulo": "SISAM - Sistema de Avaliação Municipal",
        "descricao": "Plataforma digital para diagnóstico e acompanhamento da aprendizagem dos alunos, com avaliações periódicas e relatórios detalhados por escola, polo e município.",
        "icone": "chart-bar",
        "link": "/login"
      },
      {
        "titulo": "Matrícula Escolar",
        "descricao": "Processo de matrícula e rematrícula na rede municipal de ensino, com controle de vagas e transferências entre escolas.",
        "icone": "clipboard-list",
        "link": null
      },
      {
        "titulo": "Formação Continuada",
        "descricao": "Programas de capacitação e formação continuada para professores e gestores escolares da rede municipal.",
        "icone": "academic-cap",
        "link": null
      },
      {
        "titulo": "Transporte Escolar",
        "descricao": "Serviço de transporte escolar fluvial e terrestre para garantir o acesso dos alunos às escolas do município.",
        "icone": "truck",
        "link": null
      },
      {
        "titulo": "Alimentação Escolar",
        "descricao": "Programa de alimentação escolar com cardápios elaborados por nutricionistas, garantindo refeições saudáveis para os alunos.",
        "icone": "cake",
        "link": null
      },
      {
        "titulo": "Reconhecimento Facial",
        "descricao": "Sistema de frequência escolar por reconhecimento facial, com registro automático de presença e relatórios em tempo real.",
        "icone": "camera",
        "link": null
      }
    ]
  }'::jsonb
),
(
  'news',
  '{
    "titulo": "Notícias e Eventos",
    "descricao": "Fique por dentro das últimas novidades da educação municipal.",
    "itens": [
      {
        "titulo": "Ano Letivo 2026 inicia com novidades tecnológicas",
        "resumo": "A SEMED implementou o sistema SISAM para acompanhamento da aprendizagem e o reconhecimento facial para controle de frequência em todas as escolas da rede.",
        "data": "2026-02-10",
        "imagem_url": null,
        "link": null
      },
      {
        "titulo": "Formação de professores em avaliação diagnóstica",
        "resumo": "Mais de 100 professores participaram da formação sobre o uso do SISAM para avaliação diagnóstica e acompanhamento dos níveis de aprendizagem.",
        "data": "2026-02-25",
        "imagem_url": null,
        "link": null
      },
      {
        "titulo": "Matrículas abertas para o ano letivo 2026",
        "resumo": "A SEMED informa que as matrículas para o ano letivo de 2026 estão abertas em todas as escolas da rede municipal de ensino.",
        "data": "2026-01-15",
        "imagem_url": null,
        "link": null
      }
    ]
  }'::jsonb
),
(
  'schools',
  '{
    "titulo": "Nossas Escolas",
    "descricao": "Conheça as escolas da rede municipal de ensino de São Sebastião da Boa Vista.",
    "mostrar_mapa": false,
    "mostrar_lista": true,
    "auto_list": true
  }'::jsonb
),
(
  'contact',
  '{
    "titulo": "Fale Conosco",
    "descricao": "Entre em contato com a Secretaria Municipal de Educação.",
    "endereco": "Rua Principal, s/n - Centro, São Sebastião da Boa Vista - PA, CEP 68795-000",
    "telefone": "(91) 0000-0000",
    "email": "semed@saosebastiaodaboavista.pa.gov.br",
    "horario": "Segunda a Sexta, 08h às 14h",
    "redes_sociais": [
      { "nome": "Facebook", "url": null, "icone": "facebook" },
      { "nome": "Instagram", "url": null, "icone": "instagram" }
    ]
  }'::jsonb
),
(
  'footer',
  '{
    "texto": "© 2026 SEMED - Secretaria Municipal de Educação de São Sebastião da Boa Vista - PA",
    "links_uteis": [
      { "label": "Portal da Prefeitura", "href": null },
      { "label": "MEC", "href": "https://www.gov.br/mec" },
      { "label": "INEP", "href": "https://www.gov.br/inep" },
      { "label": "FNDE", "href": "https://www.gov.br/fnde" }
    ],
    "desenvolvido_por": "SEMED - São Sebastião da Boa Vista"
  }'::jsonb
)
ON CONFLICT (secao) DO NOTHING;
