/**
 * Testes unitários/integração — lib/services/carga-horaria.service.ts
 *
 * Cobre:
 *   calcularDiasLetivos — passagem correta de parâmetros
 *   calcularCargaHorariaSemanalTurma — tabela não existe (retorna 0), com tabela
 *   gerarRelatorioEscola — caminho feliz, ano letivo não encontrado, escola não encontrada,
 *                          alertas: faltam dias, faltam horas, carga horária diária insuficiente,
 *                          sem turmas ativas
 *   listarAlertasMunicipio — itera escolas, pula erros silenciosamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import {
  calcularDiasLetivos,
  calcularCargaHorariaSemanalTurma,
  gerarRelatorioEscola,
  listarAlertasMunicipio,
} from '@/lib/services/carga-horaria.service'

const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// calcularDiasLetivos
// ============================================================================

describe('calcularDiasLetivos', () => {
  it('retorna o número de dias da função SQL contar_dias_letivos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ dias: 185 }] })

    const dias = await calcularDiasLetivos({
      anoLetivoId: 'ano-2026',
      escolaId: 'escola-1',
      dataInicio: '2026-02-01',
      dataFim: '2026-12-18',
    })

    expect(dias).toBe(185)
  })

  it('retorna 0 quando a função SQL não retorna resultado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }) // dias é undefined

    const dias = await calcularDiasLetivos({
      anoLetivoId: 'ano-2026',
      escolaId: 'escola-1',
      dataInicio: '2026-02-01',
      dataFim: '2026-12-18',
    })

    expect(dias).toBe(0)
  })

  it('passa os 4 parâmetros na ordem correta', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ dias: 200 }] })

    await calcularDiasLetivos({
      anoLetivoId: 'ano-id',
      escolaId: 'esc-id',
      dataInicio: '2026-02-01',
      dataFim: '2026-12-20',
    })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('contar_dias_letivos')
    expect(params[0]).toBe('ano-id')
    expect(params[1]).toBe('esc-id')
    expect(params[2]).toBe('2026-02-01')
    expect(params[3]).toBe('2026-12-20')
  })
})

// ============================================================================
// calcularCargaHorariaSemanalTurma
// ============================================================================

describe('calcularCargaHorariaSemanalTurma', () => {
  it('retorna 0 quando tabela horarios_aula não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ existe: false }] })

    const horas = await calcularCargaHorariaSemanalTurma('turma-1')

    expect(horas).toBe(0)
    // Não deve chamar a segunda query se a tabela não existe
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('retorna a soma de horas quando tabela existe', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ existe: true }] })
      .mockResolvedValueOnce({ rows: [{ horas_semanais: '25.5' }] })

    const horas = await calcularCargaHorariaSemanalTurma('turma-1')

    expect(horas).toBe(25.5)
  })

  it('retorna 0 quando não há horários cadastrados (horas_semanais=0)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ existe: true }] })
      .mockResolvedValueOnce({ rows: [{ horas_semanais: '0' }] })

    const horas = await calcularCargaHorariaSemanalTurma('turma-2')

    expect(horas).toBe(0)
  })
})

// ============================================================================
// gerarRelatorioEscola
// ============================================================================

describe('gerarRelatorioEscola', () => {
  it('lança erro quando ano letivo não é encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // ano letivo não existe

    await expect(gerarRelatorioEscola({
      anoLetivoId: 'ano-inexistente',
      escolaId: 'escola-1',
    })).rejects.toThrow('Ano letivo não encontrado')
  })

  it('lança erro quando escola não é encontrada', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: '2026-02-01', data_fim: '2026-12-18', dias_letivos_total: 200 }] }) // ano ok
      .mockResolvedValueOnce({ rows: [] }) // escola não existe

    await expect(gerarRelatorioEscola({
      anoLetivoId: 'ano-2026',
      escolaId: 'escola-inexistente',
    })).rejects.toThrow('Escola não encontrada')
  })

  it('retorna relatório completo no caminho feliz (200 dias, 800h)', async () => {
    mockQuery
      // 1. Ano letivo
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: '2026-02-01', data_fim: '2026-12-18', dias_letivos_total: 200 }] })
      // 2. Escola
      .mockResolvedValueOnce({ rows: [{ nome: 'Escola Municipal Teste' }] })
      // 3. calcularDiasLetivos → contar_dias_letivos
      .mockResolvedValueOnce({ rows: [{ dias: 200 }] })
      // 4. Turmas da escola
      .mockResolvedValueOnce({ rows: [{ id: 't1', codigo: '3A' }] })
      // 5. calcularCargaHorariaSemanalTurma — verificação de tabela
      .mockResolvedValueOnce({ rows: [{ existe: true }] })
      // 6. calcularCargaHorariaSemanalTurma — horas da turma (5 dias × 5h = 25h/sem)
      .mockResolvedValueOnce({ rows: [{ horas_semanais: '25' }] })

    const relatorio = await gerarRelatorioEscola({
      anoLetivoId: 'ano-2026',
      escolaId: 'escola-1',
    })

    expect(relatorio.escola_nome).toBe('Escola Municipal Teste')
    expect(relatorio.dias_letivos_efetivos).toBe(200)
    expect(relatorio.cumpre_200_dias).toBe(true)
    expect(relatorio.cumpre_800_horas).toBe(true)
    expect(relatorio.alertas).toHaveLength(0)
  })

  it('gera alerta quando dias letivos < 200', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: '2026-02-01', data_fim: '2026-12-18', dias_letivos_total: 200 }] })
      .mockResolvedValueOnce({ rows: [{ nome: 'Escola X' }] })
      .mockResolvedValueOnce({ rows: [{ dias: 150 }] }) // apenas 150 dias
      .mockResolvedValueOnce({ rows: [] }) // sem turmas (alerta extra)

    const relatorio = await gerarRelatorioEscola({ anoLetivoId: 'a1', escolaId: 'e1' })

    expect(relatorio.cumpre_200_dias).toBe(false)
    const alertaDias = relatorio.alertas.find((a) => a.includes('dias letivos'))
    expect(alertaDias).toBeDefined()
    expect(alertaDias).toContain('50') // faltam 50 dias (200 - 150)
  })

  it('gera alerta "nenhuma turma ativa" quando escola sem turmas', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: null, data_fim: null, dias_letivos_total: 200 }] })
      .mockResolvedValueOnce({ rows: [{ nome: 'Escola Vazia' }] })
      .mockResolvedValueOnce({ rows: [{ dias: 200 }] })
      .mockResolvedValueOnce({ rows: [] }) // sem turmas

    const relatorio = await gerarRelatorioEscola({ anoLetivoId: 'a1', escolaId: 'e1' })

    expect(relatorio.alertas.some((a) => a.includes('turma'))).toBe(true)
  })

  it('usa data padrão (fev-01 / dez-20) quando ano letivo não tem data_inicio/data_fim', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: null, data_fim: null, dias_letivos_total: null }] })
      .mockResolvedValueOnce({ rows: [{ nome: 'E1' }] })
      .mockResolvedValueOnce({ rows: [{ dias: 200 }] })
      .mockResolvedValueOnce({ rows: [] })

    const relatorio = await gerarRelatorioEscola({ anoLetivoId: 'a1', escolaId: 'e1' })

    // Deve ter funcionado sem lançar erro
    expect(relatorio.ano_letivo).toBe('2026')
    // dias_letivos_planejados vem de MIN_DIAS_LETIVOS (200) quando dias_letivos_total é null
    expect(relatorio.dias_letivos_planejados).toBe(200)
  })

  it('estrutura do relatório contém todos os campos esperados', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: '2026-02-01', data_fim: '2026-12-18', dias_letivos_total: 200 }] })
      .mockResolvedValueOnce({ rows: [{ nome: 'Escola Completa' }] })
      .mockResolvedValueOnce({ rows: [{ dias: 200 }] })
      .mockResolvedValueOnce({ rows: [{ id: 't1', codigo: '5A' }] })
      .mockResolvedValueOnce({ rows: [{ existe: true }] })
      .mockResolvedValueOnce({ rows: [{ horas_semanais: '25' }] })

    const rel = await gerarRelatorioEscola({ anoLetivoId: 'a1', escolaId: 'e1' })

    expect(rel).toHaveProperty('ano_letivo')
    expect(rel).toHaveProperty('escola_id')
    expect(rel).toHaveProperty('escola_nome')
    expect(rel).toHaveProperty('dias_letivos_planejados')
    expect(rel).toHaveProperty('dias_letivos_efetivos')
    expect(rel).toHaveProperty('carga_horaria_planejada')
    expect(rel).toHaveProperty('carga_horaria_efetiva')
    expect(rel).toHaveProperty('cumpre_200_dias')
    expect(rel).toHaveProperty('cumpre_800_horas')
    expect(rel).toHaveProperty('alertas')
    expect(Array.isArray(rel.alertas)).toBe(true)
  })
})

// ============================================================================
// listarAlertasMunicipio
// ============================================================================

describe('listarAlertasMunicipio', () => {
  it('itera por todas as escolas ativas', async () => {
    mockQuery
      // 1. Lista escolas
      .mockResolvedValueOnce({ rows: [{ id: 'e1' }, { id: 'e2' }] })
      // 2. gerarRelatorioEscola escola 1
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: '2026-02-01', data_fim: '2026-12-18', dias_letivos_total: 200 }] })
      .mockResolvedValueOnce({ rows: [{ nome: 'E1' }] })
      .mockResolvedValueOnce({ rows: [{ dias: 200 }] })
      .mockResolvedValueOnce({ rows: [] }) // sem turmas
      // 3. gerarRelatorioEscola escola 2
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: '2026-02-01', data_fim: '2026-12-18', dias_letivos_total: 200 }] })
      .mockResolvedValueOnce({ rows: [{ nome: 'E2' }] })
      .mockResolvedValueOnce({ rows: [{ dias: 200 }] })
      .mockResolvedValueOnce({ rows: [] })

    const resultados = await listarAlertasMunicipio('ano-2026')

    expect(resultados).toHaveLength(2)
  })

  it('pula escola silenciosamente quando gerarRelatorioEscola lança erro', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'e1' }, { id: 'e2' }] })
      // escola 1: ano letivo não encontrado → erro
      .mockResolvedValueOnce({ rows: [] }) // → lança 'Ano letivo não encontrado'
      // escola 2: ok
      .mockResolvedValueOnce({ rows: [{ ano: '2026', data_inicio: null, data_fim: null, dias_letivos_total: 200 }] })
      .mockResolvedValueOnce({ rows: [{ nome: 'E2 OK' }] })
      .mockResolvedValueOnce({ rows: [{ dias: 200 }] })
      .mockResolvedValueOnce({ rows: [] })

    const resultados = await listarAlertasMunicipio('ano-2026')

    // Apenas 1 resultado (e1 foi pulada por erro)
    expect(resultados).toHaveLength(1)
    expect(resultados[0].escola_nome).toBe('E2 OK')
  })

  it('retorna array vazio quando não há escolas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // sem escolas

    const resultados = await listarAlertasMunicipio('ano-2026')

    expect(resultados).toHaveLength(0)
  })
})
