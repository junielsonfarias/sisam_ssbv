/**
 * ADR-001 — getEtlGateMode(): gate de habilitacao do ETL (unitario)
 *
 * Prova o comportamento conservador da funcao: o modo padrao e 'estrito'
 * e so muda para 'transicao' com flag explicita. Qualquer outro valor da
 * variavel de ambiente tambem deve cair em 'estrito' (fail-closed).
 *
 * Nao precisa de mock de banco — logica puramente baseada em env vars.
 */
import { describe, it, expect, afterEach } from 'vitest'

// Snapshot do valor original para restaurar apos cada teste.
const ORIGINAL = process.env.ETL_GATE_MESTRE

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ETL_GATE_MESTRE
  else process.env.ETL_GATE_MESTRE = ORIGINAL
})

describe('getEtlGateMode — gate de habilitacao do ETL (ADR-001)', () => {
  it('padrao e "estrito" quando ETL_GATE_MESTRE nao esta definida', async () => {
    delete process.env.ETL_GATE_MESTRE
    const { getEtlGateMode } = await import('@/lib/services/importacao/config')
    expect(getEtlGateMode()).toBe('estrito')
  })

  it('"transicao" so e ativado pela flag explicita ETL_GATE_MESTRE=transicao', async () => {
    process.env.ETL_GATE_MESTRE = 'transicao'
    const { getEtlGateMode } = await import('@/lib/services/importacao/config')
    expect(getEtlGateMode()).toBe('transicao')
  })

  it('valor desconhecido cai em "estrito" (fail-closed, gate conservador)', async () => {
    process.env.ETL_GATE_MESTRE = 'habilitado'
    const { getEtlGateMode } = await import('@/lib/services/importacao/config')
    expect(getEtlGateMode()).toBe('estrito')
  })

  it('string vazia cai em "estrito" (fail-closed)', async () => {
    process.env.ETL_GATE_MESTRE = ''
    const { getEtlGateMode } = await import('@/lib/services/importacao/config')
    expect(getEtlGateMode()).toBe('estrito')
  })

  it('caixa-alta "TRANSICAO" cai em "estrito" (case-sensitive, proposital)', async () => {
    process.env.ETL_GATE_MESTRE = 'TRANSICAO'
    const { getEtlGateMode } = await import('@/lib/services/importacao/config')
    expect(getEtlGateMode()).toBe('estrito')
  })

  it('ORIGEM_SISAM_ETL exporta a constante correta para rastreabilidade', async () => {
    const { ORIGEM_SISAM_ETL } = await import('@/lib/services/importacao/config')
    // Constante usada como marcador em INSERT pelo modo transicao — nunca
    // deve ser 'gestor' (isso adulteraria a auditoria de governanca).
    expect(typeof ORIGEM_SISAM_ETL).toBe('string')
    expect(ORIGEM_SISAM_ETL).not.toBe('gestor')
    expect(ORIGEM_SISAM_ETL.length).toBeGreaterThan(0)
  })
})
