import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import {
  checarSenhaVazada,
  validarSenhaNaoVazada,
  MENSAGEM_SENHA_VAZADA,
} from '@/lib/utils/senha-vazada'

/**
 * Calcula o SHA-1 (maiúsculo) e separa prefixo/sufixo como a API HIBP espera.
 */
function hashHibp(senha: string): { prefixo: string; sufixo: string } {
  const sha1 = crypto.createHash('sha1').update(senha).digest('hex').toUpperCase()
  return { prefixo: sha1.slice(0, 5), sufixo: sha1.slice(5) }
}

/** Monta uma resposta `Response` simulando o corpo da API HIBP. */
function respostaHibp(corpo: string, ok = true): Response {
  return {
    ok,
    text: async () => corpo,
  } as unknown as Response
}

describe('senha-vazada (HIBP)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('detecta senha vazada quando o sufixo aparece com contagem > 0', async () => {
    const senha = 'SenhaForte#2026!'
    const { sufixo } = hashHibp(senha)
    const corpo = [
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:3',
      `${sufixo}:42`,
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:7',
    ].join('\r\n')

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(respostaHibp(corpo))

    const resultado = await checarSenhaVazada(senha)

    expect(resultado.vazada).toBe(true)
    expect(resultado.ocorrencias).toBe(42)
    expect(resultado.indisponivel).toBe(false)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('considera limpa quando o sufixo não está na lista', async () => {
    const senha = 'OutraSenhaBoa#2026!'
    const corpo = [
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:3',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:7',
    ].join('\n')

    vi.spyOn(global, 'fetch').mockResolvedValue(respostaHibp(corpo))

    const resultado = await checarSenhaVazada(senha)

    expect(resultado.vazada).toBe(false)
    expect(resultado.ocorrencias).toBe(0)
    expect(resultado.indisponivel).toBe(false)
  })

  it('ignora registros de padding (contagem 0)', async () => {
    const senha = 'SenhaComPadding#2026!'
    const { sufixo } = hashHibp(senha)
    const corpo = `${sufixo}:0`

    vi.spyOn(global, 'fetch').mockResolvedValue(respostaHibp(corpo))

    const resultado = await checarSenhaVazada(senha)

    expect(resultado.vazada).toBe(false)
    expect(resultado.ocorrencias).toBe(0)
  })

  it('respeita k-anonymity: envia somente os 5 primeiros chars do hash', async () => {
    const senha = 'VerificaKAnon#2026!'
    const { prefixo } = hashHibp(senha)

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(respostaHibp(''))

    await checarSenhaVazada(senha)

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${prefixo}`)
    // A URL não pode conter o hash completo nem a senha.
    expect(url).not.toContain(senha)
    expect(url.replace(/.*\/range\//, '')).toHaveLength(5)
  })

  it('falha-aberto: erro de rede não bloqueia (vazada=false, indisponivel=true)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

    const resultado = await checarSenhaVazada('QualquerSenha#2026!')

    expect(resultado.vazada).toBe(false)
    expect(resultado.indisponivel).toBe(true)
  })

  it('falha-aberto: HTTP não-ok não bloqueia', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(respostaHibp('', false))

    const resultado = await checarSenhaVazada('QualquerSenha#2026!')

    expect(resultado.vazada).toBe(false)
    expect(resultado.indisponivel).toBe(true)
  })

  it('senha vazia retorna limpa sem chamar a API', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')

    const resultado = await checarSenhaVazada('')

    expect(resultado.vazada).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('validarSenhaNaoVazada', () => {
    it('retorna ok=false com mensagem quando vazada', async () => {
      const senha = 'SenhaRuim#2026!'
      const { sufixo } = hashHibp(senha)
      vi.spyOn(global, 'fetch').mockResolvedValue(respostaHibp(`${sufixo}:10`))

      const r = await validarSenhaNaoVazada(senha)

      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.mensagem).toBe(MENSAGEM_SENHA_VAZADA)
    })

    it('retorna ok=true quando limpa', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue(respostaHibp(''))

      const r = await validarSenhaNaoVazada('SenhaLimpa#2026!')

      expect(r.ok).toBe(true)
    })

    it('retorna ok=true quando API indisponível (falha-aberto)', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'))

      const r = await validarSenhaNaoVazada('SenhaLimpa#2026!')

      expect(r.ok).toBe(true)
    })
  })
})
