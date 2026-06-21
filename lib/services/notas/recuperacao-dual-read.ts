import type { PoolClient, Pool } from 'pg'
import poolDefault from '@/database/connection'
import { ESQUEMA_RECUPERACAO_PADRAO, REGRA_RECUPERACAO_PADRAO } from './types'
import type { ConfigNotas, EsquemaRecuperacao, RegraRecuperacao } from './types'

/**
 * ADR-005, passo 5 — DUAL-READ de recuperação por esquema, com FALLBACK.
 *
 * Resolve a recuperação acadêmica a partir da nova entidade
 * `recuperacoes_escolares` (+ tabela ponte `recuperacoes_periodos`, que diz
 * QUAIS períodos cada recuperação cobre) e, quando não há entrada nova para
 * um (aluno, disciplina, ano), faz FALLBACK para a coluna legada
 * `notas_escolares.nota_recuperacao` — preservando o comportamento atual
 * durante a transição (o campo legado NÃO recebe DROP — passo 8 é humano).
 *
 * Semântica por esquema (documentada e testada):
 *  - 'por_periodo' (default): NO-OP no cálculo da média anual. A recuperação
 *    já está embutida em `notas_escolares.nota_final` de cada período (via
 *    `calcularNotaFinal` no lançamento). Ler a média dos `nota_final` dá o
 *    MESMO resultado de hoje — PARIDADE EXATA, sem regressão.
 *  - 'por_bloco_periodos' / 'semestral': a recuperação cobre N períodos
 *    (lidos da tabela ponte). Aplica-se sobre a MÉDIA dos períodos cobertos —
 *    substituição quando maior (regra 'substituicao') ou ponderação
 *    (regra 'ponderada', mesma semântica de `calcularNotaFinal`).
 *  - 'final': recuperação anual. Aplica-se sobre a média anual já calculada,
 *    com a mesma semântica de substituição/ponderada.
 *
 * Por que `por_periodo` não passa por aqui no fluxo de média anual: o caller
 * (boletim/fechamento) só precisa AJUSTAR a média quando o esquema for de
 * bloco/semestral/final. Para 'por_periodo', a média dos `nota_final` já é
 * final — chamar `aplicarRecuperacaoMedia` com esse esquema retorna a média
 * inalterada (garantido pelos testes), então é seguro chamá-la sempre.
 */

/** Recuperação resolvida (nova entidade), já com os períodos que cobre. */
export interface RecuperacaoResolvida {
  disciplinaId: string
  esquema: EsquemaRecuperacao
  notaRecuperacao: number
  /** Números dos períodos letivos cobertos (via ponte). Vazio = sem ponte. */
  periodosNumeros: number[]
}

type QueryRunner = Pick<Pool | PoolClient, 'query'>

/** Converte numeric do PG (string) para number; null/inválido → null. */
function toNum(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null
  const n = parseFloat(String(valor))
  return Number.isFinite(n) ? n : null
}

/**
 * Aplica uma nota de recuperação sobre uma média (do bloco/semestre/ano),
 * com a MESMA semântica de `calcularNotaFinal`:
 *  - 'ponderada' (pesos válidos somando ~1.0): media*peso_av + rec*peso_rec.
 *  - 'substituicao' (default): MAX(media, recuperação).
 *
 * Função PURA — sem acesso ao banco — para ser unit-testável e reusável.
 * Não re-arredonda: o caller (média anual) já arredonda conforme a regra.
 *
 * @param media           Média do bloco/semestre/ano (null = sem nota).
 * @param notaRecuperacao Nota de recuperação a aplicar (null = sem recuperação).
 * @param config          Config resolvida (pesos, regra, permite_recuperacao).
 */
export function aplicarRecuperacaoSobreMedia(
  media: number | null,
  notaRecuperacao: number | null,
  config: Pick<ConfigNotas, 'permite_recuperacao' | 'peso_avaliacao' | 'peso_recuperacao' | 'regra_recuperacao' | 'nota_maxima'>
): number | null {
  if (media === null || !Number.isFinite(media)) return media
  if (notaRecuperacao === null || !Number.isFinite(notaRecuperacao)) return media
  if (!config.permite_recuperacao) return media

  const pesoAv = config.peso_avaliacao
  const pesoRec = config.peso_recuperacao
  const regra: RegraRecuperacao = config.regra_recuperacao ?? REGRA_RECUPERACAO_PADRAO
  const pesosValidos = !!pesoAv && !!pesoRec && Math.abs((pesoAv + pesoRec) - 1) < 0.01

  let resultado: number
  if (regra === 'ponderada' && pesosValidos) {
    resultado = media * pesoAv! + notaRecuperacao * pesoRec!
  } else {
    // Substituição (default): a recuperação só sobe a média, nunca a reduz.
    resultado = Math.max(media, notaRecuperacao)
  }

  const maxNota = config.nota_maxima ?? 10
  return Math.max(0, Math.min(resultado, maxNota))
}

