/**
 * ADR-005 passo 6 — Testes dos 4 esquemas de recuperação (a)-(d) + fallback legado
 *
 * Cobre:
 *  1. Pipeline completo por esquema: calcularNotaFinal (por período) →
 *     ajustarMediaAnualPorEsquema → nota_final / media corretas.
 *  2. Fallback para nota_recuperacao legada (notas_escolares) quando não há
 *     entrada na nova entidade (carregarRecuperacoesNaoPeriodicas → Map vazio).
 *  3. carregarRecuperacoesNaoPeriodicas com mock de pool.query:
 *     - filtra 'por_periodo' (não traz)
 *     - converte numeric PG (string) para number
 *     - agrupa por disciplina_id
 *     - fallback: nenhuma linha no banco → Map vazio
 *  4. buscarConfigNotas resolvendo esquema_recuperacao (COALESCE override > global).
 *  5. dualWriteRecuperacao: sequência de queries para cada esquema (mock PoolClient).
 *
 * Regra default: 'substituicao' (MAX(media, rec) — nunca reduz).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Mock de pool ANTES dos imports dos serviços ----
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import {
  calcularNotaFinal,
  ajustarMediaAnualPorEsquema,
  aplicarRecuperacaoSobreMedia,
  carregarRecuperacoesNaoPeriodicas,
  buscarConfigNotas,
  invalidarCacheConfigNotas,
  dualWriteRecuperacao,
} from '@/lib/services/notas'
import type { RecuperacaoResolvida, ConfigNotas, EsquemaRecuperacao } from '@/lib/services/notas'

const mockQuery = vi.mocked(pool.query)

// ============================================================================
// Helpers de fixture
// ============================================================================

/** Retorna uma ConfigNotas base com regra 'substituicao' (default do sistema). */
function configSub(overrides: Partial<ConfigNotas> = {}): ConfigNotas {
  return {
    nota_maxima: 10,
    media_aprovacao: 6,
    permite_recuperacao: true,
    regra_recuperacao: 'substituicao',
    ...overrides,
  }
}

/** Retorna uma ConfigNotas com regra 'ponderada' e pesos 0.6/0.4. */
function configPond(overrides: Partial<ConfigNotas> = {}): ConfigNotas {
  return {
    nota_maxima: 10,
    media_aprovacao: 6,
    permite_recuperacao: true,
    regra_recuperacao: 'ponderada',
    peso_avaliacao: 0.6,
    peso_recuperacao: 0.4,
    ...overrides,
  }
}

/** Constrói um RecuperacaoResolvida de teste. */
function rec(
  esquema: EsquemaRecuperacao,
  nota: number,
  periodos: number[] = [],
  disciplinaId = 'disc-1'
): RecuperacaoResolvida {
  return { disciplinaId, esquema, notaRecuperacao: nota, periodosNumeros: periodos }
}

/**
 * Simula o cálculo de nota_final por período (calcularNotaFinal) e devolve
 * a média aritmética das notas finais — pipeline mínimo de fechamento.
 */
function mediaAritmetica(notasFinais: number[]): number {
  if (notasFinais.length === 0) return 0
  return notasFinais.reduce((s, n) => s + n, 0) / notasFinais.length
}

// ============================================================================
// 1. PIPELINE COMPLETO — esquema (a) por_periodo
// ============================================================================

