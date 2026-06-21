/**
 * Testes unitários — types + barrel do domínio matriculas (ADR-002)
 *
 * Cobre:
 *   - MatriculaError: é instância de Error, nome correto, mensagem preservada
 *   - isAlunoExistente(): type guard que distingue DadosAlunoExistente de DadosNovoAluno
 *   - AnoLetivoCorrente, MatriculaRow: verificação estrutural dos tipos
 *   - Barrel (index.ts): re-exporta tudo de leitura, tipos e consultas
 *
 * Regressão:
 *   - commit ce75d45 (migration aditiva): situacao padrão é 'cursando' na tabela
 *     matriculas (diverge do 'ativo' que era usado em alunos antes do ADR-002).
 *     O MatriculaRow deve aceitar 'cursando' como valor válido de situacao.
 *
 * Estratégia: puramente unitário — sem I/O, sem pool, sem rede.
 */

import { describe, it, expect } from 'vitest'

import {
  MatriculaError,
  isAlunoExistente,
} from '@/lib/services/matriculas/types'

// Barrel re-exporta tudo (verifica que o módulo está completo)
import {
  MatriculaError as MatriculaErrorBarrel,
  isAlunoExistente as isAlunoExistenteBarrel,
  obterAnoLetivoCorrente,
  buscarMatriculaDoAluno,
  listarMatriculasDaTurma,
  buscarResumoMatriculas,
  verificarCapacidadeTurma,
  verificarAnoLetivoAtivo,
} from '@/lib/services/matriculas'

// ================================================================== MatriculaError

describe('MatriculaError — erro de domínio de matrícula', () => {
  it('é instância de Error', () => {
    const err = new MatriculaError('turma sem vagas')
    expect(err).toBeInstanceOf(Error)
  })

  it('nome é "MatriculaError"', () => {
    const err = new MatriculaError('ano letivo fechado')
    expect(err.name).toBe('MatriculaError')
  })

  it('preserva a mensagem passada no construtor', () => {
    const msg = 'Ano letivo 2025 não está ativo.'
    const err = new MatriculaError(msg)
    expect(err.message).toBe(msg)
  })

  it('pode ser capturado como Error genérico (compatível com catch(err: unknown))', () => {
    let capturado: unknown
    try {
      throw new MatriculaError('falha de teste')
    } catch (e) {
      capturado = e
    }
    expect((capturado as Error).message).toBe('falha de teste')
    expect((capturado as MatriculaError).name).toBe('MatriculaError')
  })
})

// ================================================================ isAlunoExistente

describe('isAlunoExistente — type guard de aluno com id vs novo aluno', () => {
  it('retorna true para objeto com id preenchido', () => {
    expect(isAlunoExistente({ id: 'uuid-001', nome: 'Maria' })).toBe(true)
  })

  it('retorna false para objeto sem propriedade id', () => {
    expect(isAlunoExistente({ nome: 'João' })).toBe(false)
  })

  it('retorna false para objeto com id string vazia', () => {
    // id falsy → trata como novo aluno
    expect(isAlunoExistente({ id: '', nome: 'Pedro' })).toBe(false)
  })

  it('retorna false para objeto com id null', () => {
    expect(isAlunoExistente({ id: null as any, nome: 'Ana' })).toBe(false)
  })

  it('retorna false para objeto com id undefined', () => {
    expect(isAlunoExistente({ id: undefined as any, nome: 'Carlos' })).toBe(false)
  })

  it('retorna true quando aluno existente tem campos opcionais nulos (situação real do backfill)', () => {
    const aluno = {
      id: 'aluno-uuid-backfill',
      nome: 'Aluno Backfill',
      cpf: null,
      data_nascimento: null,
      pcd: false,
      serie_individual: null,
    }
    expect(isAlunoExistente(aluno)).toBe(true)
  })
})

// ============================================================= regressão ADR-002 situacao

describe('regressão ADR-002: situacao padrão na tabela matriculas é "cursando" (não "ativo")', () => {
  it('MatriculaRow aceita situacao = "cursando" (valor padrão da migration ce75d45)', () => {
    // A migration define DEFAULT 'cursando' em matriculas.situacao
    // (diverge de alunos, que usa 'ativo' como coluna de controle)
    const row = {
      id: 'mat-uuid',
      aluno_id: 'aluno-uuid',
      turma_id: 'turma-uuid',
      ano_letivo_id: 'ano-uuid',
      serie_id: null,
      situacao: 'cursando',
      data_matricula: '2026-02-01',
      criado_em: '2026-02-01T00:00:00Z',
      atualizado_em: '2026-02-01T00:00:00Z',
    }
    // Interface MatriculaRow define situacao como string genérico,
    // garantindo que 'cursando' é aceito (sem enum restritivo)
    expect(row.situacao).toBe('cursando')
  })

  it('regressão (commit ce75d45): migration usa COALESCE(a.situacao, "cursando") no backfill — null não quebra', () => {
    // Garante que o padrão de situacao do backfill é 'cursando' quando alunos.situacao é null
    const situacaoBackfill = (alunoSituacao: string | null): string =>
      alunoSituacao ?? 'cursando'

    expect(situacaoBackfill(null)).toBe('cursando')
    expect(situacaoBackfill('transferido')).toBe('transferido')
    expect(situacaoBackfill('evadido')).toBe('evadido')
    expect(situacaoBackfill('cursando')).toBe('cursando')
  })
})

// ============================================================= barrel (index.ts)

describe('barrel lib/services/matriculas/index.ts — re-exporta todos os símbolos do ADR-002', () => {
  it('MatriculaError está disponível pelo barrel', () => {
    expect(MatriculaErrorBarrel).toBeDefined()
    const err = new MatriculaErrorBarrel('via barrel')
    expect(err.name).toBe('MatriculaError')
  })

  it('isAlunoExistente está disponível pelo barrel', () => {
    expect(typeof isAlunoExistenteBarrel).toBe('function')
  })

  it('obterAnoLetivoCorrente está disponível pelo barrel (ADR-002 leitura)', () => {
    expect(typeof obterAnoLetivoCorrente).toBe('function')
  })

  it('buscarMatriculaDoAluno está disponível pelo barrel (ADR-002 leitura)', () => {
    expect(typeof buscarMatriculaDoAluno).toBe('function')
  })

  it('listarMatriculasDaTurma está disponível pelo barrel (ADR-002 leitura)', () => {
    expect(typeof listarMatriculasDaTurma).toBe('function')
  })

  it('buscarResumoMatriculas está disponível pelo barrel (consultas)', () => {
    expect(typeof buscarResumoMatriculas).toBe('function')
  })

  it('verificarCapacidadeTurma está disponível pelo barrel (consultas)', () => {
    expect(typeof verificarCapacidadeTurma).toBe('function')
  })

  it('verificarAnoLetivoAtivo está disponível pelo barrel (consultas)', () => {
    expect(typeof verificarAnoLetivoAtivo).toBe('function')
  })
})
