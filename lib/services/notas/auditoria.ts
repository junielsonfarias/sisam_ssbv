import pool from '@/database/connection'
import type { NotaSnapshot, LinhaAuditoriaNota } from './types'

// ============================================================================
// Trilha de alteração de notas (Fase 3.2)
// ============================================================================

function _num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? null : n
}

function _igual(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return Math.abs(a - b) < 0.001
}

/**
 * Diferença "de-para" entre as notas anteriores e as novas, para auditoria.
 * Pura/testável. Retorna só as linhas que REALMENTE mudaram:
 *  - sem registro anterior + algum valor não-nulo → 'lancamento'
 *  - registro anterior com algum campo diferente   → 'alteracao'
 *  - sem alteração efetiva (UPSERT no-op)           → ignorado
 */
export function montarAuditoriaNotas(
  anteriores: Map<string, NotaSnapshot>,
  novas: Array<{ aluno_id: string; nota: number | null; nota_recuperacao: number | null; nota_final: number | null }>
): LinhaAuditoriaNota[] {
  const linhas: LinhaAuditoriaNota[] = []
  for (const nv of novas) {
    const nNota = _num(nv.nota)
    const nRec = _num(nv.nota_recuperacao)
    const nFin = _num(nv.nota_final)
    const ant = anteriores.get(nv.aluno_id)

    if (!ant) {
      if (nNota === null && nRec === null && nFin === null) continue
      linhas.push({
        aluno_id: nv.aluno_id, acao: 'lancamento',
        nota_anterior: null, nota_nova: nNota,
        nota_recuperacao_anterior: null, nota_recuperacao_nova: nRec,
        nota_final_anterior: null, nota_final_nova: nFin,
      })
    } else {
      const aNota = _num(ant.nota)
      const aRec = _num(ant.nota_recuperacao)
      const aFin = _num(ant.nota_final)
      if (_igual(aNota, nNota) && _igual(aRec, nRec) && _igual(aFin, nFin)) continue
      linhas.push({
        aluno_id: nv.aluno_id, acao: 'alteracao',
        nota_anterior: aNota, nota_nova: nNota,
        nota_recuperacao_anterior: aRec, nota_recuperacao_nova: nRec,
        nota_final_anterior: aFin, nota_final_nova: nFin,
      })
    }
  }
  return linhas
}

/**
 * Grava a trilha de alteração de notas em lote (multi-row INSERT).
 * NÃO-FATAL: qualquer erro (inclusive tabela ainda inexistente) é engolido —
 * o lançamento de notas nunca pode ser bloqueado pela auditoria. Por isso é
 * chamado FORA da transação principal, após o COMMIT.
 */
export async function registrarAuditoriaNotas(
  linhas: LinhaAuditoriaNota[],
  meta: { disciplinaId: string | null; periodoId: string; turmaId: string; escolaId: string; anoLetivo: string; registradoPor: string }
): Promise<void> {
  if (linhas.length === 0) return
  try {
    const COLS = 14
    const placeholders: string[] = []
    const values: (string | number | null)[] = []
    for (let i = 0; i < linhas.length; i++) {
      const o = i * COLS
      placeholders.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},$${o + 12},$${o + 13},$${o + 14})`)
      const l = linhas[i]
      values.push(
        l.aluno_id, meta.disciplinaId, meta.periodoId, meta.turmaId, meta.escolaId, meta.anoLetivo,
        l.acao,
        l.nota_anterior, l.nota_nova,
        l.nota_recuperacao_anterior, l.nota_recuperacao_nova,
        l.nota_final_anterior, l.nota_final_nova,
        meta.registradoPor
      )
    }
    await pool.query(
      `INSERT INTO notas_escolares_auditoria
         (aluno_id, disciplina_id, periodo_id, turma_id, escola_id, ano_letivo,
          acao, nota_anterior, nota_nova, nota_recuperacao_anterior,
          nota_recuperacao_nova, nota_final_anterior, nota_final_nova, alterado_por)
       VALUES ${placeholders.join(', ')}`,
      values
    )
  } catch {
    // Auditoria nunca bloqueia o lançamento (tabela pode não existir ainda).
  }
}
