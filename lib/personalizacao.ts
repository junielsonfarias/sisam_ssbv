import personalizacaoConfig from '@/config/personalizacao.json'

export interface PersonalizacaoLogin {
  titulo: string
  subtitulo: string
  imagem_url: string | null
  cor_primaria: string
  cor_secundaria: string
}

export interface PersonalizacaoRodape {
  texto: string
  link: string | null
  link_texto: string | null
  ativo: boolean
}

export interface Personalizacao {
  login: PersonalizacaoLogin
  rodape: PersonalizacaoRodape
}

// Interface para a estrutura plana do arquivo JSON
interface PersonalizacaoPlana {
  login_titulo: string
  login_subtitulo: string
  login_imagem_url: string | null
  login_cor_primaria: string
  login_cor_secundaria: string
  rodape_texto: string
  rodape_link: string | null
  rodape_link_texto: string | null
  rodape_ativo: boolean
}

// Converter estrutura plana para estrutura aninhada
function converterParaEstruturaNested(config: PersonalizacaoPlana): Personalizacao {
  return {
    login: {
      titulo: config.login_titulo,
      subtitulo: config.login_subtitulo,
      imagem_url: config.login_imagem_url,
      cor_primaria: config.login_cor_primaria,
      cor_secundaria: config.login_cor_secundaria
    },
    rodape: {
      texto: config.rodape_texto,
      link: config.rodape_link,
      link_texto: config.rodape_link_texto,
      ativo: config.rodape_ativo
    }
  }
}

export function getPersonalizacao(): Personalizacao {
  return converterParaEstruturaNested(personalizacaoConfig as PersonalizacaoPlana)
}

export function getPersonalizacaoLogin(): PersonalizacaoLogin {
  const config = personalizacaoConfig as PersonalizacaoPlana
  return {
    titulo: config.login_titulo,
    subtitulo: config.login_subtitulo,
    imagem_url: config.login_imagem_url,
    cor_primaria: config.login_cor_primaria,
    cor_secundaria: config.login_cor_secundaria
  }
}

export function getPersonalizacaoRodape(): PersonalizacaoRodape {
  const config = personalizacaoConfig as PersonalizacaoPlana
  return {
    texto: config.rodape_texto,
    link: config.rodape_link,
    link_texto: config.rodape_link_texto,
    ativo: config.rodape_ativo
  }
}
