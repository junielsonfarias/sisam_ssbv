import { describe, it, expect } from 'vitest'
import { montarAuditoriaNotas } from '@/lib/services/notas'

function snap(nota: number | null, rec: number | null, fin: number | null) {
  return { nota, nota_recuperacao: rec, nota_final: fin }
}

describe('montarAuditoriaNotas — trilha de alteração (Fase 3.2)', () => {
  it('registra lançamento quando não há nota anterior', () => {
    const linhas = montarAuditoriaNotas(new Map(), [
      { aluno_id: 'a1', nota: 7, nota_recuperacao: null, nota_final: 7 },
    ])
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      aluno_id: 'a1', acao: 'lancamento',
      nota_anterior: null, nota_nova: 7, nota_final_nova: 7,
    })
  })

  it('ignora lançamento totalmente vazio (sem valores)', () => {
    const linhas = montarAuditoriaNotas(new Map(), [
      { aluno_id: 'a1', nota: null, nota_recuperacao: null, nota_final: null },
    ])
    expect(linhas).toHaveLength(0)
  })

  it('registra alteração quando a nota muda', () => {
    const ant = new Map([['a1', snap(5, null, 5)]])
    const linhas = montarAuditoriaNotas(ant, [
      { aluno_id: 'a1', nota: 8, nota_recuperacao: null, nota_final: 8 },
    ])
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      acao: 'alteracao', nota_anterior: 5, nota_nova: 8, nota_final_anterior: 5, nota_final_nova: 8,
    })
  })

  it('ignora UPSERT no-op (mesmos valores, inclusive em string vs number)', () => {
    // PG devolve numeric como string; o diff deve normalizar
    const ant = new Map([['a1', { nota: '7.00', nota_recuperacao: null, nota_final: '7.00' } as any]])
    const linhas = montarAuditoriaNotas(ant, [
      { aluno_id: 'a1', nota: 7, nota_recuperacao: null, nota_final: 7 },
    ])
    expect(linhas).toHaveLength(0)
  })

  it('detecta alteração apenas na recuperação', () => {
    const ant = new Map([['a1', snap(5, null, 5)]])
    const linhas = montarAuditoriaNotas(ant, [
      { aluno_id: 'a1', nota: 5, nota_recuperacao: 6, nota_final: 6 },
    ])
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      acao: 'alteracao', nota_recuperacao_anterior: null, nota_recuperacao_nova: 6,
    })
  })

  it('processa múltiplos alunos misturando lançamento, alteração e no-op', () => {
    const ant = new Map([
      ['a1', snap(5, null, 5)],   // vai alterar
      ['a2', snap(8, null, 8)],   // no-op
    ])
    const linhas = montarAuditoriaNotas(ant, [
      { aluno_id: 'a1', nota: 9, nota_recuperacao: null, nota_final: 9 },
      { aluno_id: 'a2', nota: 8, nota_recuperacao: null, nota_final: 8 },
      { aluno_id: 'a3', nota: 6, nota_recuperacao: null, nota_final: 6 }, // novo
    ])
    expect(linhas).toHaveLength(2)
    expect(linhas.find(l => l.aluno_id === 'a1')?.acao).toBe('alteracao')
    expect(linhas.find(l => l.aluno_id === 'a3')?.acao).toBe('lancamento')
    expect(linhas.find(l => l.aluno_id === 'a2')).toBeUndefined()
  })
})
