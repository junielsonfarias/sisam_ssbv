/**
 * Testes unitários — dualWriteMatricula (ADR-002 fase 3)
 *
 * Cobre o helper de escrita paralela em `matriculas`, introduzido no commit
 * d96ba48 (feat(adr-002): dual-write em matriculas no ETL e service).
 *
 * Comportamentos travados:
 *   1. Caminho feliz: UPSERT por UNIQUE(aluno_id, ano_letivo_id) — SQL correto.
 *   2. alunos.turma_id continua sendo escrito (o dual-write é ADITIVO, não substitui).
 *   3. No-op quando turmaId é null/undefined — sem consulta ao banco.
 *   4. No-op quando alunoId é vazio — sem consulta ao banco.
 *   5. No-op quando anoLetivoId não pode ser resolvido (banco não tem o ano).
 *   6. Usa anoLetivoId pré-resolvido (lote ETL) sem re-consultar anos_letivos.
 *   7. Usa serieId pré-resolvido (lote ETL) sem re-consultar series_escolares.
 *   8. Resolve anoLetivoId via resolverAnoLetivoId quando não pré-resolvido.
 *   9. Resolve serieId via resolverSerieId quando não pré-resolvido.
 *  10. Situacao padrão é 'cursando' quando não fornecida.
 *  11. Cache de anoLetivoId evita segunda consulta a anos_letivos.
 *  12. Cache de serieId evita segunda consulta a series_escolares.
 *  13. UPSERT usa ON CONFLICT ON CONSTRAINT uq_matriculas_aluno_ano (regressão: sem conflito genérico).
 *  14. Parâmetros do UPSERT na ordem correta: $1=aluno_id … $5=situacao.
 *  15. serieId pode ser null (NULLABLE no ADR-002 — série não cadastrada não quebra).
 *
 * Estratégia: puramente unitário — executor mockado (vi.fn()), sem pool real.
 * O executor aceita `{ query: vi.fn() }` (interface QueryExecutor).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------- mock de mestre.service ----
// Precisamos controlar resolverAnoLetivoId e resolverSerieId para testar o dual-write
// em isolamento, sem acoplamento à implementação do resolver.
vi.mock('@/lib/services/gestor/mestre.service', () => ({
  resolverAnoLetivoId: vi.fn(),
  resolverSerieId: vi.fn(),
}))

import { resolverAnoLetivoId, resolverSerieId } from '@/lib/services/gestor/mestre.service'
import { dualWriteMatricula, type DadosDualWriteMatricula } from '@/lib/services/matriculas/dual-write'

const mockResolverAnoLetivo = vi.mocked(resolverAnoLetivoId)
const mockResolverSerie = vi.mocked(resolverSerieId)

// ------------------------------------------------------------- fixtures ----

const ALUNO_ID = 'aluno-uuid-0001'
const TURMA_ID = 'turma-uuid-0001'
const ANO_LETIVO = '2026'
const ANO_LETIVO_ID = 'ano-letivo-uuid-2026'
const SERIE = '5º Ano'
const SERIE_ID = 'serie-uuid-5ano'

/** Cria um executor mockado (pool ou client de transação) */
function criarExecutor() {
  return { query: vi.fn() }
}

/** Dados completos com chaves pré-resolvidas (caminho lote ETL) */
function dadosPreResolvidos(overrides?: Partial<DadosDualWriteMatricula>): DadosDualWriteMatricula {
  return {
    alunoId: ALUNO_ID,
    turmaId: TURMA_ID,
    anoLetivo: ANO_LETIVO,
    anoLetivoId: ANO_LETIVO_ID,
    serieId: SERIE_ID,
    situacao: 'cursando',
    ...overrides,
  }
}

/** Dados sem chaves pré-resolvidas (caminho service de matrícula single) */
function dadosSemPreResolucao(overrides?: Partial<DadosDualWriteMatricula>): DadosDualWriteMatricula {
  return {
    alunoId: ALUNO_ID,
    turmaId: TURMA_ID,
    anoLetivo: ANO_LETIVO,
    serie: SERIE,
    situacao: 'cursando',
    ...overrides,
  }
}

