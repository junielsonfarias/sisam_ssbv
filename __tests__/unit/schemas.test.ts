import { describe, it, expect } from 'vitest'
import {
  situacaoAlunoSchema, statusFilaSchema, metodoFrequenciaSchema,
  statusFrequenciaSchema, statusDispositivoSchema, tipoVinculoProfessorSchema,
  anoLetivoSchema, cpfSchema, emailSchema, uuidSchema,
  periodoLetivoSchema, regraAvaliacaoPostSchema,
  lancarFaltasSchema, professorPostSchema,
  alunoSchema,
} from '@/lib/schemas'

// ============================================================================
// ENUMS
// ============================================================================

describe('situacaoAlunoSchema', () => {
  it('aceita "cursando"', () => {
    expect(situacaoAlunoSchema.safeParse('cursando').success).toBe(true)
  })
  it('aceita "transferido"', () => {
    expect(situacaoAlunoSchema.safeParse('transferido').success).toBe(true)
  })
  it('rejeita "invalido"', () => {
    expect(situacaoAlunoSchema.safeParse('invalido').success).toBe(false)
  })
})

describe('statusFilaSchema', () => {
  it('aceita "aguardando"', () => {
    expect(statusFilaSchema.safeParse('aguardando').success).toBe(true)
  })
  it('rejeita "xyz"', () => {
    expect(statusFilaSchema.safeParse('xyz').success).toBe(false)
  })
})

describe('metodoFrequenciaSchema', () => {
  it('aceita "manual"', () => {
    expect(metodoFrequenciaSchema.safeParse('manual').success).toBe(true)
  })
  it('aceita "facial"', () => {
    expect(metodoFrequenciaSchema.safeParse('facial').success).toBe(true)
  })
  it('rejeita "outro"', () => {
    expect(metodoFrequenciaSchema.safeParse('outro').success).toBe(false)
  })
})

describe('statusFrequenciaSchema', () => {
  it('aceita "presente"', () => {
    expect(statusFrequenciaSchema.safeParse('presente').success).toBe(true)
  })
  it('aceita "ausente"', () => {
    expect(statusFrequenciaSchema.safeParse('ausente').success).toBe(true)
  })
  it('rejeita "invalido"', () => {
    expect(statusFrequenciaSchema.safeParse('invalido').success).toBe(false)
  })
})

describe('statusDispositivoSchema', () => {
  it('aceita "ativo"', () => {
    expect(statusDispositivoSchema.safeParse('ativo').success).toBe(true)
  })
  it('aceita "bloqueado"', () => {
    expect(statusDispositivoSchema.safeParse('bloqueado').success).toBe(true)
  })
  it('rejeita "xyz"', () => {
    expect(statusDispositivoSchema.safeParse('xyz').success).toBe(false)
  })
})

describe('tipoVinculoProfessorSchema', () => {
  it('aceita "polivalente"', () => {
    expect(tipoVinculoProfessorSchema.safeParse('polivalente').success).toBe(true)
  })
  it('aceita "disciplina"', () => {
    expect(tipoVinculoProfessorSchema.safeParse('disciplina').success).toBe(true)
  })
  it('rejeita "outro"', () => {
    expect(tipoVinculoProfessorSchema.safeParse('outro').success).toBe(false)
  })
})

// ============================================================================
// VALIDADORES
// ============================================================================

describe('anoLetivoSchema', () => {
  it('aceita "2026"', () => {
    expect(anoLetivoSchema.safeParse('2026').success).toBe(true)
  })
  it('rejeita "202" (3 digitos)', () => {
    expect(anoLetivoSchema.safeParse('202').success).toBe(false)
  })
  it('rejeita "20XX" (nao numerico)', () => {
    expect(anoLetivoSchema.safeParse('20XX').success).toBe(false)
  })
  it('rejeita string vazia', () => {
    expect(anoLetivoSchema.safeParse('').success).toBe(false)
  })
  it('rejeita ano fora do intervalo (2019)', () => {
    expect(anoLetivoSchema.safeParse('2019').success).toBe(false)
  })
  it('rejeita ano fora do intervalo (2101)', () => {
    expect(anoLetivoSchema.safeParse('2101').success).toBe(false)
  })
})

describe('cpfSchema', () => {
  it('aceita "12345678901" (11 digitos)', () => {
    const result = cpfSchema.safeParse('12345678901')
    expect(result.success).toBe(true)
  })
  it('rejeita "123" (poucos digitos)', () => {
    expect(cpfSchema.safeParse('123').success).toBe(false)
  })
  it('rejeita "abc" (nao numerico)', () => {
    expect(cpfSchema.safeParse('abc').success).toBe(false)
  })
  it('aceita null (opcional)', () => {
    expect(cpfSchema.safeParse(null).success).toBe(true)
  })
  it('aceita CPF formatado "123.456.789-01"', () => {
    const result = cpfSchema.safeParse('123.456.789-01')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('12345678901')
    }
  })
})

describe('emailSchema', () => {
  it('aceita "test@test.com"', () => {
    expect(emailSchema.safeParse('test@test.com').success).toBe(true)
  })
  it('rejeita "invalid"', () => {
    expect(emailSchema.safeParse('invalid').success).toBe(false)
  })
  it('rejeita string vazia', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
  })
  it('transforma para lowercase', () => {
    const result = emailSchema.safeParse('TEST@TEST.COM')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('test@test.com')
    }
  })
})

describe('uuidSchema', () => {
  it('aceita UUID v4 valido', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
  })
  it('rejeita "not-uuid"', () => {
    expect(uuidSchema.safeParse('not-uuid').success).toBe(false)
  })
  it('rejeita string vazia', () => {
    expect(uuidSchema.safeParse('').success).toBe(false)
  })
})