describe('Esquema (a) por_periodo — pipeline completo', () => {
  it('nota_final por período = MAX(nota, rec); média anual é a aritmética das notas finais', () => {
    // Arrange: 4 bimestres; notas + recuperações por período
    const cfg = configSub({ esquema_recuperacao: 'por_periodo' })
    const nf1 = calcularNotaFinal(4, 7, cfg)  // rec maior → 7
    const nf2 = calcularNotaFinal(8, 5, cfg)  // rec menor → 8
    const nf3 = calcularNotaFinal(6, 6, cfg)  // iguais → 6
    const nf4 = calcularNotaFinal(9, null, cfg) // sem rec → 9

    // Act
    const media = mediaAritmetica([nf1!, nf2!, nf3!, nf4!])
    // (7 + 8 + 6 + 9) / 4 = 30 / 4 = 7.5
    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'por_periodo', [], cfg)

    // Assert
    expect(nf1).toBe(7)
    expect(nf2).toBe(8)
    expect(nf3).toBe(6)
    expect(nf4).toBe(9)
    expect(media).toBe(7.5)
    // 'por_periodo' é NO-OP no ajuste da média anual
    expect(mediaAjustada).toBe(7.5)
  })

  it("'por_periodo': ajustarMediaAnualPorEsquema é NO-OP mesmo passando recuperações", () => {
    // Arrange: aluno passou pela recuperação de 3º bimestre mas o cálculo anual
    // já reflete isso em nota_final do período — não deve ajustar novamente.
    const cfg = configSub({ esquema_recuperacao: 'por_periodo' })
    const recs = [rec('por_periodo', 10, [3])]

    // Act + Assert
    expect(ajustarMediaAnualPorEsquema(5.8, 'por_periodo', recs, cfg)).toBe(5.8)
  })

  it("'por_periodo' com regra ponderada: nota_final usa pesos; média anual é NO-OP", () => {
    // Arrange
    const cfg = configPond({ esquema_recuperacao: 'por_periodo' })
    // 4*0.6 + 8*0.4 = 2.4 + 3.2 = 5.6
    const nf = calcularNotaFinal(4, 8, cfg)

    // Act
    const mediaAjustada = ajustarMediaAnualPorEsquema(nf, 'por_periodo', [], cfg)

    // Assert
    expect(nf).toBeCloseTo(5.6, 5)
    expect(mediaAjustada).toBeCloseTo(5.6, 5) // NO-OP
  })
})

// ============================================================================
// 2. PIPELINE COMPLETO — esquema (b) por_bloco_periodos
// ============================================================================

describe('Esquema (b) por_bloco_periodos — pipeline completo', () => {
  it('recuperação de bloco maior que a média anual substitui a média (substituição)', () => {
    // Arrange: notas finais dos 4 bimestres (já calculadas por calcularNotaFinal)
    const cfg = configSub({ esquema_recuperacao: 'por_bloco_periodos' })
    const notasFinais = [4, 5, 6, 5]
    const media = mediaAritmetica(notasFinais) // 20/4 = 5.0

    // Recuperação do bloco 1ª+2ª = 7 (cobriu períodos 1 e 2)
    const recs = [rec('por_bloco_periodos', 7, [1, 2])]

    // Act
    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'por_bloco_periodos', recs, cfg)

    // Assert
    expect(media).toBe(5)
    expect(mediaAjustada).toBe(7) // substituição: MAX(5, 7)
  })

  it('recuperação de bloco menor que a média anual NÃO reduz a média (substituição)', () => {
    const cfg = configSub({ esquema_recuperacao: 'por_bloco_periodos' })
    const media = 8.0
    const recs = [rec('por_bloco_periodos', 5, [1, 2])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'por_bloco_periodos', recs, cfg)

    expect(mediaAjustada).toBe(8) // MAX(8, 5) = 8, não reduz
  })

  it('dois blocos (1a+2a e 3a+4a): usa a maior recuperação sobre a média', () => {
    const cfg = configSub({ esquema_recuperacao: 'por_bloco_periodos' })
    const media = 5.0
    const recs = [
      rec('por_bloco_periodos', 6, [1, 2]),
      rec('por_bloco_periodos', 8, [3, 4]),
    ]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'por_bloco_periodos', recs, cfg)

    // maior rec = 8; MAX(5, 8) = 8
    expect(mediaAjustada).toBe(8)
  })

  it('recuperação de bloco com regra ponderada aplica pesos sobre a média', () => {
    const cfg = configPond({ esquema_recuperacao: 'por_bloco_periodos' })
    const media = 5.0
    const recs = [rec('por_bloco_periodos', 8, [1, 2])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'por_bloco_periodos', recs, cfg)

    // 5*0.6 + 8*0.4 = 3 + 3.2 = 6.2
    expect(mediaAjustada).toBeCloseTo(6.2, 5)
  })

  it("ignora recuperações de esquema diferente ('semestral') ao processar 'por_bloco_periodos'", () => {
    const cfg = configSub({ esquema_recuperacao: 'por_bloco_periodos' })
    const media = 5.0
    const recs = [rec('semestral', 10, [1, 2])] // esquema errado

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'por_bloco_periodos', recs, cfg)

    expect(mediaAjustada).toBe(5) // nenhuma recuperação aplicável → NO-OP
  })
})

// ============================================================================
// 3. PIPELINE COMPLETO — esquema (c) semestral
// ============================================================================