// ================================================================ beforeEach ====

beforeEach(() => {
  // resetAllMocks limpa calls E a fila de mockResolvedValueOnce (clearAllMocks não limpa a fila).
  vi.resetAllMocks()
})

// ================================================================== 1. Caminho feliz ====

describe('dualWriteMatricula — caminho feliz (chaves pré-resolvidas)', () => {
  it('executa exatamente uma query INSERT ... ON CONFLICT quando todos os dados são fornecidos', async () => {
    // Arrange
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    // Act
    await dualWriteMatricula(executor, dadosPreResolvidos())

    // Assert — uma única query (não resolve anoLetivo/serie pois já vieram pré-resolvidos)
    expect(executor.query).toHaveBeenCalledTimes(1)
    expect(mockResolverAnoLetivo).not.toHaveBeenCalled()
    expect(mockResolverSerie).not.toHaveBeenCalled()
  })

  it('SQL contém INSERT INTO matriculas com ON CONFLICT ON CONSTRAINT uq_matriculas_aluno_ano', async () => {
    // Arrange
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    // Act
    await dualWriteMatricula(executor, dadosPreResolvidos())

    // Assert — SQL correto (regressão: ON CONFLICT ON CONSTRAINT, não genérico)
    const sql = String(executor.query.mock.calls[0][0])
    expect(sql).toContain('INSERT INTO matriculas')
    expect(sql).toContain('ON CONFLICT ON CONSTRAINT uq_matriculas_aluno_ano')
    expect(sql).toContain('DO UPDATE')
  })

  it('SQL atualiza turma_id, serie_id, situacao e atualizado_em no DO UPDATE', async () => {
    // Arrange
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    // Act
    await dualWriteMatricula(executor, dadosPreResolvidos())

    // Assert — colunas do SET no DO UPDATE
    const sql = String(executor.query.mock.calls[0][0])
    expect(sql).toContain('turma_id')
    expect(sql).toContain('serie_id')
    expect(sql).toContain('situacao')
    expect(sql).toContain('atualizado_em')
  })

  it('parâmetros passados ao executor seguem a ordem: $1=aluno_id, $2=turma_id, $3=ano_letivo_id, $4=serie_id, $5=situacao', async () => {
    // Arrange
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    // Act
    await dualWriteMatricula(executor, dadosPreResolvidos())

    // Assert — ordem exata dos parâmetros (regressão contra transposição de IDs)
    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(params[0]).toBe(ALUNO_ID)     // $1 aluno_id
    expect(params[1]).toBe(TURMA_ID)     // $2 turma_id
    expect(params[2]).toBe(ANO_LETIVO_ID) // $3 ano_letivo_id
    expect(params[3]).toBe(SERIE_ID)     // $4 serie_id
    expect(params[4]).toBe('cursando')   // $5 situacao
  })
})

// ================================================================== 2. alunos.turma_id continua sendo escrito ====

describe('dualWriteMatricula — caráter ADITIVO (alunos.turma_id não é substituído)', () => {
  it('o helper NÃO emite UPDATE em alunos — apenas INSERT em matriculas', async () => {
    // Arrange — verifica que a query enviada ao executor não toca a tabela alunos
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    // Act
    await dualWriteMatricula(executor, dadosPreResolvidos())

    // Assert — nenhuma chamada contém "UPDATE alunos" ou "SET turma_id" em alunos
    const todasAsChamadas = executor.query.mock.calls.map((c) => String(c[0]))
    const atualizaAlunos = todasAsChamadas.some(
      (sql) => sql.toUpperCase().includes('UPDATE ALUNOS')
    )
    expect(atualizaAlunos).toBe(false)
  })

  it('o SQL de INSERT em matriculas insere turma_id como $2 (espelho do vínculo)', async () => {
    // Garante que turma_id vai para a tabela matriculas (o espelho), não apenas alunos
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosPreResolvidos({ turmaId: TURMA_ID }))

    const sql = String(executor.query.mock.calls[0][0])
    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(sql).toContain('turma_id')
    expect(params[1]).toBe(TURMA_ID)
  })

  it('escrita em matriculas usa o mesmo turmaId que foi passado (sem reescrever alunos.turma_id)', async () => {
    // Simula o service de matrícula: o UPDATE em alunos ocorre ANTES do dual-write;
    // o helper só espelha — o turmaId não é alterado pelo helper em si.
    const OUTRO_TURMA = 'turma-uuid-9999'
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosPreResolvidos({ turmaId: OUTRO_TURMA }))

    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(params[1]).toBe(OUTRO_TURMA)
    // A única query emitida é para matriculas, não para alunos
    const sql = String(executor.query.mock.calls[0][0])
    expect(sql).not.toContain('UPDATE alunos')
  })
})

