/**
 * Testes dos fragmentos SQL de comparativos.
 * Valida apenas estrutura — execucao real e responsabilidade de testes
 * de integracao. Aqui garantimos que o SQL gerado nao quebre acidentalmente.
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

describe('comparativos/sql', () => {
  it('NUMERO_SERIE_SQL extrai apenas digitos', () => {
    expect(NUMERO_SERIE_SQL).toContain("REGEXP_REPLACE")
    expect(NUMERO_SERIE_SQL).toContain("'[^0-9]'")
  })

  it('PRESENCA_BASE aceita P, p, F, f (case-insensitive)', () => {
    expect(PRESENCA_BASE).toContain("rc.presenca = 'P'")
    expect(PRESENCA_BASE).toContain("rc.presenca = 'p'")
    expect(PRESENCA_BASE).toContain("rc.presenca = 'F'")
    expect(PRESENCA_BASE).toContain("rc.presenca = 'f'")
  })

  it('getMediaGeralAgregadaSQL divide por 3 nos anos iniciais (2,3,5) e por 4 nos finais', () => {
    const sql = getMediaGeralAgregadaSQL()
    expect(sql).toContain("IN ('2', '3', '5')")
    expect(sql).toContain('/ 3.0')
    expect(sql).toContain('/ 4.0')
    // Anos iniciais sem CH (ciencias humanas)
    const blocoIniciais = sql.slice(sql.indexOf("IN ('2', '3', '5')"), sql.indexOf('/ 3.0') + 5)
    expect(blocoIniciais).not.toContain('nota_ch')
    expect(blocoIniciais).toContain('nota_producao')
  })

  it('getMediaGeralAlunoSQL usa divisor dinamico (NULLIF para evitar div/0)', () => {
    const sql = getMediaGeralAlunoSQL()
    expect(sql).toContain('NULLIF')
    expect(sql).toContain('ROUND')
    // garante que considera 4 disciplinas para anos finais
    expect(sql).toContain('nota_cn')
  })

  it('getMediasDisciplinasSQL retorna media_lp/ch/mat/cn/producao', () => {
    const sql = getMediasDisciplinasSQL()
    expect(sql).toContain('as media_lp')
    expect(sql).toContain('as media_ch')
    expect(sql).toContain('as media_mat')
    expect(sql).toContain('as media_cn')
    expect(sql).toContain('as media_producao')
  })

  it('getContagemAlunosSQL conta total + presentes', () => {
    const sql = getContagemAlunosSQL()
    expect(sql).toContain('total_alunos')
    expect(sql).toContain('alunos_presentes')
    expect(sql).toContain('COUNT(DISTINCT')
  })

  it('getFromJoinsSQL inclui alunos, escolas, polos e LEFT JOIN turmas', () => {
    const sql = getFromJoinsSQL()
    expect(sql).toContain('INNER JOIN alunos')
    expect(sql).toContain('INNER JOIN escolas')
    expect(sql).toContain('INNER JOIN polos')
    expect(sql).toContain('LEFT JOIN turmas')
    expect(sql).toContain('resultados_consolidados_unificada')
  })

  it('nenhum fragmento contem aspas duplas (PG usa simples)', () => {
    const todos = [
      NUMERO_SERIE_SQL,
      PRESENCA_BASE,
      getMediaGeralAgregadaSQL(),
      getMediaGeralAlunoSQL(),
      getMediasDisciplinasSQL(),
      getContagemAlunosSQL(),
      getFromJoinsSQL(),
    ].join('\n')
    expect(todos).not.toMatch(/=\s*"/)
  })
})