describe('Esquema (c) semestral — pipeline completo', () => {
  it('recuperação semestral maior substitui a média anual', () => {
    const cfg = configSub({ esquema_recuperacao: 'semestral' })
    const media = 4.5
    // Recuperação do 2º semestre (períodos 3 e 4) = 7
    const recs = [rec('semestral', 7, [3, 4])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'semestral', recs, cfg)

    expect(mediaAjustada).toBe(7)
  })

  it('recuperação semestral menor NÃO reduz a média (substituição)', () => {
    const cfg = configSub({ esquema_recuperacao: 'semestral' })
    const media = 7.5
    const recs = [rec('semestral', 5, [1, 2])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'semestral', recs, cfg)

    expect(mediaAjustada).toBe(7.5)
  })

  it('dois semestres com recuperações: aplica a maior sobre a média anual', () => {
    const cfg = configSub({ esquema_recuperacao: 'semestral' })
    const media = 4.0
    const recs = [
      rec('semestral', 5, [1, 2]), // 1º semestre
      rec('semestral', 7, [3, 4]), // 2º semestre
    ]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'semestral', recs, cfg)

    // maior = 7; MAX(4, 7) = 7
    expect(mediaAjustada).toBe(7)
  })

  it('recuperação semestral com regra ponderada: aplica pesos sobre a média', () => {
    const cfg = configPond({ esquema_recuperacao: 'semestral' })
    const media = 5.0
    const recs = [rec('semestral', 9, [1, 2])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'semestral', recs, cfg)

    // 5*0.6 + 9*0.4 = 3 + 3.6 = 6.6
    expect(mediaAjustada).toBeCloseTo(6.6, 5)
  })

  it('sem recuperação semestral: média anual inalterada (fallback)', () => {
    const cfg = configSub({ esquema_recuperacao: 'semestral' })

    const mediaAjustada = ajustarMediaAnualPorEsquema(6.3, 'semestral', [], cfg)

    expect(mediaAjustada).toBe(6.3)
  })
})

// ============================================================================
// 4. PIPELINE COMPLETO — esquema (d) final (anual)
// ============================================================================

