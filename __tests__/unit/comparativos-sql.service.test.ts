/**
 * Testes unitários — comparativos/sql
 *
 * Cobre: NUMERO_SERIE_SQL, PRESENCA_BASE, getMediaGeralAgregadaSQL,
 *        getMediasDisciplinasSQL, getContagemAlunosSQL, getFromJoinsSQL.
 * Funções puras que geram fragmentos SQL — sem I/O.
 */
import { describe, it, expect } from 'vitest'
import {
  NUMERO_SERIE_SQL,
  PRESENCA_BASE,
  getMediaGeralAgregadaSQL,
  getMediaGeralAlunoSQL,
  getMediasDisciplinasSQL,
  getContagemAlunosSQL,
  getFromJoinsSQL,
} from '@/lib/services/comparativos/sql'

describe('NUMERO_SERIE_SQL — constante', () => {
  it('usa COALESCE e REGEXP_REPLACE', () => {
    expect(NUMERO_SERIE_SQL).toContain('COALESCE')
    expect(NUMERO_SERIE_SQL).toContain('REGEXP_REPLACE')
    expect(NUMERO_SERIE_SQL).toContain('rc.serie_numero')
  })
})

describe('PRESENCA_BASE — constante', () => {
  it('inclui presença P e F (case-insensitive)', () => {
    expect(PRESENCA_BASE).toContain("'P'")
    expect(PRESENCA_BASE).toContain("'p'")
    expect(PRESENCA_BASE).toContain("'F'")
    expect(PRESENCA_BASE).toContain("'f'")
  })

  it('é uma condição entre parênteses (pode ser usada em AND)', () => {
    expect(PRESENCA_BASE.trim()).toMatch(/^\(/)
    expect(PRESENCA_BASE.trim()).toMatch(/\)$/)
  })
})

describe('getMediaGeralAgregadaSQL', () => {
  it('retorna SQL com AVG', () => {
    const sql = getMediaGeralAgregadaSQL()
    expect(sql).toContain('AVG(')
  })

  it('diferencia anos iniciais (2,3,5) dos finais', () => {
    const sql = getMediaGeralAgregadaSQL()
    expect(sql).toContain("IN ('2', '3', '5')")
    // Anos finais: divide por 4.0
    expect(sql).toContain('4.0')
    // Anos iniciais: divide por 3.0
    expect(sql).toContain('3.0')
  })

  it('inclui nota_producao para anos iniciais', () => {
    const sql = getMediaGeralAgregadaSQL()
    expect(sql).toContain('nota_producao')
  })

  it('inclui nota_ch e nota_cn para anos finais', () => {
    const sql = getMediaGeralAgregadaSQL()
    expect(sql).toContain('nota_ch')
    expect(sql).toContain('nota_cn')
  })

  it('usa presença P para o cálculo de médias', () => {
    const sql = getMediaGeralAgregadaSQL()
    expect(sql).toContain("presenca = 'P'")
  })
})

describe('getMediaGeralAlunoSQL', () => {
  it('retorna SQL com ROUND e CASE', () => {
    const sql = getMediaGeralAlunoSQL()
    expect(sql).toContain('ROUND')
    expect(sql).toContain('CASE')
  })

  it('usa NULLIF para evitar divisão por zero', () => {
    const sql = getMediaGeralAlunoSQL()
    expect(sql).toContain('NULLIF')
  })

  it('diferencia anos iniciais (2,3,5) dos finais', () => {
    const sql = getMediaGeralAlunoSQL()
    expect(sql).toContain("IN ('2', '3', '5')")
  })
})

describe('getMediasDisciplinasSQL', () => {
  it('retorna SQL com aliases media_lp, media_ch, media_mat, media_cn, media_producao', () => {
    const sql = getMediasDisciplinasSQL()
    expect(sql).toContain('media_lp')
    expect(sql).toContain('media_ch')
    expect(sql).toContain('media_mat')
    expect(sql).toContain('media_cn')
    expect(sql).toContain('media_producao')
  })

  it('inclui contagem de acertos por disciplina', () => {
    const sql = getMediasDisciplinasSQL()
    expect(sql).toContain('media_acertos_lp')
    expect(sql).toContain('media_acertos_mat')
  })

  it('usa presença P como condição para as médias', () => {
    const sql = getMediasDisciplinasSQL()
    expect(sql).toContain("presenca = 'P'")
  })

  it('usa CAST para converter notas de string para DECIMAL', () => {
    const sql = getMediasDisciplinasSQL()
    expect(sql).toContain('CAST(rc.nota_lp AS DECIMAL)')
  })
})

describe('getContagemAlunosSQL', () => {
  it('retorna total_alunos e alunos_presentes', () => {
    const sql = getContagemAlunosSQL()
    expect(sql).toContain('total_alunos')
    expect(sql).toContain('alunos_presentes')
  })

  it('usa COUNT DISTINCT por aluno_id', () => {
    const sql = getContagemAlunosSQL()
    expect(sql).toContain('DISTINCT')
    expect(sql).toContain('rc.aluno_id')
  })

  it('conta presença P/F para total e somente P para presentes', () => {
    const sql = getContagemAlunosSQL()
    // total: P ou F
    expect(sql).toContain("IN ('P', 'p', 'F', 'f')")
    // presentes: somente P
    expect(sql).toContain("= 'P' OR rc.presenca = 'p'")
  })
})

describe('getFromJoinsSQL', () => {
  it('inclui resultados_consolidados_unificada como rc', () => {
    const sql = getFromJoinsSQL()
    expect(sql).toContain('resultados_consolidados_unificada rc')
  })

  it('faz INNER JOIN com alunos, escolas e polos', () => {
    const sql = getFromJoinsSQL()
    expect(sql).toContain('INNER JOIN alunos a')
    expect(sql).toContain('INNER JOIN escolas e')
    expect(sql).toContain('INNER JOIN polos p')
  })

  it('faz LEFT JOIN com turmas (pode ser null)', () => {
    const sql = getFromJoinsSQL()
    expect(sql).toContain('LEFT JOIN turmas t')
  })
})