/**
 * Decide o conjunto de recuperações de bloco/semestral/final que se aplicam
 * a uma média anual de uma disciplina e devolve a média JÁ AJUSTADA.
 *
 * Estratégia (sem regressão):
 *  - 'por_periodo': retorna a média inalterada (já reflete a recuperação por
 *    período em cada `nota_final`). NO-OP.
 *  - 'final': aplica a recuperação anual (se houver) sobre a média anual.
 *  - 'por_bloco_periodos' / 'semestral': como a média anual é composta a partir
 *    dos `nota_final` por período, e a recuperação de bloco cobre N períodos,
 *    aplicamos a maior recuperação de bloco encontrada sobre a média anual com
 *    a mesma semântica de substituição/ponderada. (O ajuste fino por bloco
 *    isolado depende da composição da média anual por bloco, fora do escopo
 *    deste passo; aqui garantimos que a recuperação de bloco NÃO seja ignorada
 *    e nunca reduza a média — coerente com a regra de substituição.)
 *
 * @param mediaAnual Média anual já calculada a partir dos nota_final.
 * @param esquema    Esquema de recuperação resolvido (config da escola/série).
 * @param recuperacoes Recuperações resolvidas (nova entidade) da disciplina.
 * @param config     Config resolvida (pesos/regra/permite_recuperacao).
 */
export function ajustarMediaAnualPorEsquema(
  mediaAnual: number | null,
  esquema: EsquemaRecuperacao,
  recuperacoes: RecuperacaoResolvida[],
  config: Pick<ConfigNotas, 'permite_recuperacao' | 'peso_avaliacao' | 'peso_recuperacao' | 'regra_recuperacao' | 'nota_maxima'>
): number | null {
  // 'por_periodo' não ajusta a média anual (já refletido nos nota_final).
  if (esquema === ESQUEMA_RECUPERACAO_PADRAO) return mediaAnual
  if (mediaAnual === null) return mediaAnual

  // Considera apenas recuperações do esquema corrente (defensivo).
  const aplicaveis = recuperacoes.filter((r) => r.esquema === esquema)
  if (aplicaveis.length === 0) return mediaAnual

  // Aplica a recuperação mais alta (substituição nunca reduz; ponderada usa a
  // de maior valor como parcela de recuperação). Para 'final' há no máximo uma.
  const maiorRec = aplicaveis.reduce(
    (max, r) => (r.notaRecuperacao > max ? r.notaRecuperacao : max),
    -Infinity
  )
  if (!Number.isFinite(maiorRec)) return mediaAnual

  return aplicarRecuperacaoSobreMedia(mediaAnual, maiorRec, config)
}

/**
 * Carrega as recuperações de bloco/semestral/final de um aluno num ano,
 * agrupadas por disciplina, a partir de `recuperacoes_escolares` + ponte.
 *
 * NÃO traz 'por_periodo': essas já estão refletidas nos `nota_final` (dual-read
 * é no-op para elas). Traz apenas os esquemas que ALTERAM a média anual.
 *
 * Fallback: quando NÃO existe nenhuma entrada na nova entidade para o
 * (aluno, ano) — caso geral hoje, antes de qualquer escola adotar bloco/
 * semestral/final — o Map volta vazio e o caller usa só a média dos
 * `nota_final` (comportamento atual, via coluna legada). Sem regressão.
 *
 * @returns Map<disciplina_id, RecuperacaoResolvida[]>.
 */
export async function carregarRecuperacoesNaoPeriodicas(
  alunoId: string,
  anoLetivo: string,
  runner: QueryRunner = poolDefault
): Promise<Map<string, RecuperacaoResolvida[]>> {
  const res = await runner.query(
    `SELECT re.disciplina_id,
            re.esquema,
            re.nota_recuperacao,
            COALESCE(
              ARRAY_AGG(p.numero ORDER BY p.numero) FILTER (WHERE p.numero IS NOT NULL),
              '{}'
            ) AS periodos_numeros
       FROM recuperacoes_escolares re
       LEFT JOIN recuperacoes_periodos rp ON rp.recuperacao_id = re.id
       LEFT JOIN periodos_letivos p ON p.id = rp.periodo_id
      WHERE re.aluno_id = $1
        AND re.ano_letivo = $2
        AND re.esquema <> 'por_periodo'
        AND re.nota_recuperacao IS NOT NULL
      GROUP BY re.id, re.disciplina_id, re.esquema, re.nota_recuperacao`,
    [alunoId, anoLetivo]
  )

  const mapa = new Map<string, RecuperacaoResolvida[]>()
  for (const row of res.rows as Array<Record<string, unknown>>) {
    const nota = toNum(row.nota_recuperacao)
    if (nota === null) continue
    const disciplinaId = String(row.disciplina_id)
    const periodos = Array.isArray(row.periodos_numeros)
      ? (row.periodos_numeros as unknown[]).map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : []
    const item: RecuperacaoResolvida = {
      disciplinaId,
      esquema: (row.esquema as EsquemaRecuperacao) ?? ESQUEMA_RECUPERACAO_PADRAO,
      notaRecuperacao: nota,
      periodosNumeros: periodos,
    }
    const lista = mapa.get(disciplinaId)
    if (lista) lista.push(item)
    else mapa.set(disciplinaId, [item])
  }
  return mapa
}