// ============================================================================
// SCHEMAS COMPOSTOS
// ============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('lancarFaltasSchema', () => {
  it('aceita objeto valido', () => {
    const result = lancarFaltasSchema.safeParse({
      turma_id: VALID_UUID,
      data: '2026-03-24',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita turma_id invalido', () => {
    const result = lancarFaltasSchema.safeParse({
      turma_id: 'invalid',
      data: '2026-03-24',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita data com formato invalido', () => {
    const result = lancarFaltasSchema.safeParse({
      turma_id: VALID_UUID,
      data: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita data sem separadores corretos', () => {
    const result = lancarFaltasSchema.safeParse({
      turma_id: VALID_UUID,
      data: '20260324',
    })
    expect(result.success).toBe(false)
  })
})

describe('professorPostSchema', () => {
  it('aceita dados validos', () => {
    const result = professorPostSchema.safeParse({
      nome: 'Joao Silva',
      email: 'joao@email.com',
      senha: '12345678',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = professorPostSchema.safeParse({
      nome: '',
      email: 'joao@email.com',
      senha: '12345678',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita nome com 1 caractere (min 2)', () => {
    const result = professorPostSchema.safeParse({
      nome: 'J',
      email: 'joao@email.com',
      senha: '12345678',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita email invalido', () => {
    const result = professorPostSchema.safeParse({
      nome: 'Joao',
      email: 'invalid',
      senha: '12345678',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita senha curta (min 8)', () => {
    const result = professorPostSchema.safeParse({
      nome: 'Joao',
      email: 'j@e.com',
      senha: '123',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita campos faltando', () => {
    const result = professorPostSchema.safeParse({
      nome: 'Joao',
    })
    expect(result.success).toBe(false)
  })
})

describe('regraAvaliacaoPostSchema', () => {
  const baseRegra = {
    nome: 'Regra Teste',
    tipo_avaliacao_id: VALID_UUID,
    media_aprovacao: 6,
    media_recuperacao: 5,
  }

  it('aceita objeto valido com media_recuperacao < media_aprovacao', () => {
    const result = regraAvaliacaoPostSchema.safeParse(baseRegra)
    expect(result.success).toBe(true)
  })

  it('rejeita media_recuperacao > media_aprovacao (refine)', () => {
    const result = regraAvaliacaoPostSchema.safeParse({
      ...baseRegra,
      media_recuperacao: 8,
      media_aprovacao: 6,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map(e => e.path.join('.'))
      expect(paths).toContain('media_recuperacao')
    }
  })

  it('aceita media_recuperacao == media_aprovacao', () => {
    const result = regraAvaliacaoPostSchema.safeParse({
      ...baseRegra,
      media_recuperacao: 6,
      media_aprovacao: 6,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita nome curto (min 2)', () => {
    const result = regraAvaliacaoPostSchema.safeParse({
      ...baseRegra,
      nome: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita tipo_avaliacao_id invalido', () => {
    const result = regraAvaliacaoPostSchema.safeParse({
      ...baseRegra,
      tipo_avaliacao_id: 'not-uuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('periodoLetivoSchema', () => {
  const basePeriodo = {
    nome: '1o Bimestre',
    tipo: 'bimestre' as const,
    numero: 1,
    ano_letivo: '2026',
  }

  it('aceita periodo valido sem datas', () => {
    expect(periodoLetivoSchema.safeParse(basePeriodo).success).toBe(true)
  })

  it('aceita periodo valido com datas corretas', () => {
    const result = periodoLetivoSchema.safeParse({
      ...basePeriodo,
      data_inicio: '2026-02-01',
      data_fim: '2026-04-30',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita data_fim anterior a data_inicio', () => {
    const result = periodoLetivoSchema.safeParse({
      ...basePeriodo,
      data_inicio: '2026-04-30',
      data_fim: '2026-02-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita tipo invalido', () => {
    const result = periodoLetivoSchema.safeParse({
      ...basePeriodo,
      tipo: 'quinzenal',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita numero fora do intervalo', () => {
    const result = periodoLetivoSchema.safeParse({
      ...basePeriodo,
      numero: 15,
    })
    expect(result.success).toBe(false)
  })
})

describe('alunoSchema', () => {
  const baseAluno = {
    nome: 'Maria Santos',
    escola_id: VALID_UUID,
  }

  it('aceita aluno valido com campos minimos', () => {
    expect(alunoSchema.safeParse(baseAluno).success).toBe(true)
  })

  it('aceita aluno com todos os campos opcionais', () => {
    const result = alunoSchema.safeParse({
      ...baseAluno,
      turma_id: VALID_UUID,
      serie: '5o Ano',
      ano_letivo: '2026',
      cpf: '12345678901',
      data_nascimento: '2015-05-10',
      pcd: false,
      nome_mae: 'Ana Santos',
      genero: 'feminino',
      raca_cor: 'parda',
      bolsa_familia: true,
      observacoes: 'Aluna transferida',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = alunoSchema.safeParse({
      ...baseAluno,
      nome: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita escola_id invalido', () => {
    const result = alunoSchema.safeParse({
      ...baseAluno,
      escola_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita genero invalido', () => {
    const result = alunoSchema.safeParse({
      ...baseAluno,
      genero: 'invalido',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita raca_cor invalida', () => {
    const result = alunoSchema.safeParse({
      ...baseAluno,
      raca_cor: 'invalida',
    })
    expect(result.success).toBe(false)
  })
})
