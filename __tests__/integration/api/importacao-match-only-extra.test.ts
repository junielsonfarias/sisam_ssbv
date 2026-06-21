/**
 * ADR-001 — ETL match-only: cenarios adicionais de batch e regressao de migration.
 *
 * Complementa importacao-match-only.test.ts com:
 *   - Batch misto turmas (2 existentes + 1 ausente): contadores e propagacao.
 *   - Propagacao de IDs: alunos/consolidados/resultados com TEMP_TURMA_ sao
 *     resolvidos para IDs reais quando a turma existe; IDs de turmas ausentes
 *     ficam null (aluno nao vinculado a turma divergente).
 *   - criarAlunos estrito: aluno existente e ATUALIZADO (existentes++, nao divergente).
 *   - criarAlunos estrito: batch misto (1 existente + 1 ausente).
 *   - Lista vazia: criarTurmas e criarAlunos sao no-op (sem query ao banco).
 *   - Regressao migration 005: SQL da tabela importacao_divergencias contem as
 *     colunas e constraints criticas do ADR-001.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

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

import pool from '@/database/connection'
import { criarTurmas, criarAlunos } from '@/lib/services/importacao/batch'
import type {
  ImportacaoResultado,
  TurmaParaInserir,
  AlunoParaInserir,
  ConsolidadoParaInserir,
  ResultadoParaInserir,
} from '@/lib/services/importacao/types'

const mockPool = vi.mocked(pool)

const CONFIG = {
  importacaoId: 'imp-adr001',
  anoLetivo: '2026',
  usuarioId: 'user-adr001',
  avaliacaoId: 'aval-adr001',
} as const

function novoResultado(): ImportacaoResultado {
  return {
    polos: { criados: 0, existentes: 0 },
    escolas: { criados: 0, existentes: 0, divergentes: 0 },
    turmas: { criados: 0, existentes: 0, divergentes: 0 },
    alunos: { criados: 0, existentes: 0, divergentes: 0 },
    questoes: { criadas: 0, existentes: 0 },
    resultados: { processados: 0, erros: 0, duplicados: 0, novos: 0 },
  }
}

function sqls(): string[] {
  return mockPool.query.mock.calls.map((c) => String(c[0]))
}

const envOriginal = process.env.ETL_GATE_MESTRE

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.ETL_GATE_MESTRE // garante modo estrito
})

afterAll(() => {
  if (envOriginal === undefined) delete process.env.ETL_GATE_MESTRE
  else process.env.ETL_GATE_MESTRE = envOriginal
})

// ---------------------------------------------------------------------------
// Batch misto turmas
// ---------------------------------------------------------------------------

describe('ETL match-only (estrito) — batch misto de turmas', () => {
  const turmaExiste1: TurmaParaInserir = {
    tempId: 'TEMP_TURMA_0',
    codigo: '5A',
    nome: '5A',
    escola_id: 'esc-1',
    serie: '5',
    ano_letivo: '2026',
    origem: 'sisam_etl',
    origem_importacao_id: CONFIG.importacaoId,
  }
  const turmaExiste2: TurmaParaInserir = {
    tempId: 'TEMP_TURMA_1',
    codigo: '3B',
    nome: '3B',
    escola_id: 'esc-1',
    serie: '3',
    ano_letivo: '2026',
    origem: 'sisam_etl',
    origem_importacao_id: CONFIG.importacaoId,
  }
  const turmaAusente: TurmaParaInserir = {
    tempId: 'TEMP_TURMA_2',
    codigo: '9C',
    nome: '9C',
    escola_id: 'esc-1',
    serie: '9',
    ano_letivo: '2026',
    origem: 'sisam_etl',
    origem_importacao_id: CONFIG.importacaoId,
  }

  it('2 existentes + 1 ausente: contadores e 1 divergencia gravada', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM turmas')) {
        // Retorna as duas turmas que existem (9C ausente)
        return {
          rows: [
            { id: 'turma-real-5A', escola_id: 'esc-1', codigo: '5A', ano_letivo: '2026' },
            { id: 'turma-real-3B', escola_id: 'esc-1', codigo: '3B', ano_letivo: '2026' },
          ],
        } as any
      }
      return { rows: [] } as any
    }) as any)

    const resultado = novoResultado()
    await criarTurmas([turmaExiste1, turmaExiste2, turmaAusente], [], [], [], CONFIG, resultado)

    expect(resultado.turmas.existentes).toBe(2)
    expect(resultado.turmas.divergentes).toBe(1)
    expect(sqls().some((s) => s.includes('INSERT INTO importacao_divergencias'))).toBe(true)
    expect(sqls().some((s) => s.includes('INSERT INTO turmas'))).toBe(false)
  })

  it('propagacao: alunos/consolidados/resultados com TEMP_TURMA_ resolvidos para ID real', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM turmas')) {
        return {
          rows: [
            { id: 'turma-real-5A', escola_id: 'esc-1', codigo: '5A', ano_letivo: '2026' },
            { id: 'turma-real-3B', escola_id: 'esc-1', codigo: '3B', ano_letivo: '2026' },
          ],
        } as any
      }
      return { rows: [] } as any
    }) as any)

    const alunos: AlunoParaInserir[] = [
      {
        tempId: 'TEMP_ALUNO_0',
        codigo: 'ALU0001',
        nome: 'Maria',
        escola_id: 'esc-1',
        turma_id: 'TEMP_TURMA_0', // deve resolver para turma-real-5A
        serie: '5',
        ano_letivo: '2026',
        origem: 'sisam_etl',
        origem_importacao_id: CONFIG.importacaoId,
      },
      {
        tempId: 'TEMP_ALUNO_1',
        codigo: 'ALU0002',
        nome: 'Joao',
        escola_id: 'esc-1',
        turma_id: 'TEMP_TURMA_2', // turma ausente -> null
        serie: '9',
        ano_letivo: '2026',
        origem: 'sisam_etl',
        origem_importacao_id: CONFIG.importacaoId,
      },
    ]

    const consolidados: Pick<ConsolidadoParaInserir, 'turma_id' | 'aluno_id' | 'escola_id' | 'ano_letivo' | 'avaliacao_id' | 'serie' | 'presenca' | 'total_acertos_lp' | 'total_acertos_ch' | 'total_acertos_mat' | 'total_acertos_cn' | 'nota_lp' | 'nota_ch' | 'nota_mat' | 'nota_cn' | 'media_aluno' | 'nota_producao' | 'nivel_aprendizagem' | 'nivel_aprendizagem_id' | 'tipo_avaliacao' | 'total_questoes_esperadas' | 'item_producao_1' | 'item_producao_2' | 'item_producao_3' | 'item_producao_4' | 'item_producao_5' | 'item_producao_6' | 'item_producao_7' | 'item_producao_8' | 'nivel_lp' | 'nivel_mat' | 'nivel_prod' | 'nivel_aluno'>[] = [
      {
        turma_id: 'TEMP_TURMA_1', // deve resolver para turma-real-3B
        aluno_id: 'aluno-uuid',
        escola_id: 'esc-1',
        ano_letivo: '2026',
        avaliacao_id: 'aval-1',
        serie: '3',
        presenca: 'P',
        total_acertos_lp: 5,
        total_acertos_ch: 3,
        total_acertos_mat: 4,
        total_acertos_cn: 2,
        nota_lp: null, nota_ch: null, nota_mat: null, nota_cn: null,
        media_aluno: null, nota_producao: null,
        nivel_aprendizagem: null, nivel_aprendizagem_id: null,
        tipo_avaliacao: 'avaliacao',
        total_questoes_esperadas: 20,
        item_producao_1: null, item_producao_2: null, item_producao_3: null,
        item_producao_4: null, item_producao_5: null, item_producao_6: null,
        item_producao_7: null, item_producao_8: null,
        nivel_lp: null, nivel_mat: null, nivel_prod: null, nivel_aluno: null,
      },
    ]

    const resultados: Pick<ResultadoParaInserir, 'turma_id' | 'aluno_id' | 'aluno_codigo' | 'aluno_nome' | 'questao_id' | 'questao_codigo' | 'resposta_aluno' | 'acertou' | 'nota' | 'ano_letivo' | 'avaliacao_id' | 'serie' | 'turma' | 'disciplina' | 'area_conhecimento' | 'presenca' | 'escola_id'>[] = [
      {
        turma_id: 'TEMP_TURMA_0', // deve resolver para turma-real-5A
        aluno_id: 'aluno-uuid',
        aluno_codigo: 'ALU0001',
        aluno_nome: 'Maria',
        escola_id: 'esc-1',
        questao_id: null,
        questao_codigo: 'Q01',
        resposta_aluno: 'A',
        acertou: true,
        nota: 1,
        ano_letivo: '2026',
        avaliacao_id: 'aval-1',
        serie: '5',
        turma: '5A',
        disciplina: 'LP',
        area_conhecimento: 'linguagens',
        presenca: 'P',
      },
    ]

    const resultado = novoResultado()
    await criarTurmas(
      [turmaExiste1, turmaExiste2, turmaAusente],
      alunos as AlunoParaInserir[],
      consolidados as ConsolidadoParaInserir[],
      resultados as ResultadoParaInserir[],
      CONFIG,
      resultado
    )

    // Aluno com TEMP_TURMA_0 resolvido para o id real da turma existente.
    expect(alunos[0].turma_id).toBe('turma-real-5A')
    // Aluno com TEMP_TURMA_2 (ausente) fica null (turma nao encontrada).
    expect(alunos[1].turma_id).toBeNull()
    // Consolidado com TEMP_TURMA_1 resolvido.
    expect(consolidados[0].turma_id).toBe('turma-real-3B')
    // Resultado com TEMP_TURMA_0 resolvido.
    expect(resultados[0].turma_id).toBe('turma-real-5A')
  })

  it('lista vazia: retorna sem executar nenhuma query', async () => {
    const resultado = novoResultado()
    await criarTurmas([], [], [], [], CONFIG, resultado)
    expect(mockPool.query).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// criarAlunos — cenarios adicionais estrito
// ---------------------------------------------------------------------------

describe('ETL match-only (estrito) — alunos: cenarios adicionais', () => {
  function baseAluno(overrides: Partial<AlunoParaInserir> = {}): AlunoParaInserir {
    return {
      tempId: 'TEMP_ALUNO_0',
      codigo: 'ALU0001',
      nome: 'Maria Silva',
      escola_id: 'esc-1',
      turma_id: 'turma-real-1',
      serie: '5',
      ano_letivo: '2026',
      origem: 'sisam_etl',
      origem_importacao_id: CONFIG.importacaoId,
      ...overrides,
    }
  }

  it('aluno existente: e ATUALIZADO (existentes++) e NAO gera divergencia', async () => {
    // A funcao primeiro faz lookup e depois UPDATE para aluno existente.
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      // Resolucao de ano_letivo_id
      if (texto.includes('FROM anos_letivos')) return { rows: [{ id: 'ano-uuid' }] } as any
      // Resolucao de serie_id
      if (texto.includes('FROM series_escolares')) return { rows: [{ id: 'serie-uuid' }] } as any
      // Lookup: retorna o aluno existente.
      if (texto.includes('INNER JOIN (VALUES')) {
        return {
          rows: [
            {
              id: 'aluno-real-uuid',
              nome_norm: 'MARIA SILVA',
              escola_id: 'esc-1',
              turma_id: 'turma-real-1',
              ano_letivo: '2026',
            },
          ],
        } as any
      }
      // UPDATE existente.
      if (texto.includes('UPDATE alunos')) return { rows: [] } as any
      return { rows: [] } as any
    }) as any)

    const aluno = baseAluno()
    const resultado = novoResultado()
    await criarAlunos([aluno], [], [], [], resultado, [], CONFIG)

    expect(resultado.alunos.existentes).toBe(1)
    expect(resultado.alunos.divergentes).toBe(0)
    expect(resultado.alunos.criados).toBe(0)
    // Nao deve gravar divergencia nem INSERT de aluno.
    expect(sqls().some((s) => s.includes('INSERT INTO importacao_divergencias'))).toBe(false)
    expect(sqls().some((s) => s.includes('INSERT INTO alunos'))).toBe(false)
    // Deve ter feito UPDATE.
    expect(sqls().some((s) => s.includes('UPDATE alunos'))).toBe(true)
  })

  it('batch misto (1 existente + 1 ausente): existentes=1, divergentes=1, sem INSERT aluno', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) return { rows: [{ id: 'ano-uuid' }] } as any
      if (texto.includes('FROM series_escolares')) return { rows: [{ id: 'serie-uuid' }] } as any
      if (texto.includes('INNER JOIN (VALUES')) {
        // Retorna somente Maria (existente); Joao nao existe.
        return {
          rows: [
            {
              id: 'aluno-real-maria',
              nome_norm: 'MARIA SILVA',
              escola_id: 'esc-1',
              turma_id: 'turma-real-1',
              ano_letivo: '2026',
            },
          ],
        } as any
      }
      if (texto.includes('UPDATE alunos')) return { rows: [] } as any
      return { rows: [] } as any
    }) as any)

    const maria = baseAluno({ tempId: 'TEMP_ALUNO_0', nome: 'Maria Silva' })
    const joao = baseAluno({ tempId: 'TEMP_ALUNO_1', codigo: 'ALU0002', nome: 'Joao Santos' })

    const resultado = novoResultado()
    await criarAlunos([maria, joao], [], [], [], resultado, [], CONFIG)

    expect(resultado.alunos.existentes).toBe(1)
    expect(resultado.alunos.divergentes).toBe(1)
    expect(resultado.alunos.criados).toBe(0)
    expect(sqls().some((s) => s.includes('INSERT INTO alunos'))).toBe(false)
    expect(sqls().some((s) => s.includes('INSERT INTO importacao_divergencias'))).toBe(true)
  })

  it('lista vazia: retorna sem executar nenhuma query', async () => {
    const resultado = novoResultado()
    await criarAlunos([], [], [], [], resultado, [], CONFIG)
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('regressao: modo transicao NAO deve ser ativado por acidente quando a env e estrito', async () => {
    // Garante que, independente de chamadas anteriores ao modulo, o modo padrao
    // preserva o comportamento match-only.
    delete process.env.ETL_GATE_MESTRE

    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) return { rows: [{ id: 'ano-uuid' }] } as any
      if (texto.includes('FROM series_escolares')) return { rows: [{ id: 'serie-uuid' }] } as any
      if (texto.includes('INNER JOIN (VALUES')) return { rows: [] } as any // aluno ausente
      return { rows: [] } as any
    }) as any)

    const aluno = baseAluno()
    const resultado = novoResultado()
    await criarAlunos([aluno], [], [], [], resultado, [], CONFIG)

    // Modo estrito: divergente, nao criado.
    expect(resultado.alunos.divergentes).toBe(1)
    expect(resultado.alunos.criados).toBe(0)
    expect(sqls().some((s) => s.includes('INSERT INTO alunos'))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Regressao de migration: contrato estrutural da tabela importacao_divergencias
// ---------------------------------------------------------------------------

describe('Migration 005 — contrato estrutural da tabela importacao_divergencias (ADR-001)', () => {
  const migrationSql = readFileSync(
    join(process.cwd(), 'database/migrations/005_importacao_divergencias.sql'),
    'utf-8'
  )

  it('cria a tabela importacao_divergencias (CREATE TABLE IF NOT EXISTS)', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS importacao_divergencias/i)
  })

  it('coluna "tipo" com CHECK IN (turma, aluno)', () => {
    expect(migrationSql).toMatch(/tipo\s+VARCHAR.*NOT NULL/i)
    expect(migrationSql).toMatch(/CHECK\s*\(.*tipo.*IN\s*\(.*'turma'.*'aluno'/)
  })

  it('coluna "dado_etl" JSONB NOT NULL (sem PII, dados do ETL)', () => {
    expect(migrationSql).toMatch(/dado_etl\s+JSONB\s+NOT NULL/i)
  })

  it('coluna "status" com CHECK IN (pendente, vinculado, ignorado) e default pendente', () => {
    expect(migrationSql).toMatch(/status\s+VARCHAR.*DEFAULT\s+'pendente'/i)
    expect(migrationSql).toMatch(/CHECK\s*\(.*status.*IN\s*\(.*'pendente'.*'vinculado'.*'ignorado'/)
  })

  it('coluna "chave_tentada" TEXT (descricao da chave de match)', () => {
    expect(migrationSql).toMatch(/chave_tentada\s+TEXT/i)
  })

  it('FK importacao_id -> importacoes(id) ON DELETE CASCADE', () => {
    expect(migrationSql).toMatch(/importacao_id.*REFERENCES.*importacoes\(id\).*ON DELETE CASCADE/i)
  })

  it('FK resolvido_por -> usuarios(id) ON DELETE SET NULL', () => {
    expect(migrationSql).toMatch(/resolvido_por.*REFERENCES.*usuarios\(id\).*ON DELETE SET NULL/i)
  })

  it('indice por importacao_id para a tela de triagem', () => {
    expect(migrationSql).toMatch(/CREATE INDEX IF NOT EXISTS.*importacao_divergencias_importacao/i)
  })

  it('indice por status para filtragem rapida de pendentes', () => {
    expect(migrationSql).toMatch(/CREATE INDEX IF NOT EXISTS.*importacao_divergencias_status/i)
  })

  it('migration e aditiva (nao contem DROP TABLE)', () => {
    // Garante que a migration nao derruba nada em uso — apenas adiciona.
    expect(migrationSql).not.toMatch(/DROP TABLE(?!\s+IF\s+EXISTS\s+importacao_divergencias)/i)
  })

  it('envolve criacao em BEGIN...COMMIT (transacao atomica)', () => {
    expect(migrationSql).toMatch(/^\s*BEGIN\s*;/im)
    expect(migrationSql).toMatch(/COMMIT\s*;/i)
  })
})
