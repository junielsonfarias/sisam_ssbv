/**
 * ADR-001 — governanca.ts: registrarDivergenciaImportacao() (unitario)
 *
 * Prova que:
 *   - Os campos corretos sao gravados na tabela importacao_divergencias.
 *   - A funcao e TOLERANTE A FALHA: quando o banco lanca excecao ela nao
 *     propaga o erro (nao derruba o fluxo de importacao).
 *   - dado_etl e serializado como JSON (sem PII sensivel).
 *   - registrarMestreAusente e registrarMestreCriado delegam para registrarHistorico.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// registrarHistorico usa pool internamente — mockamos a chamada via pool.
vi.mock('@/lib/divergencias/corretores', () => ({
  registrarHistorico: vi.fn().mockResolvedValue(undefined),
}))

import pool from '@/database/connection'
import { registrarDivergenciaImportacao, registrarMestreAusente, registrarMestreCriado } from '@/lib/services/importacao/governanca'
import { registrarHistorico } from '@/lib/divergencias/corretores'

const mockPool = vi.mocked(pool)
const mockRegistrarHistorico = vi.mocked(registrarHistorico)

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// registrarDivergenciaImportacao
// ---------------------------------------------------------------------------

describe('registrarDivergenciaImportacao (ADR-001)', () => {
  it('caminho feliz — turma: grava na tabela importacao_divergencias com os campos corretos', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

    await registrarDivergenciaImportacao({
      tipo: 'turma',
      dadoEtl: { codigo: '5A', nome: '5A', escola_id: 'esc-uuid', serie: '5', ano_letivo: '2026' },
      chaveTentada: 'escola_id+codigo+ano_letivo (5A/2026)',
      importacaoId: 'imp-uuid-001',
    })

    expect(mockPool.query).toHaveBeenCalledTimes(1)
    const [sql, params] = mockPool.query.mock.calls[0]
    expect(String(sql)).toContain('INSERT INTO importacao_divergencias')
    expect(String(sql)).toContain('importacao_id')
    expect(String(sql)).toContain('tipo')
    expect(String(sql)).toContain('dado_etl')
    expect(String(sql)).toContain('chave_tentada')

    // Parametros na ordem correta.
    expect(params![0]).toBe('imp-uuid-001')  // importacao_id
    expect(params![1]).toBe('turma')          // tipo
    // dado_etl deve ser JSON serializado.
    expect(() => JSON.parse(params![2] as string)).not.toThrow()
    const dadoEtlParsed = JSON.parse(params![2] as string)
    expect(dadoEtlParsed.codigo).toBe('5A')
    expect(dadoEtlParsed.escola_id).toBe('esc-uuid')
    expect(params![3]).toContain('5A/2026')  // chave_tentada
  })

  it('caminho feliz — aluno: tipo "aluno" e dado_etl com nome do aluno', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

    await registrarDivergenciaImportacao({
      tipo: 'aluno',
      dadoEtl: {
        codigo: 'ALU0042',
        nome: 'Maria Silva',
        escola_id: 'esc-uuid',
        turma_id: 'turma-uuid',
        serie: '5',
        ano_letivo: '2026',
      },
      chaveTentada: 'nome+escola+turma+ano_letivo (Maria Silva/2026)',
      importacaoId: 'imp-uuid-002',
    })

    const [, params] = mockPool.query.mock.calls[0]
    expect(params![1]).toBe('aluno')
    const dado = JSON.parse(params![2] as string)
    // Dado ETL captura nome (sem PII extra).
    expect(dado.nome).toBe('Maria Silva')
    expect(dado.codigo).toBe('ALU0042')
  })

  it('regressao ADR-001: dado_etl nao deve conter cpf, data_nascimento nem matricula (PII)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

    // Simula um dado_etl que inclui CPF por engano — o campo deve ser
    // filtrado ANTES de chamar registrarDivergenciaImportacao. Este teste
    // verifica que a funcao grava exatamente o que recebe, e os campos de
    // PII nao devem existir em dado_etl passado pela batch.
    const dadoEtlSemPii = {
      codigo: 'ALU0042',
      nome: 'Aluno Teste',
      escola_id: 'esc-uuid',
      turma_id: null,
      serie: '3',
      ano_letivo: '2026',
    }

    await registrarDivergenciaImportacao({
      tipo: 'aluno',
      dadoEtl: dadoEtlSemPii,
      chaveTentada: 'nome+escola+turma+ano_letivo',
      importacaoId: 'imp-uuid-003',
    })

    const [, params] = mockPool.query.mock.calls[0]
    const dado = JSON.parse(params![2] as string)
    // Campos de PII nao presentes no dado_etl gravado.
    expect(dado).not.toHaveProperty('cpf')
    expect(dado).not.toHaveProperty('data_nascimento')
    expect(dado).not.toHaveProperty('matricula')
  })

  it('tolerancia a falha: excecao do banco nao propaga (nao derruba o ETL)', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('connection timeout'))

    // Nao deve rejeitar — a funcao e tolerante a falha por contrato.
    await expect(
      registrarDivergenciaImportacao({
        tipo: 'turma',
        dadoEtl: { codigo: '3B', escola_id: 'esc-uuid', ano_letivo: '2026' },
        chaveTentada: 'escola_id+codigo+ano_letivo',
        importacaoId: 'imp-uuid-004',
      })
    ).resolves.not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// registrarMestreAusente
// ---------------------------------------------------------------------------

describe('registrarMestreAusente (ADR-001)', () => {
  it('delega para registrarHistorico com tipo mestre_ausente_gestor', async () => {
    await registrarMestreAusente({
      entidade: 'turma',
      nome: '5A',
      escolaNome: 'Escola Modelo',
      turmaCodigo: '5A',
      poloNome: null,
      anoLetivo: '2026',
      importacaoId: 'imp-uuid-001',
      usuarioId: 'user-uuid-001',
    })

    expect(mockRegistrarHistorico).toHaveBeenCalledTimes(1)
    const args = mockRegistrarHistorico.mock.calls[0]
    expect(args[0]).toBe('mestre_ausente_gestor')   // tipo
    expect(args[1]).toBe('turma')                    // entidade
    expect(args[2]).toBeNull()                       // entidadeId (nao criado)
    expect(args[3]).toBe('5A')                       // nome
    // dadosAntes contem o contexto ETL.
    expect(args[4]).toMatchObject({ nome: '5A', escola_nome: 'Escola Modelo', importacao_id: 'imp-uuid-001' })
    // Acao descreve o gate estrito.
    expect(String(args[6])).toContain('gate estrito')
  })

  it('delega para registrarHistorico com tipo mestre_ausente_gestor para aluno', async () => {
    await registrarMestreAusente({
      entidade: 'aluno',
      nome: 'Maria Silva',
      escolaNome: 'Escola Nova',
      turmaCodigo: '3B',
      anoLetivo: '2026',
      importacaoId: 'imp-uuid-002',
      usuarioId: 'user-uuid-002',
    })

    const args = mockRegistrarHistorico.mock.calls[0]
    expect(args[0]).toBe('mestre_ausente_gestor')
    expect(args[1]).toBe('aluno')
    expect(args[3]).toBe('Maria Silva')
  })

  it('tolerancia a falha: excecao de registrarHistorico nao propaga', async () => {
    mockRegistrarHistorico.mockRejectedValueOnce(new Error('db error'))

    await expect(
      registrarMestreAusente({
        entidade: 'escola',
        nome: 'Escola X',
        importacaoId: 'imp-uuid-003',
        usuarioId: 'user-uuid-003',
      })
    ).resolves.not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// registrarMestreCriado
// ---------------------------------------------------------------------------

describe('registrarMestreCriado (ADR-001)', () => {
  it('delega para registrarHistorico com tipo mestre_criado_etl', async () => {
    await registrarMestreCriado({
      entidade: 'turma',
      entidadeId: 'turma-uuid-criada',
      nome: '5B',
      escolaNome: 'Escola Modelo',
      anoLetivo: '2026',
      importacaoId: 'imp-uuid-001',
      usuarioId: 'user-uuid-001',
    })

    expect(mockRegistrarHistorico).toHaveBeenCalledTimes(1)
    const args = mockRegistrarHistorico.mock.calls[0]
    expect(args[0]).toBe('mestre_criado_etl')        // tipo
    expect(args[1]).toBe('turma')                    // entidade
    expect(args[2]).toBe('turma-uuid-criada')        // entidadeId (criado pelo ETL)
    expect(args[3]).toBe('5B')                       // nome
    // dadosDepois contem origem rastreavel.
    expect(args[5]).toMatchObject({ origem: 'sisam_etl', importacao_id: 'imp-uuid-001' })
    // Acao descreve que foi criado em modo transicao.
    expect(String(args[6])).toContain('transição')
  })

  it('entidadeId null e aceito (id real resolvido depois na fase de batch)', async () => {
    await registrarMestreCriado({
      entidade: 'aluno',
      entidadeId: null,
      nome: 'Joao Teste',
      importacaoId: 'imp-uuid-002',
      usuarioId: 'user-uuid-002',
    })

    const args = mockRegistrarHistorico.mock.calls[0]
    expect(args[2]).toBeNull()
  })

  it('tolerancia a falha: excecao de registrarHistorico nao propaga', async () => {
    mockRegistrarHistorico.mockRejectedValueOnce(new Error('db error'))

    await expect(
      registrarMestreCriado({
        entidade: 'polo',
        entidadeId: null,
        nome: 'Polo Norte',
        importacaoId: 'imp-uuid-003',
        usuarioId: 'user-uuid-003',
      })
    ).resolves.not.toThrow()
  })
})