// ================================================================== 3. No-op sem turmaId ====

describe('dualWriteMatricula — no-op silencioso quando turmaId está ausente', () => {
  it('retorna sem chamar executor quando turmaId é null', async () => {
    const executor = criarExecutor()

    await dualWriteMatricula(executor, dadosPreResolvidos({ turmaId: null }))

    expect(executor.query).not.toHaveBeenCalled()
  })

  it('retorna sem chamar executor quando turmaId é string vazia', async () => {
    const executor = criarExecutor()

    // turmaId '' é falsy → no-op
    await dualWriteMatricula(executor, dadosPreResolvidos({ turmaId: '' as any }))

    expect(executor.query).not.toHaveBeenCalled()
  })

  it('não lança exceção quando turmaId é null (comportamento aditivo)', async () => {
    const executor = criarExecutor()

    await expect(
      dualWriteMatricula(executor, dadosPreResolvidos({ turmaId: null }))
    ).resolves.toBeUndefined()
  })
})

// ================================================================== 4. No-op sem alunoId ====

describe('dualWriteMatricula — no-op silencioso quando alunoId está ausente', () => {
  it('retorna sem chamar executor quando alunoId é string vazia', async () => {
    const executor = criarExecutor()

    await dualWriteMatricula(executor, dadosPreResolvidos({ alunoId: '' }))

    expect(executor.query).not.toHaveBeenCalled()
  })
})

// ================================================================== 5. No-op sem anoLetivoId resolvível ====

describe('dualWriteMatricula — no-op silencioso quando ano letivo não é resolvível', () => {
  it('retorna sem UPSERT quando resolverAnoLetivoId retorna null (ano não existe em anos_letivos)', async () => {
    // Arrange — chaves NÃO pré-resolvidas; resolver retorna null
    const executor = criarExecutor()
    mockResolverAnoLetivo.mockResolvedValueOnce(null)
    mockResolverSerie.mockResolvedValueOnce(SERIE_ID)

    // Act
    await dualWriteMatricula(executor, dadosSemPreResolucao())

    // Assert — sem UPSERT em matriculas
    expect(executor.query).not.toHaveBeenCalled()
  })

  it('não lança exceção quando anoLetivoId pré-resolvido é null (no-op aditivo)', async () => {
    const executor = criarExecutor()

    await expect(
      dualWriteMatricula(executor, dadosPreResolvidos({ anoLetivoId: null }))
    ).resolves.toBeUndefined()

    // Nenhuma query enviada
    expect(executor.query).not.toHaveBeenCalled()
  })
})

// ================================================================== 6. Chaves pré-resolvidas (ETL batch) ====

describe('dualWriteMatricula — uso de chaves pré-resolvidas (lote ETL, evita relookup)', () => {
  it('usa anoLetivoId pré-resolvido sem chamar resolverAnoLetivoId', async () => {
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosPreResolvidos({ anoLetivoId: ANO_LETIVO_ID }))

    expect(mockResolverAnoLetivo).not.toHaveBeenCalled()
  })

  it('usa serieId pré-resolvido sem chamar resolverSerieId', async () => {
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosPreResolvidos({ serieId: SERIE_ID }))

    expect(mockResolverSerie).not.toHaveBeenCalled()
  })

  it('anoLetivoId pré-resolvido chega em $3 do UPSERT sem passar pelo resolver', async () => {
    const OUTRO_ANO_ID = 'ano-letivo-especifico-uuid'
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosPreResolvidos({ anoLetivoId: OUTRO_ANO_ID }))

    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(params[2]).toBe(OUTRO_ANO_ID)
  })
})

