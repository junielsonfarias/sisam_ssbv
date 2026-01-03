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

export function getPersonalizacao(): Personalizacao {
  return personalizacaoConfig as Personalizacao
}

export function getPersonalizacaoLogin(): PersonalizacaoLogin {
  return personalizacaoConfig.login
}

export function getPersonalizacaoRodape(): PersonalizacaoRodape {
  return personalizacaoConfig.rodape
}

