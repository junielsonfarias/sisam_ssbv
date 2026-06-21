import {
  resolverAnoLetivoId,
  resolverSerieId,
  type QueryExecutor,
} from '@/lib/services/gestor/mestre.service'

// ============================================================================
// Escrita PARALELA (dual-write) na tabela dedicada `matriculas` (ADR-002 fase 3).
//
// Sempre que `alunos.turma_id` e definido/alterado (ETL e service de matricula),
// espelha-se o vinculo na tabela `matriculas` via UPSERT por
// UNIQUE(aluno_id, ano_letivo_id). Mudanca ADITIVA: NAO substitui nem para de
// escrever `alunos.turma_id` — apenas mantem a nova fonte sincronizada.
//
// O helper aceita um `QueryExecutor` (pool OU client de transacao), entao a
// gravacao acontece dentro da mesma transacao/savepoint do chamador quando ha
// uma, e no pool quando o ETL grava fora de transacao.
// ============================================================================

/** Dados minimos para espelhar uma matricula na tabela dedicada. */
export interface DadosDualWriteMatricula {
  alunoId: string
  turmaId: string | null
  /** Ano letivo em varchar (ex.: "2026") — resolvido para anos_letivos.id. */
  anoLetivo: string | null | undefined
  /** Serie em varchar (ex.: "5" ou "5º Ano") — resolvida para series_escolares.id. */
  serie?: string | null
  /** Situacao do vinculo (default 'cursando'). */
  situacao?: string | null
  /** Pre-resolvidos: passe quando ja calculou (lote do ETL) para evitar relookup. */
  anoLetivoId?: string | null
  serieId?: string | null
}

/**
 * Espelha um vinculo aluno<->turma na tabela `matriculas` (ADR-002).
 *
 * - Resolve `ano_letivo_id` e `serie_id` canonicos via helpers de mestre.service
 *   (reaproveita os mesmos lookups do cadastro mestre). Caches opcionais por
 *   lote evitam repetir a query a cada aluno.
 * - UPSERT por UNIQUE(aluno_id, ano_letivo_id): cria a matricula ou atualiza
 *   turma/serie/situacao quando o aluno e remanejado dentro do mesmo ano.
 * - No-op silencioso (sem lancar) quando faltam dados que tornariam a linha
 *   invalida para o NOT NULL da tabela (sem turma_id ou sem ano_letivo_id
 *   resolvivel) — preserva o comportamento aditivo/nao-destrutivo: o ETL/service
 *   nunca quebra por causa do espelho.
 *
 * Usado por: lib/services/importacao/batch/alunos.ts (ETL) e
 * lib/services/matriculas/matricula.ts (service de matricula).
 */
export async function dualWriteMatricula(
  executor: QueryExecutor,
  dados: DadosDualWriteMatricula,
  caches?: {
    anoLetivoIdCache?: Map<string, string | null>
    serieIdCache?: Map<string, string | null>
  }
): Promise<void> {
  const { alunoId, turmaId } = dados
  // Sem turma nao ha vinculo a espelhar (coluna turma_id e NOT NULL).
  if (!alunoId || !turmaId) return

  const anoLetivoId =
    dados.anoLetivoId !== undefined
      ? dados.anoLetivoId
      : await resolverAnoLetivoId(executor, dados.anoLetivo, caches?.anoLetivoIdCache)
  // Sem ano letivo canonico a linha violaria o NOT NULL — no-op aditivo.
  if (!anoLetivoId) return

  const serieId =
    dados.serieId !== undefined
      ? dados.serieId
      : await resolverSerieId(executor, dados.serie, caches?.serieIdCache)

  const situacao = dados.situacao || 'cursando'

  await executor.query(
    `INSERT INTO matriculas (aluno_id, turma_id, ano_letivo_id, serie_id, situacao)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ON CONSTRAINT uq_matriculas_aluno_ano DO UPDATE
       SET turma_id      = EXCLUDED.turma_id,
           serie_id      = EXCLUDED.serie_id,
           situacao      = EXCLUDED.situacao,
           atualizado_em = now()`,
    [alunoId, turmaId, anoLetivoId, serieId, situacao]
  )
}