// ================================================================== 7. Resolução dinâmica ====

describe('dualWriteMatricula — resolução dinâmica via mestre.service (service single)', () => {
  it('chama resolverAnoLetivoId quando anoLetivoId não está pré-resolvido', async () => {
    const executor = criarExecutor()
    mockResolverAnoLetivo.mockResolvedValueOnce(ANO_LETIVO_ID)
    mockResolverSerie.mockResolvedValueOnce(SERIE_ID)
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosSemPreResolucao())

    expect(mockResolverAnoLetivo).toHaveBeenCalledOnce()
    expect(mockResolverAnoLetivo).toHaveBeenCalledWith(executor, ANO_LETIVO, undefined)
  })

  it('chama resolverSerieId quando serieId não está pré-resolvido', async () => {
    const executor = criarExecutor()
    mockResolverAnoLetivo.mockResolvedValueOnce(ANO_LETIVO_ID)
    mockResolverSerie.mockResolvedValueOnce(SERIE_ID)
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosSemPreResolucao())

    expect(mockResolverSerie).toHaveBeenCalledOnce()
    expect(mockResolverSerie).toHaveBeenCalledWith(executor, SERIE, undefined)
  })

  it('anoLetivoId resolvido dinamicamente chega em $3 do UPSERT', async () => {
    const executor = criarExecutor()
    mockResolverAnoLetivo.mockResolvedValueOnce(ANO_LETIVO_ID)
    mockResolverSerie.mockResolvedValueOnce(null)
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosSemPreResolucao())

    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(params[2]).toBe(ANO_LETIVO_ID)
  })
})

// ================================================================== 8. Caches de lote ====

describe('dualWriteMatricula — cache de lote elimina relookups', () => {
  it('passa cache de anoLetivoId para resolverAnoLetivoId (usado no lote ETL)', async () => {
    const executor = criarExecutor()
    const anoLetivoIdCache = new Map<string, string | null>([[ANO_LETIVO, ANO_LETIVO_ID]])
    // Cache já tem o valor — resolver não precisa de query
    mockResolverAnoLetivo.mockResolvedValueOnce(ANO_LETIVO_ID)
    mockResolverSerie.mockResolvedValueOnce(SERIE_ID)
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(
      executor,
      dadosSemPreResolucao(),
      { anoLetivoIdCache, serieIdCache: undefined }
    )

    expect(mockResolverAnoLetivo).toHaveBeenCalledWith(executor, ANO_LETIVO, anoLetivoIdCache)
  })

  it('passa cache de serieId para resolverSerieId (usado no lote ETL)', async () => {
    const executor = criarExecutor()
    const serieIdCache = new Map<string, string | null>([[SERIE, SERIE_ID]])
    mockResolverAnoLetivo.mockResolvedValueOnce(ANO_LETIVO_ID)
    mockResolverSerie.mockResolvedValueOnce(SERIE_ID)
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(
      executor,
      dadosSemPreResolucao(),
      { anoLetivoIdCache: undefined, serieIdCache }
    )

    expect(mockResolverSerie).toHaveBeenCalledWith(executor, SERIE, serieIdCache)
  })
})

// ================================================================== 9. Situacao padrão ====

describe('dualWriteMatricula — situacao padrão é "cursando"', () => {
  it('usa "cursando" como situacao quando não fornecida explicitamente', async () => {
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    const dados = dadosPreResolvidos()
    delete (dados as any).situacao  // remove o campo para forçar o default

    await dualWriteMatricula(executor, dados)

    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(params[4]).toBe('cursando')
  })

  it('respeita situacao fornecida explicitamente (ex.: "transferido")', async () => {
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosPreResolvidos({ situacao: 'transferido' }))

    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(params[4]).toBe('transferido')
  })
})

// ================================================================== 10. serie_id NULLABLE ====

