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
const CONFIG_FIXA = {
  login: {
    titulo: 'SISAM',
    subtitulo: 'Sistema de Avaliação Municipal',
    imagem_url: '/logo.png', // Logo fixa em public/logo.png
    cor_primaria: '#4f46e5',
    cor_secundaria: '#818cf8'
  },
  rodape: {
    texto: '2026 Junielson Farias - Todos os direitos reservados Kontrol_tec',
    link: null,
    link_texto: null,
    ativo: true
  }
}

export function getPersonalizacao(): Personalizacao {
  return CONFIG_FIXA
}

export function getPersonalizacaoLogin(): PersonalizacaoLogin {
  return CONFIG_FIXA.login
}

export function getPersonalizacaoRodape(): PersonalizacaoRodape {
  return CONFIG_FIXA.rodape
}
