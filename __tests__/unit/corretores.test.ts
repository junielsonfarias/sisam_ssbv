import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do pool ANTES de importar o módulo
vi.mock('@/database/connection', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  },
}))

import { corrigirNotaForaRange } from '@/lib/divergencias/corretores'
import pool from '@/database/connection'

const mockedQuery = pool.query as ReturnType<typeof vi.fn>

// ============================================================================
// TESTES DE CORREÇÃO DE NOTAS — CAMPOS_PERMITIDOS + VALIDAÇÃO
// ============================================================================

describe('corrigirNotaForaRange', () => {
  const usuarioId = 'user-001'
  const usuarioNome = 'Admin Teste'

  beforeEach(() => {
    mockedQuery.mockReset()
    mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 })
  })

  // --------------------------------------------------------------------------
  // CAMPOS PERMITIDOS (whitelist)
  // --------------------------------------------------------------------------

  describe('CAMPOS_PERMITIDOS — whitelist de campos', () => {
    const camposValidos = [
      'nota_lp', 'nota_mat', 'nota_ch', 'nota_cn', 'nota_producao',
      'media_aluno', 'acertos_lp', 'acertos_mat', 'acertos_ch', 'acertos_cn',
      'nota_lp_final', 'nota_mat_final', 'nota_ch_final', 'nota_cn_final',
      'media_final',
    ]

    for (const campo of camposValidos) {
      it(`aceita campo válido: ${campo}`, async () => {
        mockedQuery.mockResolvedValueOnce({ rows: [{ valor_antigo: 15 }], rowCount: 1 })
        mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
        mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }) // historico

        const result = await corrigirNotaForaRange(
          { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo, novoValor: 5 } },
          usuarioId,
          usuarioNome
        )
        expect(result.sucesso).toBe(true)
        expect(result.corrigidos).toBe(1)
      })
    }

    const camposInvalidos = [
      'DROP TABLE alunos',
      'invalid_field',
      'senha',
      'email',
      'nota_lp; DROP TABLE',
      '1=1; --',
      'nota_lp OR 1=1',
      'NOTA_LP', // case-sensitive
    ]

    for (const campo of camposInvalidos) {
      it(`rejeita campo inválido: "${campo}"`, async () => {
        const result = await corrigirNotaForaRange(
          { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo, novoValor: 5 } },
          usuarioId,
          usuarioNome
        )
        expect(result.sucesso).toBe(false)
        expect(result.mensagem).toContain('não permitido')
        // Deve NUNCA ter chamado pool.query com campo inválido
        expect(mockedQuery).not.toHaveBeenCalled()
      })
    }
  })

  // --------------------------------------------------------------------------
  // VALIDAÇÃO DE novoValor (0-10)
  // --------------------------------------------------------------------------

  describe('validação de novoValor', () => {
    it('aceita valor 0 (mínimo)', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ valor_antigo: -1 }], rowCount: 1 })
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo: 'nota_lp', novoValor: 0 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(true)
    })

    it('aceita valor 10 (máximo)', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ valor_antigo: 15 }], rowCount: 1 })
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo: 'nota_lp', novoValor: 10 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(true)
    })

    it('aceita valor 5.5 (decimal intermediário)', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ valor_antigo: 15 }], rowCount: 1 })
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo: 'nota_lp', novoValor: 5.5 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(true)
    })

    it('rejeita valor negativo', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo: 'nota_lp', novoValor: -1 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
      expect(result.mensagem).toContain('entre 0 e 10')
    })

    it('rejeita valor maior que 10', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo: 'nota_lp', novoValor: 11 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
      expect(result.mensagem).toContain('entre 0 e 10')
    })

    it('rejeita valor muito alto (100)', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo: 'nota_lp', novoValor: 100 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // IDS VAZIOS / DADOS INCOMPLETOS
  // --------------------------------------------------------------------------

  describe('dados incompletos', () => {
    it('rejeita ids vazio', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: [], dadosCorrecao: { campo: 'nota_lp', novoValor: 5 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
      expect(result.mensagem).toContain('incompletos')
    })

    it('rejeita ids undefined', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', dadosCorrecao: { campo: 'nota_lp', novoValor: 5 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
    })

    it('rejeita campo undefined', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { novoValor: 5 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
    })

    it('rejeita campo string vazia', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo: '', novoValor: 5 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
      expect(result.mensagem).toContain('incompletos')
    })

    it('rejeita novoValor undefined', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'], dadosCorrecao: { campo: 'nota_lp' } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
    })

    it('rejeita dadosCorrecao undefined', async () => {
      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1'] },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // PROCESSAMENTO COM MÚLTIPLOS IDS
  // --------------------------------------------------------------------------

  describe('múltiplos ids', () => {
    it('processa múltiplos ids e conta corrigidos', async () => {
      // Cada id gera: 1 SELECT + 1 UPDATE + 1 INSERT historico
      for (let i = 0; i < 3; i++) {
        mockedQuery.mockResolvedValueOnce({ rows: [{ valor_antigo: 15 }], rowCount: 1 })
        mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
        mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      }

      const result = await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['id1', 'id2', 'id3'], dadosCorrecao: { campo: 'nota_lp', novoValor: 7 } },
        usuarioId,
        usuarioNome
      )
      expect(result.sucesso).toBe(true)
      expect(result.corrigidos).toBe(3)
      expect(result.erros).toBe(0)
    })

    it('id com underscore usa parte antes do _', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ valor_antigo: 15 }], rowCount: 1 })
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await corrigirNotaForaRange(
        { tipo: 'notas_fora_range', ids: ['abc123_nota_lp'], dadosCorrecao: { campo: 'nota_lp', novoValor: 5 } },
        usuarioId,
        usuarioNome
      )

      // O SELECT deve usar 'abc123' (parte antes do _)
      const firstCall = mockedQuery.mock.calls[0]
      expect(firstCall[1]).toContain('abc123')
    })
  })
})
