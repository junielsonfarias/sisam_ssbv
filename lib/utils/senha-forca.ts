/**
 * Avaliação de força de senha.
 *
 * Usado tanto no schema Zod (server-side, validação) quanto na UI
 * (cliente, feedback em tempo real).
 *
 * Regras (Fase 1 SEMED):
 *  - Mínimo 12 caracteres
 *  - Pelo menos 1 maiúscula
 *  - Pelo menos 1 minúscula
 *  - Pelo menos 1 número
 *  - Pelo menos 1 símbolo
 *  - Não pode ser uma senha comum (top 200)
 *  - Não pode ter sequência óbvia (123456, abcdef, qwerty, etc.)
 *
 * @module lib/utils/senha-forca
 */

/** Top 200 senhas mais comuns (combina listas SecLists/NIST/Brasil) */
const SENHAS_COMUNS = new Set([
  '123456', '123456789', 'password', 'qwerty', '12345678', '111111', '123123',
  'admin', '12345', '1234567', '1234567890', 'qwerty123', '000000', 'abc123',
  '654321', 'iloveyou', 'monkey', 'dragon', 'letmein', 'trustno1', 'welcome',
  'login', 'master', 'password1', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'sunshine',
  'football', 'baseball', 'shadow', 'master123', 'jesus', 'jordan', 'michael',
  'superman', 'batman', 'starwars', 'princess', 'whatever', 'qazwsx', 'asdfgh',
  'zxcvbn', 'qwerty1', 'qwertyuiop', 'mustang', 'access', 'hello', 'freedom',
  'flower', 'lakers', 'cookie', 'mickey', 'silver', 'pokemon', 'soccer',
  'killer', 'amanda', 'andrew', 'matrix', 'thunder', 'andrea', 'joshua',
  // PT-BR comuns
  'senha', 'senha123', '12345678', 'brasil', 'futebol', 'flamengo', 'corinthians',
  'palmeiras', 'gremio', 'vasco', 'fluminense', 'amor', 'familia', 'deus',
  'jesus', 'maria', 'joao', 'pedro', 'ana', 'casa123', 'minhasenha',
  'mudar123', 'trocar123', 'temp123', 'temporaria', 'administrador',
  // Educacional
  'escola', 'escola123', 'professor', 'professor123', 'aluno', 'aluno123',
  'sisam', 'sisam123', 'semed', 'semed123', 'educatec', 'educatec123',
  'gestor', 'gestor123', 'diretor', 'diretor123', 'secretaria',
])

/** Padrões sequenciais óbvios */
const PADROES_SEQUENCIAIS = [
  /(.)\1{3,}/, // 4+ caracteres iguais em sequência (aaaa, 1111)
  /0123|1234|2345|3456|4567|5678|6789|7890/,
  /9876|8765|7654|6543|5432|4321|3210/,
  /abcd|bcde|cdef|defg|efgh|fghi/i,
  /qwer|wert|erty|rtyu|tyui|yuio/i,
  /asdf|sdfg|dfgh|fghj|ghjk/i,
  /zxcv|xcvb|cvbn|vbnm/i,
]

export interface AvaliacaoSenha {
  /** Pontuação de 0 a 5 (0 = inválida, 5 = excelente) */
  pontuacao: 0 | 1 | 2 | 3 | 4 | 5
  /** Rótulo em pt-BR */
  rotulo: 'Muito fraca' | 'Fraca' | 'Razoável' | 'Boa' | 'Forte' | 'Excelente'
  /** Lista de problemas detectados (vazia se válida) */
  problemas: string[]
  /** Senha cumpre todos os requisitos mínimos? */
  valida: boolean
}

/**
 * Avalia uma senha contra todas as regras.
 * Não levanta exceção — retorna estrutura analisável.
 */
export function avaliarSenha(senha: string): AvaliacaoSenha {
  const problemas: string[] = []
  let pontos = 0

  if (!senha || typeof senha !== 'string') {
    return {
      pontuacao: 0,
      rotulo: 'Muito fraca',
      problemas: ['Senha é obrigatória'],
      valida: false,
    }
  }

  // Tamanho mínimo
  if (senha.length < 12) {
    problemas.push('Mínimo de 12 caracteres')
  } else {
    pontos++
    if (senha.length >= 16) pontos++
  }

  // Maiúscula
  if (!/[A-Z]/.test(senha)) {
    problemas.push('Deve conter pelo menos 1 letra maiúscula')
  } else {
    pontos++
  }

  // Minúscula
  if (!/[a-z]/.test(senha)) {
    problemas.push('Deve conter pelo menos 1 letra minúscula')
  }

  // Número
  if (!/[0-9]/.test(senha)) {
    problemas.push('Deve conter pelo menos 1 número')
  } else {
    pontos++
  }

  // Símbolo
  if (!/[^A-Za-z0-9]/.test(senha)) {
    problemas.push('Deve conter pelo menos 1 símbolo (!@#$%...)')
  } else {
    pontos++
  }

  // Não pode ser uma senha comum (literal)
  const senhaLower = senha.toLowerCase()
  if (SENHAS_COMUNS.has(senhaLower)) {
    problemas.push('Esta senha é muito comum — escolha outra')
  } else {
    // Bases comuns mesmo com sufixos numéricos/símbolos previsíveis:
    // "Password123!", "senha2024", "admin@1234" etc.
    const BASES_COMUNS = ['password', 'senha', 'admin', 'qwerty', 'welcome', 'login', 'master']
    for (const base of BASES_COMUNS) {
      if (senhaLower.startsWith(base) || senhaLower.endsWith(base)) {
        problemas.push('Não use palavras óbvias como "password", "senha" ou "admin" no início/fim')
        break
      }
    }
  }

  // Sem padrões sequenciais
  for (const padrao of PADROES_SEQUENCIAIS) {
    if (padrao.test(senha)) {
      problemas.push('Evite sequências óbvias (123, abc, qwerty)')
      break
    }
  }

  const valida = problemas.length === 0
  const pontuacao = (valida ? Math.min(5, pontos) : Math.min(2, pontos)) as AvaliacaoSenha['pontuacao']
  const ROTULOS: AvaliacaoSenha['rotulo'][] = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente']

  return {
    pontuacao,
    rotulo: ROTULOS[pontuacao],
    problemas,
    valida,
  }
}

/**
 * Versão simplificada que retorna apenas true/false.
 * Útil em validações onde só interessa "passa ou não".
 */
export function senhaForte(senha: string): boolean {
  return avaliarSenha(senha).valida
}
