/**
 * Geração de senha temporária forte.
 *
 * Produz uma senha aleatória que satisfaz a política de força do projeto
 * (`lib/utils/senha-forca.ts`): >= 12 caracteres, com maiúscula, minúscula,
 * número e símbolo, sem palavras comuns nem sequências óbvias.
 *
 * Usado na criação de usuário pelo admin (substitui o costume de digitar uma
 * senha fraca ou usar default) e na geração de credenciais temporárias do
 * servidor (criar-admin, init).
 *
 * Isomórfico: usa Web Crypto (`globalThis.crypto`), disponível no navegador e
 * no Node 18+, podendo ser importado tanto em client components quanto em
 * route handlers.
 *
 * @module lib/utils/gerar-senha
 */

import { avaliarSenha } from './senha-forca'

// Alfabetos sem caracteres ambíguos (0/O, 1/l/I) para facilitar a leitura
// quando a senha é repassada manualmente ao usuário.
const MAIUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // sem I, O
const MINUSCULAS = 'abcdefghijkmnpqrstuvwxyz' // sem l, o
const NUMEROS = '23456789' // sem 0, 1
const SIMBOLOS = '!@#$%*?-_+'

const ALFABETO = MAIUSCULAS + MINUSCULAS + NUMEROS + SIMBOLOS

/** Inteiro uniforme em [0, max) sem viés de módulo (rejection sampling). */
function inteiroAleatorio(max: number): number {
  const limite = Math.floor(0xffffffff / max) * max
  const buffer = new Uint32Array(1)
  let valor: number
  do {
    globalThis.crypto.getRandomValues(buffer)
    valor = buffer[0]
  } while (valor >= limite)
  return valor % max
}

/** Sorteia um caractere de um conjunto. */
function sortear(conjunto: string): string {
  return conjunto[inteiroAleatorio(conjunto.length)]
}

/**
 * Gera uma senha temporária forte.
 *
 * Garante ao menos um caractere de cada classe e embaralha a ordem
 * (Fisher–Yates com fonte criptográfica). Revalida contra `avaliarSenha`
 * e re-tenta no caso (raríssimo) de cair numa sequência rejeitada.
 *
 * @param tamanho Comprimento desejado (mínimo 12; default 16).
 * @returns Senha que passa na política de força do projeto.
 */
export function gerarSenhaForte(tamanho = 16): string {
  const tam = Math.max(12, Math.floor(tamanho))

  let senha = ''
  for (let tentativa = 0; tentativa < 25; tentativa++) {
    // Um de cada classe garante que a política de composição é satisfeita.
    const chars: string[] = [
      sortear(MAIUSCULAS),
      sortear(MINUSCULAS),
      sortear(NUMEROS),
      sortear(SIMBOLOS),
    ]
    while (chars.length < tam) {
      chars.push(sortear(ALFABETO))
    }

    // Fisher–Yates para não deixar as classes obrigatórias sempre no início.
    for (let i = chars.length - 1; i > 0; i--) {
      const j = inteiroAleatorio(i + 1)
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }

    senha = chars.join('')
    if (avaliarSenha(senha).valida) return senha
  }

  // Inalcançável na prática (a 1ª iteração quase sempre é válida); retorna a
  // última gerada como salvaguarda em vez de lançar exceção.
  return senha
}