describe('Esquema (d) final — pipeline completo', () => {
  it('recuperação anual maior substitui a média anual (substituição)', () => {
    const cfg = configSub({ esquema_recuperacao: 'final' })
    const notasFinais = [4, 5, 5, 4] // média = 4.5
    const media = mediaAritmetica(notasFinais)
    const recs = [rec('final', 7, [1, 2, 3, 4])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'final', recs, cfg)

    expect(media).toBe(4.5)
    expect(mediaAjustada).toBe(7)
  })

  it('recuperação anual menor NÃO reduz a média (substituição default)', () => {
    const cfg = configSub({ esquema_recuperacao: 'final' })
    const media = 8.5
    const recs = [rec('final', 6, [1, 2, 3, 4])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'final', recs, cfg)

    expect(mediaAjustada).toBe(8.5)
  })

  it('recuperação final igual à média: mantém a média (sem efeito)', () => {
    const cfg = configSub({ esquema_recuperacao: 'final' })
    const media = 6.0
    const recs = [rec('final', 6, [1, 2, 3, 4])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'final', recs, cfg)

    expect(mediaAjustada).toBe(6)
  })

  it('recuperação final com regra ponderada aplica pesos sobre a média anual', () => {
    const cfg = configPond({ esquema_recuperacao: 'final' })
    const media = 5.0
    const recs = [rec('final', 8, [1, 2, 3, 4])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'final', recs, cfg)

    // 5*0.6 + 8*0.4 = 3 + 3.2 = 6.2
    expect(mediaAjustada).toBeCloseTo(6.2, 5)
  })

  it('ponderada com pesos que não somam 1 → fallback substituição MAX(4, 9)=9', () => {
    const cfg: ConfigNotas = {
      nota_maxima: 10,
      media_aprovacao: 6,
      permite_recuperacao: true,
      regra_recuperacao: 'ponderada',
      peso_avaliacao: 0.3,
      peso_recuperacao: 0.2, // soma = 0.5 ≠ 1.0
      esquema_recuperacao: 'final',
    }
    const recs = [rec('final', 9, [1, 2, 3, 4])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(4, 'final', recs, cfg)

    expect(mediaAjustada).toBe(9) // MAX(4, 9) por fallback
  })

  it('recuperação final sem nota (lista vazia): média anual inalterada', () => {
    const cfg = configSub({ esquema_recuperacao: 'final' })

    const mediaAjustada = ajustarMediaAnualPorEsquema(5.5, 'final', [], cfg)

    expect(mediaAjustada).toBe(5.5)
  })

  it('média anual null com recuperação final: permanece null', () => {
    const cfg = configSub({ esquema_recuperacao: 'final' })
    const recs = [rec('final', 9, [1, 2, 3, 4])]

    const mediaAjustada = ajustarMediaAnualPorEsquema(null, 'final', recs, cfg)

    expect(mediaAjustada).toBeNull()
  })

  it('respeit nota_maxima: recuperação não ultrapassa teto de 10', () => {
    const cfg = configPond({ nota_maxima: 10, esquema_recuperacao: 'final' })
    // 9*0.6 + 10*0.4 = 5.4 + 4 = 9.4 → dentro do limite
    const recs = [rec('final', 10, [])]

    const resultado = aplicarRecuperacaoSobreMedia(9, 10, cfg)

    expect(resultado).toBeCloseTo(9.4, 5)
    expect(resultado!).toBeLessThanOrEqual(10)
  })
})

// ============================================================================
// 5. FALLBACK LEGADO — coluna nota_recuperacao (notas_escolares)
// ============================================================================

describe('Fallback legado — nota_recuperacao em notas_escolares', () => {
  /**
   * Cenário: escola ainda não migrou para recuperacoes_escolares.
   * A função carregarRecuperacoesNaoPeriodicas retorna Map vazio (sem linhas no banco).
   * O cálculo deve usar a coluna legada nota_recuperacao via calcularNotaFinal.
   */
  it('FALLBACK: sem entradas novas → calcularNotaFinal usa nota_recuperacao legada normalmente', () => {
    // Arrange: nota legada do bimestre 3 com recuperação
    const cfg = configSub()
    const notaLegada = 4
    const recLegada = 8 // coluna nota_recuperacao de notas_escolares

    // Act: calcularNotaFinal é o caminho legado (por_periodo)
    const notaFinal = calcularNotaFinal(notaLegada, recLegada, cfg)

    // Assert
    expect(notaFinal).toBe(8) // MAX(4, 8) = 8
  })

  it('FALLBACK ponderada: nota_recuperacao legada usa pesos quando configurado', () => {
    const cfg = configPond()
    const notaFinal = calcularNotaFinal(4, 8, cfg)

    // 4*0.6 + 8*0.4 = 2.4 + 3.2 = 5.6
    expect(notaFinal).toBeCloseTo(5.6, 5)
  })

  it('FALLBACK com Map vazio: ajustarMediaAnualPorEsquema por_periodo é NO-OP', () => {
    // Simula que carregarRecuperacoesNaoPeriodicas retornou Map vazio
    // (esquema 'por_periodo' → NO-OP de qualquer forma)
    const cfg = configSub({ esquema_recuperacao: 'por_periodo' })
    const mediaComNf = 6.5 // calculada a partir dos nota_final (com rec legada embutida)

    const mapVazio = new Map<string, RecuperacaoResolvida[]>()
    const recsDisc = mapVazio.get('disc-1') ?? []

    const mediaAjustada = ajustarMediaAnualPorEsquema(mediaComNf, 'por_periodo', recsDisc, cfg)

    expect(mediaAjustada).toBe(6.5) // NO-OP
  })

  it('FALLBACK com Map vazio: ajustarMediaAnualPorEsquema final retorna média sem ajuste', () => {
    // Escola configurada como 'final' mas ainda não lançou recuperação nova.
    // Map retorna vazio → nenhuma recuperação aplicável → média inalterada.
    const cfg = configSub({ esquema_recuperacao: 'final' })
    const media = 4.8

    const mapVazio = new Map<string, RecuperacaoResolvida[]>()
    const recsDisc = mapVazio.get('disc-1') ?? []

    const mediaAjustada = ajustarMediaAnualPorEsquema(media, 'final', recsDisc, cfg)

    // Sem entrada nova → inalterada (não usa coluna legada neste caminho;
    // a coluna legada já foi usada pelo calcularNotaFinal de cada período)
    expect(mediaAjustada).toBe(4.8)
  })

  it('FALLBACK: permite_recuperacao=false ignora nota_recuperacao legada', () => {
    const cfg = configSub({ permite_recuperacao: false })
    const notaFinal = calcularNotaFinal(4, 9, cfg)

    expect(notaFinal).toBe(4) // rec ignorada
  })
})

// ============================================================================
// 6. carregarRecuperacoesNaoPeriodicas — mock de pool.query
// ============================================================================

describe('carregarRecuperacoesNaoPeriodicas (mock pool.query)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filtra esquema por_periodo: não retorna entradas com esquema por_periodo', async () => {
    // O SQL usa WHERE re.esquema <> 'por_periodo' — o banco não devolve essas linhas.
    // Simula resultado vazio (como seria com apenas linhas por_periodo no banco).
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const mapa = await carregarRecuperacoesNaoPeriodicas('aluno-1', '2026')

    expect(mapa.size).toBe(0)
    // Confirma que a query foi chamada com os parâmetros corretos
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("re.esquema <> 'por_periodo'"),
      ['aluno-1', '2026']
    )
  })

  it('converte nota_recuperacao de string (numeric PG) para number', async () => {
    // PG devolve DECIMAL/NUMERIC como string — armadilha §8 do contexto SISAM
    mockQuery.mockResolvedValueOnce({
      rows: [{
        disciplina_id: 'disc-mat',
        esquema: 'final',
        nota_recuperacao: '7.50', // string como vem do PG
        periodos_numeros: [1, 2, 3, 4],
      }],
      rowCount: 1,
    } as any)

    const mapa = await carregarRecuperacoesNaoPeriodicas('aluno-1', '2026')
    const recs = mapa.get('disc-mat')

    expect(recs).toHaveLength(1)
    expect(typeof recs![0].notaRecuperacao).toBe('number')
    expect(recs![0].notaRecuperacao).toBe(7.5)
  })

  it('agrupa múltiplas recuperações pela disciplina_id', async () => {
    // Cenário: aluno tem recuperação semestral em 2 disciplinas
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          disciplina_id: 'disc-mat',
          esquema: 'semestral',
          nota_recuperacao: '6.0',
          periodos_numeros: [1, 2],
        },
        {
          disciplina_id: 'disc-por',
          esquema: 'semestral',
          nota_recuperacao: '7.0',
          periodos_numeros: [1, 2],
        },
      ],
      rowCount: 2,
    } as any)

    const mapa = await carregarRecuperacoesNaoPeriodicas('aluno-1', '2026')

    expect(mapa.size).toBe(2)
    expect(mapa.get('disc-mat')).toHaveLength(1)
    expect(mapa.get('disc-por')![0].notaRecuperacao).toBe(7)
  })

  it('retorna Map vazio quando não há entradas no banco (fallback)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const mapa = await carregarRecuperacoesNaoPeriodicas('aluno-sem-rec', '2026')

    expect(mapa).toBeInstanceOf(Map)
    expect(mapa.size).toBe(0)
  })

  it('periodos_numeros: converte array vindo do banco para números finitos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        disciplina_id: 'disc-mat',
        esquema: 'por_bloco_periodos',
        nota_recuperacao: '5.0',
        periodos_numeros: [1, 2], // já numérico (COALESCE retorna array)
      }],
      rowCount: 1,
    } as any)

    const mapa = await carregarRecuperacoesNaoPeriodicas('aluno-1', '2026')
    const recs = mapa.get('disc-mat')

    expect(recs![0].periodosNumeros).toEqual([1, 2])
  })

  it('ignora linha com nota_recuperacao inválida (null/NaN)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          disciplina_id: 'disc-mat',
          esquema: 'final',
          nota_recuperacao: null, // nula: deve ser ignorada
          periodos_numeros: [1, 2, 3, 4],
        },
        {
          disciplina_id: 'disc-por',
          esquema: 'final',
          nota_recuperacao: '8.0', // válida
          periodos_numeros: [1, 2, 3, 4],
        },
      ],
      rowCount: 2,
    } as any)

    const mapa = await carregarRecuperacoesNaoPeriodicas('aluno-1', '2026')

    // disc-mat: nota nula → ignorada; disc-por: mantida
    expect(mapa.has('disc-mat')).toBe(false)
    expect(mapa.has('disc-por')).toBe(true)
  })

  it('usa o pool default quando nenhum runner é passado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await carregarRecuperacoesNaoPeriodicas('aluno-1', '2026')

    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// 7. buscarConfigNotas — resolução de esquema_recuperacao (mock pool.query)
// ============================================================================

describe('buscarConfigNotas — resolução de esquema_recuperacao (mock pool.query)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Limpa o cache em memória da função para evitar vazamento entre testes
    invalidarCacheConfigNotas()
  })

  it('sem override de série: esquema_recuperacao default é por_periodo', async () => {
    // Arrange: tabela global (configuracao_notas_escola) sem override de série
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          nota_maxima: '10', media_aprovacao: '6',
          permite_recuperacao: true,
          peso_avaliacao: null, peso_recuperacao: null,
          regra_recuperacao: 'substituicao',
        }],
        rowCount: 1,
      } as any)
    // sem serie → não chama 2ª query (escola_regras_avaliacao)

    const config = await buscarConfigNotas('esc-1', '2026', null)

    expect(config.esquema_recuperacao).toBe('por_periodo')
    expect(config.regra_recuperacao).toBe('substituicao')
    // pool.query foi chamado apenas 1 vez (somente a query global)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('com override de série configurado como final: esquema_recuperacao = final', async () => {
    // Arrange: config global + override por série (escola_regras_avaliacao)
    mockQuery
      .mockResolvedValueOnce({
        // configuracao_notas_escola
        rows: [{
          nota_maxima: '10', media_aprovacao: '6',
          permite_recuperacao: true,
          peso_avaliacao: '0.6', peso_recuperacao: '0.4',
          regra_recuperacao: 'substituicao',
        }],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({
        // escola_regras_avaliacao (override por série)
        rows: [{
          media_aprovacao: null,
          nota_maxima: null,
          permite_recuperacao: null,
          esquema_recuperacao: 'final',
        }],
        rowCount: 1,
      } as any)

    const config = await buscarConfigNotas('esc-1', '2026', 'serie-5ano')

    expect(config.esquema_recuperacao).toBe('final')
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('com override de série configurado como semestral: esquema_recuperacao = semestral', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ nota_maxima: '10', media_aprovacao: '6', permite_recuperacao: true, peso_avaliacao: null, peso_recuperacao: null, regra_recuperacao: null }],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({
        rows: [{ media_aprovacao: null, nota_maxima: null, permite_recuperacao: true, esquema_recuperacao: 'semestral' }],
        rowCount: 1,
      } as any)

    const config = await buscarConfigNotas('esc-1', '2026', 'serie-eja')

    expect(config.esquema_recuperacao).toBe('semestral')
  })

  it('com override de série configurado como por_bloco_periodos', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ nota_maxima: '10', media_aprovacao: '6', permite_recuperacao: true, peso_avaliacao: null, peso_recuperacao: null, regra_recuperacao: null }],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({
        rows: [{ media_aprovacao: null, nota_maxima: null, permite_recuperacao: null, esquema_recuperacao: 'por_bloco_periodos' }],
        rowCount: 1,
      } as any)

    const config = await buscarConfigNotas('esc-1', '2026', 'serie-fund')

    expect(config.esquema_recuperacao).toBe('por_bloco_periodos')
  })

  it('esquema_recuperacao inválido no banco é normalizado para por_periodo (default)', async () => {
    // Protege contra dados sujos no banco (valor fora do CHECK constraint)
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ nota_maxima: '10', media_aprovacao: '6', permite_recuperacao: true, peso_avaliacao: null, peso_recuperacao: null, regra_recuperacao: null }],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({
        rows: [{ media_aprovacao: null, nota_maxima: null, permite_recuperacao: null, esquema_recuperacao: 'invalido_xyz' }],
        rowCount: 1,
      } as any)

    const config = await buscarConfigNotas('esc-1', '2026', 'serie-x')

    expect(config.esquema_recuperacao).toBe('por_periodo')
  })

  it('sem linha em configuracao_notas_escola: usa defaults (sem crash)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // global vazio
      // sem serie → 1 query

    const config = await buscarConfigNotas('esc-sem-config', '2026', null)

    expect(config.nota_maxima).toBe(10)
    expect(config.media_aprovacao).toBe(6)
    expect(config.permite_recuperacao).toBe(true)
    expect(config.esquema_recuperacao).toBe('por_periodo')
  })
})

