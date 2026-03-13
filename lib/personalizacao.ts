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
  titulo: 'SISAM',
  subtitulo: 'Sistema de Avaliação Municipal',
  imagem_url: '/logo.png', // Logo fixa em public/logo.png
  cor_primaria: '#4f46e5',
  cor_secundaria: '#818cf8'
}

function getRodape(): PersonalizacaoRodape {
  return {
    texto: `${new Date().getFullYear()} Junielson Farias - Todos os direitos reservados Kontrol_tec`,
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
