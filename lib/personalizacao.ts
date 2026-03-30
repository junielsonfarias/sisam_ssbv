// Configuracoes de personalizacao fixas no codigo
// Para alterar, edite diretamente este arquivo

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

// CONFIGURACOES FIXAS - Edite aqui para alterar a personalizacao
const CONFIG_LOGIN: PersonalizacaoLogin = {
  titulo: 'Portal do Educador',
  subtitulo: 'SEMED — São Sebastião da Boa Vista',
  imagem_url: '/logo.png',
  cor_primaria: '#1e3a5f',
  cor_secundaria: '#2563eb'
}

function getRodape(): PersonalizacaoRodape {
  return {
    texto: `© ${new Date().getFullYear()} SEMED — São Sebastião da Boa Vista/PA`,
    link: null,
    link_texto: null,
    ativo: true
  }
}

export function getPersonalizacao(): Personalizacao {
  return { login: CONFIG_LOGIN, rodape: getRodape() }
}

export function getPersonalizacaoLogin(): PersonalizacaoLogin {
  return CONFIG_LOGIN
}

export function getPersonalizacaoRodape(): PersonalizacaoRodape {
  return getRodape()
}