// ============================================================================
// 8. dualWriteRecuperacao — mock de PoolClient (sequência de queries)
// ============================================================================

describe('dualWriteRecuperacao — mock PoolClient (sequência de queries)', () => {
  /** Cria um mock de PoolClient mínimo para dualWriteRecuperacao. */
  function mockClient() {
    return { query: vi.fn() } as any
  }

  const baseParams = {
    escolaId: 'esc-1',
    anoLetivo: '2026',
    periodoId: 'per-3',
    registradoPor: 'prof-1',
  }

  it('esquema por_periodo: grava DELETE + INSERT + ponte para cada aluno com recuperação', async () => {
    const client = mockClient()
    // DELETE retorna rowCount=0; INSERT retorna id; INSERT ponte retorna rowCount=1
    client.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE nota_id_origem aluno-1
      .mockResolvedValueOnce({ rows: [{ id: 'rec-uuid-1' }], rowCount: 1 }) // INSERT recuperacoes_escolares
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT recuperacoes_periodos

    const cfg = configSub({ esquema_recuperacao: 'por_periodo' })

    await dualWriteRecuperacao(client, {
      ...baseParams,
      config: cfg,
      itens: [{
        notaId: 'nota-1',
        alunoId: 'aluno-1',
        disciplinaId: 'disc-mat',
        notaRecuperacao: 8,
        notaFinal: 8,
      }],
    })

    expect(client.query).toHaveBeenCalledTimes(3)
    // 1ª call: DELETE por nota_id_origem
    expect(client.query.mock.calls[0][0]).toContain('DELETE FROM recuperacoes_escolares')
    // 2ª call: INSERT com esquema
    expect(client.query.mock.calls[1][0]).toContain('INSERT INTO recuperacoes_escolares')
    expect(client.query.mock.calls[1][1]).toContain('por_periodo')
    // 3ª call: ponte
    expect(client.query.mock.calls[2][0]).toContain('INSERT INTO recuperacoes_periodos')
  })

  it('esquema final: grava com esquema=final no INSERT', async () => {
    const client = mockClient()
    client.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'rec-uuid-2' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const cfg = configSub({ esquema_recuperacao: 'final' })

    await dualWriteRecuperacao(client, {
      ...baseParams,
      config: cfg,
      itens: [{
        notaId: 'nota-2',
        alunoId: 'aluno-2',
        disciplinaId: 'disc-por',
        notaRecuperacao: 7,
        notaFinal: 7,
      }],
    })

    // Verifica que o esquema 'final' foi passado no INSERT
    expect(client.query.mock.calls[1][1]).toContain('final')
  })

  it('esquema semestral: grava com esquema=semestral no INSERT', async () => {
    const client = mockClient()
    client.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'rec-uuid-3' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const cfg = configSub({ esquema_recuperacao: 'semestral' })

    await dualWriteRecuperacao(client, {
      ...baseParams,
      config: cfg,
      itens: [{
        notaId: 'nota-3',
        alunoId: 'aluno-3',
        disciplinaId: 'disc-cien',
        notaRecuperacao: 6,
        notaFinal: 6,
      }],
    })

    expect(client.query.mock.calls[1][1]).toContain('semestral')
  })

  it('esquema por_bloco_periodos: grava com esquema=por_bloco_periodos no INSERT', async () => {
    const client = mockClient()
    client.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'rec-uuid-4' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const cfg = configSub({ esquema_recuperacao: 'por_bloco_periodos' })

    await dualWriteRecuperacao(client, {
      ...baseParams,
      config: cfg,
      itens: [{
        notaId: 'nota-4',
        alunoId: 'aluno-4',
        disciplinaId: 'disc-geo',
        notaRecuperacao: 5,
        notaFinal: 5,
      }],
    })

    expect(client.query.mock.calls[1][1]).toContain('por_bloco_periodos')
  })

  it('nota_recuperacao null: faz DELETE sem INSERT (remove recuperação anterior)', async () => {
    const client = mockClient()
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // DELETE

    const cfg = configSub({ esquema_recuperacao: 'por_periodo' })

    await dualWriteRecuperacao(client, {
      ...baseParams,
      config: cfg,
      itens: [{
        notaId: 'nota-5',
        alunoId: 'aluno-5',
        disciplinaId: 'disc-mat',
        notaRecuperacao: null, // sem nota de recuperação
        notaFinal: 4,
      }],
    })

    // Apenas DELETE; nenhum INSERT
    expect(client.query).toHaveBeenCalledTimes(1)
    expect(client.query.mock.calls[0][0]).toContain('DELETE FROM recuperacoes_escolares')
  })

  it('disciplinaId null: item é ignorado (nova entidade exige disciplina_id NOT NULL)', async () => {
    const client = mockClient()

    const cfg = configSub()

    await dualWriteRecuperacao(client, {
      ...baseParams,
      config: cfg,
      itens: [{
        notaId: 'nota-6',
        alunoId: 'aluno-6',
        disciplinaId: null, // nula → item ignorado
        notaRecuperacao: 8,
        notaFinal: 8,
      }],
    })

    // Nenhuma query deve ser chamada para item com disciplina nula
    expect(client.query).not.toHaveBeenCalled()
  })

  it('múltiplos alunos: processa cada item em sequência (3 queries por aluno com rec)', async () => {
    const client = mockClient()
    // Aluno 1: com recuperação (3 queries)
    client.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'rec-u-a' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
    // Aluno 2: com recuperação (3 queries)
    client.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'rec-u-b' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const cfg = configSub()

    await dualWriteRecuperacao(client, {
      ...baseParams,
      config: cfg,
      itens: [
        { notaId: 'nota-a', alunoId: 'al-a', disciplinaId: 'disc-1', notaRecuperacao: 7, notaFinal: 7 },
        { notaId: 'nota-b', alunoId: 'al-b', disciplinaId: 'disc-1', notaRecuperacao: 8, notaFinal: 8 },
      ],
    })

    // 2 alunos × 3 queries cada = 6 queries totais
    expect(client.query).toHaveBeenCalledTimes(6)
  })
})

