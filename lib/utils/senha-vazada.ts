/**
 * Verificação de senha contra vazamentos conhecidos (Have I Been Pwned).
 *
 * Complementa `lib/utils/senha-forca.ts`: enquanto aquele garante que a senha
 * é estruturalmente forte (tamanho, classes, não-comum, sem sequência), este
 * garante que a senha não aparece em vazamentos públicos reais — uma senha
 * pode ser "forte" e ainda assim já estar comprometida.
 *
 * Usa o modelo de k-anonymity da API pwnedpasswords.com:
 *  - Calcula o SHA-1 da senha
 *  - Envia APENAS os 5 primeiros caracteres do hash (prefixo)
 *  - A API devolve todos os sufixos com esse prefixo (~500-1000 hashes)
 *  - A comparação do sufixo é feita localmente
 *  => A senha em texto puro nunca sai do servidor, nem o hash completo.
 *
 * Política "falha-aberto": se a API estiver indisponível, lenta ou retornar
 * erro, a checagem NÃO bloqueia o usuário (retorna `vazada: false` +
 * `indisponivel: true`). A validação de força local (sempre síncrona) continua
 * sendo a barreira garantida — esta é apenas uma camada extra de defesa.
 *
 * @module lib/utils/senha-vazada
 */

import crypto from 'crypto'

/** Resultado da checagem de senha vazada. */
export interface ResultadoSenhaVazada {
  /** A senha aparece em vazamentos conhecidos? */
  vazada: boolean
  /** Quantas vezes apareceu em vazamentos (0 se limpa ou indisponível). */
  ocorrencias: number
  /** A API ficou indisponível? (timeout, rede, erro HTTP) — falha-aberto. */
  indisponivel: boolean
}

/** Tempo máximo de espera pela API externa antes de desistir (falha-aberto). */
const TIMEOUT_MS = 3000

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/'

/**
 * Verifica se uma senha aparece em vazamentos conhecidos (HIBP).
 *
 * Nunca levanta exceção — em qualquer falha retorna `{ vazada: false,
 * indisponivel: true }` para não bloquear o fluxo (falha-aberto).
 *
 * @param senha Senha em texto puro a verificar.
 * @returns Resultado da checagem.
 */
export async function checarSenhaVazada(senha: string): Promise<ResultadoSenhaVazada> {
  if (!senha || typeof senha !== 'string') {
    return { vazada: false, ocorrencias: 0, indisponivel: false }
  }

  // SHA-1 em maiúsculas (formato esperado pela API).
  const sha1 = crypto.createHash('sha1').update(senha).digest('hex').toUpperCase()
  const prefixo = sha1.slice(0, 5)
  const sufixo = sha1.slice(5)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const resposta = await fetch(`${HIBP_RANGE_URL}${prefixo}`, {
      // Add-Padding faz a API retornar resultados com tamanho uniforme,
      // dificultando inferência por análise de tráfego.
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    })

    if (!resposta.ok) {
      return { vazada: false, ocorrencias: 0, indisponivel: true }
    }

    const corpo = await resposta.text()

    for (const linha of corpo.split('\n')) {
      const [suf, contagem] = linha.trim().split(':')
      if (suf === sufixo) {
        const ocorrencias = Number.parseInt(contagem ?? '0', 10) || 0
        // Padding insere registros com contagem 0 — ignorar esses.
        return { vazada: ocorrencias > 0, ocorrencias, indisponivel: false }
      }
    }

    return { vazada: false, ocorrencias: 0, indisponivel: false }
  } catch {
    // Timeout, rede indisponível, abort, etc. — falha-aberto.
    return { vazada: false, ocorrencias: 0, indisponivel: true }
  } finally {
    clearTimeout(timer)
  }
}

/** Mensagem padrão para devolver ao usuário quando a senha está vazada. */
export const MENSAGEM_SENHA_VAZADA =
  'Esta senha apareceu em vazamentos de dados públicos e não é segura. Escolha outra.'

/**
 * Helper conveniente para uso em rotas: retorna se a senha pode ser aceita.
 * Em caso de indisponibilidade da API, aceita (falha-aberto).
 *
 * @param senha Senha a validar.
 * @returns `{ ok: true }` se aceitável, ou `{ ok: false, mensagem }` se vazada.
 */
export async function validarSenhaNaoVazada(
  senha: string
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const resultado = await checarSenhaVazada(senha)
  if (resultado.vazada) {
    return { ok: false, mensagem: MENSAGEM_SENHA_VAZADA }
  }
  return { ok: true }
}
