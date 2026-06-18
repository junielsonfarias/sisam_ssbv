/**
 * Service — Cobertura de conteúdo: plano de aula × diário (Fase 4.2 — ciclo LDB).
 *
 * Mede quanto do conteúdo PLANEJADO (habilidades BNCC vinculadas aos planos de
 * aula em `planos_aula_bncc_habilidades`) foi efetivamente TRABALHADO no diário
 * de classe (`diario_classe_bncc_habilidades`) dentro da vigência do plano.
 *
 * Complementa o painel de lacunas do diário: lacuna = dia sem registro;
 * cobertura de conteúdo = habilidade planejada ainda não abordada.
 *
 * Sem migration — reusa as tabelas e tabelas-ponte BNCC já existentes.
 *
 * @module services/planos-aula-cobertura
 */

import pool from '@/database/connection'

export interface ResumoCobertura {
  total_habilidades: number
  cobertas: number
  pendentes: number
  /** % de habilidades planejadas já trabalhadas no diário. null se não há plano com habilidade. */
  percentual: number | null
}

/**
 * Resume a cobertura a partir de uma lista de habilidades marcadas como
 * cobertas/pendentes. Função PURA e testável.
 */
export function resumirCobertura(habilidades: { coberta: boolean }[]): ResumoCobertura {
  const total = habilidades.length
  const cobertas = habilidades.filter((h) => h.coberta).length
  return {
    total_habilidades: total,
    cobertas,
    pendentes: total - cobertas,
    percentual: total > 0 ? Math.round((cobertas / total) * 100) : null,
  }
}

export interface HabilidadeCobertura {
  codigo: string
  descricao: string | null
  coberta: boolean
  /** Data (YYYY-MM-DD) do 1º registro no diário que trabalhou a habilidade. */
  coberta_em: string | null
}

export interface PlanoCobertura {
  plano_id: string
  disciplina_nome: string | null
  periodo: string | null
  status: string
  data_inicio: string
  data_fim: string | null
  objetivo_resumo: string
  resumo: ResumoCobertura
  habilidades: HabilidadeCobertura[]
}

export interface FiltrosCoberturaConteudo {
  turmaId: string
  /** Janela opcional (período letivo): só planos que tocam o intervalo entram. */
  janelaInicio?: string
  janelaFim?: string
}

interface HabRow {
  plano_id: string
  habilidade_codigo: string
  descricao: string | null
  coberta_em: Date | string | null
}

/**
 * Analisa a cobertura de conteúdo dos planos de aula de uma turma.
 *
 * Para cada habilidade BNCC planejada, verifica se há algum registro no diário
 * da turma — vinculado à mesma habilidade — dentro de [data_inicio, data_fim ou
 * hoje] do plano. A correspondência por código BNCC já implica o componente
 * curricular, dispensando casar disciplina.
 *
 * Usado por: GET /api/admin/turmas/[id]/cobertura-plano
 */
export async function analisarCoberturaConteudoTurma(
  filtros: FiltrosCoberturaConteudo
): Promise<{ resumo: ResumoCobertura; planos: PlanoCobertura[] }> {
  const params: unknown[] = [filtros.turmaId]
  let overlap = ''
  if (filtros.janelaInicio && filtros.janelaFim) {
    params.push(filtros.janelaInicio, filtros.janelaFim)
    // Plano "toca" a janela se começa antes do fim dela e termina depois do início.
    overlap = ` AND p.data_inicio <= $3 AND COALESCE(p.data_fim, CURRENT_DATE) >= $2`
  }

  // 1) Metadados dos planos (apenas os que têm habilidade BNCC vinculada).
  const planosRes = await pool.query(
    `SELECT p.id AS plano_id, d.nome AS disciplina_nome, p.periodo, p.status,
            p.data_inicio, p.data_fim, p.objetivo
       FROM planos_aula p
       LEFT JOIN disciplinas_escolares d ON d.id = p.disciplina_id
      WHERE p.turma_id = $1${overlap}
        AND EXISTS (SELECT 1 FROM planos_aula_bncc_habilidades pb WHERE pb.plano_id = p.id)
      ORDER BY p.data_inicio DESC, d.nome NULLS LAST`,
    params
  )

  if (planosRes.rows.length === 0) {
    return { resumo: resumirCobertura([]), planos: [] }
  }

  // 2) Habilidades planejadas por plano + marca se foram trabalhadas no diário.
  const habRes = await pool.query(
    `SELECT pb.plano_id, pb.habilidade_codigo, h.descricao,
            MIN(dc.data_aula) FILTER (WHERE db.diario_id IS NOT NULL) AS coberta_em
       FROM planos_aula p
       JOIN planos_aula_bncc_habilidades pb ON pb.plano_id = p.id
       LEFT JOIN bncc_habilidades h ON h.codigo = pb.habilidade_codigo
       LEFT JOIN diario_classe dc
              ON dc.turma_id = p.turma_id
             AND dc.data_aula BETWEEN p.data_inicio AND COALESCE(p.data_fim, CURRENT_DATE)
       LEFT JOIN diario_classe_bncc_habilidades db
              ON db.diario_id = dc.id
             AND db.habilidade_codigo = pb.habilidade_codigo
      WHERE p.turma_id = $1${overlap}
      GROUP BY pb.plano_id, pb.habilidade_codigo, h.descricao
      ORDER BY pb.habilidade_codigo`,
    params
  )

  const habsPorPlano = new Map<string, HabilidadeCobertura[]>()
  for (const row of habRes.rows as HabRow[]) {
    const lista = habsPorPlano.get(row.plano_id) ?? []
    const cobertaEm = row.coberta_em ? String(row.coberta_em).slice(0, 10) : null
    lista.push({
      codigo: row.habilidade_codigo,
      descricao: row.descricao,
      coberta: cobertaEm !== null,
      coberta_em: cobertaEm,
    })
    habsPorPlano.set(row.plano_id, lista)
  }

  const planos: PlanoCobertura[] = planosRes.rows.map((p: Record<string, unknown>) => {
    const habilidades = habsPorPlano.get(String(p.plano_id)) ?? []
    const objetivo = String(p.objetivo ?? '')
    return {
      plano_id: String(p.plano_id),
      disciplina_nome: p.disciplina_nome ? String(p.disciplina_nome) : null,
      periodo: p.periodo ? String(p.periodo) : null,
      status: String(p.status),
      data_inicio: String(p.data_inicio).slice(0, 10),
      data_fim: p.data_fim ? String(p.data_fim).slice(0, 10) : null,
      objetivo_resumo: objetivo.length > 160 ? `${objetivo.slice(0, 160)}…` : objetivo,
      resumo: resumirCobertura(habilidades),
      habilidades,
    }
  })

  // Resumo agregado: todas as habilidades de todos os planos.
  const todas = planos.flatMap((p) => p.habilidades)
  return { resumo: resumirCobertura(todas), planos }
}