// ============================================================================
// 9. Tabela comparativa (valores concretos) — todos os esquemas em sequência
// ============================================================================

describe('Tabela comparativa — nota_final e media_final por esquema (regra substituicao)', () => {
  /**
   * Cenário unificado:
   *   Notas brutas dos 4 bimestres: 4, 5, 5, 4
   *   Recuperação disponível: 7
   *   Regra: substituicao (default)
   *
   * Resultados esperados:
   *   (a) por_periodo  : nota_final de cada bimestre inclui a rec; média = calculada por período
   *   (b) por_bloco    : média = 4.5 → rec 7 > 4.5 → media_final = 7
   *   (c) semestral    : média = 4.5 → rec 7 > 4.5 → media_final = 7
   *   (d) final        : média = 4.5 → rec 7 > 4.5 → media_final = 7
   */

  const notasBrutas = [4, 5, 5, 4]

  it('(a) por_periodo: nota_final de cada bimestre = MAX(nota_bruta, rec) quando rec é maior', () => {
    const cfg = configSub({ esquema_recuperacao: 'por_periodo' })
    // Recuperação só no 1º bimestre (nota bruta = 4, rec = 7)
    const nf1 = calcularNotaFinal(4, 7, cfg) // 7
    const nf2 = calcularNotaFinal(5, null, cfg) // 5
    const nf3 = calcularNotaFinal(5, null, cfg) // 5
    const nf4 = calcularNotaFinal(4, null, cfg) // 4

    const media = mediaAritmetica([nf1!, nf2!, nf3!, nf4!])
    const mediaFinal = ajustarMediaAnualPorEsquema(media, 'por_periodo', [], cfg)

    expect(nf1).toBe(7)
    expect(mediaFinal).toBe(5.25) // (7+5+5+4)/4
  })

  it('(b) por_bloco_periodos: media_final = MAX(mediaAnual, recBloco) = 7', () => {
    const cfg = configSub({ esquema_recuperacao: 'por_bloco_periodos' })
    const notasFinais = notasBrutas.map((n) => calcularNotaFinal(n, null, cfg)!)
    const media = mediaAritmetica(notasFinais) // (4+5+5+4)/4 = 4.5
    const recs = [rec('por_bloco_periodos', 7, [1, 2])]

    const mediaFinal = ajustarMediaAnualPorEsquema(media, 'por_bloco_periodos', recs, cfg)

    expect(media).toBe(4.5)
    expect(mediaFinal).toBe(7)
  })

  it('(c) semestral: media_final = MAX(mediaAnual, recSemestral) = 7', () => {
    const cfg = configSub({ esquema_recuperacao: 'semestral' })
    const notasFinais = notasBrutas.map((n) => calcularNotaFinal(n, null, cfg)!)
    const media = mediaAritmetica(notasFinais) // 4.5
    const recs = [rec('semestral', 7, [1, 2])]

    const mediaFinal = ajustarMediaAnualPorEsquema(media, 'semestral', recs, cfg)

    expect(mediaFinal).toBe(7)
  })

  it('(d) final: media_final = MAX(mediaAnual, recAnual) = 7', () => {
    const cfg = configSub({ esquema_recuperacao: 'final' })
    const notasFinais = notasBrutas.map((n) => calcularNotaFinal(n, null, cfg)!)
    const media = mediaAritmetica(notasFinais) // 4.5
    const recs = [rec('final', 7, [1, 2, 3, 4])]

    const mediaFinal = ajustarMediaAnualPorEsquema(media, 'final', recs, cfg)

    expect(mediaFinal).toBe(7)
  })
})
