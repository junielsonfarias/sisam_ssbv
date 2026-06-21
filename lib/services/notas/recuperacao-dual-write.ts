import type { PoolClient } from 'pg'
import { ESQUEMA_RECUPERACAO_PADRAO } from './types'
import type { ConfigNotas } from './types'

/**
 * Item resolvido de dual-write: correlaciona a linha de `notas_escolares`
 * (via `notaId` = id da nota) com o período coberto e a nota de recuperação.
 */
export interface DualWriteRecuperacaoItem {
  /** id da linha em notas_escolares (origem 1:1 da recuperação 'por_periodo'). */
  notaId: string
  alunoId: string
  /** Quando null, a recuperação não pode ser modelada (disciplina é NOT NULL). */
  disciplinaId: string | null
  notaRecuperacao: number | null
  notaFinal: number | null
}

/**
 * Dual-write de recuperação (ADR-005, passo 4).
 *
 * Além de a escrita legada em `notas_escolares.nota_recuperacao` ser mantida
 * pelo caller (lancarNotas), aqui espelhamos a recuperação na nova entidade
 * `recuperacoes_escolares` + tabela ponte `recuperacoes_periodos`, usando o
 * esquema vindo da config resolvida (default 'por_periodo').
 *
 * Modelo de correlação: cada linha de `notas_escolares` (id = `notaId`) é a
 * origem 1:1 de uma recuperação 'por_periodo' — mesma âncora usada pelo backfill
 * (passo 3, coluna `recuperacoes_escolares.nota_id_origem`). Como não há índice
 * UNIQUE em `nota_id_origem`, o UPSERT é feito como DELETE por origem + INSERT,
 * dentro da MESMA transação/client do lançamento (atômico com o legado).
 *
 * Casos:
 *  - `nota_recuperacao` presente e disciplina não-nula → grava/atualiza a
 *    recuperação + ponte com o período da nota.
 *  - `nota_recuperacao` nula (recuperação removida) → remove a recuperação
 *    correlacionada (a ponte cai por ON DELETE CASCADE), evitando dado stale.
 *  - disciplina nula → ignorado (a nova entidade exige disciplina_id NOT NULL;
 *    a escrita legada permanece intacta, sem regressão).
 *
 * Importante: NÃO remove nem altera a escrita legada — é aditivo.
 *
 * @param client    Client da transação em curso (mesmo do INSERT legado).
 * @param escolaId  Escola da turma/lançamento.
 * @param anoLetivo Ano letivo do lançamento.
 * @param periodoId Período (bimestre/semestre) que a recuperação cobre.
 * @param config    Config resolvida — fornece `esquema_recuperacao`.
 * @param registradoPor Usuário que lançou.
 * @param itens     Itens correlacionados (nota_id ↔ aluno ↔ recuperação).
 */
export async function dualWriteRecuperacao(
  client: PoolClient,
  params: {
    escolaId: string
    anoLetivo: string
    periodoId: string
    config: ConfigNotas
    registradoPor: string
    itens: DualWriteRecuperacaoItem[]
  }
): Promise<void> {
  const { escolaId, anoLetivo, periodoId, config, registradoPor, itens } = params
  const esquema = config.esquema_recuperacao ?? ESQUEMA_RECUPERACAO_PADRAO

  for (const item of itens) {
    // A nova entidade exige disciplina_id NOT NULL; sem ela, só o legado é escrito.
    if (!item.disciplinaId) continue

    // UPSERT por origem (nota_id): zera a recuperação anterior daquela nota.
    // A ponte cai junto por ON DELETE CASCADE.
    await client.query(
      `DELETE FROM recuperacoes_escolares WHERE nota_id_origem = $1`,
      [item.notaId]
    )

    // Sem nota de recuperação: a remoção acima basta (mantém consistência).
    if (item.notaRecuperacao === null) continue

    const ins = await client.query(
      `INSERT INTO recuperacoes_escolares
         (aluno_id, disciplina_id, escola_id, ano_letivo, esquema,
          nota_recuperacao, nota_final_calc, registrado_por, nota_id_origem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        item.alunoId,
        item.disciplinaId,
        escolaId,
        anoLetivo,
        esquema,
        item.notaRecuperacao,
        item.notaFinal,
        registradoPor,
        item.notaId,
      ]
    )

    const recuperacaoId = ins.rows[0]?.id as string | undefined
    if (!recuperacaoId) continue

    // Ponte: período que esta recuperação cobre. Para 'por_periodo' é o período
    // da própria nota; os demais esquemas (bloco/semestral/final) abrem N períodos
    // em etapa futura — aqui registramos ao menos o período corrente.
    await client.query(
      `INSERT INTO recuperacoes_periodos (recuperacao_id, periodo_id)
       VALUES ($1, $2)
       ON CONFLICT (recuperacao_id, periodo_id) DO NOTHING`,
      [recuperacaoId, periodoId]
    )
  }
}
