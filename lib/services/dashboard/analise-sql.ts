/**
 * Fragmentos SQL reutilizáveis para a análise de acertos/erros.
 *
 * Centraliza os blocos repetidos de contagem (total_respostas/acertos/erros)
 * e de taxas (ROUND taxa_acerto/taxa_erro) usados nas 8+4 queries de
 * `fetchAnaliseAcertosErros` e `fetchResumosPorSerie`. Não altera nomes de
 * colunas nem a lógica — apenas elimina duplicação textual.
 *
 * @module services/dashboard/analise-sql
 */

/** Colunas de contagem: total_respostas, total_acertos, total_erros. */
export function colunasContagemSQL(): string {
  return `COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros`
}

/**
 * Colunas de acerto/erro completas: contagem + taxas arredondadas.
 * `sufixo` permite gerar `taxa_acerto`/`taxa_erro` (padrão) ou
 * `taxa_acerto_geral`/`taxa_erro_geral` (KPI geral).
 */
export function colunasAcertoErroSQL(sufixo: '' | '_geral' = ''): string {
  return `${colunasContagemSQL()},
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto${sufixo},
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro${sufixo}`
}