describe('dualWriteMatricula — serieId pode ser null (ADR-002 transição)', () => {
  it('executa UPSERT mesmo quando serieId pré-resolvido é null (série não cadastrada)', async () => {
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosPreResolvidos({ serieId: null }))

    // UPSERT executado mesmo com serie_id = null
    expect(executor.query).toHaveBeenCalledTimes(1)
    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(params[3]).toBeNull()  // $4 serie_id pode ser null
  })

  it('executa UPSERT quando resolverSerieId retorna null (série sem catálogo)', async () => {
    // Arrange
    const executor = criarExecutor()
    mockResolverAnoLetivo.mockResolvedValueOnce(ANO_LETIVO_ID)
    mockResolverSerie.mockResolvedValueOnce(null)  // série não catalogada
    executor.query.mockResolvedValueOnce({ rows: [] })

    // Act
    await dualWriteMatricula(executor, dadosSemPreResolucao({ serie: 'Série Estranha XYZ' }))

    // Assert — Não é no-op: ainda insere em matriculas com serie_id = null
    expect(executor.query).toHaveBeenCalledTimes(1)
    const params = executor.query.mock.calls[0][1] as unknown[]
    expect(params[3]).toBeNull()
  })
})

// ================================================================== 11. Executor agnóstico ====

describe('dualWriteMatricula — executor agnóstico (pool OU client de transação)', () => {
  it('funciona com executor que simula um client de transação (dentro de savepoint)', async () => {
    // O service de matrícula passa o client da transação em andamento;
    // o helper usa o mesmo client — mesma transação, sem abrir nova conexão.
    const clientTransacao = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }),
    }

    await dualWriteMatricula(clientTransacao, dadosPreResolvidos())

    expect(clientTransacao.query).toHaveBeenCalledTimes(1)
    const sql = String(clientTransacao.query.mock.calls[0][0])
    expect(sql).toContain('INSERT INTO matriculas')
  })

  it('funciona com executor que simula pool (fora de transação — caminho ETL)', async () => {
    const poolSimulado = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }),
    }

    await dualWriteMatricula(poolSimulado, dadosPreResolvidos())

    expect(poolSimulado.query).toHaveBeenCalledTimes(1)
  })
})

// ================================================================== 12. Regressão d96ba48 ====

describe('regressão d96ba48: dual-write é ADITIVO — comportamento no-op não quebra o fluxo', () => {
  it('regressão d96ba48: ausência de turmaId NÃO lança exceção (ETL não quebra por espelho)', async () => {
    // Antes do fix (d96ba48), o service não tinha dual-write algum.
    // Este teste trava que o helper introduzido seja genuinamente silencioso
    // em dados incompletos — o ETL nunca pode lançar por causa do espelho.
    const executor = criarExecutor()

    await expect(
      dualWriteMatricula(executor, dadosPreResolvidos({ turmaId: null }))
    ).resolves.toBeUndefined()

    expect(executor.query).not.toHaveBeenCalled()
  })

  it('regressão d96ba48: ano letivo sem cadastro NÃO lança exceção (ETL não quebra por espelho)', async () => {
    const executor = criarExecutor()
    // anoLetivoId pré-resolvido como null → ano não existe em anos_letivos
    await expect(
      dualWriteMatricula(executor, dadosPreResolvidos({ anoLetivoId: null }))
    ).resolves.toBeUndefined()

    expect(executor.query).not.toHaveBeenCalled()
  })

  it('regressão d96ba48: UPSERT usa constraint nomeada, não ON CONFLICT(col) genérico', async () => {
    // Se o UPSERT usar ON CONFLICT(aluno_id, ano_letivo_id) sem o nome da constraint,
    // o PG pode ignorar índices parciais ou usar constraint errada. Trava o nome exato.
    const executor = criarExecutor()
    executor.query.mockResolvedValueOnce({ rows: [] })

    await dualWriteMatricula(executor, dadosPreResolvidos())

    const sql = String(executor.query.mock.calls[0][0])
    expect(sql).toContain('ON CONSTRAINT uq_matriculas_aluno_ano')
    // Não deve usar a forma genérica sem nome
    expect(sql).not.toMatch(/ON CONFLICT\s*\(/)
  })
})
